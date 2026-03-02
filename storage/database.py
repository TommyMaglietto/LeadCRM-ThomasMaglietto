"""
SQLite database for persistent lead storage across runs.

Creates and manages a local SQLite database that stores all discovered
businesses with their enrichment data. Handles deduplication on insert,
refresh logic, and protects user-managed fields (outreach_status, notes).
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Any

import config

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

_CREATE_TABLE = """\
CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_place_id TEXT UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    website_url TEXT,
    website_status TEXT,
    google_rating REAL,
    google_review_count INTEGER,
    has_yelp TEXT DEFAULT 'unknown',
    yelp_url TEXT,
    franchise_score INTEGER DEFAULT 0,
    franchise_flag TEXT DEFAULT 'none',
    lead_score INTEGER DEFAULT 0,
    lead_tier TEXT DEFAULT 'skip',
    trades TEXT,
    outreach_status TEXT DEFAULT 'new',
    notes TEXT,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_enriched DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

_CREATE_INDEX_PLACE_ID = (
    "CREATE INDEX IF NOT EXISTS idx_businesses_place_id "
    "ON businesses(google_place_id);"
)
_CREATE_INDEX_PHONE = (
    "CREATE INDEX IF NOT EXISTS idx_businesses_phone "
    "ON businesses(phone);"
)
_CREATE_INDEX_TIER = (
    "CREATE INDEX IF NOT EXISTS idx_businesses_lead_tier "
    "ON businesses(lead_tier);"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")



def _append_trades(existing_trades: str | None, new_trade: str) -> str:
    """Merge *new_trade* into the comma-separated *existing_trades* string
    without introducing duplicates.

    Parameters
    ----------
    existing_trades:
        Comma-separated trade string already stored in the database,
        or ``None`` / empty string when no trades are recorded yet.
    new_trade:
        A single trade (or comma-separated list) to append.

    Returns
    -------
    str
        The merged, deduplicated, comma-separated trades string.

    Examples
    --------
    >>> _append_trades("plumber", "HVAC")
    'plumber,HVAC'
    >>> _append_trades("plumber,HVAC", "plumber")
    'plumber,HVAC'
    >>> _append_trades(None, "roofer")
    'roofer'
    """
    seen: set[str] = set()
    merged: list[str] = []

    parts: list[str] = []
    if existing_trades:
        parts.extend(existing_trades.split(","))
    if new_trade:
        parts.extend(new_trade.split(","))

    for trade in parts:
        trade = trade.strip()
        if trade and trade not in seen:
            seen.add(trade)
            merged.append(trade)

    return ",".join(merged)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def init_db(db_path: str | None = None) -> sqlite3.Connection:
    """Create the database file and ``businesses`` table if they do not exist.

    Parameters
    ----------
    db_path:
        Filesystem path for the SQLite database.  Falls back to
        ``config.DB_PATH`` (``"leads.db"``) when not provided.

    Returns
    -------
    sqlite3.Connection
        An open connection with ``row_factory`` set to ``sqlite3.Row``
        so that rows behave like both tuples and dicts.
    """
    if db_path is None:
        db_path = config.DB_PATH

    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")

    conn.execute(_CREATE_TABLE)
    conn.execute(_CREATE_INDEX_PLACE_ID)
    conn.execute(_CREATE_INDEX_PHONE)
    conn.execute(_CREATE_INDEX_TIER)
    conn.commit()

    return conn


def find_existing(
    conn: sqlite3.Connection,
    google_place_id: str | None = None,
    phone: str | None = None,
) -> dict[str, Any] | None:
    """Look up an existing business record by place ID or phone number.

    The lookup order is:

    1. ``google_place_id`` -- the authoritative Google identifier.
    2. ``phone`` -- a fallback that catches the same real-world business
       listed under a different Google place ID.

    Parameters
    ----------
    conn:
        An open database connection returned by :func:`init_db`.
    google_place_id:
        The Google Places ``place_id`` string.
    phone:
        A normalised 10-digit phone string.

    Returns
    -------
    dict | None
        The matching row as a dict, or ``None`` when no match is found.
    """
    if google_place_id:
        row = conn.execute(
            "SELECT * FROM businesses WHERE google_place_id = ?",
            (google_place_id,),
        ).fetchone()
        if row:
            return dict(row)

    if phone:
        row = conn.execute(
            "SELECT * FROM businesses WHERE phone = ?",
            (phone,),
        ).fetchone()
        if row:
            return dict(row)

    return None


def insert_business(conn: sqlite3.Connection, business: dict[str, Any]) -> bool:
    """Insert a new business row into the database.

    If a row with the same ``google_place_id`` already exists, the insert
    is silently skipped (the caller should use :func:`update_enrichment`
    for existing records).

    Parameters
    ----------
    conn:
        An open database connection.
    business:
        A dict with keys that map to column names.  At minimum ``name``
        must be present.  The ``place_id`` key (from the discovery module)
        is mapped to the ``google_place_id`` column automatically.

    Returns
    -------
    bool
        ``True`` if a new row was inserted, ``False`` if the business
        already existed (duplicate ``google_place_id``).
    """
    now = _now_iso()

    # Map discovery-pipeline key names to database column names.
    place_id = business.get("google_place_id") or business.get("place_id")

    # Guard against duplicates before attempting the insert.
    if place_id:
        existing = conn.execute(
            "SELECT id FROM businesses WHERE google_place_id = ?",
            (place_id,),
        ).fetchone()
        if existing:
            return False

    if not place_id and business.get("phone"):
        existing = conn.execute(
            "SELECT id FROM businesses WHERE phone = ?",
            (business["phone"],),
        ).fetchone()
        if existing:
            return False

    try:
        conn.execute(
            """\
            INSERT INTO businesses (
                google_place_id, name, phone, address, city, state,
                website_url, website_status,
                google_rating, google_review_count,
                has_yelp, yelp_url,
                franchise_score, franchise_flag,
                lead_score, lead_tier,
                trades, outreach_status, notes,
                first_seen, last_enriched, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?
            )
            """,
            (
                place_id,
                business.get("name"),
                business.get("phone"),
                business.get("address"),
                business.get("city"),
                business.get("state"),
                business.get("website_url"),
                business.get("website_status"),
                business["google_rating"] if "google_rating" in business else business.get("rating"),
                business["google_review_count"] if "google_review_count" in business else business.get("review_count"),
                business.get("has_yelp", "unknown"),
                business.get("yelp_url"),
                business.get("franchise_score", 0),
                business.get("franchise_flag", "none"),
                business.get("lead_score", 0),
                business.get("lead_tier", "skip"),
                business.get("trades") or business.get("trade"),
                business.get("outreach_status", "new"),
                business.get("notes"),
                now,  # first_seen
                now,  # last_enriched
                now,  # created_at
                now,  # updated_at
            ),
        )
        return True
    except sqlite3.IntegrityError:
        # Concurrent insert or constraint violation -- treat as duplicate.
        return False


def update_enrichment(conn: sqlite3.Connection, business: dict[str, Any]) -> None:
    """Update enrichment-related columns for an existing business.

    This function deliberately does **not** modify ``outreach_status`` or
    ``notes`` -- those are user-managed fields that must be preserved
    across enrichment refreshes.

    The ``trades`` column is *appended* (merged) rather than overwritten
    so that multi-trade discoveries accumulate over runs.

    Parameters
    ----------
    conn:
        An open database connection.
    business:
        A dict containing at least ``google_place_id`` (or ``place_id``)
        to identify the row, plus any enrichment fields to update.
    """
    place_id = business.get("google_place_id") or business.get("place_id")
    if not place_id:
        return

    # Fetch current trades so we can merge rather than overwrite.
    row = conn.execute(
        "SELECT trades FROM businesses WHERE google_place_id = ?",
        (place_id,),
    ).fetchone()
    if row is None:
        return

    existing_trades = row["trades"] if row["trades"] else None
    new_trade = business.get("trades") or business.get("trade") or ""
    merged_trades = _append_trades(existing_trades, new_trade)

    now = _now_iso()

    conn.execute(
        """\
        UPDATE businesses SET
            website_url     = COALESCE(?, website_url),
            website_status  = COALESCE(?, website_status),
            google_rating   = COALESCE(?, google_rating),
            google_review_count = COALESCE(?, google_review_count),
            has_yelp        = COALESCE(?, has_yelp),
            yelp_url        = COALESCE(?, yelp_url),
            franchise_score = ?,
            franchise_flag  = ?,
            lead_score      = ?,
            lead_tier       = ?,
            trades          = ?,
            last_enriched   = ?,
            updated_at      = ?
        WHERE google_place_id = ?
        """,
        (
            business.get("website_url"),
            business.get("website_status"),
            business["google_rating"] if "google_rating" in business else business.get("rating"),
            business["google_review_count"] if "google_review_count" in business else business.get("review_count"),
            business.get("has_yelp"),
            business.get("yelp_url"),
            business.get("franchise_score", 0),
            business.get("franchise_flag", "none"),
            business.get("lead_score", 0),
            business.get("lead_tier", "skip"),
            merged_trades,
            now,
            now,
            place_id,
        ),
    )


def get_businesses_for_refresh(
    conn: sqlite3.Connection,
    google_place_ids: list[str],
) -> list[dict[str, Any]]:
    """Return existing rows whose ``google_place_id`` is in *google_place_ids*.

    This is used by the scan pipeline to decide which businesses already
    exist in the database and may need their enrichment data refreshed
    rather than a fresh insert.

    Parameters
    ----------
    conn:
        An open database connection.
    google_place_ids:
        A list of Google place-ID strings to look up.

    Returns
    -------
    list[dict]
        A list of matching rows as plain dicts.  May be shorter than the
        input list if some IDs are not yet in the database.
    """
    if not google_place_ids:
        return []

    # SQLite has a default SQLITE_MAX_VARIABLE_NUMBER of 999.
    # Process in batches to stay safely under that limit.
    batch_size = 900
    results: list[dict[str, Any]] = []

    for start in range(0, len(google_place_ids), batch_size):
        batch = google_place_ids[start : start + batch_size]
        placeholders = ",".join("?" for _ in batch)
        query = (
            f"SELECT google_place_id FROM businesses "
            f"WHERE google_place_id IN ({placeholders})"
        )
        rows = conn.execute(query, batch).fetchall()
        for row in rows:
            results.append(dict(row))

    return results
