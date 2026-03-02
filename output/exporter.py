"""
CSV export and terminal summary display.

Generates a CSV file with new leads from the current run and displays
a formatted summary to the terminal with tier counts and top hot leads.
"""

from __future__ import annotations

import csv
import os
import re
import sys
from typing import Any


# ---------------------------------------------------------------------------
# Website-status labels (for the terminal summary)
# ---------------------------------------------------------------------------

_STATUS_LABELS: dict[str, str] = {
    "no_website": "NO WEBSITE",
    "dead": "DEAD SITE",
    "parked": "PARKED DOMAIN",
    "facebook_only": "FACEBOOK ONLY",
    "placeholder": "PLACEHOLDER",
    "poor": "POOR QUALITY SITE",
    "adequate": "ADEQUATE SITE",
}

# Patterns used to detect the builder name embedded in free-tier URLs.
_FREE_TIER_BUILDERS: list[tuple[str, str]] = [
    ("wixsite", "Wix"),
    ("squarespace", "Squarespace"),
    ("weebly", "Weebly"),
    ("wordpress", "WordPress"),
    ("godaddysites", "GoDaddy"),
    ("carrd", "Carrd"),
]

# CSV column order
_CSV_COLUMNS: list[str] = [
    "name",
    "phone",
    "address",
    "city",
    "website_url",
    "website_status",
    "rating",
    "review_count",
    "lead_score",
    "lead_tier",
    "trade",
]


def _safe_print(text: str) -> None:
    """Print *text* to stdout, gracefully replacing characters that the
    terminal encoding cannot render (e.g. emojis on Windows cp1252).
    """
    try:
        print(text)
    except UnicodeEncodeError:
        encoded = text.encode(sys.stdout.encoding or "utf-8", errors="replace")
        print(encoded.decode(sys.stdout.encoding or "utf-8", errors="replace"))


# ---------------------------------------------------------------------------
# Phone formatting
# ---------------------------------------------------------------------------

def format_phone(phone: str | None) -> str:
    """Format a phone string as ``(XXX) XXX-XXXX`` when it contains
    exactly 10 digits.  Returns the raw string unchanged otherwise.

    Parameters
    ----------
    phone:
        A raw phone string, typically 10 digits with no separators, or
        ``None``.

    Returns
    -------
    str
        The formatted phone, or an empty string when *phone* is falsy.

    Examples
    --------
    >>> format_phone("7045551234")
    '(704) 555-1234'
    >>> format_phone("+1-704-555-1234")
    '+1-704-555-1234'
    >>> format_phone(None)
    ''
    """
    if not phone:
        return ""

    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"

    # Not exactly 10 digits -- return the original string as-is.
    return phone


# ---------------------------------------------------------------------------
# Status label
# ---------------------------------------------------------------------------

def _status_label(website_status: str | None, website_url: str | None) -> str:
    """Return a human-readable status label for the terminal summary.

    For ``free_tier`` status the builder name is detected from the URL
    and included in parentheses (e.g. ``"FREE TIER (Wix)"``).
    """
    if not website_status:
        return ""

    if website_status == "free_tier":
        builder = _detect_builder(website_url)
        if builder:
            return f"FREE TIER ({builder})"
        return "FREE TIER"

    return _STATUS_LABELS.get(website_status, website_status.upper())


def _detect_builder(url: str | None) -> str:
    """Detect the website-builder name from a URL string.

    Returns the human-friendly builder name (e.g. ``"Wix"``) or an empty
    string when no known builder is detected.
    """
    if not url:
        return ""
    url_lower = url.lower()
    for keyword, label in _FREE_TIER_BUILDERS:
        if keyword in url_lower:
            return label
    return ""


# ---------------------------------------------------------------------------
# CSV export
# ---------------------------------------------------------------------------

