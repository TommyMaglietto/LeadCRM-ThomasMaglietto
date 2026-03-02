"""
Lead scoring formula and tiering.

Assigns a composite numeric score based on website quality, business size
signals, Yelp presence, and franchise flags. Higher = better prospect.

Scoring weights are imported from config.py for easy tuning.

Tiers:
  Hot (12+): Call these first
  Warm (8-11): Worth an email or drive-by
  Cold (5-7): Low priority
  Skip (<5): Not worth pursuing
"""

from __future__ import annotations

from typing import Any

from config import (
    SCORE_NO_WEBSITE,
    SCORE_DEAD_PARKED,
    SCORE_FACEBOOK_ONLY,
    SCORE_PLACEHOLDER,
    SCORE_FREE_TIER,
    SCORE_POOR,
    SCORE_UNDER_20_REVIEWS,
    SCORE_UNDER_10_REVIEWS,
    SCORE_HAS_PHONE,
    SCORE_YELP_NO_WEBSITE,
    SCORE_YELP_BAD_WEBSITE,
    SCORE_ADEQUATE,
    SCORE_LIKELY_FRANCHISE,
    SCORE_DEFINITE_FRANCHISE,
    TIER_HOT,
    TIER_WARM,
    TIER_COLD,
)

# Website statuses that count as "bad" for the Yelp bonus signal.
_BAD_WEBSITE_STATUSES: frozenset[str] = frozenset({
    "dead",
    "parked",
    "facebook_only",
    "placeholder",
    "free_tier",
    "poor",
})


def _determine_tier(score: int) -> str:
    """Map a numeric lead score to its tier label.

    Parameters
    ----------
    score:
        The composite lead score (may be negative).

    Returns
    -------
    str
        One of ``"hot"``, ``"warm"``, ``"cold"``, or ``"skip"``.
    """
    if score >= TIER_HOT:
        return "hot"
    if score >= TIER_WARM:
        return "warm"
    if score >= TIER_COLD:
        return "cold"
    return "skip"


def score_lead(business: dict[str, Any]) -> dict[str, Any]:
    """Score a single business lead and assign a tier.

    The score is an additive composite of signals drawn from the
    business dict.  Each signal contributes a positive or negative
    weight imported from ``config.py``.

    Signals evaluated (in order):

    1. **Website status** -- the worse the website situation, the higher
       the score (these are prospects who need a website).
    2. **Low review count** -- fewer reviews hint at a smaller business
       that may benefit from marketing help.  Under-20 and under-10
       bonuses stack.
    3. **Has phone** -- a reachable phone number is valuable for cold
       outreach.
    4. **Yelp + bad/no website** -- active on Yelp but lacking a real
       website is a strong buying signal.
    5. **Adequate website** -- penalises leads who already have a
       reasonable site.
    6. **Franchise flags** -- heavy penalties to deprioritise franchises
       and national chains.

    Parameters
    ----------
    business:
        A dict representing a single business.  Expected keys include
        ``website_status``, ``review_count``, ``phone``, ``has_yelp``,
        and ``franchise_flag``.

    Returns
    -------
    dict[str, Any]
        The original *business* dict with ``lead_score`` (int) and
        ``lead_tier`` (str) added.
    """
    score = 0

    website_status: str = (business.get("website_status") or "").lower()
    review_count: int | None = business.get("review_count")
    phone: str | None = business.get("phone")
    has_yelp: str = str(business.get("has_yelp") or "").lower()
    franchise_flag: str = (business.get("franchise_flag") or "none").lower()

    # ------------------------------------------------------------------
    # Website status scoring (mutually exclusive tiers)
    # ------------------------------------------------------------------
    if website_status == "no_website":
        score += SCORE_NO_WEBSITE
    elif website_status in ("dead", "parked"):
        score += SCORE_DEAD_PARKED
    elif website_status == "facebook_only":
        score += SCORE_FACEBOOK_ONLY
    elif website_status == "placeholder":
        score += SCORE_PLACEHOLDER
    elif website_status == "free_tier":
        score += SCORE_FREE_TIER
    elif website_status == "poor":
        score += SCORE_POOR
    elif website_status == "adequate":
        score += SCORE_ADEQUATE

    # ------------------------------------------------------------------
    # Low review count bonuses (stack)
    # ------------------------------------------------------------------
    if review_count is not None:
        if review_count < 20:
            score += SCORE_UNDER_20_REVIEWS
        if review_count < 10:
            score += SCORE_UNDER_10_REVIEWS

    # ------------------------------------------------------------------
    # Phone availability bonus
    # ------------------------------------------------------------------
    if phone:
        score += SCORE_HAS_PHONE

    # ------------------------------------------------------------------
    # Yelp presence combined with website status
    # ------------------------------------------------------------------
    if has_yelp == "true":
        if website_status == "no_website":
            score += SCORE_YELP_NO_WEBSITE
        elif website_status in _BAD_WEBSITE_STATUSES:
            score += SCORE_YELP_BAD_WEBSITE

    # ------------------------------------------------------------------
    # Franchise penalties
    # ------------------------------------------------------------------
    if franchise_flag == "likely_franchise":
        score += SCORE_LIKELY_FRANCHISE
    elif franchise_flag == "definite_franchise":
        score += SCORE_DEFINITE_FRANCHISE

    # ------------------------------------------------------------------
    # Assign score and tier
    # ------------------------------------------------------------------
    business["lead_score"] = score
    business["lead_tier"] = _determine_tier(score)
    return business


def score_all(businesses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Score every business in the list and sort by score descending.

    Parameters
    ----------
    businesses:
        A list of business dicts to score.

    Returns
    -------
    list[dict[str, Any]]
        The same business dicts, each augmented with ``lead_score`` and
        ``lead_tier``, sorted from highest score (best prospect) to
        lowest.
    """
    scored = [score_lead(biz) for biz in businesses]
    scored.sort(key=lambda biz: biz["lead_score"], reverse=True)
    return scored
