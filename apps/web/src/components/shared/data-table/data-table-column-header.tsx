import React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps {
  title: string;
  sorted?: 'asc' | 'desc' | false;
  onSort?: () => void;
  className?: string;
}

export function DataTableColumnHeader({
  title,
  sorted = false,
  onSort,
  className,
}: DataTableColumnHeaderProps) {
  if (!onSort) {
    return <span className={cn('text-xs font-semibold', className)}>{title}</span>;
  }

  return (
    <button
      type="button"
      onClick={onSort}
      className={cn(
        'group inline-flex items-center gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm',
        sorted && 'text-foreground font-bold',
        className
      )}
      aria-label={`Urutkan berdasarkan ${title}`}
    >
      <span>{title}</span>
      {sorted === 'asc' ? (
        <ChevronUp className="h-3.5 w-3.5 text-foreground" />
      ) : sorted === 'desc' ? (
        <ChevronDown className="h-3.5 w-3.5 text-foreground" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
      )}
    </button>
  );
}
