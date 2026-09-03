'use client';

import React from 'react';
import { ScrollText } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function AdminAuditLogsPage() {
  return (
    <PagePlaceholder
      title="Log Audit Aktivitas Sistem"
      description="Rekam jejak seluruh mutasi data, penugasan, eskalasi tiket, dan aktivitas operasional."
      icon={ScrollText}
    />
  );
}
