'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { useArticleCategories } from '@/hooks/use-articles';
import { useAuth } from '@/components/providers/auth-provider';
import { articleStatusLabels } from '@/lib/labels';

export function ArticleFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can } = useAuth();
  const canFilterStatus = can('article.create');

  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category_id') || '';
  const status = searchParams.get('status') || '';

  const { data: categoriesResponse } = useArticleCategories();
  const categories = categoriesResponse?.data ?? [];

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'ALL') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    params.set('page', '1');
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  const resetAll = () => startTransition(() => router.replace(pathname));
  const hasActiveFilters = Boolean(search || categoryId || status);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(val) => updateFilters({ search: val })}
          placeholder="Cari judul atau isi artikel…"
          className="w-full sm:max-w-xs"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={categoryId || 'ALL'} onValueChange={(val) => updateFilters({ category_id: val })}>
          <SelectTrigger className="h-8 min-w-[140px] rounded-lg text-xs bg-card border-border">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canFilterStatus && (
          <Select value={status || 'ALL'} onValueChange={(val) => updateFilters({ status: val })}>
            <SelectTrigger className="h-8 min-w-[130px] rounded-lg text-xs bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
              {Object.entries(articleStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetAll} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
