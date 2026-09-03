'use client';

import React from 'react';
import { Laptop } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function MyAssetsPage() {
  return (
    <PagePlaceholder
      title="Aset Saya"
      description="Daftar perangkat keras dan perlengkapan IT yang sedang ditugaskan kepada Anda."
      icon={Laptop}
    />
  );
}
