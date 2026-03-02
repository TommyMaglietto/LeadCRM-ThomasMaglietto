'use client';

import { cn } from '@/lib/cn';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
}

export function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  className,
  id,
}: DropdownProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'h-8 w-full appearance-none rounded-[6px] border bg-surface-input pl-3 pr-8 text-sm text-text-primary',
            'border-border transition-colors duration-150 outline-none cursor-pointer',
            'focus:border-border-focus focus:ring-1 focus:ring-border-focus',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            !value && 'text-text-muted',
            error && 'border-red-500',
            className
          )}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-surface-card text-text-primary"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom chevron icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-text-muted">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
