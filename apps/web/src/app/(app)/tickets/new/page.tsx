import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateTicketPageClient } from './page-client';

export const metadata = {
  title: 'Buat Tiket Baru | JARVIS OPS',
  description: 'Formulir pelaporan kendala dan permohonan tiket bantuan teknis IT.',
};

export default function CreateTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <CreateTicketPageClient />
    </Suspense>
  );
}
