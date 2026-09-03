'use client';

import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function DashboardPage() {
  return (
    <PagePlaceholder
      title="Dashboard Sistem"
      description="Pusat pemantauan tiket, metrik SLA, performa teknisi, dan ringkasan operasional."
      icon={LayoutDashboard}
    />
  );
}
