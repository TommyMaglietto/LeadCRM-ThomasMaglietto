'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { formatDate } from '@/lib/formatters';
import type { CallLogEntry } from '@/lib/types';

const OUTCOME_OPTIONS = [
  { value: 'no_answer',          label: 'No Answer'           },
  { value: 'voicemail',          label: 'Voicemail'           },
  { value: 'spoke',              label: 'Spoke'               },
  { value: 'callback_scheduled', label: 'Callback Scheduled'  },
];

const OUTCOME_STYLE: Record<string, { bg: string; text: string }> = {
  no_answer:          { bg: 'rgba(113,113,122,0.15)', text: '#a1a1aa' },
  voicemail:          { bg: 'rgba(245,158,11,0.15)',  text: '#fcd34d' },
  spoke:              { bg: 'rgba(34,197,94,0.15)',   text: '#86efac' },
  callback_scheduled: { bg: 'rgba(99,102,241,0.15)',  text: '#a5b4fc' },
};

function OutcomeBadge({ outcome }: { outcome: string }) {
  const style = OUTCOME_STYLE[outcome] ?? { bg: '#27272a', text: '#a1a1aa' };
  const label = OUTCOME_OPTIONS.find((o) => o.value === outcome)?.label ?? outcome;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface AddCallFormProps {
  leadId:   number;
  onSaved:  () => void;
}

function AddCallForm({ leadId, onSaved }: AddCallFormProps) {
  const [outcome,  setOutcome]  = useState('');
  const [duration, setDuration] = useState('');
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) { setError('Please select an outcome.'); return; }

    setLoading(true);
    setError('');
    try {
      const body: Record<string, unknown> = { outcome, notes: notes.trim() || null };
      if (duration) body.duration_seconds = parseInt(duration, 10);

      const res = await fetch(`/api/leads/${leadId}/calls`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save call log');

      setOutcome('');
      setDuration('');
      setNotes('');
      onSaved();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Dropdown
          label="Outcome"
          options={OUTCOME_OPTIONS}
          value={outcome}
          onChange={setOutcome}
          placeholder="Select outcome..."
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-secondary">Duration (seconds)</label>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Optional"
            className={cn(
              'h-8 w-full rounded-[6px] border bg-surface-input px-3 text-sm text-text-primary placeholder:text-text-muted',
              'border-border transition-colors outline-none',
              'focus:border-border-focus focus:ring-1 focus:ring-border-focus'
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Call notes..."
          className={cn(
            'w-full rounded-[6px] border bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted',
            'border-border transition-colors outline-none resize-none',
            'focus:border-border-focus focus:ring-1 focus:ring-border-focus'
          )}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <Button type="submit" variant="primary" size="sm" loading={loading}>
        Log Call
      </Button>
    </form>
  );
}

interface CallLogProps {
  leadId:  number;
  entries: CallLogEntry[];
  onAdded: () => void;
}

export function CallLog({ leadId, entries, onAdded }: CallLogProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Add call form */}
      <div className="rounded-[6px] border border-border-subtle bg-surface-input/50 p-3">
        <p className="text-xs font-medium text-text-secondary mb-3">Log a Call</p>
        <AddCallForm leadId={leadId} onSaved={onAdded} />
      </div>

      {/* History */}
      {entries.length > 0 && (
        <div className="flex flex-col gap-0">
          <p className="text-xs font-medium text-text-muted mb-2">Call History</p>
          <div className="flex flex-col divide-y divide-border-subtle">
            {entries.map((entry) => (
              <div key={entry.id} className="py-2.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <OutcomeBadge outcome={entry.outcome} />
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    {entry.duration_seconds && (
                      <span>{formatDuration(entry.duration_seconds)}</span>
                    )}
                    <span>{formatDate(entry.called_at)}</span>
                  </div>
                </div>
                {entry.notes && (
                  <p className="text-xs text-text-secondary leading-relaxed pl-0.5">
                    {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-xs text-text-muted text-center py-4">No calls logged yet.</p>
      )}
    </div>
  );
}
