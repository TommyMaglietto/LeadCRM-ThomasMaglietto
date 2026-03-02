'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ScanForm } from './ScanForm';
import { ScanProgress } from './ScanProgress';
import { ScanResults } from './ScanResults';
import { ScanHistory } from './ScanHistory';
import { useScan } from '@/hooks/useScan';
import type { Scan, DashboardStats } from '@/lib/types';

// ---------------------------------------------------------------------------
// View state machine
// ---------------------------------------------------------------------------

type ViewState = 'form' | 'progress' | 'results';

// ---------------------------------------------------------------------------
// ScanView — two-column layout for the scan page
// ---------------------------------------------------------------------------

export function ScanView() {
  const { scan, launchScan, clearScan, activeScanId, resumeScan } = useScan();

  const [viewState, setViewState] = useState<ViewState>('form');
  const [completedScan, setCompletedScan] = useState<Scan | null>(null);
  const scanStartRef = useRef<Date>(new Date());
  const [checkedForActive, setCheckedForActive] = useState(false);

  // On mount, check if there's a scan still running in the DB and resume tracking it
  useEffect(() => {
    if (checkedForActive || activeScanId !== null) return;

    fetch('/api/stats')
      .then((r) => r.json() as Promise<DashboardStats>)
      .then((stats) => {
        const runningScan = stats.recentScans?.find(
          (s) => s.status === 'running' || s.status === 'pending'
        );
        if (runningScan) {
          resumeScan(runningScan.id);
          scanStartRef.current = runningScan.started_at
            ? new Date(runningScan.started_at)
            : new Date();
          setViewState('progress');
        }
      })
      .catch(() => {})
      .finally(() => setCheckedForActive(true));
  }, [checkedForActive, activeScanId, resumeScan]);

  // Transition from progress -> results when the polled scan finishes
  useEffect(() => {
    if (!scan) return;
    if (viewState !== 'progress') return;

    if (scan.status === 'completed' || scan.status === 'failed') {
      setCompletedScan(scan);
      setViewState('results');
    }
  }, [scan, viewState]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (trades: string[], towns: string[], refresh: boolean) => {
      scanStartRef.current = new Date();
      setViewState('progress');
      try {
        await launchScan(trades, towns, refresh);
      } catch (err) {
        console.error('[ScanView] launchScan failed:', err);
        // If launch itself errors (network, validation), return to form
        setViewState('form');
      }
    },
    [launchScan]
  );

  const handleCancel = useCallback(() => {
    // Stops the polling UI; the scan continues in background on the server
    clearScan();
    setViewState('form');
  }, [clearScan]);

  const handleRunAnother = useCallback(() => {
    clearScan();
    setCompletedScan(null);
    setViewState('form');
  }, [clearScan]);

  // ---------------------------------------------------------------------------
  // Derive the card title
  // ---------------------------------------------------------------------------

  const cardTitle =
    viewState === 'form'
      ? 'New Scan'
      : viewState === 'progress'
      ? 'Scan Running'
      : 'Scan Complete';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      {/* Left column: form / progress / results */}
      <Card title={cardTitle}>
        {viewState === 'form' && (
          <ScanForm onSubmit={handleSubmit} isLoading={false} />
        )}

        {viewState === 'progress' && (
          <ScanProgress
            scan={scan}
            startedAt={scanStartRef.current}
            onCancel={handleCancel}
          />
        )}

        {viewState === 'results' && completedScan && (
          <ScanResults scan={completedScan} onRunAnother={handleRunAnother} />
        )}
      </Card>

      {/* Right column: recent scan history */}
      <div className="flex flex-col gap-4">
        <Card title="Recent Scans">
          <ScanHistory />
        </Card>
      </div>
    </div>
  );
}
