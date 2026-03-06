'use client';

import { cn } from '@/lib/cn';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
}

export function Card({ title, children, className, headerAction, noPadding = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-ink bg-cream-dark shadow-card',
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink/15">
          <h3 className="font-display text-lg tracking-wide text-ink uppercase">{title}</h3>
          {headerAction && (
            <div className="flex items-center gap-2">{headerAction}</div>
          )}
        </div>
      )}
      <div className={cn(!noPadding && 'p-4')}>{children}</div>
    </div>
  );
}
