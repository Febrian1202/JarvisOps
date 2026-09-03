import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EditAssetPageClient } from './page-client';

export const metadata = {
  title: 'Ubah Aset | JARVIS OPS',
  description: 'Perbarui informasi data aset pada inventaris IT perusahaan.',
};

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
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
      <EditAssetPageClient assetId={Number(id)} />
    </Suspense>
  );
}