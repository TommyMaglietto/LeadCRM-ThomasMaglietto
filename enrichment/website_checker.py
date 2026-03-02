"""
Async website quality checker.

For every business with a website URL, performs real HTTP checks to classify
the website as: no_website, dead, parked, facebook_only, placeholder,
poor, free_tier, or adequate.

Uses aiohttp for concurrent checks (30+ URLs at once, 10s timeout each).
"""

from __future__ import annotations

import asyncio
import re
import sys
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

import aiohttp

from config import (
    DIRECTORY_DOMAINS,
    FREE_TIER_SUBDOMAINS,
    MAX_REDIRECTS,
    PARKED_MARKERS,
    USER_AGENT,
    WEBSITE_TIMEOUT,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_MAX_BODY_BYTES = 100 * 1024  # Read at most 100 KB of the response body
_CONCURRENT_CONNECTIONS = 30

_PLACEHOLDER_MARKERS: list[str] = [
    "coming soon",
    "under construction",
    "site is being built",
    "launching soon",
    "check back later",
]

# Parked markers that are distinct from placeholder markers.  The config
# ``PARKED_MARKERS`` list may include some overlap (e.g. "coming soon"),
# but for classification we separate them.  We build the parked-only list
# by excluding anything that already appears in _PLACEHOLDER_MARKERS.
_PARKED_ONLY_MARKERS: list[str] = [
    m for m in PARKED_MARKERS if m not in _PLACEHOLDER_MARKERS
]

_MIN_VISIBLE_TEXT_BYTES = 512  # < 512 bytes of visible text => parked

# Pre-compiled regex patterns (avoids recompilation per business).
_RE_SCRIPT_STYLE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
_RE_TAGS = re.compile(r"<[^>]+>")
_RE_WHITESPACE = re.compile(r"\s+")
_RE_COPYRIGHT = re.compile(r"(?:copyright|&copy;|\u00a9)\s*(?:\d{4}\s*[-\u2013]\s*)?(\d{4})")
_RE_OLD_JQUERY = re.compile(r"jquery[/.-]1\.\d+")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_visible_text(html: str) -> str:
    """Crude extraction of visible text from HTML.

    Strips ``<script>``, ``<style>``, and all other tags, then collapses
    whitespace.  Good enough for a size heuristic -- not meant to be
    a full text extractor.
    """
    # Remove script and style blocks entirely.
    text = _RE_SCRIPT_STYLE.sub("", html)
    # Strip remaining tags.
    text = _RE_TAGS.sub(" ", text)
    # Collapse whitespace.
    text = _RE_WHITESPACE.sub(" ", text).strip()
    return text


def _is_directory_domain(url: str) -> bool:
    """Return True when *url* is hosted on a known directory/social domain."""
    try:
        hostname = urlparse(url).hostname or ""
    except Exception:
        return False
    hostname = hostname.lower()
    if hostname.startswith("www."):
        hostname = hostname[4:]
    for domain in DIRECTORY_DOMAINS:
        if hostname == domain or hostname.endswith("." + domain):
            return True
    return False


def _is_facebook_url(url: str) -> bool:
    """Return True when *url* points to Facebook."""
    try:
        hostname = urlparse(url).hostname or ""
    except Exception:
        return False
    return "facebook.com" in hostname.lower()


def _is_free_tier(url: str) -> bool:
    """Return True when *url* hostname matches a free-tier subdomain."""
    try:
        hostname = urlparse(url).hostname or ""
    except Exception:
        return False
    hostname = hostname.lower()
    return any(hostname.endswith(suffix) for suffix in FREE_TIER_SUBDOMAINS)


def _count_neglect_signals(url: str, html: str, final_url: str) -> int:
    """Count neglect signals present in the page.

    Signals checked:
    1. No SSL -- original URL is http:// and final URL is also http://.
    2. Missing viewport ``<meta>`` tag (not mobile-friendly).
    3. Copyright year is 3+ years old.
    4. Contains Flash references (``swfobject``, ``.swf``).
    5. Very old jQuery (version 1.x).
    """
    signals = 0
    html_lower = html.lower()

    # 1. No SSL
    if url.startswith("http://") and final_url.startswith("http://"):
        signals += 1

    # 2. Missing viewport meta tag
    if 'name="viewport"' not in html_lower and "name='viewport'" not in html_lower:
        signals += 1

    # 3. Copyright year 3+ years old
    current_year = datetime.now().year
    copyright_years = _RE_COPYRIGHT.findall(html_lower)
    if copyright_years:
        try:
            most_recent = max(int(y) for y in copyright_years)
            if current_year - most_recent >= 3:
                signals += 1
        except ValueError:
            pass

    # 4. Flash references
    if "swfobject" in html_lower or ".swf" in html_lower:
        signals += 1

    # 5. Very old jQuery (1.x)
    if _RE_OLD_JQUERY.search(html_lower):
        signals += 1

    return signals


# ---------------------------------------------------------------------------
# Core: check a single URL
# ---------------------------------------------------------------------------

async def _check_one(
    session: aiohttp.ClientSession,
    business: dict[str, Any],
) -> dict[str, Any]:
    """Check one business's website and return the business dict with
    ``website_status`` set.
    """
    url: str | None = business.get("website_url")

    # --- no_website: empty URL ---
    if not url or not url.strip():
        business["website_status"] = "no_website"
        return business

    url = url.strip()

    # Ensure the URL has a scheme.
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    # --- facebook_only: URL itself is Facebook (before fetching) ---
    # Checked before directory-domain so facebook.com is classified as
    # "facebook_only" rather than the less specific "no_website".
    if _is_facebook_url(url):
        business["website_status"] = "facebook_only"
        return business

    # --- no_website: directory domain ---
    if _is_directory_domain(url):
        business["website_status"] = "no_website"
        return business

    # --- Attempt HTTP GET ---
    try:
        async with session.get(
            url,
            allow_redirects=True,
            max_redirects=MAX_REDIRECTS,
            timeout=aiohttp.ClientTimeout(total=WEBSITE_TIMEOUT),
            ssl=False,  # Accept any cert; we note SSL status separately.
        ) as resp:
            final_url = str(resp.url)
            status = resp.status

            # --- facebook_only: redirect landed on Facebook ---
            if _is_facebook_url(final_url):
                business["website_status"] = "facebook_only"
                return business

            # --- dead: 4xx / 5xx ---
            if status >= 400:
                business["website_status"] = "dead"
                return business

            # Read body (capped)
            body_bytes = await resp.content.read(_MAX_BODY_BYTES)
            try:
                html = body_bytes.decode("utf-8", errors="replace")
            except Exception:
                html = body_bytes.decode("latin-1", errors="replace")

    except (
        aiohttp.ClientError,
        asyncio.TimeoutError,
        OSError,
        UnicodeDecodeError,
    ):
        business["website_status"] = "dead"
        return business

    html_lower = html.lower()

    # --- parked: marker strings ---
    for marker in _PARKED_ONLY_MARKERS:
        if marker in html_lower:
            business["website_status"] = "parked"
            return business

    # --- placeholder: specific marker strings (check before tiny-text) ---
    for marker in _PLACEHOLDER_MARKERS:
        if marker in html_lower:
            business["website_status"] = "placeholder"
            return business

    # --- parked: tiny visible text ---
    visible_text = _extract_visible_text(html)
    if len(visible_text.encode("utf-8", errors="replace")) < _MIN_VISIBLE_TEXT_BYTES:
        business["website_status"] = "parked"
        return business

    # --- free_tier: hostname matches ---
    check_url = final_url or url
    if _is_free_tier(check_url) or _is_free_tier(url):
        business["website_status"] = "free_tier"
        return business

    # --- poor: 2+ neglect signals ---
    neglect = _count_neglect_signals(url, html, final_url)
    if neglect >= 2:
        business["website_status"] = "poor"
        return business

    # --- adequate: everything else ---
    business["website_status"] = "adequate"
    return business


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def check_websites(
    businesses: list[dict[str, Any]],
    progress_callback: Any = None,
) -> list[dict[str, Any]]:
    """Check the website quality for every business in *businesses*.

    Each dict is updated **in place** with a ``website_status`` key whose
    value is one of: ``no_website``, ``dead``, ``parked``, ``facebook_only``,
    ``placeholder``, ``free_tier``, ``poor``, ``adequate``.

    Parameters
    ----------
    businesses:
        A list of business dicts.  Each should contain a ``website_url``
        key (which may be ``None``).
    progress_callback:
        Optional callable ``(phase: str, done: int, total: int) -> None``.
        When provided, called after each item completes instead of printing
        dots to stdout.

    Returns
    -------
    list[dict]
        The same list, with ``website_status`` added to every entry.
    """
    if not businesses:
        return businesses

    total = len(businesses)
    completed = 0

    connector = aiohttp.TCPConnector(limit=_CONCURRENT_CONNECTIONS)
    headers = {"User-Agent": USER_AGENT}

    async with aiohttp.ClientSession(connector=connector, headers=headers) as session:

        async def _check_and_report(biz: dict[str, Any]) -> dict[str, Any]:
            nonlocal completed
            result = await _check_one(session, biz)
            completed += 1
            if progress_callback is not None:
                progress_callback("websites", completed, total)
            else:
                # Legacy CLI progress: dots and counters.
                if completed % 10 == 0 or completed == total:
                    sys.stdout.write(f" [{completed}/{total}]")
                    sys.stdout.flush()
                else:
                    sys.stdout.write(".")
                    sys.stdout.flush()
            return result

        if progress_callback is None:
            print(f"  Checking {total} websites...", end="", flush=True)
        tasks = [_check_and_report(biz) for biz in businesses]
        results = await asyncio.gather(*tasks)
        if progress_callback is None:
            print()  # Newline after progress dots.

    return results
