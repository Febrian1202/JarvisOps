'use client';

import React, { useEffect, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssetFilters } from '@/components/assets/AssetFilters';
import { AssetTable } from '@/components/assets/AssetTable';
import { CsvExportButton } from '@/components/shared/CsvExportButton';
import { useAssets, type AssetQueryParams } from '@/hooks/use-assets';
import { useAuth } from '@/components/providers/auth-provider';

export function AssetsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { user, can, isLoading: isAuthLoading } = useAuth();

  const page = Number(searchParams.get('page')) || 1;
  const perPage = Number(searchParams.get('per_page')) || 10;
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const category = searchParams.get('category') || '';
  const assignedUserId = searchParams.get('assigned_user_id') || '';
  const sortBy = searchParams.get('sort_by') || 'asset_tag';
  const sortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') || 'asc';

  const queryParams: AssetQueryParams = {
    page,
    per_page: perPage,
    search,
    status,
    category,
    assigned_user_id: assignedUserId,
    sort_by: sortBy,
    sort_dir: sortDir,
  };

  const { data: response, isLoading } = useAssets(queryParams);
  const assets = response?.data ?? [];
  const meta = response?.meta;

  // Guard: only Technician/Manager/Admin can view assets
  const canViewAssets = can('asset.viewAny');
  useEffect(() => {
    if (!isAuthLoading && user && !canViewAssets) {
      router.replace('/403');
    }
  }, [canViewAssets, isAuthLoading, user, router]);

  if (!canViewAssets) {
    return null;
  }

  const updateQueryParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateQueryParams({ sort_dir: sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      updateQueryParams({ sort_by: field, sort_dir: 'asc', page: 1 });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-xl text-foreground tracking-tight">
            Inventaris Aset Perusahaan
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Manajemen inventaris perangkat, status operasional, siklus hidup, dan penugasan pengguna.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <CsvExportButton entity="assets" />

          {can('asset.create') && (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/assets/new">
                <Plus className="h-4 w-4" />
                <span>Tambah Aset Baru</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <AssetFilters />

      {/* Table */}
      <AssetTable
        assets={assets}
        meta={meta}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onPageChange={(p) => updateQueryParams({ page: p })}
        onPerPageChange={(pp) => updateQueryParams({ per_page: pp, page: 1 })}
      />
    </div>
  );
}