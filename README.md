<<<<<<< HEAD
# LeadGen Engine

A full-stack lead generation platform that discovers local businesses without websites and ranks them by sales priority. Built for agencies and freelancers who sell web design services to trades like plumbers, roofers, electricians, and HVAC companies.

Scans an entire region in minutes — 20 trades across 5 towns produces ~850 scored, tiered leads in under 3 minutes.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## How It Works

```
┌─────────────┐     stdin (JSON)      ┌──────────────────────────────────┐
│  Next.js UI  │ ──────────────────▶  │  Python Async Pipeline           │
│  (React 18)  │                      │                                  │
│              │  ◀──────────────────  │  Discovery → Dedup → Enrich     │
│  SWR polling │   stdout (JSON lines) │  → Franchise → Score → Store    │
└──────┬───────┘                      └──────────────┬───────────────────┘
       │                                             │
       │              ┌──────────┐                   │
       └─────────────▶│  SQLite  │◀──────────────────┘
                      │  (WAL)   │
                      └──────────┘
```

The Next.js frontend spawns a Python subprocess and communicates via JSON over stdin/stdout. As the pipeline runs, Python streams real-time progress updates — the frontend polls the database and shows a live progress bar with phase details and item counts.

---

## Features

### Discovery & Scoring Pipeline

- **Google Places API** — Searches every trade/town combination with up to 5 concurrent async API calls
- **Two-Pass Deduplication** — By Google Place ID, then by normalized phone number. Merges duplicates and accumulates trade metadata
- **Website Quality Classification** — Goes beyond alive/dead. Detects: parked domains, placeholders, free-tier platforms (Wix/Squarespace subdomains), and neglect signals (no SSL, outdated copyright, missing mobile viewport, Flash, old jQuery)
- **Yelp Presence Detection** — Fast slug HEAD request first, DuckDuckGo fallback. Business on Yelp + no website = strong buying signal
- **Franchise Detection** — 9 independent signals (brand keywords, review volume, Google types, domain patterns, dealership indicators) to filter out chains
- **Weighted Lead Scoring** — Composite score based on website status, review count, phone availability, Yelp presence, and franchise flags
- **Auto-Tiering** — Hot (12+), Warm (8-11), Cold (5-7), Skip (<5)

### Web Interface

- **Dashboard** — KPIs, tier distribution charts, outreach funnel, recent scans
- **Lead Table** — Sortable, filterable, paginated. Bulk status updates. Full-text search across name, phone, and address
- **Lead Detail Drawer** — Contact info, website status, Yelp links, Google rating, franchise flag, notes editor, call log
- **Kanban Pipeline** — Drag-and-drop leads between outreach stages (New → Contacted → Replied → Meeting Set → Closed)
- **Analytics** — Conversion charts, lead quality distribution, scan history
- **Scan Dashboard** — Real-time progress bar with phase tracking, scan history, result summaries
- **CSV Export** — Filtered by minimum score threshold

### Engineering Highlights

- **Real-Time Progress** — Python streams JSON progress lines → Node.js writes to DB → frontend polls with SWR
- **Preserved User Data** — Notes and outreach status survive re-scans. Only enrichment data gets refreshed
- **Zero Infrastructure** — Runs entirely on SQLite (WAL mode for concurrent access). No Postgres, no Redis
- **30 Concurrent Website Checks** — aiohttp connection pooling with configurable concurrency
- **Configurable Scoring** — All weights, thresholds, and tier boundaries live in `config.py`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Data Fetching | SWR (polling + cache) |
| Charts | Recharts |
| Drag & Drop | dnd-kit |
| Backend API | Next.js API Routes |
| Pipeline | Python 3.11+, asyncio, aiohttp, httpx |
| Database | SQLite (better-sqlite3 for Node, sqlite3 for Python) |
| IPC | JSON over stdin/stdout (subprocess bridge) |

