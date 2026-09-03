'use client';

import React from 'react';
import { AlertTriangle, Clock, CheckCircle2, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlaTrackerProps {
  slaStatus: string;
  duration: number;
  remaining: number | null;
}

export function SlaTracker({ slaStatus, duration, remaining }: SlaTrackerProps) {
  // Final state (resolved/closed): no progress bar, show final badge
  if (remaining === null) {
    return (
      <div className="flex items-center gap-1.5 rounded-sm bg-[#eaf0e6] px-2 py-0.5 text-xs font-medium text-[#4d663e]">
        <CircleCheck className="h-3.5 w-3.5 shrink-0" />
        <span>Selesai</span>
      </div>
    );
  }

  const isBreached = slaStatus === 'breached' || remaining < 0;

  if (isBreached) {
    const overdueMins = Math.abs(remaining);
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 rounded-sm bg-[#fae8e8] px-2 py-0.5 text-xs font-medium text-[#991b1b]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Terlambat {overdueMins} menit</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={100}
          aria-label="Batas waktu SLA terlampaui"
          className="h-1.5 w-full overflow-hidden rounded-full bg-[#f5d2d2]"
        >
          <div className="h-full w-full rounded-full bg-[#991b1b]" />
        </div>
      </div>
    );
  }

  // Compute progress percent (elapsed ratio, clamped 0-100)
  const progress = duration > 0 ? Math.min(100, Math.max(0, ((duration - remaining) / duration) * 100)) : 0;
  const isWarning = remaining <= duration * 0.25;

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium',
          isWarning
            ? 'bg-[#fbf0e4] text-[#b45309]'
            : 'bg-[#eaf0e6] text-[#4d663e]'
        )}
      >
        {isWarning ? (
          <Clock className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        )}
        <span>Sisa {remaining} menit</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label="Progress batas waktu SLA"
        className="h-1.5 w-full overflow-hidden rounded-full bg-[#eceae4]"
      >
        <div
          className={cn(
            'h-full rounded-full',
            isWarning ? 'bg-[#b45309]' : 'bg-[#4d663e]'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}