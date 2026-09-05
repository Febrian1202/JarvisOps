import React from 'react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  Timer,
  UserX,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { SlaComplianceCard } from './sla-compliance-card';
import { formatDuration } from '@/lib/formatters';
import type { ManagerDashboardData } from '@/types/dashboard';

export interface ManagerMetricsProps {
  data?: ManagerDashboardData;
  isLoading?: boolean;
}

export function ManagerMetrics({ data, isLoading = false }: ManagerMetricsProps) {
  const isUnassignedDanger = Boolean(data && data.unassigned_tickets > 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {/* 1) Total Ticket */}
      <MetricCard
        label="Total Ticket"
        value={data !== undefined ? data.total_tickets : null}
        icon={Inbox}
        footer="Pada rentang tanggal ini"
        isLoading={isLoading}
      />

      {/* 2) Total Ticket Aktif (Open) */}
      <MetricCard
        label="Total Ticket Aktif"
        value={data !== undefined ? data.open_tickets : null}
        icon={Clock}
        footer={
          <div className="flex flex-col gap-0.5">
            <span>Snapshot kondisi saat ini (status 1, 2, 3)</span>
          </div>
        }
        isLoading={isLoading}
      />

      {/* 3) Ticket Selesai (Resolved) */}
      <MetricCard
        label="Ticket Selesai"
        value={data !== undefined ? data.resolved_tickets : null}
        icon={CheckCircle2}
        footer="Resolved pada rentang tanggal ini"
        isLoading={isLoading}
      />

      {/* 4) SLA Compliance Card */}
      <SlaComplianceCard
        compliancePercentage={data?.sla.compliance_percentage}
        withinSla={data?.sla.within_sla}
        breachedSla={data?.sla.breached}
        isLoading={isLoading}
      />

      {/* 5) Rata-rata Penyelesaian */}
      <MetricCard
        label="Rata-rata Penyelesaian"
        value={
          data?.sla.avg_resolution_minutes !== null && data?.sla.avg_resolution_minutes !== undefined
            ? formatDuration(data.sla.avg_resolution_minutes)
            : null
        }
        icon={Timer}
        footer="Berdasarkan tiket resolved"
        isLoading={isLoading}
      />

      {/* 6) Ticket Belum Di-assign */}
      <MetricCard
        label="Ticket Belum Di-assign"
        value={data !== undefined ? data.unassigned_tickets : null}
        icon={UserX}
        tone={isUnassignedDanger ? 'danger' : 'default'}
        footer={isUnassignedDanger ? 'Perlu penugasan segera' : 'Semua tiket telah di-assign'}
        isLoading={isLoading}
      />
    </div>
  );
}
