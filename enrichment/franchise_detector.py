"""
Multi-signal franchise/large company detection.

Instead of relying solely on brand name string matching, this uses
multiple behavioral signals to score how likely a business is to be
a franchise or national chain. The brand keyword list is ONE signal
among many, not a hard filter.

Franchise score thresholds:
  >= 6: likely_franchise
  >= 10: definite_franchise
"""

from __future__ import annotations

from typing import Any

from config import FRANCHISE_LIKELY_THRESHOLD, FRANCHISE_DEFINITE_THRESHOLD

# ---------------------------------------------------------------------------
# Car brands that require dealership context to count as a franchise match.
# Without context words, "Ford Creek Plumbing" would be a false positive.
# ---------------------------------------------------------------------------
CAR_BRANDS: list[str] = [
    "toyota",
    "honda",
    "ford",
    "chevrolet",
    "chevy",
    "gmc",
    "nissan",
    "hyundai",
    "kia",
    "subaru",
    "mazda",
    "volkswagen",
    "bmw",
    "mercedes",
    "audi",
    "lexus",
    "acura",
    "infiniti",
    "volvo",
    "jeep",
    "dodge",
    "chrysler",
    "buick",
    "cadillac",
    "lincoln",
    "porsche",
    "tesla",
]

# ---------------------------------------------------------------------------
# Context words that confirm a car-brand mention is actually a dealership,
# not a coincidental name like "Lincoln Park Roofing".
# ---------------------------------------------------------------------------
DEALERSHIP_CONTEXT: list[str] = [
    "dealer",
    "dealership",
    "motors",
    "automotive",
    "auto sales",
    "auto group",
    "certified pre-owned",
]

# ---------------------------------------------------------------------------
# Dealership indicators found in business names (scored independently of
# brand keyword matching).
# ---------------------------------------------------------------------------
_DEALERSHIP_NAME_INDICATORS: list[str] = [
    "auto group",
    "auto mall",
    "motors inc",
    "dealership",
]

# ---------------------------------------------------------------------------
# Multi-location hint words in business names.
# ---------------------------------------------------------------------------
_MULTI_LOCATION_HINTS: list[str] = [
    "locations",
    "branches",
    "nationwide",
]

# ---------------------------------------------------------------------------
# Known corporate / national domain patterns (substring match on domain).
# ---------------------------------------------------------------------------
_CORPORATE_DOMAIN_PATTERNS: list[str] = [
    "servpro.com",
    "servicemaster.com",
    "mrrooter.com",
    "rotorooter.com",
    "roto-rooter.com",
    "onehourheatandair.com",
    "benjaminfranklinplumbing.com",
    "mistersparky.com",
    "ahs.com",
    "stanley-steemer.com",
    "mollymaids.com",
    "certapro.com",
    "1800gotjunk.com",
    "twomaidsandamop.com",
    "jiffylube.com",
    "maaco.com",
    "meineke.com",
    "jiffy-lube.com",
    "orkin.com",
    "terminix.com",
    "abcpest.com",
]


# ---------------------------------------------------------------------------
# Brand keyword matching (smart: car brands need dealership context)
# ---------------------------------------------------------------------------

def _brand_matches_name(name_lower: str, brand_keywords: list[str]) -> bool:
    """Return True if any brand keyword matches the business name.

    For car brand keywords, a match only counts when a dealership context
    word also appears in the name.  This prevents false positives like
    "Ford Creek Plumbing" being flagged as a franchise.
    """
    for keyword in brand_keywords:
        if keyword not in name_lower:
            continue

        # If this keyword is a car brand, require a dealership context word.
        if keyword in CAR_BRANDS:
            has_context = any(ctx in name_lower for ctx in DEALERSHIP_CONTEXT)
            if not has_context:
                continue

        return True

    return False


def _brand_matches_domain(domain_lower: str, brand_keywords: list[str]) -> bool:
    """Return True if any brand keyword appears in the website domain.

    Car brands in domains still require dealership context within the
    domain string (e.g. ``hondadealers.com`` matches, ``hondacreek.com``
    does not unless a context word is also present).
    """
    for keyword in brand_keywords:
        if keyword not in domain_lower:
            continue

        if keyword in CAR_BRANDS:
            has_context = any(ctx in domain_lower for ctx in DEALERSHIP_CONTEXT)
            if not has_context:
                continue

        return True

    return False


# ---------------------------------------------------------------------------
# Helper: extract domain from a URL string
# ---------------------------------------------------------------------------

