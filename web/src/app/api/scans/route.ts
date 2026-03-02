/**
 * POST /api/scans
 *
 * Launch a new lead-discovery scan via the Python bridge.
 *
 * 1. Inserts a scan row with status='running'.
 * 2. Spawns the Python bridge as a background process (fire-and-forget).
 * 3. Returns 202 immediately with { scanId, status: "running" }.
 * 4. When the process finishes, the scan row is updated with the results.
 *
 * Request body:
 *   trades   string[]  (required, e.g. ["plumber", "HVAC"])
 *   towns    string[]  (required, e.g. ["Huntersville, NC"])
 *   refresh  boolean   (optional, default false)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { spawnPythonBridge } from '@/lib/python';

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { trades, towns, refresh = false } = body;

  // -- Validation ------------------------------------------------------------
  if (!Array.isArray(trades) || trades.length === 0) {
    return NextResponse.json(
      { error: 'trades must be a non-empty array of strings' },
      { status: 422 },
    );
  }
  if (!Array.isArray(towns) || towns.length === 0) {
    return NextResponse.json(
      { error: 'towns must be a non-empty array of strings' },
      { status: 422 },
    );
  }

  const tradesArr = (trades as unknown[]).map(String).filter(Boolean);
  const townsArr = (towns as unknown[]).map(String).filter(Boolean);

  if (tradesArr.length === 0 || townsArr.length === 0) {
    return NextResponse.json(
      { error: 'trades and towns must contain non-empty strings' },
      { status: 422 },
    );
  }

  // -- Insert scan row -------------------------------------------------------
  const db = getDb();
  const insertResult = db
    .prepare(
      `INSERT INTO scans (trades, towns, status, started_at, created_at)
       VALUES (?, ?, 'running', datetime('now'), datetime('now'))`,
    )
    .run(tradesArr.join(','), townsArr.join(','));

  const scanId = Number(insertResult.lastInsertRowid);

  // -- Spawn Python bridge in background -------------------------------------
  const payload = {
    action: 'run_scan',
    trades: tradesArr,
    towns: townsArr,
    refresh: Boolean(refresh),
  };

  const child = spawnPythonBridge(payload);

  let lastResultLine = '';
  let stderr = '';
  let lineBuffer = '';

  child.stdout?.on('data', (chunk: Buffer) => {
    lineBuffer += chunk.toString();

    // Process complete lines (delimited by \n).
    let newlineIdx: number;
    while ((newlineIdx = lineBuffer.indexOf('\n')) !== -1) {
      const line = lineBuffer.slice(0, newlineIdx).trim();
      lineBuffer = lineBuffer.slice(newlineIdx + 1);

      if (!line) continue;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue; // Non-JSON output — ignore gracefully.
      }

      if (parsed.type === 'progress') {
        // Real-time progress update → write to DB immediately.
        try {
          const progressDb = getDb();
          progressDb
            .prepare(
              `UPDATE scans
                 SET current_phase = ?,
                     phase_detail  = ?,
                     progress      = ?,
                     items_done    = ?,
                     items_total   = ?
               WHERE id = ?`,
            )
            .run(
              String(parsed.phase ?? ''),
              String(parsed.detail ?? ''),
              Number(parsed.progress ?? 0),
              Number(parsed.items_done ?? 0),
              Number(parsed.items_total ?? 0),
              scanId,
            );
        } catch (dbErr) {
          console.error('[POST /api/scans] progress DB update failed:', dbErr);
        }
      } else {
        // Final result line (has "status": "completed" or "error").
        lastResultLine = line;
      }
    }
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  child.on('close', (code: number | null) => {
    // Process any remaining partial line in the buffer.
    if (lineBuffer.trim()) {
      try {
        const parsed = JSON.parse(lineBuffer.trim());
        if (parsed.type !== 'progress') {
          lastResultLine = lineBuffer.trim();
        }
      } catch {
        // Ignore unparseable remainder.
      }
    }

    // Re-acquire a fresh db reference since this callback fires asynchronously.
    try {
      const asyncDb = getDb();

      if (code !== 0 || !lastResultLine) {
        const errMsg = (stderr.trim() || 'Unknown error').slice(0, 1000);
        asyncDb
          .prepare(
            `UPDATE scans
               SET status        = 'failed',
                   error_message = ?,
                   current_phase = 'failed',
                   phase_detail  = ?,
                   completed_at  = datetime('now')
             WHERE id = ?`,
          )
          .run(errMsg, errMsg, scanId);
        return;
      }

      let result: Record<string, unknown>;
      try {
        result = JSON.parse(lastResultLine);
      } catch {
        asyncDb
          .prepare(
            `UPDATE scans
               SET status        = 'failed',
                   error_message = 'Bridge returned invalid JSON',
                   current_phase = 'failed',
                   completed_at  = datetime('now')
             WHERE id = ?`,
          )
          .run(scanId);
        return;
      }

      asyncDb
        .prepare(
          `UPDATE scans
             SET status        = 'completed',
                 total_found   = ?,
                 new_inserted  = ?,
                 updated       = ?,
                 hot_count     = ?,
                 warm_count    = ?,
                 cold_count    = ?,
                 skip_count    = ?,
                 progress      = 100,
                 current_phase = 'complete',
                 phase_detail  = 'Scan finished',
                 completed_at  = datetime('now')
           WHERE id = ?`,
        )
        .run(
          Number(result.total_found ?? 0),
          Number(result.new_inserted ?? 0),
          Number(result.updated ?? 0),
          Number(result.hot_count ?? 0),
          Number(result.warm_count ?? 0),
          Number(result.cold_count ?? 0),
          Number(result.skip_count ?? 0),
          scanId,
        );
    } catch (dbErr) {
      console.error('[POST /api/scans] async DB update failed:', dbErr);
    }
  });

  return NextResponse.json({ scanId, status: 'running' }, { status: 202 });
}
