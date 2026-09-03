'use client';

import React from 'react';
import { User } from 'lucide-react';
import { PagePlaceholder } from '@/components/shared/page-placeholder';

export default function ProfilePage() {
  return (
    <PagePlaceholder
      title="Profil Pengguna"
      description="Pengaturan identitas akun, nomor kontak karyawan, dan pembaruan kata sandi."
      icon={User}
    />
  );
}
