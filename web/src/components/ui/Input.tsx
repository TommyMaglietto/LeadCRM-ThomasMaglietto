'use client';

import { cn } from '@/lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leadingIcon,
  trailingIcon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-text-muted">
            {leadingIcon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'h-8 w-full rounded-[6px] border bg-surface-input px-3 text-sm text-text-primary placeholder:text-text-muted',
            'border-border transition-colors duration-150 outline-none',
            'focus:border-border-focus focus:ring-1 focus:ring-border-focus',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            leadingIcon && 'pl-8',
            trailingIcon && 'pr-8',
            className
          )}
          {...props}
        />
        {trailingIcon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-text-muted">
            {trailingIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
