'use client';

import React from 'react';
import { ArticleCard } from './ArticleCard';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTablePagination } from '@/components/shared/data-table/data-table-pagination';
import type { KnowledgeArticleListItem } from '@/types/articles';
import type { PaginationMeta } from '@/types/api';

interface ArticleCardGridProps {
  articles: KnowledgeArticleListItem[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  showStatus?: boolean;
  canEdit?: boolean;
}

export function ArticleCardGrid({
  articles,
  meta,
  isLoading = false,
  onPageChange,
  onPerPageChange,
  showStatus = true,
  canEdit = false,
}: ArticleCardGridProps) {
  return (
    <div className="space-y-6">
      {isLoading ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Memuat daftar artikel">
          {Array.from({ length: 6 }).map((_, idx) => (
            <li key={`skeleton-${idx}`} className="h-full">
              <div className="flex h-[180px] flex-col justify-between rounded-xl border border-border bg-card p-5">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24 rounded-sm" />
                  {showStatus && <Skeleton className="h-5 w-16 rounded-full" />}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-full rounded-sm" />
                  <Skeleton className="h-5 w-4/5 rounded-sm" />
                </div>
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-20 rounded-sm" />
                  <Skeleton className="h-4 w-16 rounded-sm" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : articles.length === 0 ? (
        <div className="py-8">
          <EmptyState
            title="Tidak Ada Artikel Ditemukan"
            description="Belum ada artikel yang cocok dengan kriteria pencarian atau filter Anda."
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Daftar artikel">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} showStatus={showStatus} canEdit={canEdit} />
          ))}
        </ul>
      )}

      {meta && onPageChange && articles.length > 0 && (
        <DataTablePagination
          meta={meta}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
        />
      )}
    </div>
  );
}
