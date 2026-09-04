import React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRightLeft,
  UserCheck,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import { RelativeTime } from '@/components/shared/relative-time';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getActivityFieldLabel } from '@/lib/labels';
import type { TicketHistoryItem } from '@/types/tickets';

interface TechnicianActivityListProps {
  activities: TicketHistoryItem[];
  isLoading?: boolean;
}

function getActivityIcon(fieldChanged: string) {
  switch (fieldChanged) {
    case 'status_id':
      return ArrowRightLeft;
    case 'technician_id':
      return UserCheck;
    case 'category_id':
      return Tag;
    case 'priority_id':
      return SlidersHorizontal;
    default:
      return Activity;
  }
}

export function TechnicianActivityList({
  activities,
  isLoading = false,
}: TechnicianActivityListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        title="Tidak Ada Aktivitas"
        description="Belum ada aktivitas."
      />
    );
  }

  return (
    <div className="divide-y divide-cream-border/60">
      {activities.map((item) => {
        const Icon = getActivityIcon(item.field_changed);
        const actionLabel = getActivityFieldLabel(item.field_changed);

        return (
          <div
            key={item.id}
            className="flex items-center justify-between py-3.5 px-1 hover:bg-cream-card/50 rounded-sm transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                  <span>{actionLabel}</span>
                  {item.ticket ? (
                    <Link
                      href={`/tickets?search=${encodeURIComponent(item.ticket.ticket_number)}`}
                      className="font-mono text-xs font-semibold text-primary hover:underline"
                    >
                      {item.ticket.ticket_number}
                    </Link>
                  ) : null}
                  {item.ticket?.title && (
                    <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                      — {item.ticket.title}
                    </span>
                  )}
                </div>
                {(item.old_value || item.new_value) && (
                  <div className="text-[11px] text-muted-foreground">
                    {item.old_value && <span className="line-through">{item.old_value}</span>}
                    {item.old_value && item.new_value && <span> → </span>}
                    {item.new_value && <span className="font-medium text-foreground">{item.new_value}</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground shrink-0 pl-2">
              <RelativeTime date={item.created_at} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
