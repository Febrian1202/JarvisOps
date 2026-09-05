import React, { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  label: string;
  value: string | number | null;
  icon?: LucideIcon;
  footer?: ReactNode;
  tone?: 'default' | 'danger';
  isLoading?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  footer,
  tone = 'default',
  isLoading = false,
  className,
}: MetricCardProps) {
  const isDanger = tone === 'danger';

  return (
    <div
      className={cn(
        'rounded-card border border-border bg-card p-4 flex flex-col justify-between shadow-xs',
        isDanger && 'border-[#fae8e8]/80 dark:border-destructive/40 bg-[#fdf2f2]/60 dark:bg-card dark:border-red-900/50',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-xs font-medium line-clamp-1',
            isDanger ? 'text-destructive dark:text-red-300' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
        {Icon && (
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              isDanger
                ? 'bg-[#fae8e8] text-[#991b1b] dark:bg-red-950/70 dark:text-red-400 dark:border dark:border-red-800/40'
                : 'bg-muted/60 text-muted-foreground'
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="mt-3">
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div
            className={cn(
              'text-2xl font-semibold tracking-tight',
              isDanger ? 'text-[#991b1b] dark:text-red-400' : 'text-foreground'
            )}
          >
            {value === null || value === undefined ? '—' : value}
          </div>
        )}
      </div>

      {footer && !isLoading && (
        <div
          className={cn(
            'mt-2 text-xs',
            isDanger ? 'text-destructive/90 dark:text-red-300/90 font-medium' : 'text-muted-foreground'
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
