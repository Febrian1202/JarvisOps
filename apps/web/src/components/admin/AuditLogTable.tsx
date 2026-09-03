'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { DataTable, type ColumnDef } from '@/components/shared/data-table/data-table';
import { DataTableColumnHeader } from '@/components/shared/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/shared/relative-time';
import { getAuditActionLabel, getAuditModuleLabel } from '@/lib/labels';
import type { AuditLogListItem } from '@/types/audit';
import type { PaginationMeta } from '@/types/api';

interface AuditLogTableProps {
  items: AuditLogListItem[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  onViewDetail: (item: AuditLogListItem) => void;
}

export function AuditLogTable({
  items,
  meta,
  isLoading = false,
  sortBy = 'created_at',
  sortDir = 'desc',
  onSort,
  onPageChange,
  onPerPageChange,
  onViewDetail,
}: AuditLogTableProps) {
  const columns: ColumnDef<AuditLogListItem>[] = [
    {
      id: 'created_at',
      header: (
        <DataTableColumnHeader
          title="Waktu"
          sorted={sortBy === 'created_at' ? sortDir : false}
          onSort={() => onSort('created_at')}
        />
      ),
      className: 'w-36',
      cell: ({ row }) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-foreground">
            <RelativeTime date={row.created_at} />
          </span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(row.created_at).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      ),
    },
    {
      id: 'user',
      header: 'Pelaku',
      className: 'w-40',
      cell: ({ row }) => (
        <span className="text-xs font-medium text-foreground truncate block">
          {row.user?.full_name ?? 'Sistem'}
        </span>
      ),
    },
    {
      id: 'action',
      header: (
        <DataTableColumnHeader
          title="Aksi"
          sorted={sortBy === 'action' ? sortDir : false}
          onSort={() => onSort('action')}
        />
      ),
      className: 'w-32',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="text-[11px] font-medium px-2 py-0.5 rounded-full border-border bg-muted/40 text-foreground"
        >
          {getAuditActionLabel(row.action)}
        </Badge>
      ),
    },
    {
      id: 'module',
      header: (
        <DataTableColumnHeader
          title="Modul"
          sorted={sortBy === 'module' ? sortDir : false}
          onSort={() => onSort('module')}
        />
      ),
      className: 'w-32',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-foreground">{getAuditModuleLabel(row.module)}</span>
          {row.module_id && (
            <span className="font-mono text-[10px] text-muted-foreground">
              #{row.module_id}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Keterangan',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1">
          {row.description ?? '—'}
        </span>
      ),
    },
    {
      id: 'ip_address',
      header: 'IP Address',
      className: 'w-28 hidden md:table-cell',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.ip_address ?? '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Rincian',
      className: 'w-16 text-right',
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`Lihat rincian log #${row.id}`}
          onClick={() => onViewDetail(row)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      meta={meta}
      isLoading={isLoading}
      emptyTitle="Tidak Ada Log Audit Ditemukan"
      emptyDescription="Belum ada catatan aktivitas sistem yang cocok dengan kriteria filter Anda."
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
    />
  );
}
