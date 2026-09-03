import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/server/require-admin';
import { UsersPageClient } from './page-client';

export const metadata: Metadata = {
  title: 'Kelola Pengguna | JARVIS OPS',
  description:
    'Pusat administrasi akun pengguna, penetapan peran (role), aktivasi status, dan reset password.',
};

export default async function AdminUsersPage() {
  await requireAdmin();
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <UsersPageClient />
    </Suspense>
  );
}
