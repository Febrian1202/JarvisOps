'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { articleKeys } from '@/lib/query-keys';
import type { KnowledgeArticleListItem, KnowledgeCategory } from '@/types/articles';

export interface ArticleQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number | string;
  status?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  [key: string]: unknown;
}

export function useArticles(params: ArticleQueryParams = {}) {
  return useQuery({
    queryKey: articleKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.set(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      const endpoint = queryString ? `/articles?${queryString}` : '/articles';
      return apiFetch<KnowledgeArticleListItem[]>(endpoint);
    },
  });
}

export function useArticleCategories() {
  return useQuery({
    queryKey: articleKeys.categories,
    queryFn: () => apiFetch<KnowledgeCategory[]>('/knowledge-categories'),
    staleTime: 5 * 60 * 1000,
  });
}
