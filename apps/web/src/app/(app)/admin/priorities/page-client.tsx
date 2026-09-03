'use client';

import React from 'react';
import { MasterDataPage } from '@/components/shared/MasterDataPage';
import { ticketPriorityConfigBase } from '@/components/admin/master-data-configs';
import type { TicketPriority } from '@/types/tickets';
import type { ColumnDef } from '@/components/shared/data-table/data-table';
import { Badge } from '@/components/ui/badge';

const columns: ColumnDef<TicketPriority>[] = [
  {
    id: 'level',
    header: 'Level',
    className: 'w-20',
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono text-xs">
        L{row.level ?? '—'}
      </Badge>
    ),
  },
  {
    id: 'name',
    header: 'Nama Prioritas',
    cell: ({ row }) => (
      <span className="font-medium text-foreground text-sm">{row.name}</span>
    ),
  },
  {
    id: 'sla_minutes',
    header: 'Target SLA',
    className: 'w-32',
    cell: ({ row }) => (
      <span className="text-xs font-semibold text-foreground">
        {row.sla_minutes} menit
      </span>
    ),
  },
  {
    id: 'description',
    header: 'Deskripsi',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{row.description ?? '—'}</span>
    ),
  },
];

export function TicketPrioritiesPageClient() {
  return <MasterDataPage<TicketPriority> {...ticketPriorityConfigBase} columns={columns} />;
}
