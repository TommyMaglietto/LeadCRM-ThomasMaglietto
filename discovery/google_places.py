"""
Google Places Text Search API integration.

Uses Text Search (New) to find businesses by natural language query like
"plumber in Huntersville NC". This is NOT Nearby Search -- Text Search
accepts any string and is not limited to predefined type categories.

API: POST https://places.googleapis.com/v1/places:searchText
Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Callable

import httpx

from discovery.deduplicator import normalize_phone

_API_URL = "https://places.googleapis.com/v1/places:searchText"

_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.types",
        "places.businessStatus",
    ]
)

_MAX_PAGES = 3
_MAX_RESULTS_PER_PAGE = 20
_PAGE_TOKEN_DELAY_SECONDS = 2


# ---------------------------------------------------------------------------
# Single-place normaliser
# ---------------------------------------------------------------------------

def _normalize_place(place: dict[str, Any], trade: str) -> dict[str, Any]:
    """Convert a raw Places API response object into a flat dict with
    consistent key names used throughout the rest of the pipeline.
    """
    display_name = place.get("displayName") or {}
    return {
        "place_id": place.get("id"),
        "name": display_name.get("text") if isinstance(display_name, dict) else str(display_name),
        "address": place.get("formattedAddress"),
        "phone": normalize_phone(place.get("nationalPhoneNumber")),
        "website_url": place.get("websiteUri"),
        "rating": place.get("rating"),
        "review_count": place.get("userRatingCount"),
        "types": place.get("types", []),
        "trade": trade,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def search_businesses(api_key: str, trade: str, town: str) -> list[dict[str, Any]]:
    """Search Google Places Text Search for *trade* businesses in *town*.

    Parameters
    ----------
    api_key:
        A valid Google Maps Platform API key with the Places API (New) enabled.
    trade:
        The trade or business category to search for (e.g. ``"plumber"``).
    town:
        The town/city string (e.g. ``"Huntersville NC"``).

    Returns
    -------
    list[dict]
        A list of normalised business dicts.  Returns an empty list when the
        API call fails or yields no results.
    """
    query = f"{trade} in {town}"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": _FIELD_MASK,
    }

    all_places: list[dict[str, Any]] = []
    next_page_token: str | None = None

    for page in range(_MAX_PAGES):
        body: dict[str, Any] = {
            "textQuery": query,
            "maxResultCount": _MAX_RESULTS_PER_PAGE,
        }
        if next_page_token is not None:
            body["pageToken"] = next_page_token

        try:
            response = httpx.post(
                _API_URL,
                headers=headers,
                json=body,
                timeout=30.0,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            print(
                f"  WARNING: Google Places API returned HTTP {exc.response.status_code} "
                f"for query '{query}' (page {page + 1}). Stopping pagination."
            )
            break
        except httpx.RequestError as exc:
            print(
                f"  WARNING: Network error querying Google Places for '{query}': {exc}"
            )
            break

        data = response.json()
        places = data.get("places", [])

        for raw_place in places:
            # Filter out permanently closed businesses.
            if raw_place.get("businessStatus") == "CLOSED_PERMANENTLY":
                continue
            all_places.append(_normalize_place(raw_place, trade))

        next_page_token = data.get("nextPageToken")
        if not next_page_token:
            break

        # The API requires a short delay before using a page token.
        time.sleep(_PAGE_TOKEN_DELAY_SECONDS)

    return all_places


# ---------------------------------------------------------------------------
# Async parallel discovery
# ---------------------------------------------------------------------------

async def _async_search_one(
    client: httpx.AsyncClient,
    api_key: str,
    trade: str,
    town: str,
) -> list[dict[str, Any]]:
    """Async version of search_businesses using a shared client."""
    query = f"{trade} in {town}"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": _FIELD_MASK,
    }

    all_places: list[dict[str, Any]] = []
    next_page_token: str | None = None

    for page in range(_MAX_PAGES):
        body: dict[str, Any] = {
            "textQuery": query,
            "maxResultCount": _MAX_RESULTS_PER_PAGE,
        }
        if next_page_token is not None:
            body["pageToken"] = next_page_token

        try:
            response = await client.post(
                _API_URL,
                headers=headers,
                json=body,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            print(
                f"  WARNING: Google Places API returned HTTP {exc.response.status_code} "
                f"for query '{query}' (page {page + 1}). Stopping pagination.",
            )
            break
        except httpx.RequestError as exc:
            print(
                f"  WARNING: Network error querying Google Places for '{query}': {exc}",
            )
            break

        data = response.json()
        places = data.get("places", [])

        for raw_place in places:
            if raw_place.get("businessStatus") == "CLOSED_PERMANENTLY":
                continue
            all_places.append(_normalize_place(raw_place, trade))

        next_page_token = data.get("nextPageToken")
        if not next_page_token:
            break

        await asyncio.sleep(_PAGE_TOKEN_DELAY_SECONDS)

    return all_places


async def async_search_all(
    api_key: str,
    combos: list[tuple[str, str, str, str]],
    max_concurrent: int = 5,
    on_progress: Callable[[str, str, int, int, int], None] | None = None,
) -> list[dict[str, Any]]:
    """Search all trade/town combos concurrently.

    Parameters
    ----------
    api_key:
        Google Maps Platform API key.
    combos:
        List of ``(trade, town, city, state)`` tuples to search.
        ``city`` and ``state`` are injected into each result dict.
    max_concurrent:
        Maximum number of concurrent Google Places API searches.
    on_progress:
        Optional callback ``(trade, town, found_count, done, total) -> None``.

    Returns
    -------
    list[dict]
        Concatenated results from all searches, with city/state set.
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    all_results: list[dict[str, Any]] = []
    lock = asyncio.Lock()
    done = 0

    async def _search(trade: str, town: str, city: str, state: str) -> None:
        nonlocal done
        async with semaphore:
            results = await _async_search_one(client, api_key, trade, town)
        # Inject city/state into each result.
        for biz in results:
            biz.setdefault("city", city)
            biz.setdefault("state", state)
        async with lock:
            all_results.extend(results)
            done += 1
            if on_progress:
                on_progress(trade, town, len(results), done, len(combos))

    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = [_search(t, tw, c, s) for t, tw, c, s in combos]
        await asyncio.gather(*tasks)

    return all_results
