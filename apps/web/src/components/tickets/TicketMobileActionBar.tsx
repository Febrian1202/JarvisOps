import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { getTicketActionLabel } from '@/lib/labels';
import type { TicketDetail, TicketAction } from '@/types/tickets';

const PRIMARY_ACTIONS: TicketAction[] = ['assign', 'start', 'resolve', 'close', 'reopen'];

interface TicketMobileActionBarProps {
  ticket: TicketDetail;
  onAction: (action: TicketAction) => void;
  onCommentClick: () => void;
}

export function TicketMobileActionBar({
  ticket,
  onAction,
  onCommentClick,
}: TicketMobileActionBarProps) {
  const primaryActions = ticket.available_actions.filter((a) => PRIMARY_ACTIONS.includes(a as TicketAction));
  const canComment = ticket.available_actions.includes('comment');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] sm:hidden">
      <div className="flex gap-2">
        {canComment && (
          <Button
            variant="outline"
            className="min-h-[44px] flex-1 gap-2"
            onClick={onCommentClick}
            aria-label="Tulis Komentar"
          >
            <MessageSquare className="h-4 w-4" />
            Komentar
          </Button>
        )}
        {primaryActions.slice(0, 1).map((action) => (
          <Button
            key={action}
            className="min-h-[44px] flex-1"
            onClick={() => onAction(action as TicketAction)}
          >
            {getTicketActionLabel(action)}
          </Button>
        ))}
      </div>
    </div>
  );
}