#!/usr/bin/env python3
"""
find_leads.py -- CLI entry point for the lead-generator pipeline.

Full pipeline:
  1. Parse CLI arguments
  2. For each trade x town combination, discover businesses via Google Places
  3. Deduplicate results across all trade/town pairs
  4. Check SQLite for existing records; skip or mark for refresh
  5. Run enrichment concurrently (website checks + Yelp presence)
  6. Run franchise detection against brand-keyword list
  7. Score each lead and assign a tier (hot / warm / cold)
  8. Upsert results into SQLite
  9. Display a terminal summary and export CSV

Usage examples:
    python find_leads.py --trade "plumber,electrician" --town "Huntersville, NC"
    python find_leads.py --trade HVAC --town "Cornelius,Davidson" --min-score 8
    python find_leads.py --list-trades
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
from datetime import date
from typing import Any

from dotenv import load_dotenv

import config
from discovery.google_places import search_businesses
from discovery.deduplicator import deduplicate
from enrichment.website_checker import check_websites
from enrichment.yelp_presence import check_yelp_presence
from enrichment.franchise_detector import detect_franchise, load_brand_keywords
from scoring.lead_scorer import score_lead
from storage.database import (
    init_db,
    insert_business,
    update_enrichment,
    get_businesses_for_refresh,
)
from output.exporter import export_csv, print_summary


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    """Construct and return the CLI argument parser."""
    parser = argparse.ArgumentParser(
        prog="find_leads",
        description="Discover, enrich, score, and export local-business leads.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            '  python find_leads.py --trade "plumber,electrician" '
            '--town "Huntersville, NC"\n'
            '  python find_leads.py --trade HVAC --town "Cornelius,Davidson" '
            "--min-score 8\n"
            "  python find_leads.py --list-trades\n"
        ),
    )

    parser.add_argument(
        "--trade",
        type=str,
        default=None,
        help=(
            'Comma-separated trades to search, e.g. "plumber,electrician,HVAC". '
            "Required unless --list-trades is used."
        ),
    )
    parser.add_argument(
        "--town",
        type=str,
        default=None,
        help=(
            "Comma-separated towns to search. State defaults to NC if not "
            'specified, e.g. "Huntersville, NC" or just "Huntersville".'
        ),
    )
    parser.add_argument(
        "--export",
        type=str,
        default=None,
        help=(
            "CSV output path. Defaults to "
            "./leads_export_YYYY-MM-DD.csv"
        ),
    )
    parser.add_argument(
        "--min-score",
        type=int,
        default=5,
        help="Minimum lead-score threshold for export (default: 5).",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        default=False,
        help="Re-enrich businesses that already exist in the database.",
    )
    parser.add_argument(
        "--list-trades",
        action="store_true",
        default=False,
        help="Print the default trade list and exit.",
    )

    return parser


# ---------------------------------------------------------------------------
# Town normalization
# ---------------------------------------------------------------------------

def normalize_town(raw: str) -> str:
    """
    Ensure *raw* includes a US state abbreviation.

    If a comma followed by a two-letter state code is already present the
    string is returned as-is (stripped). Otherwise the default state from
    ``config.DEFAULT_STATE`` is appended.

    Examples
    --------
    >>> normalize_town("Huntersville, NC")
    'Huntersville, NC'
    >>> normalize_town("Huntersville")
    'Huntersville, NC'
    >>> normalize_town(" Davidson ")
    'Davidson, NC'
    """
    raw = raw.strip()
    if not raw:
        return raw

    parts = [p.strip() for p in raw.split(",")]
    # If the last part is exactly two letters, assume it is a state abbreviation.
    if len(parts) >= 2 and len(parts[-1]) == 2 and parts[-1].isalpha():
        return ", ".join(parts)

    return f"{raw}, {config.DEFAULT_STATE}"


def parse_towns(raw_csv: str) -> list[str]:
    """
    Split a raw ``--town`` value into individual normalized town strings.

    The tricky part: commas separate towns *and* separate city from state.
    Strategy -- split on commas, then greedily pair each segment with the
    *next* segment if the next segment looks like a US state abbreviation
    (exactly two alpha characters, ignoring whitespace).
    """
    segments = [s.strip() for s in raw_csv.split(",") if s.strip()]
    towns: list[str] = []
    i = 0
    while i < len(segments):
        seg = segments[i]
        # Peek ahead: is the next segment a two-letter state code?
        if (
            i + 1 < len(segments)
            and len(segments[i + 1]) == 2
            and segments[i + 1].isalpha()
        ):
            towns.append(f"{seg}, {segments[i + 1].upper()}")
            i += 2
        else:
            # No state code follows -- apply default state.
            towns.append(normalize_town(seg))
            i += 1
    return towns


def parse_trades(raw_csv: str) -> list[str]:
    """Split and clean a comma-separated trade string."""
    return [t.strip() for t in raw_csv.split(",") if t.strip()]


# ---------------------------------------------------------------------------
# API key resolution
# ---------------------------------------------------------------------------

def _get_google_api_key() -> str:
    """Retrieve the Google Places API key from the environment.

    Exits with a clear error message if the key is not set.
    """
    key = os.environ.get(config.GOOGLE_API_KEY_ENV, "").strip()
    if not key:
        print(
            f"[ERROR] Environment variable {config.GOOGLE_API_KEY_ENV} is not set.\n"
            f"        Set it in your .env file or export it in your shell."
        )
        sys.exit(1)
    return key


# ---------------------------------------------------------------------------
# Async enrichment orchestration
# ---------------------------------------------------------------------------

async def _run_enrichment(leads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Run website checks and Yelp presence checks.

    ``check_websites`` handles its own internal concurrency (batched aiohttp).
    ``check_yelp_presence`` runs with a deliberate delay between DuckDuckGo
    queries to avoid rate-limiting.

    We run both passes in series (websites first, then Yelp) because the
    Yelp enrichment logic may reference the ``website_status`` produced by
    the website checker.
    """
    # Phase A: Website quality check (concurrent via aiohttp internally)
    leads = await check_websites(leads)

    # Phase B: Yelp presence check (sequential with delay, runs in-process)
    leads = await check_yelp_presence(leads)

    return leads


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def run_pipeline(args: argparse.Namespace) -> None:
    """Execute the full discovery -> enrich -> score -> export pipeline."""

    # -- 0. Validate required args -------------------------------------------
    if not args.trade:
        print("[ERROR] --trade is required. Use --list-trades to see options.")
        sys.exit(1)
    if not args.town:
        print("[ERROR] --town is required.")
        sys.exit(1)

    api_key = _get_google_api_key()
    trades = parse_trades(args.trade)
    towns = parse_towns(args.town)
    export_path = args.export or f"./leads_export_{date.today().isoformat()}.csv"
    min_score = args.min_score
    refresh = args.refresh

    print("=" * 64)
    print("  LEAD GENERATOR -- Local Business Discovery Pipeline")
    print("=" * 64)
    print(f"  Trades : {', '.join(trades)}")
    print(f"  Towns  : {', '.join(towns)}")
    print(f"  Export : {export_path}")
    print(f"  Min score : {min_score}")
    print(f"  Refresh   : {refresh}")
    print("=" * 64)
    print()

    # -- 1. Initialize database -----------------------------------------------
    print("[1/8] Initializing database ...")
    db = init_db(config.DB_PATH)

    try:
        _run_pipeline_inner(db, api_key, trades, towns, export_path, min_score, refresh)
    except KeyboardInterrupt:
        print("\n\n[INTERRUPTED] Committing any pending changes...")
        db.commit()
        print("[INTERRUPTED] Database saved. Exiting.")
        sys.exit(130)
    finally:
        db.close()


