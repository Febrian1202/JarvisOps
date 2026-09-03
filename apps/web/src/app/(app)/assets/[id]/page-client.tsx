'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetDetailCard } from '@/components/assets/AssetDetailCard';
import { AssetHistoryTimeline } from '@/components/assets/AssetHistoryTimeline';
import { AssignDialog } from '@/components/assets/AssignDialog';
import { ReleaseDialog } from '@/components/assets/ReleaseDialog';
import { EmptyState } from '@/components/shared/empty-state';
import { useAsset, useAssetHistory } from '@/hooks/use-assets';
import { apiFetch, ApiError } from '@/lib/client/api';
import { assetKeys } from '@/lib/query-keys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useAuth } from '@/components/providers/auth-provider';
import type { AssetDetail } from '@/types/assets';

function AssetLoaded({ asset }: { asset: AssetDetail }) {
  const { can } = useAuth();
  const [assignOpen, setAssignOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);

  const { data: historyResponse, isLoading: historyLoading } = useAssetHistory(asset.id);
  const events = historyResponse?.data ?? [];

  const detailKey = assetKeys.detail(asset.id);
  const listKeys = assetKeys.lists();

  const assignMutation = useApiMutation({
    mutationFn: (data: { user_id: number; notes?: string }) =>
      apiFetch<AssetDetail>(`/assets/${asset.id}/assign`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccessMessage: 'Aset berhasil ditugaskan.',
    invalidateKeys: [detailKey, listKeys],
    onSuccess: () => {
      setAssignOpen(false);
    },
  });

  const releaseMutation = useApiMutation({
    mutationFn: (data: { notes?: string }) =>
      apiFetch<AssetDetail>(`/assets/${asset.id}/release`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccessMessage: 'Aset berhasil dilepaskan.',
    invalidateKeys: [detailKey, listKeys],
    onSuccess: () => {
      setReleaseOpen(false);
    },
  });

  const canAssign = can('asset.assign');
  const canRelease = can('asset.release');
  const isAssigned = !!asset.current_assignment;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground">
          <Link href="/assets">
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Daftar Aset
          </Link>
        </Button>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2">
        {canAssign && !isAssigned && (
          <Button size="sm" className="gap-1.5" onClick={() => setAssignOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Tugaskan Aset
          </Button>
        )}
        {canRelease && isAssigned && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setReleaseOpen(true)}>
            <UserMinus className="h-4 w-4" />
            Lepaskan Penugasan
          </Button>
        )}
      </div>

      {/* Detail + History layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <AssetDetailCard asset={asset} />
        </div>
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Riwayat Kepemilikan &amp; Perubahan
            </h2>
            <AssetHistoryTimeline events={events} isLoading={historyLoading} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        asset={asset}
        isSubmitting={assignMutation.isPending}
        onSubmit={(data) => assignMutation.mutate(data)}
      />
      <ReleaseDialog
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        asset={asset}
        isSubmitting={releaseMutation.isPending}
        onSubmit={(data) => releaseMutation.mutate(data)}
      />
    </div>
  );
}

export function AssetDetailPageClient({ assetId }: { assetId: number }) {
  const router = useRouter();
  const { can } = useAuth();
  const { data: response, isLoading, error } = useAsset(assetId);

  const canView = can('asset.viewAny');
  useEffect(() => {
    if (!canView) router.replace('/403');
  }, [canView, router]);

  if (!canView) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !response?.data) {
    const is404 = error instanceof ApiError && error.status === 404;

    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center shadow-xs">
        <EmptyState
          title={is404 ? 'Aset Tidak Ditemukan' : 'Gagal Memuat Aset'}
          description={
            is404
              ? 'Aset dengan ID tersebut tidak ditemukan dalam sistem.'
              : 'Terjadi kendala saat memuat rincian aset.'
          }
          action={{
            label: 'Kembali ke Inventaris',
            href: '/assets',
          }}
        />
      </div>
    );
  }

  return <AssetLoaded asset={response.data} />;
}