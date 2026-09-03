import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAuditViewer } from '@/lib/server/require-admin';
import { AuditLogsPageClient } from './page-client';

export const metadata = {
  title: 'Log Audit | JARVIS OPS',
  description: 'Catatan jejak aktivitas dan audit sistem.',
};

export default async function AuditLogsPage() {
  await requireAuditViewer();

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
      <AuditLogsPageClient />
    </Suspense>
  );
}
