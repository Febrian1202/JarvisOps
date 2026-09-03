'use client';

import React from 'react';
import { MasterDataPage } from '@/components/shared/MasterDataPage';
import {
  departmentConfigBase,
  type DepartmentItem,
} from '@/components/admin/master-data-configs';
import type { ColumnDef } from '@/components/shared/data-table/data-table';

const columns: ColumnDef<DepartmentItem>[] = [
  {
    id: 'name',
    header: 'Nama Departemen',
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

export function DepartmentsPageClient() {
  return <MasterDataPage<DepartmentItem> {...departmentConfigBase} columns={columns} />;
}
