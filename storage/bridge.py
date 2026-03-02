#!/usr/bin/env python3
"""
storage/bridge.py -- JSON-in / JSON-out bridge between Next.js and the Python pipeline.

The Next.js subprocess runner (web/src/lib/python.ts) calls this script by:
  1. Spawning: python storage/bridge.py
  2. Writing a JSON command to the child's stdin
  3. Reading a JSON result from the child's stdout

Supported actions
-----------------
run_scan
    Run the full discovery -> dedup -> enrich -> score -> store pipeline.
    Input:  {"action": "run_scan", "trades": [...], "towns": [...], "refresh": false}
    Output: {"status": "completed", "total_found": N, "new_inserted": N,
             "updated": N, "hot_count": N, "warm_count": N,
             "cold_count": N, "skip_count": N}

get_config
    Return configuration values from config.py.
    Input:  {"action": "get_config"}
    Output: {"trades": [...], "default_state": "NC", ...}
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Ensure the project root is on sys.path so we can import the pipeline modules.
# bridge.py lives at <project_root>/storage/bridge.py
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_PROJECT_ROOT))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_result(obj: dict[str, Any]) -> None:
    """Serialise *obj* to stdout as a single JSON line then flush."""
    sys.stdout.write(json.dumps(obj))
    sys.stdout.write("\n")
    sys.stdout.flush()


def _write_error(message: str) -> None:
    """Write a JSON error envelope to stdout and exit non-zero."""
    _write_result({"status": "error", "error": message})
    sys.exit(1)


def _write_progress(
    phase: str,
    detail: str,
    progress: int,
    items_done: int = 0,
    items_total: int = 0,
) -> None:
    """Write a progress update line to stdout.

    These lines are consumed by the Node.js route handler while the
    pipeline is still running.  They are distinguished from the final
    result line by the ``"type": "progress"`` key.
    """
    sys.stdout.write(json.dumps({
        "type": "progress",
        "phase": phase,
        "detail": detail,
        "progress": progress,
        "items_done": items_done,
        "items_total": items_total,
    }) + "\n")
    sys.stdout.flush()


# ---------------------------------------------------------------------------
# Action: get_config
# ---------------------------------------------------------------------------

def handle_get_config() -> None:
    import config  # type: ignore[import]

    _write_result({
        "trades": config.DEFAULT_TRADES,
        "default_state": config.DEFAULT_STATE,
        "tier_thresholds": {
            "hot": config.TIER_HOT,
            "warm": config.TIER_WARM,
            "cold": config.TIER_COLD,
        },
    })


# ---------------------------------------------------------------------------
# Action: run_scan
# ---------------------------------------------------------------------------

async def _run_enrichment(
    leads: list[dict[str, Any]],
    progress_callback: Any = None,
) -> list[dict[str, Any]]:
    """Run website + Yelp enrichment concurrently.

    Both enrichments modify dicts in-place with different keys
    (website_status vs has_yelp/yelp_url), so running in parallel is safe.
    """
    from enrichment.website_checker import check_websites  # type: ignore[import]
    from enrichment.yelp_presence import check_yelp_presence  # type: ignore[import]

    await asyncio.gather(
        check_websites(leads, progress_callback=progress_callback),
        check_yelp_presence(leads, progress_callback=progress_callback),
    )
    return leads


def handle_run_scan(payload: dict[str, Any]) -> None:
    """Execute the full pipeline and write a JSON summary to stdout."""
    from dotenv import load_dotenv  # type: ignore[import]

    import config  # type: ignore[import]
    from storage.database import init_db  # type: ignore[import]

    # Load environment variables (honours .env in project root).
    load_dotenv(dotenv_path=_PROJECT_ROOT / ".env")

    api_key = os.environ.get(config.GOOGLE_API_KEY_ENV, "").strip()
    if not api_key:
        _write_error(
            f"Environment variable {config.GOOGLE_API_KEY_ENV} is not set. "
            "Add it to your .env file."
        )
        return

    trades: list[str] = [str(t).strip() for t in payload.get("trades", []) if str(t).strip()]
    towns: list[str] = [str(t).strip() for t in payload.get("towns", []) if str(t).strip()]
    refresh: bool = bool(payload.get("refresh", False))

    if not trades or not towns:
        _write_error("trades and towns must be non-empty arrays")
        return

    # -----------------------------------------------------------------------
    # 1. Initialise database
    # -----------------------------------------------------------------------
    db_path = str(_PROJECT_ROOT / config.DB_PATH)
    db = init_db(db_path)

    try:
        summary = _run_pipeline(
            db=db,
            api_key=api_key,
            trades=trades,
            towns=towns,
            refresh=refresh,
        )
    except Exception as exc:  # noqa: BLE001
        db.close()
        _write_error(str(exc))
        return

    db.close()
    _write_result(summary)


def _run_pipeline(
    db: Any,
    api_key: str,
    trades: list[str],
    towns: list[str],
    refresh: bool,
) -> dict[str, Any]:
    """Core pipeline logic.  Returns a summary dict.

    Runs async phases (discovery + enrichment) inside a single event loop
    for maximum concurrency.
    """
    return asyncio.run(_run_pipeline_async(db, api_key, trades, towns, refresh))


async def _run_pipeline_async(
    db: Any,
    api_key: str,
    trades: list[str],
    towns: list[str],
    refresh: bool,
) -> dict[str, Any]:
    """Async pipeline: parallel discovery, parallel enrichment."""
    import config  # type: ignore[import]
    from discovery.google_places import async_search_all  # type: ignore[import]
    from discovery.deduplicator import deduplicate  # type: ignore[import]
    from enrichment.franchise_detector import detect_franchise, load_brand_keywords  # type: ignore[import]
    from scoring.lead_scorer import score_lead  # type: ignore[import]
    from storage.database import (  # type: ignore[import]
        insert_business,
        update_enrichment,
        get_businesses_for_refresh,
    )

    # -- 1. Discover (parallel, up to 5 concurrent API searches) -------------
    combos: list[tuple[str, str, str, str]] = []
    for trade in trades:
        for town in towns:
            town_parts = [p.strip() for p in town.split(",")]
            city_name = town_parts[0] if town_parts else town
            state_code = town_parts[1] if len(town_parts) > 1 else config.DEFAULT_STATE
            combos.append((trade, town, city_name, state_code))

    combo_total = len(combos)
    _write_progress("discovery", f"Searching {combo_total} trade/town combinations...", 0, 0, combo_total)

    def _discovery_progress(trade: str, town: str, found: int, done: int, total: int) -> None:
        pct = int(35 * done / total)
        _write_progress("discovery", f"Searched {trade} in {town} ({found} found)", pct, done, total)

    all_raw = await async_search_all(
        api_key,
        combos,
        max_concurrent=5,
        on_progress=_discovery_progress,
    )

    if not all_raw:
        return {
            "status": "completed",
            "total_found": 0,
            "new_inserted": 0,
            "updated": 0,
            "hot_count": 0,
            "warm_count": 0,
            "cold_count": 0,
            "skip_count": 0,
        }

    # -- 2. Deduplicate ------------------------------------------------------
    unique_leads = deduplicate(all_raw)
    _write_progress("dedup", f"{len(unique_leads)} unique leads after dedup", 36)

    # -- 3. Skip existing (unless refresh) -----------------------------------
    all_place_ids = [ld.get("place_id", "") for ld in unique_leads if ld.get("place_id")]
    existing_rows = get_businesses_for_refresh(db, all_place_ids)
    existing_ids: set[str] = {r["google_place_id"] for r in existing_rows if r.get("google_place_id")}

    to_enrich: list[dict[str, Any]] = []
    for lead in unique_leads:
        pid = lead.get("place_id", "")
        if pid in existing_ids and not refresh:
            continue
        if pid in existing_ids and refresh:
            lead["_refresh"] = True
        to_enrich.append(lead)

    # -- 4. Enrich (website + Yelp run in parallel) --------------------------
    enrich_count = len(to_enrich)
    if to_enrich:
        _write_progress("enriching_websites", f"Enriching {enrich_count} leads...", 37, 0, enrich_count)

        def _enrichment_progress(phase: str, done: int, total: int) -> None:
            # Throttle: report every 5 items, plus first and last.
            if done == 1 or done == total or done % 5 == 0:
                if phase == "websites":
                    pct = 37 + int(21 * done / max(total, 1))
                    _write_progress("enriching_websites", f"Checked {done}/{total} websites", pct, done, total)
                elif phase == "yelp":
                    pct = 59 + int(23 * done / max(total, 1))
                    _write_progress("enriching_yelp", f"Checked {done}/{total} Yelp listings", pct, done, total)

        enriched = await _run_enrichment(to_enrich, progress_callback=_enrichment_progress)
    else:
        enriched = []

    # -- 5. Franchise detection ----------------------------------------------
    brand_keywords = load_brand_keywords(str(config.BRAND_KEYWORDS_PATH))
    for lead in enriched:
        detect_franchise(lead, brand_keywords)

    franchise_count = sum(1 for l in enriched if l.get("franchise_flag") in ("likely_franchise", "definite_franchise"))
    _write_progress("franchise_detection", f"Detected {franchise_count} franchises", 83)

    # -- 6. Score ------------------------------------------------------------
    tier_counts: dict[str, int] = {"hot": 0, "warm": 0, "cold": 0, "skip": 0}
    _write_progress("scoring", f"Scoring {len(enriched)} leads...", 84, 0, len(enriched))
    for lead in enriched:
        score_lead(lead)
        tier = lead.get("lead_tier", "skip")
        tier_counts[tier] = tier_counts.get(tier, 0) + 1

    _write_progress(
        "scoring",
        f"Scored: {tier_counts['hot']} hot, {tier_counts['warm']} warm, {tier_counts['cold']} cold",
        90,
    )

    # -- 7. Upsert -----------------------------------------------------------
    _write_progress("saving", f"Saving {len(enriched)} leads to database...", 91, 0, len(enriched))
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
                update_enrichment(db, lead)
                updated += 1
    db.commit()

    _write_progress("saving", f"Saved {inserted} new, {updated} updated", 99, len(enriched), len(enriched))

    return {
        "status": "completed",
        "total_found": len(all_raw),
        "new_inserted": inserted,
        "updated": updated,
        "hot_count": tier_counts["hot"],
        "warm_count": tier_counts["warm"],
        "cold_count": tier_counts["cold"],
        "skip_count": tier_counts["skip"],
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    raw = sys.stdin.read().strip()
    if not raw:
        _write_error("No input received on stdin")
        return

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        _write_error(f"Invalid JSON on stdin: {exc}")
        return

    action = payload.get("action", "")

    if action == "get_config":
        handle_get_config()
    elif action == "run_scan":
        handle_run_scan(payload)
    else:
        _write_error(f"Unknown action: '{action}'. Supported: run_scan, get_config")


if __name__ == "__main__":
    main()
