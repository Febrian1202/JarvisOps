'use client';

import React from 'react';
import { KeyRound, Pencil, Power, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type ColumnDef } from '@/components/shared/data-table/data-table';
import { DataTableColumnHeader } from '@/components/shared/data-table/data-table-column-header';
import { getRoleLabel, userStatusLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { UserListItem } from '@/types/auth';
import type { PaginationMeta } from '@/types/api';

interface UsersTableProps {
  items: UserListItem[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  onEdit: (user: UserListItem) => void;
  onResetPassword: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => void;
  onToggleStatus: (user: UserListItem) => void;
}

export function UsersTable({
  items,
  meta,
  isLoading = false,
  sortBy = 'full_name',
  sortDir = 'asc',
  onSort,
  onPageChange,
  onPerPageChange,
  onEdit,
  onResetPassword,
  onDelete,
  onToggleStatus,
}: UsersTableProps) {
  const columns: ColumnDef<UserListItem>[] = [
    {
      id: 'full_name',
      header: (
        <DataTableColumnHeader
          title="Nama Lengkap"
          sorted={sortBy === 'full_name' ? sortDir : false}
          onSort={() => onSort('full_name')}
        />
      ),
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="font-medium text-foreground text-sm truncate">{row.full_name}</p>
          <p className="text-muted-foreground text-xs truncate">{row.email}</p>
        </div>
      ),
    },
    {
      id: 'email',
      header: (
        <DataTableColumnHeader
          title="Email"
          sorted={sortBy === 'email' ? sortDir : false}
          onSort={() => onSort('email')}
        />
      ),
      className: 'hidden md:table-cell',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.email}</span>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      className: 'w-32',
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className="rounded-full font-medium text-xs shadow-none border-border bg-muted/50 text-foreground"
        >
          {getRoleLabel(row.role?.name ?? '')}
        </Badge>
      ),
    },
    {
      id: 'department',
      header: 'Departemen',
      className: 'w-32 hidden sm:table-cell',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.department?.name ?? '—'}
        </span>
      ),
    },
    {
      id: 'employee_code',
      header: 'Kode Karyawan',
      className: 'w-28 hidden lg:table-cell',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.employee_code ?? '—'}
        </span>
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
      className: 'w-24',
      cell: ({ row }) => {
        const isActive = row.status === 'active';
        return (
          <Badge
            variant="outline"
            className={cn(
              'rounded-full font-medium text-xs shadow-none border-transparent',
              isActive
                ? 'bg-[#eaf0e6] text-[#4d663e] border-[#d9e5d4]'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {userStatusLabels[row.status] ?? row.status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      className: 'w-40 text-right',
      cell: ({ row }) => {
        const isActive = row.status === 'active';
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label={`Edit pengguna ${row.full_name}`}
              onClick={() => onEdit(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label={`Reset password pengguna ${row.full_name}`}
              onClick={() => onResetPassword(row)}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 rounded-lg hover:text-foreground',
                isActive ? 'text-muted-foreground' : 'text-emerald-700'
              )}
              aria-label={
                isActive
                  ? `Nonaktifkan pengguna ${row.full_name}`
                  : `Aktifkan pengguna ${row.full_name}`
              }
              onClick={() => onToggleStatus(row)}
            >
              <Power className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
              aria-label={`Hapus pengguna ${row.full_name}`}
              onClick={() => onDelete(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      meta={meta}
      isLoading={isLoading}
      emptyTitle="Tidak Ada Pengguna Ditemukan"
      emptyDescription="Belum ada pengguna yang cocok dengan kriteria pencarian atau filter Anda."
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
    />
  );
}
