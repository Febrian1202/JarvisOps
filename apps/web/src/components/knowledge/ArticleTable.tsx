'use client';

import React from 'react';
import Link from 'next/link';
import { DataTable, type ColumnDef } from '@/components/shared/data-table/data-table';
import { DataTableColumnHeader } from '@/components/shared/data-table/data-table-column-header';
import { ArticleStatusBadge } from './ArticleStatusBadge';
import { RelativeTime } from '@/components/shared/relative-time';
import type { KnowledgeArticleListItem } from '@/types/articles';
import type { PaginationMeta } from '@/types/api';

interface ArticleTableProps {
  articles: KnowledgeArticleListItem[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  showStatus?: boolean;
}

export function ArticleTable({
  articles,
  meta,
  isLoading = false,
  sortBy = 'created_at',
  sortDir = 'desc',
  onSort,
  onPageChange,
  onPerPageChange,
  showStatus = true,
}: ArticleTableProps) {
  const columns: ColumnDef<KnowledgeArticleListItem>[] = [
    {
      id: 'title',
      header: (
        <DataTableColumnHeader title="Judul" sorted={sortBy === 'title' ? sortDir : false} onSort={() => onSort('title')} />
      ),
      cell: ({ row }) => (
        <Link href={`/knowledge/${row.slug}`} className="font-medium text-foreground text-sm hover:text-primary hover:underline">
          {row.title}
        </Link>
      ),
    },
    { id: 'category', header: 'Kategori', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.category?.name ?? '—'}</span> },
    { id: 'author', header: 'Penulis', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.author?.full_name ?? '—'}</span> },
    ...(showStatus
      ? [{ id: 'status', header: 'Status', className: 'w-28', cell: ({ row }: { row: KnowledgeArticleListItem }) => <ArticleStatusBadge status={row.status} /> }]
      : []),
    {
      id: 'view_count',
      header: (
        <DataTableColumnHeader title="Dilihat" sorted={sortBy === 'view_count' ? sortDir : false} onSort={() => onSort('view_count')} />
      ),
      className: 'w-20',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.view_count}</span>,
    },
    { id: 'published_at', header: 'Terbit', className: 'w-32', cell: ({ row }) => <RelativeTime date={row.published_at ?? row.created_at} className="text-xs text-muted-foreground" /> },
  ];

  return (
    <DataTable
      columns={columns}
      data={articles}
      meta={meta}
      isLoading={isLoading}
      emptyTitle="Tidak Ada Artikel Ditemukan"
      emptyDescription="Belum ada artikel yang cocok dengan kriteria pencarian atau filter Anda."
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
    />
  );
}
