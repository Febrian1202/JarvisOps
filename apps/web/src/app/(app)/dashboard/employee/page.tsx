import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeDashboardPageClient } from './page-client';

export const metadata = {
  title: 'Dashboard Karyawan | JARVIS OPS',
  description: 'Ringkasan tiket permohonan bantuan, aset yang dipegang, dan artikel bantuan terbaru.',
};

export default function EmployeeDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-72 lg:col-span-2 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      }
    >
      <EmployeeDashboardPageClient />
    </Suspense>
  );
}
