'use client';

import React from 'react';
import { FolderKanban } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function AdminKnowledgeCategoriesPage() {
  return (
    <PagePlaceholder
      title="Kategori Basis Pengetahuan"
      description="Pengelompokan artikel solusi dan materi penanganan masalah IT."
      icon={FolderKanban}
    />
  );
}
