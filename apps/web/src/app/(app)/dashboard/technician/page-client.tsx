'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TechnicianDashboard } from '@/components/dashboard/technician/technician-dashboard';
import { useAuth } from '@/components/providers/auth-provider';

export function TechnicianDashboardPageClient() {
  const router = useRouter();
  const { can, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && !can('dashboard.technician')) {
      router.replace('/403');
    }
  }, [isAuthLoading, can, router]);

  if (isAuthLoading || !can('dashboard.technician')) {
    return null;
  }

  return <TechnicianDashboard />;
}
