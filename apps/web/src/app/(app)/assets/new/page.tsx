import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateAssetPageClient } from './page-client';

export const metadata = {
  title: 'Tambah Aset Baru | JARVIS OPS',
  description: 'Formulir pencatatan perangkat baru dalam inventaris IT perusahaan.',
};

export default function CreateAssetPage() {
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
      <CreateAssetPageClient />
    </Suspense>
  );
}