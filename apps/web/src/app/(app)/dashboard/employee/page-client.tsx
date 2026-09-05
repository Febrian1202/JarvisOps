'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EmployeeDashboard } from '@/components/dashboard/employee/employee-dashboard';
import { useAuth } from '@/components/providers/auth-provider';

export function EmployeeDashboardPageClient() {
  const router = useRouter();
  const { can, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && !can('dashboard.employee')) {
      router.replace('/403');
    }
  }, [isAuthLoading, can, router]);

  if (isAuthLoading || !can('dashboard.employee')) {
    return null;
  }

  return <EmployeeDashboard />;
}
