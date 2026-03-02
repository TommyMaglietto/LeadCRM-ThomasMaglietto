/**
 * db.ts - Singleton better-sqlite3 connection shared across all API routes.
 *
 * The database file lives one directory above web/ so it is shared with the
 * Python CLI tool.  DB_PATH can be overridden via the DB_PATH environment
 * variable for testing.
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH =
  process.env.DB_PATH || path.join(process.cwd(), '..', 'leads.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Schema bootstrap
// ---------------------------------------------------------------------------
// The `businesses` table is owned by Python and already exists.
// We only create supplementary tables and indexes here.
// ---------------------------------------------------------------------------

function initSchema(db: Database.Database): void {
  db.exec(`
    -- Main businesses table (shared with Python CLI — must match Python schema)
    CREATE TABLE IF NOT EXISTS businesses (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      google_place_id     TEXT UNIQUE,
      name                TEXT NOT NULL,
      phone               TEXT,
      address             TEXT,
      city                TEXT,
      state               TEXT,
      website_url         TEXT,
      website_status      TEXT,
      google_rating       REAL,
      google_review_count INTEGER,
      has_yelp            TEXT DEFAULT 'unknown',
      yelp_url            TEXT,
      franchise_score     INTEGER DEFAULT 0,
      franchise_flag      TEXT DEFAULT 'none',
      lead_score          INTEGER DEFAULT 0,
      lead_tier           TEXT DEFAULT 'skip',
      trades              TEXT,
      outreach_status     TEXT DEFAULT 'new',
      notes               TEXT,
      first_seen          DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_enriched       DATETIME,
      created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_businesses_place_id ON businesses(google_place_id);
    CREATE INDEX IF NOT EXISTS idx_businesses_phone    ON businesses(phone);
    CREATE INDEX IF NOT EXISTS idx_businesses_lead_tier ON businesses(lead_tier);

    -- CRM-specific tables
    CREATE TABLE IF NOT EXISTS call_log (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id      INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      called_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duration_seconds INTEGER,
      outcome          TEXT,
      notes            TEXT,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_call_log_business_id ON call_log(business_id);

    CREATE TABLE IF NOT EXISTS scans (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      trades        TEXT NOT NULL,
      towns         TEXT NOT NULL,
      status        TEXT DEFAULT 'pending',
      total_found   INTEGER DEFAULT 0,
      new_inserted  INTEGER DEFAULT 0,
      updated       INTEGER DEFAULT 0,
      hot_count     INTEGER DEFAULT 0,
      warm_count    INTEGER DEFAULT 0,
      cold_count    INTEGER DEFAULT 0,
      skip_count    INTEGER DEFAULT 0,
      error_message TEXT,
      started_at    DATETIME,
      completed_at  DATETIME,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      current_phase TEXT,
      phase_detail  TEXT,
      progress      INTEGER DEFAULT 0,
      items_done    INTEGER DEFAULT 0,
      items_total   INTEGER DEFAULT 0
    );

    -- UI query optimization indexes
    CREATE INDEX IF NOT EXISTS idx_businesses_outreach_status ON businesses(outreach_status);
    CREATE INDEX IF NOT EXISTS idx_businesses_city           ON businesses(city);
    CREATE INDEX IF NOT EXISTS idx_businesses_website_status ON businesses(website_status);
    CREATE INDEX IF NOT EXISTS idx_businesses_lead_score     ON businesses(lead_score);
  `);

  // Migrate existing scans table to include progress tracking columns.
  // ALTER TABLE ADD COLUMN is a no-op if the column already exists (caught).
  const progressColumns: [string, string][] = [
    ['current_phase', 'TEXT'],
    ['phase_detail', 'TEXT'],
    ['progress', 'INTEGER DEFAULT 0'],
    ['items_done', 'INTEGER DEFAULT 0'],
    ['items_total', 'INTEGER DEFAULT 0'],
  ];
  for (const [col, type] of progressColumns) {
    try {
      db.exec(`ALTER TABLE scans ADD COLUMN ${col} ${type}`);
    } catch {
      // Column already exists — safe to ignore.
    }
  }
}
