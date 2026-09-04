import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TechnicianDashboardPageClient } from './page-client';

export const metadata = {
  title: 'Dashboard Teknisi | JARVIS OPS',
  description: 'Ringkasan antrean tugas tiket teknisi, pemantauan SLA breached, dan catatan aktivitas terbaru.',
};

export default function TechnicianDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <div>
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      }
    >
      <TechnicianDashboardPageClient />
    </Suspense>
  );
}
