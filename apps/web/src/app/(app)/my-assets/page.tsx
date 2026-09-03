import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MyAssetsPageClient } from './page-client';

export const metadata = {
  title: 'Aset Saya | JARVIS OPS',
  description: 'Daftar perangkat dan aset IT yang ditugaskan kepada Anda.',
};

export default function MyAssetsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <MyAssetsPageClient />
    </Suspense>
  );
}