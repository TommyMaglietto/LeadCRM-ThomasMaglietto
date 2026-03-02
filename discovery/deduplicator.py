"""
Deduplicates businesses found across multiple trade x town searches.

Primary key: google_place_id.  Secondary: normalised phone number.
When duplicates are found the records are merged -- in particular the
``trade`` field is combined (e.g. ``"plumber,HVAC"``).
"""

from __future__ import annotations

import re
from typing import Any


# ---------------------------------------------------------------------------
# Phone normalisation (public -- used by other modules too)
# ---------------------------------------------------------------------------

def normalize_phone(phone: str | None) -> str | None:
    """Strip *phone* to digits and return the last 10.

    Returns ``None`` when the input is falsy or contains fewer than 10 digits.

    Examples
    --------
    >>> normalize_phone("(704) 555-1234")
    '7045551234'
    >>> normalize_phone("+1-704-555-1234")
    '7045551234'
    >>> normalize_phone("555-12")  # too short
    >>> normalize_phone(None)
    """
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 10:
        return None
    return digits[-10:]


# ---------------------------------------------------------------------------
# Merge helpers
# ---------------------------------------------------------------------------

def _merge_trades(existing: str, incoming: str) -> str:
    """Combine two comma-separated trade strings, preserving order and
    removing duplicates.

    >>> _merge_trades("plumber", "HVAC")
    'plumber,HVAC'
    >>> _merge_trades("plumber,HVAC", "plumber")
    'plumber,HVAC'
    """
    seen: set[str] = set()
    merged: list[str] = []
    for trade in existing.split(",") + incoming.split(","):
        trade = trade.strip()
        if trade and trade not in seen:
            seen.add(trade)
            merged.append(trade)
    return ",".join(merged)


def _filled_field_count(biz: dict[str, Any]) -> int:
    """Count how many 'interesting' fields have a non-empty value.

    Used to decide which duplicate record carries more useful data.
    """
    fields = ("name", "address", "phone", "website_url", "rating", "review_count")
    count = 0
    for field in fields:
        value = biz.get(field)
        if value is not None and value != "" and value != []:
            count += 1
    return count


def _merge_records(keep: dict[str, Any], discard: dict[str, Any]) -> dict[str, Any]:
    """Merge *discard* into *keep*, combining trades and back-filling blanks.

    The record with more filled fields is treated as the base (``keep``).
    """
    # Always combine trades regardless of which record is richer.
    keep_trade = keep.get("trade", "")
    discard_trade = discard.get("trade", "")
    merged_trade = _merge_trades(keep_trade, discard_trade)

    # Start from the richer record.
    if _filled_field_count(discard) > _filled_field_count(keep):
        base = {**discard}
        supplement = keep
    else:
        base = {**keep}
        supplement = discard

    # Back-fill: for any field that is blank in base but present in supplement,
    # pull the value from supplement.
    for key, value in supplement.items():
        if key == "trade":
            continue  # handled separately
        base_value = base.get(key)
        if (base_value is None or base_value == "" or base_value == []) and value:
            base[key] = value

    base["trade"] = merged_trade
    return base


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def deduplicate(businesses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Remove duplicate business records and merge their metadata.

    Deduplication proceeds in two passes:

    1. **Place ID pass** -- exact match on ``place_id``.  This is the
       authoritative Google identifier and catches the same listing found
       across different trade searches.
    2. **Phone pass** -- match on the normalised 10-digit phone number.
       This catches the same real-world business that has slightly different
       Google listings (e.g. different place IDs but the same phone).

    When duplicates are found the ``trade`` fields are combined and the
    record with more filled-in data is kept as the base.

    Parameters
    ----------
    businesses:
        A flat list of business dicts, typically the concatenated output of
        multiple :func:`discovery.google_places.search_businesses` calls.

    Returns
    -------
    list[dict]
        Deduplicated list.  Order follows first-seen for each unique business.
    """
    if not businesses:
        return []

    # ---- Pass 1: dedupe on place_id ----
    by_place_id: dict[str, dict[str, Any]] = {}
    order_place: list[str] = []  # preserve insertion order

    for biz in businesses:
        pid = biz.get("place_id")
        if not pid:
            # No place_id -- keep unconditionally (will still go through
            # the phone pass).
            fake_key = f"__no_pid_{id(biz)}"
            by_place_id[fake_key] = biz
            order_place.append(fake_key)
            continue

        if pid in by_place_id:
            by_place_id[pid] = _merge_records(by_place_id[pid], biz)
        else:
            by_place_id[pid] = {**biz}  # shallow copy
            order_place.append(pid)

    after_place_pass = [by_place_id[key] for key in order_place]

    # ---- Pass 2: dedupe on normalised phone ----
    by_phone: dict[str, dict[str, Any]] = {}
    order_phone: list[str] = []  # preserve insertion order
    no_phone: list[dict[str, Any]] = []

    for biz in after_place_pass:
        norm = normalize_phone(biz.get("phone"))
        if norm is None:
            no_phone.append(biz)
            continue

        if norm in by_phone:
            by_phone[norm] = _merge_records(by_phone[norm], biz)
        else:
            by_phone[norm] = {**biz}
            order_phone.append(norm)

    after_phone_pass = [by_phone[key] for key in order_phone]

    result = after_phone_pass + no_phone

    deduped_count = len(businesses) - len(result)
    if deduped_count > 0:
        print(f"  Deduplication removed {deduped_count} duplicate(s), {len(result)} unique businesses remain.")

    return result
