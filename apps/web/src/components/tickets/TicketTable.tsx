'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type ColumnDef } from '@/components/shared/data-table/data-table';
import { DataTableColumnHeader } from '@/components/shared/data-table/data-table-column-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { SlaIndicator } from '@/components/shared/sla-indicator';
import { RelativeTime } from '@/components/shared/relative-time';
import { TicketCard } from './TicketCard';
import type { TicketListItem } from '@/types/tickets';
import type { PaginationMeta } from '@/types/api';

interface TicketTableProps {
  tickets: TicketListItem[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}

export function TicketTable({
  tickets,
  meta,
  isLoading = false,
  sortBy = 'created_at',
  sortDir = 'desc',
  onSort,
  onPageChange,
  onPerPageChange,
}: TicketTableProps) {
  const router = useRouter();

  const columns: ColumnDef<TicketListItem>[] = [
    {
      id: 'ticket_number',
      header: (
        <DataTableColumnHeader
          title="Nomor Tiket"
          sorted={sortBy === 'ticket_number' ? sortDir : false}
          onSort={() => onSort('ticket_number')}
        />
      ),
      className: 'w-28',
      cell: ({ row }) => (
        <span className="font-semibold text-primary font-mono text-xs">
          {row.ticket_number}
        </span>
      ),
    },
    {
      id: 'title',
      header: (
        <DataTableColumnHeader
          title="Judul Permohonan"
        />
      ),
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="font-medium text-foreground text-sm line-clamp-1">
            {row.title}
          </p>
          <p className="text-muted-foreground text-xs">{row.category?.name ?? '-'}</p>
        </div>
      ),
    },
    {
      id: 'reporter',
      header: 'Pelapor',
      className: 'w-36',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.reporter?.full_name ?? '-'}
        </span>
      ),
    },
    {
      id: 'priority',
      header: (
        <DataTableColumnHeader
          title="Prioritas"
          sorted={sortBy === 'priority_id' ? sortDir : false}
          onSort={() => onSort('priority_id')}
        />
      ),
      className: 'w-24',
      cell: ({ row }) => <PriorityBadge priority={row.priority?.name} />,
    },
    {
      id: 'category',
      header: 'Kategori',
      className: 'w-28',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.category?.name ?? '-'}
        </span>
      ),
    },
    {
      id: 'technician',
      header: 'Teknisi',
      className: 'w-36',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.technician?.full_name ?? (
            <em className="text-muted-foreground/60 not-italic">Belum ditugaskan</em>
          )}
        </span>
      ),
    },
    {
      id: 'status',
      header: (
        <DataTableColumnHeader
          title="Status"
          sorted={sortBy === 'status_id' ? sortDir : false}
          onSort={() => onSort('status_id')}
        />
      ),
      className: 'w-28',
      cell: ({ row }) => <StatusBadge status={row.status?.name} />,
    },
    {
      id: 'sla',
      header: (
        <DataTableColumnHeader
          title="SLA"
          sorted={sortBy === 'sla_deadline' ? sortDir : false}
          onSort={() => onSort('sla_deadline')}
        />
      ),
      className: 'w-28',
      cell: ({ row }) => (
        <SlaIndicator
          slaStatus={row.sla_status}
          durationMinutes={row.priority?.sla_minutes}
          deadline={row.sla_deadline}
        />
      ),
    },
    {
      id: 'created_at',
      header: (
        <DataTableColumnHeader
          title="Dibuat"
          sorted={sortBy === 'created_at' ? sortDir : false}
          onSort={() => onSort('created_at')}
        />
      ),
      className: 'w-28',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          <RelativeTime date={row.created_at} />
        </span>
      ),
    },
  ];

  return (
    <div className="w-full">
      <DataTable
        columns={columns}
        data={tickets}
        meta={meta}
        isLoading={isLoading}
        emptyTitle="Tidak Ada Tiket Ditemukan"
        emptyDescription="Belum ada permohonan tiket bantuan teknis yang cocok dengan kriteria pencarian Anda."
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        onRowClick={(row) => router.push(`/tickets/${row.id}`)}
        renderCard={(row) => <TicketCard ticket={row} />}
      />
    </div>
  );
}
