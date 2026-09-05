import React from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { RelativeTime } from '@/components/shared/relative-time';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatSlaRemaining } from '@/lib/formatters';
import type { TicketListItem } from '@/types/tickets';

interface TicketMiniTableProps {
  tickets: TicketListItem[];
  isLoading?: boolean;
}

export function TicketMiniTable({ tickets, isLoading = false }: TicketMiniTableProps) {
  const router = useRouter();
  const [now] = React.useState(() => Date.now());

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        title="Tidak Ada Tiket"
        description="Belum ada tiket."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <caption className="sr-only">
          Daftar ringkasan tiket aktif terbaru milik karyawan
        </caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="pb-3 pt-1 font-medium">NOMOR</th>
            <th scope="col" className="pb-3 pt-1 font-medium">JUDUL</th>
            <th scope="col" className="pb-3 pt-1 font-medium">STATUS</th>
            <th scope="col" className="pb-3 pt-1 font-medium hidden sm:table-cell">PRIORITAS</th>
            <th scope="col" className="pb-3 pt-1 font-medium hidden md:table-cell">SISA SLA</th>
            <th scope="col" className="pb-3 pt-1 font-medium hidden sm:table-cell">DIBUAT</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tickets.map((ticket) => {
            const isFinished = ticket.status.name === 'RESOLVED' || ticket.status.name === 'CLOSED';
            let signedRemainingMinutes: number | null = null;

            if (ticket.sla_deadline && !isFinished) {
              const deadline = new Date(ticket.sla_deadline).getTime();
              signedRemainingMinutes = Math.round((deadline - now) / (1000 * 60));
            }

            return (
              <tr
                key={ticket.id}
                onClick={() => router.push(`/tickets/${ticket.id}`)}
                className="group cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 font-mono text-xs font-medium text-foreground group-hover:underline">
                  {ticket.ticket_number}
                </td>
                <td className="py-3 font-medium text-foreground max-w-[200px] truncate">
                  {ticket.title}
                </td>
                <td className="py-3">
                  <StatusBadge status={ticket.status.name} />
                </td>
                <td className="py-3 hidden sm:table-cell">
                  <PriorityBadge priority={ticket.priority.name} />
                </td>
                <td className="py-3 text-xs text-muted-foreground whitespace-nowrap hidden md:table-cell">
                  {formatSlaRemaining(signedRemainingMinutes, isFinished)}
                </td>
                <td className="py-3 text-xs text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                  <RelativeTime date={ticket.created_at} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
