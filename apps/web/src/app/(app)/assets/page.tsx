'use client';

import React from 'react';
import { FolderKanban } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function AssetsPage() {
  return (
    <PagePlaceholder
      title="Inventaris Aset Perusahaan"
      description="Manajemen inventaris perangkat, status operasional, siklus hidup, dan penugasan pengguna."
      icon={FolderKanban}
    />
  );
}
