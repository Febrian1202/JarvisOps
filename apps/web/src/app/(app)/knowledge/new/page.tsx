import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateArticlePageClient } from './page-client';

export const metadata = {
  title: 'Buat Artikel Baru | JARVIS OPS',
  description: 'Tulis dan publikasikan artikel panduan untuk basis pengetahuan.',
};

export default function CreateArticlePage() {
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
      <CreateArticlePageClient />
    </Suspense>
  );
}