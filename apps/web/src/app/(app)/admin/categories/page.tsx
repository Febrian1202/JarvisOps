'use client';

import React from 'react';
import { Tags } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function AdminCategoriesPage() {
  return (
    <PagePlaceholder
      title="Kategori Tiket Layanan"
      description="Pengaturan hirarki kategori permohonan bantuan teknis (Hardware, Software, Network, dll)."
      icon={Tags}
    />
  );
}
