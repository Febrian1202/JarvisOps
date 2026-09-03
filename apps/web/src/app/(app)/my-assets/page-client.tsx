'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AssetTable } from '@/components/assets/AssetTable';
import { useMyAssets, type AssetQueryParams } from '@/hooks/use-assets';

export function MyAssetsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const page = Number(searchParams.get('page')) || 1;
  const perPage = Number(searchParams.get('per_page')) || 10;

  const queryParams: AssetQueryParams = {
    page,
    per_page: perPage,
  };

  const { data: response, isLoading } = useMyAssets(queryParams);
  const assets = response?.data ?? [];
  const meta = response?.meta;

  const updateQueryParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') params.delete(key);
      else params.set(key, String(val));
    });

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-xl text-foreground tracking-tight">
          Aset Saya
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Daftar perangkat keras dan perlengkapan IT yang sedang ditugaskan kepada Anda.
        </p>
      </div>

      <AssetTable
        assets={assets}
        meta={meta}
        isLoading={isLoading}
        sortBy="asset_tag"
        sortDir="asc"
        onSort={() => {}}
        onPageChange={(p) => updateQueryParams({ page: p })}
        onPerPageChange={(pp) => updateQueryParams({ per_page: pp, page: 1 })}
        showHolder={false}
      />
    </div>
  );
}