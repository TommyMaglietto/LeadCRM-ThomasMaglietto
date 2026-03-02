'use client';

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
  breadcrumb?: string;
}

export function Header({ title, actions, breadcrumb }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-6">
      <div className="flex flex-col justify-center min-w-0">
        {breadcrumb && (
          <span className="text-[11px] text-text-muted leading-none mb-0.5">{breadcrumb}</span>
        )}
        <h1 className="text-sm font-semibold text-text-primary truncate leading-none">
          {title}
        </h1>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {actions}
        </div>
      )}
    </header>
  );
}
