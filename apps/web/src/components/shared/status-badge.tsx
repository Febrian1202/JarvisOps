import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getTicketStatusLabel } from '@/lib/labels';
import type { TicketStatusName } from '@/types/tickets';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: TicketStatusName | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase();

  // Style mapping following warm-neutral aesthetic from DESIGN.md
  let badgeVariantClass = 'bg-muted text-muted-foreground border-transparent';

  switch (normalizedStatus) {
    case 'OPEN':
      badgeVariantClass = 'bg-[#f0ede6] text-[#5f5f5d] border-[#eceae4]';
      break;
    case 'ASSIGNED':
      badgeVariantClass = 'bg-[#e8edf2] text-[#42526e] border-[#d8e0ea]';
      break;
    case 'IN_PROGRESS':
      badgeVariantClass = 'bg-[#f5ebd9] text-[#8a5b1e] border-[#ebdcc4]';
      break;
    case 'RESOLVED':
      badgeVariantClass = 'bg-[#eaf0e6] text-[#4d663e] border-[#d9e5d4]';
      break;
    case 'CLOSED':
      badgeVariantClass = 'bg-[#eceae4] text-[#1c1c1c] border-[#dcd9d0]';
      break;
  }

  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs px-2.5 py-0.5 rounded-full shadow-none', badgeVariantClass, className)}
    >
      {getTicketStatusLabel(normalizedStatus)}
    </Badge>
  );
}
