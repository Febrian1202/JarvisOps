import React from 'react';
import { Users, Laptop, UserCheck, Building2 } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import type { AdminDashboardData } from '@/types/dashboard';

export interface AdminMetricsProps {
  data?: AdminDashboardData;
  isLoading?: boolean;
}

export function AdminMetrics({ data, isLoading = false }: AdminMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1) Total Pengguna */}
      <MetricCard
        label="Total Pengguna"
        value={data?.total_users ?? null}
        icon={Users}
        isLoading={isLoading}
      />

      {/* 2) Total Aset IT */}
      <MetricCard
        label="Total Aset IT"
        value={data?.total_assets ?? null}
        icon={Laptop}
        isLoading={isLoading}
      />

      {/* 3) Technician */}
      <MetricCard
        label="Technician"
        value={data?.total_technicians ?? null}
        icon={UserCheck}
        isLoading={isLoading}
      />

      {/* 4) Departemen */}
      <MetricCard
        label="Departemen"
        value={data?.total_departments ?? null}
        icon={Building2}
        isLoading={isLoading}
      />
    </div>
  );
}
