import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { laravelFetch } from '@/lib/server/api';
import { ProfilePageClient } from './page-client';
import type { AuthUser } from '@/types/auth';

export const metadata = {
  title: 'Profil Saya | JARVIS OPS',
  description: 'Kelola informasi profil dan keamanan akun Anda.',
};

export default async function ProfilePage() {
  const res = await laravelFetch('/me', { cache: 'no-store' });
  if (!res.ok) {
    redirect('/login');
  }

  const payload = (await res.json()) as { success: boolean; data: AuthUser };
  const user = payload.data;

  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4 max-w-4xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ProfilePageClient initialUser={user} />
    </Suspense>
  );
}
