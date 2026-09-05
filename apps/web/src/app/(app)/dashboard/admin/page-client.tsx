'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminDashboardView } from '@/components/dashboard/admin';
import { buildDashboardParams, useAdminDashboard } from '@/hooks/use-dashboards';
import { useAuth } from '@/components/providers/auth-provider';

export function AdminDashboardPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, user, isLoading: isAuthLoading } = useAuth();

  const activeParams = React.useMemo(() => {
    return buildDashboardParams(searchParams);
  }, [searchParams]);

  const { data, isLoading: isDashboardLoading } = useAdminDashboard({
    date_from: activeParams?.date_from,
    date_to: activeParams?.date_to,
  });

  const handleDateChange = React.useCallback(
    (range: { from: string; to: string } | null) => {
      const newParams = new URLSearchParams(searchParams.toString());
      if (range && range.from && range.to) {
        newParams.set('date_from', range.from);
        newParams.set('date_to', range.to);
      } else {
        newParams.delete('date_from');
        newParams.delete('date_to');
      }

      const queryString = newParams.toString();
      router.replace(queryString ? `/dashboard/admin?${queryString}` : '/dashboard/admin', {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (!isAuthLoading && !can('dashboard.admin')) {
      router.replace('/403');
    }
  }, [isAuthLoading, can, router]);

  if (isAuthLoading || !can('dashboard.admin')) {
    return null;
  }

  return (
    <AdminDashboardView
      data={data}
      isLoading={isDashboardLoading}
      range={{ from: activeParams?.date_from, to: activeParams?.date_to }}
      onRangeChange={handleDateChange}
      user={user}
    />
  );
}
