'use client';

import React from 'react';
import { ArrowRightLeft, History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/shared/relative-time';
import type { AssetTimelineEvent } from '@/types/assets';

interface AssetHistoryTimelineProps {
  events: AssetTimelineEvent[];
  isLoading?: boolean;
}

export function formatEventMessage(event: AssetTimelineEvent): string {
  if (event.type === 'history') {
    return event.description ?? 'Perubahan data aset';
  }

  const holderName = event.user?.full_name ?? 'Pengguna';
  if (event.action === 'released') {
    return `Dilepaskan dari ${holderName}`;
  }
  return `Ditugaskan ke ${holderName}`;
}

export function AssetHistoryTimeline({ events, isLoading = false }: AssetHistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3 rounded-sm" />
              <Skeleton className="h-3 w-2/3 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Belum ada riwayat kepemilikan atau perubahan.</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        const isAssignment = event.type === 'assignment';
        const isRelease = isAssignment && event.action === 'released';

        return (
          <li key={`${event.type}-${idx}`} className="relative flex gap-3 pb-5">
            {!isLast && <span aria-hidden className="absolute left-4 top-9 bottom-0 w-px bg-border" />}

            {/* Icon */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${
                isRelease
                  ? 'bg-[#f5ebd9] text-[#8a5b1e] ring-[#ebdcc4]'
                  : isAssignment
                    ? 'bg-[#e8edf2] text-[#42526e] ring-[#d8e0ea]'
                    : 'bg-[#eceae4] text-[#5f5f5d] ring-[#dcd9d0]'
              }`}
            >
              {isAssignment ? <ArrowRightLeft className="h-3.5 w-3.5" /> : <History className="h-3.5 w-3.5" />}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm text-foreground leading-relaxed">
                {formatEventMessage(event)}
              </p>
              {event.notes && (
                <p className="mt-1 rounded-lg bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                  {event.notes}
                </p>
              )}
              {event.occurred_at && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  <RelativeTime date={event.occurred_at} />
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}