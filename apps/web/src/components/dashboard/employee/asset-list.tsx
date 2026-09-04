import React from 'react';
import Link from 'next/link';
import { Laptop } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { AssignableAsset } from '@/types/assets';

interface EmployeeAssetListProps {
  assets: AssignableAsset[];
  isLoading?: boolean;
}

export function EmployeeAssetList({ assets, isLoading = false }: EmployeeAssetListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 py-1">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <EmptyState
        title="Tidak Ada Aset"
        description="Kamu belum memegang aset apa pun."
      />
    );
  }

  return (
    <div className="divide-y divide-cream-border/60">
      {assets.map((asset) => (
        <Link
          key={asset.id}
          href={`/assets/${asset.id}`}
          className="flex items-center justify-between py-3 group hover:bg-cream-card/50 px-1 rounded-sm transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground group-hover:text-foreground transition-colors">
              <Laptop className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate group-hover:underline">
                {asset.name}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {asset.asset_tag}
              </div>
            </div>
          </div>
          <StatusBadge status={asset.status} />
        </Link>
      ))}
    </div>
  );
}
