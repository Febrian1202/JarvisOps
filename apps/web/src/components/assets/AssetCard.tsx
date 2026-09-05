'use client';

import React from 'react';
import { AssetStatusBadge } from './AssetStatusBadge';
import type { AssetListItem } from '@/types/assets';

export interface AssetCardProps {
  asset: AssetListItem;
  onClick?: (asset: AssetListItem) => void;
  showHolder?: boolean;
}

export function AssetCard({ asset, onClick, showHolder = true }: AssetCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Aset ${asset.asset_tag}: ${asset.name}`}
      onClick={() => onClick?.(asset)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(asset);
        }
      }}
      className="p-4 border-b border-border bg-card hover:bg-muted/50 transition-colors flex flex-col gap-2.5 min-h-[44px] cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono font-semibold text-xs text-primary">
          {asset.asset_tag}
        </span>
        <AssetStatusBadge status={asset.status} />
      </div>

      <div className="space-y-0.5">
        <h3 className="font-medium text-sm text-foreground line-clamp-1">
          {asset.name}
        </h3>
        <p className="text-xs text-muted-foreground">
          {[asset.brand, asset.model].filter(Boolean).join(' — ') || asset.category || '—'}
        </p>
      </div>

      <div className="pt-2 border-t border-border flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {showHolder && (
          <div className="min-w-0 truncate">
            <span>Pemegang: </span>
            <span className="font-medium text-foreground">
              {asset.current_assignment?.full_name ?? '—'}
            </span>
          </div>
        )}
        <div className="shrink-0 ml-auto text-right">
          <span>
            {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString('id-ID') : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
