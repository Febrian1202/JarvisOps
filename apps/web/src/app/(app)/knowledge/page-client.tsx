'use client';

import React, { useEffect, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArticleFilters } from '@/components/knowledge/ArticleFilters';
import { ArticleTable } from '@/components/knowledge/ArticleTable';
import { useArticles, type ArticleQueryParams } from '@/hooks/use-articles';
import { useAuth } from '@/components/providers/auth-provider';

export function KnowledgePageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can, hasRole } = useAuth();

  const page = Number(searchParams.get('page')) || 1;
  const perPage = Number(searchParams.get('per_page')) || 10;
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category_id') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') || 'desc';

  const canFilterStatus = can('article.create');
  const showStatus = canFilterStatus;
  const isEmployee = hasRole('employee');

  const queryParams: ArticleQueryParams = {
    page,
    per_page: perPage,
    search,
    category_id: categoryId,
    status: canFilterStatus ? status : '',
    sort_by: sortBy,
    sort_dir: sortDir,
  };

  const { data: response, isLoading } = useArticles(queryParams);
  const articles = response?.data ?? [];
  const meta = response?.meta;

  const canView = can('article.viewAny');
  useEffect(() => {
    if (!canView) router.replace('/403');
  }, [canView, router]);
  if (!canView) return null;

  const updateQueryParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateQueryParams({ sort_dir: sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      updateQueryParams({ sort_by: field, sort_dir: 'asc', page: 1 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-xl text-foreground tracking-tight">Basis Pengetahuan</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Panduan mandiri, dokumentasi solusi, dan standar operasional penanganan kendala IT.
          </p>
        </div>
        {can('article.create') && (
          <Button asChild size="sm" className="gap-1.5 self-start sm:self-auto">
            <Link href="/knowledge/new">
              <Plus className="h-4 w-4" />
              <span>Buat Artikel</span>
            </Link>
          </Button>
        )}
      </div>

      <ArticleFilters />

      <ArticleTable
        articles={articles}
        meta={meta}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onPageChange={(p) => updateQueryParams({ page: p })}
        onPerPageChange={(pp) => updateQueryParams({ per_page: pp, page: 1 })}
        showStatus={showStatus}
      />

      {isEmployee && articles.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada artikel. Silakan buat tiket untuk melaporkan masalah Anda.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/tickets/new">Buat Tiket</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
