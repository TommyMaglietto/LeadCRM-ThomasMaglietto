'use client';

import { Header } from './Header';
import { cn } from '@/lib/cn';

interface PageShellProps {
  title: string;
  actions?: React.ReactNode;
  breadcrumb?: string;
  children: React.ReactNode;
  className?: string;
  /** Remove default padding (useful for full-bleed layouts) */
  noPadding?: boolean;
}

export function PageShell({
  title,
  actions,
  breadcrumb,
  children,
  className,
  noPadding = false,
}: PageShellProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <Header title={title} actions={actions} breadcrumb={breadcrumb} />
      <main
        className={cn(
          'flex-1 overflow-y-auto',
          !noPadding && 'p-6',
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
