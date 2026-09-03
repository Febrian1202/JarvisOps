'use client';

import React from 'react';
import { MasterDataPage } from '@/components/shared/MasterDataPage';
import { knowledgeCategoryConfigBase } from '@/components/admin/master-data-configs';
import type { KnowledgeCategory } from '@/types/articles';
import type { ColumnDef } from '@/components/shared/data-table/data-table';

const columns: ColumnDef<KnowledgeCategory>[] = [
  {
    id: 'name',
    header: 'Nama Kategori',
    cell: ({ row }) => (
      <span className="font-medium text-foreground text-sm">{row.name}</span>
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

export function KnowledgeCategoriesPageClient() {
  return <MasterDataPage<KnowledgeCategory> {...knowledgeCategoryConfigBase} columns={columns} />;
}
