import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketDetailPageClient } from './page-client';

export const metadata = {
  title: 'Detail Tiket | JARVIS OPS',
  description: 'Pantau penanganan, timeline, dan lakukan aksi pada tiket layanan.',
};

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <TicketDetailPageClient ticketId={Number(id)} />
    </Suspense>
  );
}