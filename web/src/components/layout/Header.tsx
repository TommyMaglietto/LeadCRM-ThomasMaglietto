'use client';

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
  breadcrumb?: string;
}

export function Header({ title, actions, breadcrumb }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink/10 bg-cream px-6">
      <div className="flex flex-col justify-center min-w-0">
        {breadcrumb && (
          <span className="text-[11px] text-rubble leading-none mb-1 uppercase tracking-wider font-medium">{breadcrumb}</span>
        )}
        <h1 className="font-display text-2xl text-ink tracking-wide uppercase truncate leading-none">
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
