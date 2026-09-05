import React from 'react';
import { CheckCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface SlaComplianceCardProps {
  compliancePercentage?: number | null;
  withinSla?: number;
  breachedSla?: number;
  isLoading?: boolean;
  className?: string;
}

export function SlaComplianceCard({
  compliancePercentage = null,
  withinSla = 0,
  breachedSla = 0,
  isLoading = false,
  className,
}: SlaComplianceCardProps) {
  const hasData = compliancePercentage !== null && compliancePercentage !== undefined;
  const isDanger = hasData && compliancePercentage < 85;

  const totalResolved = withinSla + breachedSla;
  const withinRatio = totalResolved > 0 ? (withinSla / totalResolved) * 100 : 0;
  const breachedRatio = totalResolved > 0 ? (breachedSla / totalResolved) * 100 : 0;

  return (
    <div
      className={cn(
        'rounded-card border border-border bg-card p-3 sm:p-4 flex flex-col justify-between shadow-xs',
        isDanger && 'border-[#fae8e8]/80 dark:border-destructive/40 bg-[#fdf2f2]/60 dark:bg-card dark:border-red-900/50',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-xs font-medium truncate',
            isDanger ? 'text-destructive dark:text-red-300' : 'text-muted-foreground'
          )}
        >
          SLA Compliance
        </span>
        <div
          className={cn(
            'flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full',
            isDanger
              ? 'bg-[#fae8e8] text-[#991b1b] dark:bg-red-950/70 dark:text-red-400 dark:border dark:border-red-800/40'
              : 'bg-muted/60 text-muted-foreground'
          )}
        >
          <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.5} />
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <Skeleton className="h-6 sm:h-8 w-20" />
        ) : (
          <div
            className={cn(
              'text-lg sm:text-2xl font-semibold tracking-tight',
              isDanger ? 'text-[#991b1b] dark:text-red-400' : 'text-foreground'
            )}
          >
            {hasData ? `${compliancePercentage}%` : '—'}
          </div>
        )}
      </div>

      {/* Sub-bar Visual Progress */}
      <div className="mt-2.5">
        {isLoading ? (
          <Skeleton className="h-2 w-full rounded-full" />
        ) : (
          <div
            role="progressbar"
            aria-valuenow={hasData ? compliancePercentage : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="SLA Compliance Rate"
            className="h-2 w-full rounded-full bg-muted/60 overflow-hidden flex"
          >
            {totalResolved > 0 ? (
              <>
                <div
                  style={{ width: `${withinRatio}%` }}
                  className="h-full bg-[#7c8c6e] transition-all"
                  title={`${withinSla} tepat waktu`}
                />
                <div
                  style={{ width: `${breachedRatio}%` }}
                  className="h-full bg-[#b91c1c] transition-all"
                  title={`${breachedSla} breached`}
                />
              </>
            ) : (
              <div className="h-full w-full bg-muted/40" />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={cn(
          'mt-1.5 sm:mt-2 text-[11px] sm:text-xs leading-tight',
          isDanger ? 'text-destructive/90 dark:text-red-300/90 font-medium' : 'text-muted-foreground'
        )}
      >
        {isLoading ? (
          <Skeleton className="h-4 w-32 mt-0.5" />
        ) : totalResolved > 0 ? (
          <span>{`${withinSla} tepat waktu / ${breachedSla} breached`}</span>
        ) : (
          <span>Belum ada data tiket selesai pada rentang ini</span>
        )}
      </div>
    </div>
  );
}
