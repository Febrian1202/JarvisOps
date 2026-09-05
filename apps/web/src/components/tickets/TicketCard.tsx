'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { SlaIndicator } from '@/components/shared/sla-indicator';
import { RelativeTime } from '@/components/shared/relative-time';
import type { TicketListItem } from '@/types/tickets';

interface TicketCardProps {
  ticket: TicketListItem;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const router = useRouter();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/tickets/${ticket.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/tickets/${ticket.id}`);
        }
      }}
      className="p-4 border-b border-border bg-card hover:bg-muted/50 transition-colors flex flex-col gap-3 min-h-[44px] cursor-pointer"
    >
      <div className="flex justify-between items-start gap-2">
        <span className="font-mono text-xs font-semibold text-primary">
          {ticket.ticket_number}
        </span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <StatusBadge status={ticket.status?.name} />
          <PriorityBadge priority={ticket.priority?.name} />
        </div>
      </div>

      <div>
        <h3 className="font-medium text-sm text-foreground line-clamp-2">
          {ticket.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {ticket.category?.name ?? 'Tidak ada kategori'}
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate flex-1" title={ticket.reporter?.full_name}>
            P: {ticket.reporter?.full_name ?? '-'}
          </span>
          <span className="truncate flex-1" title={ticket.technician?.full_name}>
            T: {ticket.technician?.full_name ?? '-'}
          </span>
          <div className="whitespace-nowrap shrink-0">
            <RelativeTime date={ticket.created_at} />
          </div>
        </div>

        <SlaIndicator
          slaStatus={ticket.sla_status}
          durationMinutes={ticket.priority?.sla_minutes}
          deadline={ticket.sla_deadline}
        />
      </div>
    </div>
  );
}