def _run_pipeline_inner(
    db, api_key: str, trades: list[str], towns: list[str],
    export_path: str, min_score: int, refresh: bool,
) -> None:
    """Inner pipeline logic, separated for clean interrupt handling."""

    # -- 2. Discover businesses for each trade x town -------------------------
    print("[2/8] Discovering businesses ...")
    all_raw: list[dict[str, Any]] = []
    combo_count = len(trades) * len(towns)
    idx = 0
    for trade in trades:
        for town in towns:
            idx += 1
            print(
                f"       ({idx}/{combo_count}) {trade} in {town} ... ",
                end="",
                flush=True,
            )
            try:
                results = search_businesses(api_key, trade, town)
                # Inject city/state from the town string for DB storage.
                town_parts = [p.strip() for p in town.split(",")]
                city_name = town_parts[0] if town_parts else town
                state_code = town_parts[1] if len(town_parts) > 1 else config.DEFAULT_STATE
                for biz in results:
                    biz.setdefault("city", city_name)
                    biz.setdefault("state", state_code)
                print(f"{len(results)} found")
                all_raw.extend(results)
            except Exception as exc:
                print(f"ERROR: {exc}")

    if not all_raw:
        print("\n[DONE] No businesses discovered. Exiting.")
        return

    print(f"       Total raw results: {len(all_raw)}")
    print()

    # -- 3. Deduplicate -------------------------------------------------------
    print("[3/8] Deduplicating ...")
    unique_leads = deduplicate(all_raw)
    print(f"       {len(all_raw)} -> {len(unique_leads)} unique businesses")
    print()

    # -- 4. Check SQLite for existing records ---------------------------------
    print("[4/8] Checking database for existing records ...")
    all_place_ids = [
        lead["place_id"]
        for lead in unique_leads
        if lead.get("place_id")
    ]
    existing_rows = get_businesses_for_refresh(db, all_place_ids)
    existing_ids: set[str] = {
        row["google_place_id"]
        for row in existing_rows
        if row.get("google_place_id")
    }

    to_enrich: list[dict[str, Any]] = []
    skipped = 0
    for lead in unique_leads:
        pid = lead.get("place_id", "")
        if pid in existing_ids and not refresh:
            skipped += 1
            continue
        if pid in existing_ids and refresh:
            lead["_refresh"] = True
        to_enrich.append(lead)

    print(
        f"       {skipped} already in DB (skipped), "
        f"{len(to_enrich)} to process"
    )
    print()

    if not to_enrich:
        print(
            "[DONE] All leads already in database. "
            "Use --refresh to re-enrich."
        )
        return

    # -- 5. Enrich concurrently (website + Yelp) ------------------------------
    print(f"[5/8] Enriching {len(to_enrich)} leads (website + Yelp) ...")
    t0 = time.perf_counter()
    enriched = asyncio.run(_run_enrichment(to_enrich))
    elapsed = time.perf_counter() - t0
    print(f"       Enrichment completed in {elapsed:.1f}s")
    print()

    # -- 6. Franchise detection -----------------------------------------------
    print("[6/8] Running franchise detection ...")
    brand_keywords = load_brand_keywords(str(config.BRAND_KEYWORDS_PATH))
    franchise_flagged = 0
    for lead in enriched:
        detect_franchise(lead, brand_keywords)
        if lead.get("franchise_flag") in ("likely_franchise", "definite_franchise"):
            franchise_flagged += 1
    print(f"       {franchise_flagged} flagged as likely/definite franchise")
    print()

    # -- 7. Score and assign tier ---------------------------------------------
    print("[7/8] Scoring and tiering ...")
    tier_counts: dict[str, int] = {
        "hot": 0,
        "warm": 0,
        "cold": 0,
        "skip": 0,
    }
    for lead in enriched:
        score_lead(lead)
        tier = lead.get("lead_tier", "skip")
        tier_counts[tier] = tier_counts.get(tier, 0) + 1

    print(
        f"       Hot: {tier_counts['hot']}  |  "
        f"Warm: {tier_counts['warm']}  |  "
        f"Cold: {tier_counts['cold']}  |  "
        f"Skip: {tier_counts['skip']}"
    )
    print()

    # -- 8. Upsert into SQLite ------------------------------------------------
    print("[8/8] Saving to database ...")
    inserted = 0
    updated = 0
    for lead in enriched:
        is_refresh = lead.pop("_refresh", False)
        if is_refresh:
            update_enrichment(db, lead)
            updated += 1
        else:
            was_inserted = insert_business(db, lead)
            if was_inserted:
                inserted += 1
            else:
                # Place ID already existed (race or prior partial run);
                # update enrichment data instead.
                update_enrichment(db, lead)
                updated += 1
    db.commit()
    print(f"       {inserted} inserted, {updated} updated")
    print()

    # -- 9. Terminal summary + CSV export -------------------------------------
    # Filter to leads meeting the minimum score for export.
    qualified = [
        ld for ld in enriched if ld.get("lead_score", 0) >= min_score
    ]

    export_csv(qualified, export_path)
    abs_csv_path = os.path.abspath(export_path)

    print_summary(
        businesses=enriched,
        skipped_existing=skipped,
        skipped_franchise=franchise_flagged,
        trades=trades,
        towns=towns,
        csv_path=abs_csv_path,
    )

    print(
        f"[DONE] Exported {len(qualified)} leads (score >= {min_score}) "
        f"to {abs_csv_path}"
    )


# ---------------------------------------------------------------------------
# --list-trades handler
# ---------------------------------------------------------------------------

def list_trades() -> None:
    """Print the default trade list in a readable format and exit."""
    print("Default trades:")
    print("-" * 40)
    for i, trade in enumerate(config.DEFAULT_TRADES, 1):
        print(f"  {i:>2}. {trade}")
    print(f"\nTotal: {len(config.DEFAULT_TRADES)} trades")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    """Parse arguments and dispatch to the appropriate handler."""
    load_dotenv()

    parser = build_parser()
    args = parser.parse_args()

    if args.list_trades:
        list_trades()
        sys.exit(0)

    run_pipeline(args)


if __name__ == "__main__":
    main()