def _extract_domain(url: str | None) -> str:
    """Return the lowercased domain portion of a URL, or empty string."""
    if not url:
        return ""
    url_lower = url.lower().strip()
    # Strip protocol.
    for prefix in ("https://", "http://"):
        if url_lower.startswith(prefix):
            url_lower = url_lower[len(prefix):]
            break
    # Strip path.
    url_lower = url_lower.split("/", 1)[0]
    # Strip port.
    url_lower = url_lower.split(":", 1)[0]
    return url_lower


# ---------------------------------------------------------------------------
# Core scoring function
# ---------------------------------------------------------------------------

def detect_franchise(
    business: dict[str, Any],
    brand_keywords: list[str],
) -> dict[str, Any]:
    """Score a business for franchise / national chain likelihood.

    Examines multiple behavioural signals -- review volume, brand name
    presence, Google type tags, dealership indicators, multi-location
    hints, and corporate domain patterns -- and assigns:

    * ``franchise_score`` (int): cumulative signal score.
    * ``franchise_flag`` (str): one of ``"none"``, ``"likely_franchise"``,
      or ``"definite_franchise"`` based on threshold comparison.

    Parameters
    ----------
    business:
        A dict representing a single business record.  Expected keys
        include ``name``, ``review_count``, ``website_url``, and ``types``.
    brand_keywords:
        Lowercased brand keyword strings loaded via :func:`load_brand_keywords`.

    Returns
    -------
    dict[str, Any]
        The original *business* dict with ``franchise_score`` and
        ``franchise_flag`` added.
    """
    score = 0
    name_lower = (business.get("name") or "").lower()
    review_count = business.get("review_count") or 0
    types: list[str] = business.get("types") or []
    domain = _extract_domain(business.get("website_url"))

    # ------------------------------------------------------------------
    # Signal 1: very high Google review count (> 1000)  +5
    # ------------------------------------------------------------------
    if review_count > 1000:
        score += 5

    # ------------------------------------------------------------------
    # Signal 2: high Google review count (> 300 but <= 1000)  +3
    # ------------------------------------------------------------------
    elif review_count > 300:
        score += 3

    # ------------------------------------------------------------------
    # Signal 3: brand keyword match in business name  +4
    # ------------------------------------------------------------------
    if _brand_matches_name(name_lower, brand_keywords):
        score += 4

    # ------------------------------------------------------------------
    # Signal 4: brand keyword match in website domain  +3
    # ------------------------------------------------------------------
    if domain and _brand_matches_domain(domain, brand_keywords):
        score += 3

    # ------------------------------------------------------------------
    # Signal 5: Google types include "car_dealer"  +5
    # ------------------------------------------------------------------
    if "car_dealer" in types:
        score += 5

    # ------------------------------------------------------------------
    # Signal 6: dealership indicators in business name  +4
    # ------------------------------------------------------------------
    if any(indicator in name_lower for indicator in _DEALERSHIP_NAME_INDICATORS):
        score += 4

    # ------------------------------------------------------------------
    # Signal 7: general_contractor with high reviews  +2
    # ------------------------------------------------------------------
    if "general_contractor" in types and review_count > 200:
        score += 2

    # ------------------------------------------------------------------
    # Signal 8: multi-location hints in business name  +3
    # ------------------------------------------------------------------
    if any(hint in name_lower for hint in _MULTI_LOCATION_HINTS):
        score += 3

    # ------------------------------------------------------------------
    # Signal 9: corporate / national domain pattern  +3
    # ------------------------------------------------------------------
    if domain and any(pattern in domain for pattern in _CORPORATE_DOMAIN_PATTERNS):
        score += 3

    # ------------------------------------------------------------------
    # Determine franchise flag from score
    # ------------------------------------------------------------------
    if score >= FRANCHISE_DEFINITE_THRESHOLD:
        flag = "definite_franchise"
    elif score >= FRANCHISE_LIKELY_THRESHOLD:
        flag = "likely_franchise"
    else:
        flag = "none"

    business["franchise_score"] = score
    business["franchise_flag"] = flag
    return business


# ---------------------------------------------------------------------------
# Brand keywords loader
# ---------------------------------------------------------------------------

def load_brand_keywords(filepath: str) -> list[str]:
    """Load brand keywords from a text file.

    The file should contain one keyword per line.  Blank lines and lines
    starting with ``#`` (comments) are skipped.  All keywords are
    lowercased and stripped of surrounding whitespace.

    Parameters
    ----------
    filepath:
        Path to the brand keywords text file (typically
        ``data/brand_keywords.txt``).

    Returns
    -------
    list[str]
        Lowercased brand keyword strings.

    Raises
    ------
    FileNotFoundError
        If *filepath* does not exist.
    """
    keywords: list[str] = []
    with open(filepath, "r", encoding="utf-8") as fh:
        for raw_line in fh:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            keywords.append(line.lower())
    return keywords
