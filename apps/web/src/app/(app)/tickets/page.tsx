'use client';

import React from 'react';
import { Ticket } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function TicketsPage() {
  return (
    <PagePlaceholder
      title="Tiket Layanan"
      description="Daftar permohonan tiket bantuan teknis, status pengerjaan, dan riwayat penanganan."
      icon={Ticket}
    />
  );
}
