'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { DataTablePagination } from '@/components/shared/data-table/data-table-pagination';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api';

export interface ColumnDef<TData> {
  id: string;
  header: React.ReactNode | ((props: { column: ColumnDef<TData> }) => React.ReactNode);
  accessorKey?: keyof TData;
  cell?: (props: { row: TData; value: unknown }) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  renderCard?: (row: TData, index: number) => React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  meta,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  onPageChange,
  onPerPageChange,
  renderCard,
}: DataTableProps<TData>) {
  return (
    <div className="space-y-3">
      <div
        className={cn(
          'rounded-xl border border-border bg-card overflow-hidden',
          renderCard && 'hidden sm:block'
        )}
      >
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={col.className ?? 'text-muted-foreground font-semibold text-xs py-3'}
                >
                  {typeof col.header === 'function'
                    ? col.header({ column: col })
                    : col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <TableRow key={`skeleton-row-${rIdx}`} className="border-border">
                  {columns.map((col, cIdx) => (
                    <TableCell key={`skeleton-cell-${cIdx}`} className="py-3">
                      <Skeleton className="h-5 w-full rounded-sm" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-8 text-center">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIdx) => (
                <TableRow
                  key={`data-row-${rowIdx}`}
                  className="border-border transition-colors hover:bg-muted/30"
                >
                  {columns.map((col) => {
                    const value = col.accessorKey ? row[col.accessorKey] : undefined;
                    return (
                      <TableCell key={col.id} className={col.className ?? 'py-3 text-sm'}>
                        {col.cell ? col.cell({ row, value }) : String(value ?? '-')}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {renderCard && (
        <div className="block sm:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`card-skeleton-${idx}`}
                data-testid="table-card-skeleton"
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <Skeleton className="h-5 w-1/3 rounded-sm" />
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-2/3 rounded-sm" />
              </div>
            ))
          ) : data.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <EmptyState title={emptyTitle} description={emptyDescription} />
            </div>
          ) : (
            data.map((row, idx) => (
              <React.Fragment key={`mobile-card-row-${idx}`}>
                {renderCard(row, idx)}
              </React.Fragment>
            ))
          )}
        </div>
      )}

      {meta && onPageChange && (
        <DataTablePagination
          meta={meta}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
        />
      )}
    </div>
  );
}
