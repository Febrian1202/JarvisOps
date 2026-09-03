'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetForm } from '@/components/assets/AssetForm';
import { apiFetch } from '@/lib/client/api';
import { assetKeys } from '@/lib/query-keys';
import { useAuth } from '@/components/providers/auth-provider';
import type { AssetDetail } from '@/types/assets';

export function EditAssetPageClient({ assetId }: { assetId: number }) {
  const router = useRouter();
  const { can } = useAuth();
  const { data: response, isLoading } = useQuery({
    queryKey: assetKeys.detail(assetId),
    queryFn: () => apiFetch<AssetDetail>(`/assets/${assetId}`),
    enabled: Number.isFinite(assetId),
  });

  const canEdit = can('asset.update');
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

  const asset = response.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href={`/assets/${asset.id}`} aria-label="Kembali ke detail aset">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-bold text-xl text-foreground tracking-tight">
            Ubah Aset — {asset.asset_tag}
          </h1>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm pl-10">
          Perbarui data informasi perangkat <strong>{asset.name}</strong> pada inventaris IT.
        </p>
      </div>

      <AssetForm asset={asset} />
    </div>
  );
}