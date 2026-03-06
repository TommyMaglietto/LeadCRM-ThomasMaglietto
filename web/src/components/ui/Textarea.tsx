'use client';

import { cn } from '@/lib/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  rows = 3,
  className,
  id,
  ...props
}: TextareaProps) {
  const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-medium text-stone uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={cn(
          'w-full rounded-[8px] border bg-cream px-3 py-2 text-sm text-ink placeholder:text-rubble',
          'border-ink transition-colors duration-150 outline-none resize-none',
          'focus:border-accent focus:ring-1 focus:ring-accent',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          error && 'border-red-600 focus:border-red-600 focus:ring-red-600',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-rubble">{hint}</p>}
    </div>
  );
}
