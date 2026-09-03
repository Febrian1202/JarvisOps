'use client';

import React from 'react';
import { AssetStatusBadge } from './AssetStatusBadge';
import type { AssetDetail } from '@/types/assets';

interface AssetDetailCardProps {
  asset: AssetDetail;
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground text-right">{value}</dd>
    </div>
  );
}

export function AssetDetailCard({ asset }: AssetDetailCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
      {/* Banner */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-primary font-mono text-sm">{asset.asset_tag}</span>
        <span className="text-sm text-muted-foreground">—</span>
        <h1 className="font-bold text-xl text-foreground tracking-tight">{asset.name}</h1>
        <AssetStatusBadge status={asset.status} className="ml-auto" />
      </div>

      {/* Metadata */}
      <dl className="divide-y divide-border border-t border-border text-sm">
        <MetaRow label="Nama Aset" value={asset.name} />
        <MetaRow label="Kode Aset" value={asset.asset_tag} />
        <MetaRow label="Kategori" value={asset.category || '—'} />
        <MetaRow label="Merek" value={asset.brand || '—'} />
        <MetaRow label="Model" value={asset.model || '—'} />
        <MetaRow label="Nomor Seri" value={asset.serial_number || '—'} />
        <MetaRow
          label="Tanggal Pembelian"
          value={
            asset.purchase_date
              ? new Date(asset.purchase_date).toLocaleDateString('id-ID')
              : '—'
          }
        />
        <MetaRow
          label="Pemegang Saat Ini"
          value={asset.current_assignment?.full_name ?? '—'}
        />
      </dl>

      {/* Notes */}
      {asset.notes && (
        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">Catatan</p>
          <p className="whitespace-pre-wrap">{asset.notes}</p>
        </div>
      )}
    </div>
  );
}