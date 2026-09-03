import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EditArticlePageClient } from './page-client';

export const metadata = {
  title: 'Ubah Artikel | JARVIS OPS',
  description: 'Perbarui judul, kategori, atau konten artikel basis pengetahuan.',
};

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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
      <EditArticlePageClient articleId={Number(id)} />
    </Suspense>
  );
}
