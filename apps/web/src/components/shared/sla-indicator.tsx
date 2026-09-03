import React from 'react';
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import type { SlaStatus } from '@/types/tickets';
import { cn } from '@/lib/utils';

interface SlaIndicatorProps {
  slaStatus: SlaStatus | string;
  remainingMinutes?: number | null;
  durationMinutes?: number;
  deadline?: string | null;
  className?: string;
}

export function SlaIndicator({
  slaStatus,
  remainingMinutes,
  durationMinutes,
  className,
}: SlaIndicatorProps) {
  const isBreached = slaStatus === 'breached' || (remainingMinutes !== undefined && remainingMinutes !== null && remainingMinutes < 0);

  if (isBreached) {
    const overdueMins = remainingMinutes ? Math.abs(remainingMinutes) : 0;
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[#fae8e8] px-2 py-0.5 text-xs font-medium text-[#991b1b]',
          className
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Terlambat {overdueMins > 0 ? `${overdueMins} mnt` : '(Breach)'}</span>
      </div>
    );
  }

  // Warning state: Remaining time <= 25% of total SLA duration
  const isWarning =
    durationMinutes &&
    remainingMinutes !== undefined &&
    remainingMinutes !== null &&
    remainingMinutes > 0 &&
    remainingMinutes <= durationMinutes * 0.25;

  if (isWarning) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[#fbf0e4] px-2 py-0.5 text-xs font-medium text-[#b45309]',
          className
        )}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>Sisa {remainingMinutes} mnt</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[#eaf0e6] px-2 py-0.5 text-xs font-medium text-[#4d663e]',
        className
      )}
    >
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      <span>
        {remainingMinutes !== undefined && remainingMinutes !== null && remainingMinutes >= 0
          ? `Sisa ${remainingMinutes} mnt`
          : 'Tepat Waktu'}
      </span>
    </div>
  );
}
