import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { KnowledgePageClient } from './page-client';

export const metadata = {
  title: 'Basis Pengetahuan | JARVIS OPS',
  description: 'Panduan mandiri dan dokumentasi solusi untuk kendala IT.',
};

export default function KnowledgePage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <KnowledgePageClient />
    </Suspense>
  );
}
