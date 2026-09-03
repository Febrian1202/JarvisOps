'use client';

import React from 'react';
import { Sliders } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function AdminPrioritiesPage() {
  return (
    <PagePlaceholder
      title="Prioritas & Target SLA"
      description="Konfigurasi target batas waktu penyelesaian tiket (Critical, High, Medium, Low)."
      icon={Sliders}
    />
  );
}
