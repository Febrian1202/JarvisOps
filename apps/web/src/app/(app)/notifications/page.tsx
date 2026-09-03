'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function NotificationsPage() {
  return (
    <PagePlaceholder
      title="Pusat Notifikasi"
      description="Riwayat pemberitahuan penugasan tiket, perubahan status, komentar baru, dan SLA breach."
      icon={Bell}
    />
  );
}
