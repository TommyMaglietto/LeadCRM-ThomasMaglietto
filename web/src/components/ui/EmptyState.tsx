'use client';

import { cn } from '@/lib/cn';
import { Button } from './Button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: EmptyStateAction;
  icon?: React.ReactNode;
  className?: string;
}

function DefaultIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      className="text-rubble"
    >
      <rect x="6" y="10" width="28" height="22" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 18h14M13 24h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="30" cy="10" r="6" fill="#EDE9E1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M28 10h4M30 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 px-6 text-center',
        className
      )}
    >
      <div className="text-rubble">{icon ?? <DefaultIcon />}</div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-stone">{title}</p>
        {description && (
          <p className="text-xs text-rubble max-w-xs">{description}</p>
        )}
      </div>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
