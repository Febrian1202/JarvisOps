'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function KnowledgePage() {
  return (
    <PagePlaceholder
      title="Basis Pengetahuan (Knowledge Base)"
      description="Panduan mandiri, dokumentasi solusi, dan standar operasional penanganan kendala IT."
      icon={BookOpen}
    />
  );
}
