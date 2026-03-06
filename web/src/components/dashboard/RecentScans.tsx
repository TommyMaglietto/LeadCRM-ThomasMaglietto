'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/formatters';
import type { Scan } from '@/lib/types';

// --- Types ----------------------------------------------------------------

interface RecentScansProps {
  scans: Scan[];
}

// --- Status badge mapping -------------------------------------------------

const SCAN_STATUS_VARIANT = {
  completed: 'success',
  running:   'warning',
  pending:   'info',
  failed:    'error',
} as const satisfies Record<Scan['status'], 'success' | 'warning' | 'info' | 'error'>;

// --- Main component -------------------------------------------------------

export function RecentScans({ scans }: RecentScansProps) {
  const display = scans.slice(0, 10);

  return (
    <Card title="Recent Scans" noPadding>
      {display.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-rubble">
          No scans yet. Run your first scan to see results here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/15">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-rubble uppercase tracking-wider">
                  Trades
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-rubble uppercase tracking-wider">
                  Towns
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-rubble uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-rubble uppercase tracking-wider">
                  Found
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-rubble uppercase tracking-wider">
                  Hot
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-rubble uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {display.map((scan, index) => (
                <tr
                  key={scan.id}
                  className={
                    index < display.length - 1
                      ? 'border-b border-ink/10'
                      : ''
                  }
                  style={{
                    backgroundColor:
                      index % 2 === 1 ? 'rgba(26, 26, 24, 0.03)' : undefined,
                  }}
                >
                  <td className="px-4 py-3 text-ink max-w-[140px]">
                    <span className="block truncate" title={scan.trades}>
                      {scan.trades || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone max-w-[140px]">
                    <span className="block truncate" title={scan.towns}>
                      {scan.towns || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={SCAN_STATUS_VARIANT[scan.status] ?? 'neutral'}
                      size="sm"
                    >
                      {scan.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-display text-lg text-ink tabular-nums">
                    {scan.total_found.toLocaleString('en-US')}
                  </td>
                  <td className="px-4 py-3 text-right font-display text-lg tabular-nums">
                    <span
                      style={{
                        color: scan.hot_count > 0 ? '#C4411A' : '#9C9389',
                      }}
                    >
                      {scan.hot_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-rubble whitespace-nowrap">
                    {formatDate(scan.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
