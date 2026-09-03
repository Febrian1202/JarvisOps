import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/server/require-admin';
import { TicketCategoriesPageClient } from './page-client';

export const metadata = {
  title: 'Kategori Tiket | JARVIS OPS',
  description: 'Kelola kategori tiket dan hierarki layanan.',
};

export default async function TicketCategoriesPage() {
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
      <TicketCategoriesPageClient />
    </Suspense>
  );
}
