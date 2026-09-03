import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/server/require-admin';
import { DepartmentsPageClient } from './page-client';

export const metadata = {
  title: 'Departemen | JARVIS OPS',
  description: 'Kelola unit departemen organisasi.',
};

export default async function DepartmentsPage() {
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
      <DepartmentsPageClient />
    </Suspense>
  );
}
