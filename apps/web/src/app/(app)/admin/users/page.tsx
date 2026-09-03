'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function AdminUsersPage() {
  return (
    <PagePlaceholder
      title="Kelola Pengguna"
      description="Pusat administrasi akun pengguna, penetapan peran (role), aktivasi status, dan reset password."
      icon={Users}
    />
  );
}
