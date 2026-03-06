'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { OUTREACH_STATUSES } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { OutreachStatus } from '@/lib/types';

interface BulkActionBarProps {
  selectedIds:  number[];
  onDeselect:   () => void;
  onBulkUpdate: () => void;
}

export function BulkActionBar({
  selectedIds,
  onDeselect,
  onBulkUpdate,
}: BulkActionBarProps) {
  const [status,  setStatus]  = useState<OutreachStatus | ''>('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const count = selectedIds.length;

  if (count === 0) return null;

  const handleApply = async () => {
    if (!status) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leads/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ids:    selectedIds,
          update: { outreach_status: status },
        }),
      });
      if (!res.ok) throw new Error('Bulk update failed');
      setStatus('');
      onBulkUpdate();
      onDeselect();
    } catch {
      setError('Failed to update leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-30',
        'flex items-center gap-3 px-4 py-3 rounded-[10px]',
        'bg-cream-dark border border-ink shadow-card',
        'transition-all duration-200 ease-out'
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3 border-r border-ink/10">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold shrink-0">
          {count > 99 ? '99+' : count}
        </div>
        <span className="text-sm text-ink whitespace-nowrap font-medium">
          {count === 1 ? '1 lead' : `${count} leads`} selected
        </span>
      </div>

      {/* Change status dropdown */}
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OutreachStatus | '')}
          className={cn(
            'h-8 appearance-none rounded-[6px] border bg-cream pl-3 pr-8 text-sm',
            'border-ink transition-colors outline-none cursor-pointer',
            'focus:border-accent focus:ring-1 focus:ring-accent',
            status ? 'text-ink' : 'text-rubble'
          )}
        >
          <option value="" disabled className="bg-cream text-rubble">
            Change Status...
          </option>
          {OUTREACH_STATUSES.map((s) => (
            <option key={s.value} value={s.value} className="bg-cream text-ink">
              {s.label}
            </option>
          ))}
        </select>

        <Button
          variant="primary"
          size="md"
          onClick={() => void handleApply()}
          loading={loading}
          disabled={!status}
        >
          Apply
        </Button>
      </div>

      {/* Deselect */}
      <div className="pl-1 border-l border-ink/10">
        <Button
          variant="ghost"
          size="md"
          onClick={onDeselect}
          disabled={loading}
        >
          Deselect All
        </Button>
      </div>

      {/* Error */}
      {error && (
        <span className="text-xs text-red-600 ml-2">{error}</span>
      )}
    </div>
  );
}