---

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Google Places API key** ([Get one here](https://console.cloud.google.com/apis/library/places-backend.googleapis.com))

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/lead-generator.git
cd lead-generator

# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
cd web
npm install
cd ..
```

### Environment Setup

Create a `.env` file in the project root:

```env
GOOGLE_PLACES_API_KEY=your_api_key_here
```

Create `web/.env.local`:

```env
DB_PATH=../leads.db
PYTHON_PATH=python
GOOGLE_PLACES_API_KEY=your_api_key_here
```

> Set `PYTHON_PATH` to the full path of your Python executable if `python` isn't on your PATH.

### Run the Web App

```bash
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the dashboard.

### Run the CLI (optional)

The Python pipeline also works standalone:

```bash
# Search for plumbers and electricians in two towns
python find_leads.py --trade "plumber,electrician" --town "Huntersville, NC" --town "Cornelius, NC"

# List all default trades
python find_leads.py --list-trades

# Re-enrich existing leads
python find_leads.py --trade "plumber" --town "Charlotte, NC" --refresh

# Export with minimum score filter
python find_leads.py --trade "HVAC" --town "Raleigh, NC" --min-score 8 --export ./leads.csv
```

---

## Pipeline Deep Dive

### Scoring Breakdown

| Signal | Points | Rationale |
|--------|--------|-----------|
| No website | +10 | Prime prospect — needs a site |
| Dead/parked site | +9 | Might not know their site is down |
| Facebook only | +8 | Using social as website substitute |
| Placeholder site | +7 | Started but never finished |
| Free-tier site (Wix subdomain, etc.) | +6 | Ready to upgrade |
| Poor site (no SSL, outdated) | +5 | Needs a refresh |
| < 20 Google reviews | +3 | Small business signal |
| < 10 Google reviews | +2 | Very small — stacks with above |
| Has phone number | +2 | Reachable for outreach |
| On Yelp + no/bad website | +3 | Active online but no proper site |
| Adequate website | -5 | Already has what you'd sell |
| Likely franchise | -10 | Corporate handles their site |
| Definite franchise | -20 | Don't waste your time |

### Tier Thresholds

| Tier | Score | Action |
|------|-------|--------|
| Hot | >= 12 | Call first |
| Warm | 8 - 11 | Email or drive-by |
| Cold | 5 - 7 | Low priority |
| Skip | < 5 | Ignore |

### Default Trades (20)

Plumber, Electrician, HVAC, Roofer, Landscaper, Painter, Handyman, Fence Installer, Pressure Washing, Gutter Cleaning, Concrete Contractor, Paving Contractor, Tree Service, Pest Control, Garage Door Repair, Locksmith, Pool Service, Septic Service, Drywall Contractor, Flooring Installer

---

## Project Structure

```
lead-generator/
├── config.py                 # All scoring weights, thresholds, constants
├── find_leads.py             # CLI entry point
├── requirements.txt          # Python dependencies
├── data/
│   └── brand_keywords.txt    # Franchise brand names for detection
├── discovery/
│   ├── google_places.py      # Google Places API (sync + async)
│   └── deduplicator.py       # Two-pass dedup by place_id and phone
├── enrichment/
│   ├── website_checker.py    # Async website quality classification
│   ├── yelp_presence.py      # Yelp detection (HEAD + DuckDuckGo)
│   └── franchise_detector.py # Multi-signal franchise scoring
├── scoring/
│   └── lead_scorer.py        # Weighted lead scoring + tiering
├── storage/
│   ├── database.py           # SQLite schema, insert, update, query
│   └── bridge.py             # JSON stdin/stdout bridge for Node.js
├── output/
│   └── exporter.py           # CSV export
└── web/                      # Next.js application
    └── src/
        ├── app/
        │   ├── dashboard/    # KPI dashboard
        │   ├── leads/        # Lead table + detail drawer
        │   ├── scan/         # Scan launcher + progress
        │   ├── pipeline/     # Kanban outreach board
        │   ├── analytics/    # Charts and metrics
        │   └── api/          # REST API routes
        ├── components/       # React components
        ├── hooks/            # Custom React hooks (SWR-based)
        └── lib/              # Utilities, types, DB connection
```

---

## License

MIT
=======
# LeadCRM-ThomasMaglietto
A full Lead Generator End to end with Customer Management made to generate leads for website development
>>>>>>> 5c900c64da270341ad3a7fd94d8ff552789e44c2