def export_csv(businesses: list[dict[str, Any]], filepath: str) -> str:
    """Write a CSV file containing the supplied business records.

    Parameters
    ----------
    businesses:
        A list of business dicts.  Keys should match the standard
        column names used throughout the pipeline.
    filepath:
        The destination file path.  Parent directories are created
        automatically if they do not exist.

    Returns
    -------
    str
        The absolute path of the written CSV file.
    """
    # Ensure the parent directory exists.
    parent = os.path.dirname(filepath)
    if parent:
        os.makedirs(parent, exist_ok=True)

    with open(filepath, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=_CSV_COLUMNS,
            extrasaction="ignore",
            quoting=csv.QUOTE_MINIMAL,
        )
        writer.writeheader()

        for biz in businesses:
            row = {col: biz.get(col, "") for col in _CSV_COLUMNS}

            # Format phone for human readability in the CSV.
            row["phone"] = format_phone(row.get("phone"))

            # Coerce None values to empty strings so the CSV is clean.
            for key in row:
                if row[key] is None:
                    row[key] = ""

            writer.writerow(row)

    return os.path.abspath(filepath)


# ---------------------------------------------------------------------------
# Terminal summary
# ---------------------------------------------------------------------------

def print_summary(
    businesses: list[dict[str, Any]],
    skipped_existing: int,
    skipped_franchise: int,
    trades: list[str],
    towns: list[str],
    csv_path: str,
) -> None:
    """Print a formatted run summary to the terminal.

    Parameters
    ----------
    businesses:
        The list of *new* leads added during this run (after dedup and
        franchise filtering).
    skipped_existing:
        Count of businesses that were already in the database.
    skipped_franchise:
        Count of businesses flagged as likely/definite franchise.
    trades:
        The trade keywords that were searched.
    towns:
        The town/city strings that were searched.
    csv_path:
        Path to the exported CSV file.
    """
    total = len(businesses) + skipped_existing
    new_count = len(businesses)

    # Tier counts
    hot_count = sum(1 for b in businesses if b.get("lead_tier") == "hot")
    warm_count = sum(1 for b in businesses if b.get("lead_tier") == "warm")
    cold_count = sum(1 for b in businesses if b.get("lead_tier") == "cold")
    skip_count = sum(1 for b in businesses if b.get("lead_tier") == "skip")

    trades_str = ", ".join(trades) if trades else "all trades"
    towns_str = ", ".join(towns) if towns else "all towns"

    print()
    print("=== Lead Generation Complete ===")
    print(f"Search: {trades_str} in {towns_str}")
    print()
    print(f"Found {total} businesses total")
    print(f"  - {skipped_existing} already in database (skipped)")
    print(f"  - {skipped_franchise} flagged as franchise (penalized)")
    print()
    print(f"New leads processed: {new_count}")
    _safe_print(f"  \U0001f525 Hot (12+):  {hot_count}")
    _safe_print(f"  \U0001f7e1 Warm (8-11): {warm_count}")
    _safe_print(f"  \U0001f535 Cold (5-7):  {cold_count}")
    _safe_print(f"  \u26aa Skip (<5):   {skip_count}")

    # Top 5 hot leads (sorted by lead_score descending)
    hot_leads = [b for b in businesses if b.get("lead_tier") == "hot"]
    hot_leads.sort(key=lambda b: b.get("lead_score", 0), reverse=True)
    top_leads = hot_leads[:5]

    if top_leads:
        print()
        print("Top 5 hot leads:")
        for idx, lead in enumerate(top_leads, start=1):
            score = lead.get("lead_score", 0)
            name = lead.get("name", "Unknown")
            phone = format_phone(lead.get("phone"))
            status = _status_label(
                lead.get("website_status"),
                lead.get("website_url"),
            )

            detail_parts: list[str] = []
            if phone:
                detail_parts.append(phone)
            if status:
                detail_parts.append(status)

            line = f"[{score} pts] {name}"
            if detail_parts:
                line += " -- " + " -- ".join(detail_parts)

            print(f"  {idx}. {line}")

    print()
    print(f"Exported to: {csv_path}")
    print()
