'use client';

import React from 'react';
import { MasterDataPage } from '@/components/shared/MasterDataPage';
import { ticketCategoryConfigBase } from '@/components/admin/master-data-configs';
import type { TicketCategory } from '@/types/tickets';
import type { ColumnDef } from '@/components/shared/data-table/data-table';

const columns: ColumnDef<TicketCategory>[] = [
  {
    id: 'name',
    header: 'Nama Kategori',
    cell: ({ row }) => (
      <span className="font-medium text-foreground text-sm">{row.name}</span>
    ),
  },
  {
    id: 'parent',
    header: 'Kategori Induk',
    className: 'w-48',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{row.parent?.name ?? '—'}</span>
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

export function TicketCategoriesPageClient() {
  return <MasterDataPage<TicketCategory> {...ticketCategoryConfigBase} columns={columns} />;
}
