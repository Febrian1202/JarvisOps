'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DataTable, type ColumnDef } from '@/components/shared/data-table/data-table';
import { DataTableColumnHeader } from '@/components/shared/data-table/data-table-column-header';
import { AssetStatusBadge } from './AssetStatusBadge';
import { AssetCard } from './AssetCard';
import type { AssetListItem } from '@/types/assets';
import type { PaginationMeta } from '@/types/api';

interface AssetTableProps {
  assets: AssetListItem[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  showHolder?: boolean;
}

export function AssetTable({
  assets,
  meta,
  isLoading = false,
  sortBy = 'asset_tag',
  sortDir = 'asc',
  onSort,
  onPageChange,
  onPerPageChange,
  showHolder = true,
}: AssetTableProps) {
  const router = useRouter();

  const columns: ColumnDef<AssetListItem>[] = [
    {
      id: 'asset_tag',
      header: (
        <DataTableColumnHeader
          title="Kode Aset"
          sorted={sortBy === 'asset_tag' ? sortDir : false}
          onSort={() => onSort('asset_tag')}
        />
      ),
      className: 'w-28',
      cell: ({ row }) => (
        <span className="font-semibold text-primary font-mono text-xs">{row.asset_tag}</span>
      ),
    },
    {
      id: 'name',
      header: (
        <DataTableColumnHeader
          title="Nama Aset"
          sorted={sortBy === 'name' ? sortDir : false}
          onSort={() => onSort('name')}
        />
      ),
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="font-medium text-foreground text-sm truncate">{row.name}</p>
          <p className="text-muted-foreground text-xs">
            {[row.brand, row.model].filter(Boolean).join(' — ') || '—'}
          </p>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Kategori',
      className: 'w-32',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.category || '—'}</span>
      ),
    },
    {
      id: 'status',
      header: (
        <DataTableColumnHeader
          title="Status"
          sorted={sortBy === 'status' ? sortDir : false}
          onSort={() => onSort('status')}
        />
      ),
      className: 'w-28',
      cell: ({ row }) => <AssetStatusBadge status={row.status} />,
    },
    {
      id: 'holder',
      header: 'Pemegang',
      className: 'w-36',
      cell: ({ row }) =>
        showHolder ? (
          <span className="text-xs text-muted-foreground">
            {row.current_assignment?.full_name ?? '—'}
          </span>
        ) : null,
    },
    {
      id: 'purchase_date',
      header: (
        <DataTableColumnHeader
          title="Tgl. Beli"
          sorted={sortBy === 'purchase_date' ? sortDir : false}
          onSort={() => onSort('purchase_date')}
        />
      ),
      className: 'w-28',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.purchase_date ? new Date(row.purchase_date).toLocaleDateString('id-ID') : '—'}
        </span>
      ),
    },
  ];

  const visibleColumns = showHolder
    ? columns
    : columns.filter((col) => col.id !== 'holder');

  return (
    <div className="w-full">
      <DataTable
        columns={visibleColumns}
        data={assets}
        meta={meta}
        isLoading={isLoading}
        emptyTitle="Tidak Ada Aset Ditemukan"
        emptyDescription="Belum ada aset yang cocok dengan kriteria pencarian atau filter Anda."
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        onRowClick={(row) => router.push(`/assets/${row.id}`)}
        renderCard={(row) => (
          <AssetCard
            asset={row}
            showHolder={showHolder}
            onClick={(a) => router.push(`/assets/${a.id}`)}
          />
        )}
      />
    </div>
  );
}