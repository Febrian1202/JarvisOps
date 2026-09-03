import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/server/require-admin';
import { TicketPrioritiesPageClient } from './page-client';

export const metadata = {
  title: 'Prioritas Tiket & SLA | JARVIS OPS',
  description: 'Kelola prioritas tiket dan batas waktu SLA.',
};

export default async function TicketPrioritiesPage() {
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
      <TicketPrioritiesPageClient />
    </Suspense>
  );
}
