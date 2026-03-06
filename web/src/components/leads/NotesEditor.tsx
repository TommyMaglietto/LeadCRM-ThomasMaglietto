'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/cn';

interface NotesEditorProps {
  leadId:     number;
  initialValue?: string | null;
  onSaved?:   (value: string) => void;
  className?: string;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export function NotesEditor({
  leadId,
  initialValue,
  onSaved,
  className,
}: NotesEditorProps) {
  const [value,     setValue]     = useState(initialValue ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when external value changes (e.g. when lead ID changes)
  useEffect(() => {
    setValue(initialValue ?? '');
    setSaveState('idle');
  }, [initialValue, leadId]);

  const persistSave = useCallback(
    async (text: string) => {
      setSaveState('saving');
      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ notes: text }),
        });
        if (!res.ok) throw new Error('Save failed');
        setSaveState('saved');
        onSaved?.(text);
        savedTimerRef.current = setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('error');
      }
    },
    [leadId, onSaved]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);
    setSaveState('dirty');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void persistSave(text), 1000);
  };

  const handleBlur = () => {
    if (saveState === 'dirty') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void persistSave(value);
    }
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (debounceRef.current)  clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const indicator =
    saveState === 'saving' ? (
      <span className="text-rubble text-xs animate-pulse">Saving...</span>
    ) : saveState === 'saved' ? (
      <span className="text-green-700 text-xs flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Saved
      </span>
    ) : saveState === 'error' ? (
      <span className="text-red-600 text-xs">Save failed</span>
    ) : null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-stone">Notes</label>
        <div className="h-4">{indicator}</div>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        rows={4}
        placeholder="Add notes about this lead..."
        className={cn(
          'w-full rounded-[6px] border bg-cream px-3 py-2.5',
          'text-sm text-ink placeholder:text-rubble',
          'border-ink transition-colors duration-150 outline-none resize-none',
          'focus:border-accent focus:ring-1 focus:ring-accent',
          saveState === 'error' && 'border-red-500 focus:border-red-500'
        )}
      />
    </div>
  );
}
