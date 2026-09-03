'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { RelativeTime } from '@/components/shared/relative-time';
import { useAuth } from '@/components/providers/auth-provider';
import { getTicketActionLabel } from '@/lib/labels';
import type { TicketDetail, TicketAction } from '@/types/tickets';

export type TicketBannerAction = TicketAction | 'delete';

// Actions rendered in the banner (dialog-driven). comment & attach are
// handled in their dedicated components (CommentForm / AttachmentList).
const BANNER_ACTIONS: TicketAction[] = [
  'start',
  'assign',
  'resolve',
  'close',
  'reopen',
  'unassign',
  'cancel',
  'change_priority',
  'edit',
];

interface TicketDetailBannerProps {
  ticket: TicketDetail;
  onAction: (action: TicketBannerAction) => void;
}

export function TicketDetailBanner({ ticket, onAction }: TicketDetailBannerProps) {
  const { can } = useAuth();

  const actions = ticket.available_actions.filter((a) => BANNER_ACTIONS.includes(a));

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
      {/* Top row: ticket number + badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-primary font-mono text-sm">
          {ticket.ticket_number}
        </span>
        <StatusBadge status={ticket.status.name} />
        <PriorityBadge priority={ticket.priority.name} />
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground text-xs font-normal">
          {ticket.category.name}
        </Badge>
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-foreground tracking-tight leading-snug">
        {ticket.title}
      </h1>

      {/* Reporter & metadata row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Pelapor: <span className="font-medium text-foreground">{ticket.reporter.full_name}</span>
        </span>
        {ticket.reporter.department && (
          <span>
            Departemen: <span className="font-medium text-foreground">{ticket.reporter.department}</span>
          </span>
        )}
        {ticket.technician && (
          <span>
            Teknisi: <span className="font-medium text-foreground">{ticket.technician.full_name}</span>
          </span>
        )}
        <span>
          Dibuat: <RelativeTime date={ticket.created_at} />
        </span>
        <span>
          Komentar: <span className="font-medium text-foreground">{ticket.comments_count}</span>
        </span>
        <span>
          Lampiran: <span className="font-medium text-foreground">{ticket.attachments_count}</span>
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
        {actions.map((action) => (
          <Button
            key={action}
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => onAction(action)}
          >
            {getTicketActionLabel(action)}
          </Button>
        ))}

        {/* Delete button — Admin only, not from available_actions */}
        {can('ticket.delete') && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 ml-auto"
            onClick={() => onAction('delete')}
          >
            Hapus Tiket
          </Button>
        )}
      </div>
    </div>
  );
}