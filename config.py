"""
config.py -- Central configuration for the lead-generator CLI.

All scoring weights, tier thresholds, franchise detection settings,
website-check parameters, and default trade lists live here so that
every other module can import them from a single source of truth.
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# Default trades to scan when none are specified explicitly
# ---------------------------------------------------------------------------
DEFAULT_TRADES: list[str] = [
    "plumber",
    "electrician",
    "HVAC",
    "roofer",
    "landscaper",
    "painter",
    "handyman",
    "fence installer",
    "pressure washing",
    "gutter cleaning",
    "concrete contractor",
    "paving contractor",
    "tree service",
    "pest control",
    "garage door repair",
    "locksmith",
    "pool service",
    "septic service",
    "drywall contractor",
    "flooring installer",
]

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
DEFAULT_STATE: str = "NC"
DB_PATH: str = "leads.db"
GOOGLE_API_KEY_ENV: str = "GOOGLE_PLACES_API_KEY"

# ---------------------------------------------------------------------------
# Brand keywords file (for franchise detection)
# ---------------------------------------------------------------------------
BRAND_KEYWORDS_PATH: Path = Path(__file__).resolve().parent / "data" / "brand_keywords.txt"

# ---------------------------------------------------------------------------
# Website check
# ---------------------------------------------------------------------------
WEBSITE_TIMEOUT: int = 7
MAX_REDIRECTS: int = 5
USER_AGENT: str = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# ---------------------------------------------------------------------------
# Scoring weights (from spec section 6.7)
# ---------------------------------------------------------------------------
SCORE_NO_WEBSITE: int = 10
SCORE_DEAD_PARKED: int = 9
SCORE_FACEBOOK_ONLY: int = 8
SCORE_PLACEHOLDER: int = 7
SCORE_FREE_TIER: int = 6
SCORE_POOR: int = 5
SCORE_UNDER_20_REVIEWS: int = 3
SCORE_UNDER_10_REVIEWS: int = 2   # additional bonus
SCORE_HAS_PHONE: int = 2
SCORE_YELP_NO_WEBSITE: int = 3
SCORE_YELP_BAD_WEBSITE: int = 1
SCORE_ADEQUATE: int = -5
SCORE_LIKELY_FRANCHISE: int = -10
SCORE_DEFINITE_FRANCHISE: int = -20

# ---------------------------------------------------------------------------
# Tier thresholds
# ---------------------------------------------------------------------------
TIER_HOT: int = 12
TIER_WARM: int = 8
TIER_COLD: int = 5

# ---------------------------------------------------------------------------
# Franchise detection
# ---------------------------------------------------------------------------
FRANCHISE_LIKELY_THRESHOLD: int = 6
FRANCHISE_DEFINITE_THRESHOLD: int = 10
FRANCHISE_HIGH_REVIEWS: int = 300
FRANCHISE_VERY_HIGH_REVIEWS: int = 1000

# ---------------------------------------------------------------------------
# Yelp / DuckDuckGo presence check
# ---------------------------------------------------------------------------
YELP_SEARCH_DELAY: float = 0.5  # seconds between DuckDuckGo searches

# ---------------------------------------------------------------------------
# Parked-domain markers (substring match on page body, lowercase)
# ---------------------------------------------------------------------------
PARKED_MARKERS: list[str] = [
    "this domain is for sale",
    "parked",
    "coming soon",
    "under construction",
    "buy this domain",
    "domain parking",
    "renew this domain",
    "sedoparking",
    "hugedomains",
    "namecheap parking",
    "godaddy park",
]

# ---------------------------------------------------------------------------
# Free-tier subdomains (suffix match on hostname)
# ---------------------------------------------------------------------------
FREE_TIER_SUBDOMAINS: list[str] = [
    ".wixsite.com",
    ".squarespace.com",
    ".weebly.com",
    ".wordpress.com",
    ".godaddysites.com",
    ".carrd.co",
    ".webflow.io",
    ".mystrikingly.com",
]

# ---------------------------------------------------------------------------
# Directory domains -- if a business lists one of these as its website,
# treat it as "no website"
# ---------------------------------------------------------------------------
DIRECTORY_DOMAINS: list[str] = [
    "yelp.com",
    "facebook.com",
    "yellowpages.com",
    "bbb.org",
    "google.com",
    "mapquest.com",
    "manta.com",
    "angi.com",
    "thumbtack.com",
    "nextdoor.com",
    "linkedin.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "homeadvisor.com",
    "houzz.com",
    "angieslist.com",
    "porch.com",
    "bark.com",
]

# ---------------------------------------------------------------------------
# Concurrency
# ---------------------------------------------------------------------------
MAX_CONCURRENT_ENRICHMENTS: int = 8
