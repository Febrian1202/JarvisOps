'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ManagerDashboard } from '@/components/dashboard/manager';
import { buildDashboardParams } from '@/hooks/use-dashboards';

export function ManagerDashboardPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeParams = React.useMemo(() => {
    return buildDashboardParams(searchParams);
  }, [searchParams]);

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
      router.replace(queryString ? `/dashboard/manager?${queryString}` : '/dashboard/manager', {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  return (
    <ManagerDashboard
      dateFrom={activeParams?.date_from}
      dateTo={activeParams?.date_to}
      onDateChange={handleDateChange}
    />
  );
}
