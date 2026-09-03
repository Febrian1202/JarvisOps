'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArticleEditor } from '@/components/knowledge/ArticleEditor';
import { apiFetch } from '@/lib/client/api';
import { articleKeys } from '@/lib/query-keys';
import { useAuth } from '@/components/providers/auth-provider';
import type { KnowledgeArticleDetail } from '@/types/articles';

export function EditArticlePageClient({ articleId }: { articleId: number }) {
  const router = useRouter();
  const { can } = useAuth();
  const { data: response, isLoading } = useQuery({
    queryKey: articleKeys.edit(articleId),
    queryFn: () => apiFetch<KnowledgeArticleDetail>(`/articles/${articleId}/edit`), // A4 — tanpa view_count++
    enabled: Number.isFinite(articleId),
  });

  const canEdit = can('article.update');
  useEffect(() => {
    if (!canEdit) router.replace('/403');
  }, [canEdit, router]);

  if (!canEdit || isLoading || !response?.data) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/knowledge/${response.data.slug}`} aria-label="Kembali ke detail artikel">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-bold text-xl text-foreground tracking-tight">Ubah Artikel</h1>
      </div>
      <ArticleEditor article={response.data} />
    </div>
  );
}
