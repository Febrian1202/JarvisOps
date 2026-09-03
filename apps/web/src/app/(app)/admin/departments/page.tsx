'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function AdminDepartmentsPage() {
  return (
    <PagePlaceholder
      title="Kelola Departemen"
      description="Struktur organisasi divisi perusahaan dan pengelompokan karyawan."
      icon={Building2}
    />
  );
}
