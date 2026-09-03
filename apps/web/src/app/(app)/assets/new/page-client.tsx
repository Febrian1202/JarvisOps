'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssetForm } from '@/components/assets/AssetForm';

export function CreateAssetPageClient() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/assets" aria-label="Kembali ke daftar aset">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-bold text-xl text-foreground tracking-tight">
            Tambah Aset Baru
          </h1>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm pl-10">
          Input data perangkat atau aset perusahaan untuk dicatat ke dalam inventaris IT.
        </p>
      </div>

      <AssetForm />
    </div>
  );
}