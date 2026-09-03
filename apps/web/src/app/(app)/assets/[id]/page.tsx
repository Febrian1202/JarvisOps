import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetDetailPageClient } from './page-client';

export const metadata = {
  title: 'Detail Aset | JARVIS OPS',
  description: 'Informasi detail dan riwayat kepemilikan aset perusahaan.',
};

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <AssetDetailPageClient assetId={Number(id)} />
    </Suspense>
  );
}