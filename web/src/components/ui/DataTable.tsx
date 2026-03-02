'use client';

import { cn } from '@/lib/cn';
import { Spinner } from '@/components/ui/Spinner';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns:      Column<T>[];
  data:         T[];
  isLoading?:   boolean;
  isError?:     boolean;
  emptyMessage?: string;
  sortKey?:     string;
  sortOrder?:   'asc' | 'desc';
  onSort?:      (key: string) => void;
  rowClassName?: (row: T) => string;
  onRowClick?:  (row: T) => void;
  className?:   string;
}

function SortIcon({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  return (
    <span className={cn('inline-flex flex-col ml-1', active ? 'text-accent' : 'text-text-muted')}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className={cn('mb-[1px]', active && order === 'asc' ? 'opacity-100' : 'opacity-40')}>
        <path d="M4 1L7 5H1L4 1Z" />
      </svg>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className={cn(active && order === 'desc' ? 'opacity-100' : 'opacity-40')}>
        <path d="M4 7L1 3H7L4 7Z" />
      </svg>
    </span>
  );
}

export function DataTable<T extends { id: number }>({
  columns,
  data,
  isLoading   = false,
  isError     = false,
  emptyMessage = 'No results found.',
  sortKey,
  sortOrder   = 'asc',
  onSort,
  rowClassName,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('relative w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-subtle">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'px-3 py-2.5 text-left text-xs font-medium text-text-muted select-none whitespace-nowrap',
                  col.sortable && 'cursor-pointer hover:text-text-secondary',
                  col.className
                )}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
              >
                {col.header}
                {col.sortable && (
                  <SortIcon
                    active={sortKey === col.key}
                    order={sortOrder}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <div className="flex items-center justify-center gap-2 text-text-muted">
                  <Spinner size="sm" />
                  <span className="text-sm">Loading leads...</span>
                </div>
              </td>
            </tr>
          )}
          {isError && !isLoading && (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center text-sm text-red-400">
                Failed to load data. Please try again.
              </td>
            </tr>
          )}
          {!isLoading && !isError && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center text-sm text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
          {!isLoading && !isError && data.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-border-subtle transition-colors duration-75',
                onRowClick && 'cursor-pointer hover:bg-surface-hover',
                rowClassName?.(row)
              )}
              style={{ height: '44px' }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('px-3 py-0 align-middle', col.className)}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
