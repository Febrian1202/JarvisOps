import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { EditArticlePageClient } from './page-client';
import { laravelFetch } from '@/lib/server/api';
import type { KnowledgeArticleDetail } from '@/types/articles';

interface ArticlePayload {
  success: boolean;
  data: KnowledgeArticleDetail;
}

export const metadata = {
  title: 'Ubah Artikel | JARVIS OPS',
  description: 'Perbarui judul, kategori, atau konten artikel basis pengetahuan.',
};

export default async function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const detailRes = await laravelFetch(`/articles/${slug}`, { cache: 'no-store' });
  if (!detailRes.ok) {
    notFound();
  }
  const detailPayload = (await detailRes.json()) as ArticlePayload;
  const articleId = detailPayload.data.id;

  const editRes = await laravelFetch(`/articles/${articleId}/edit`, { cache: 'no-store' });
  if (!editRes.ok) {
    notFound();
  }
  const editPayload = (await editRes.json()) as ArticlePayload;

  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <EditArticlePageClient article={editPayload.data} />
    </Suspense>
  );
}