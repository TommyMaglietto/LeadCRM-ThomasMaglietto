"""
Yelp presence detection via DuckDuckGo search + constructed URL fallback.

Checks whether each business has a Yelp listing. A business on Yelp but
with no website is a prime prospect. This does NOT use the paid Yelp API.

Strategy:
1. Primary: DuckDuckGo search for '"{name}" {city} site:yelp.com'
2. Fallback: Construct Yelp slug URL and check with HEAD request
"""

from __future__ import annotations

import asyncio
import re
import sys
from typing import Any

import aiohttp

from config import USER_AGENT, YELP_SEARCH_DELAY

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_DDG_HTML_URL = "https://html.duckduckgo.com/html/"
_YELP_BIZ_BASE = "https://www.yelp.com/biz/"
_REQUEST_TIMEOUT = 15  # generous timeout for external search engines
_CONCURRENT_CONNECTIONS = 5  # conservative for search-engine queries


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_yelp_slug(name: str, city: str) -> str:
    """Construct a plausible Yelp business slug.

    Example::

        >>> _build_yelp_slug("Bob's Plumbing", "Huntersville")
        'bobs-plumbing-huntersville'
    """
    raw = f"{name} {city}".lower()
    # Replace any non-alphanumeric character with a hyphen.
    slug = re.sub(r"[^a-z0-9]+", "-", raw)
    # Strip leading/trailing hyphens and collapse consecutive hyphens.
    slug = re.sub(r"-{2,}", "-", slug).strip("-")
    return slug


def _extract_yelp_url(html: str) -> str | None:
    """Search *html* for the first URL containing ``yelp.com/biz/``.

    Returns the full URL or ``None`` if nothing matched.
    """
    # DuckDuckGo's HTML results embed links in various forms.  We look for
    # any href or plain-text URL containing the /biz/ path.
    match = re.search(r'https?://[^\s"\'<>]*yelp\.com/biz/[^\s"\'<>&]+', html)
    if match:
        url = match.group(0)
        # Clean up common trailing artefacts.
        url = url.rstrip(")")
        return url
    return None


# ---------------------------------------------------------------------------
# Per-business check
# ---------------------------------------------------------------------------

async def _check_one(
    session: aiohttp.ClientSession,
    semaphore: asyncio.Semaphore,
    business: dict[str, Any],
) -> dict[str, Any]:
    """Check Yelp presence for a single business.

    Updates *business* in place with ``has_yelp`` and ``yelp_url`` keys.
    """
    name: str = business.get("name", "").strip()
    # Use the city key injected by find_leads.py, falling back to address parsing.
    city: str = business.get("city", "").strip()
    if not city:
        address: str = business.get("address", "")
        if address:
            parts = [p.strip() for p in address.split(",")]
            if len(parts) >= 3:
                # Format: "123 Main St, Huntersville, NC 28078"
                city = parts[-2].strip()
                city = re.sub(r"\b[A-Z]{2}\s*\d{5}(-\d{4})?\b", "", city).strip()
            elif len(parts) >= 2:
                city = parts[1].strip()
                city = re.sub(r"\b[A-Z]{2}\s*\d{5}(-\d{4})?\b", "", city).strip()

    if not name:
        business["has_yelp"] = "unknown"
        business["yelp_url"] = None
        return business

    # ------------------------------------------------------------------
    # Strategy 1: Constructed slug URL + HEAD request (FAST, no rate limit)
    # ------------------------------------------------------------------
    slug = _build_yelp_slug(name, city)
    constructed_url = f"{_YELP_BIZ_BASE}{slug}"
    head_failed = False

    try:
        async with session.head(
            constructed_url,
            timeout=aiohttp.ClientTimeout(total=5),
            allow_redirects=True,
        ) as resp:
            if resp.status == 200:
                business["has_yelp"] = "true"
                business["yelp_url"] = constructed_url
                return business
            # 404, 301-to-something-else, etc. -- fall through to DDG.
    except (
        aiohttp.ClientError,
        asyncio.TimeoutError,
        OSError,
    ):
        head_failed = True

    # ------------------------------------------------------------------
    # Strategy 2: DuckDuckGo HTML search (slower, rate-limited fallback)
    # ------------------------------------------------------------------
    ddg_success = False
    async with semaphore:
        try:
            query = f'"{name}" {city} site:yelp.com'
            async with session.get(
                _DDG_HTML_URL,
                params={"q": query},
                timeout=aiohttp.ClientTimeout(total=_REQUEST_TIMEOUT),
                allow_redirects=True,
            ) as resp:
                if resp.status == 200:
                    body = await resp.text()
                    yelp_url = _extract_yelp_url(body)
                    if yelp_url:
                        business["has_yelp"] = "true"
                        business["yelp_url"] = yelp_url
                        await asyncio.sleep(YELP_SEARCH_DELAY)
                        return business
                    # No /biz/ URL in results.
                    ddg_success = True

            # Throttle to be polite.
            await asyncio.sleep(YELP_SEARCH_DELAY)

        except (
            aiohttp.ClientError,
            asyncio.TimeoutError,
            OSError,
        ):
            # DuckDuckGo unreachable.
            pass

    # ------------------------------------------------------------------
    # Neither method confirmed a listing.
    # ------------------------------------------------------------------
    if ddg_success:
        business["has_yelp"] = "false"
    else:
        business["has_yelp"] = "unknown"

    business["yelp_url"] = None
    return business


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def check_yelp_presence(
    businesses: list[dict[str, Any]],
    progress_callback: Any = None,
) -> list[dict[str, Any]]:
    """Detect Yelp listings for every business in *businesses*.

    Each dict is updated **in place** with:

    - ``has_yelp``: ``"true"``, ``"false"``, or ``"unknown"``
    - ``yelp_url``: The Yelp listing URL if found, otherwise ``None``

    Parameters
    ----------
    businesses:
        A list of business dicts.  Each should have at least ``name`` and
        ``address`` keys.
    progress_callback:
        Optional callable ``(phase: str, done: int, total: int) -> None``.
        When provided, called after each item completes instead of printing
        dots to stdout.

    Returns
    -------
    list[dict]
        The same list, with ``has_yelp`` and ``yelp_url`` added to every
        entry.
    """
    if not businesses:
        return businesses

    total = len(businesses)
    completed = 0

    connector = aiohttp.TCPConnector(limit=_CONCURRENT_CONNECTIONS)
    headers = {"User-Agent": USER_AGENT}
    # DuckDuckGo rate-limiting: allow only one search at a time via semaphore
    # so the delay between requests is respected.
    semaphore = asyncio.Semaphore(3)

    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:

        async def _check_and_report(biz: dict[str, Any]) -> dict[str, Any]:
            nonlocal completed
            result = await _check_one(session, semaphore, biz)
            completed += 1
            if progress_callback is not None:
                progress_callback("yelp", completed, total)
            else:
                if completed % 10 == 0 or completed == total:
                    sys.stdout.write(f" [{completed}/{total}]")
                    sys.stdout.flush()
                else:
                    sys.stdout.write(".")
                    sys.stdout.flush()
            return result

        if progress_callback is None:
            print(f"  Checking Yelp presence for {total} businesses...", end="", flush=True)
        tasks = [_check_and_report(biz) for biz in businesses]
        results = await asyncio.gather(*tasks)
        if progress_callback is None:
            print()  # Newline after progress.

    return results
