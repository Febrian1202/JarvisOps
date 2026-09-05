'use client';

import React from 'react';
import {
  Inbox,
  Clock,
  Layers,
  AlertTriangle,
  Timer,
  CheckCheck,
  ArrowRight,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { DashboardPanel } from '@/components/dashboard/dashboard-panel';
import { TechnicianActivityList } from './activity-list';
import { useTechnicianDashboard } from '@/hooks/use-dashboards';
import { formatDuration } from '@/lib/formatters';

export function TechnicianDashboard() {
  const { data, isLoading } = useTechnicianDashboard();

  const isBreachedDanger = Boolean(data && data.sla_breached > 0);
  const complianceDisplay =
    data?.sla_compliance_percentage !== null && data?.sla_compliance_percentage !== undefined
      ? `${data.sla_compliance_percentage}%`
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Dashboard Teknisi
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Pantau penugasan tiket kerja, antrean tiket masuk, dan performa penanganan SLA Anda.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <MetricCard
          label="Ditugaskan ke Saya"
          value={data ? data.assigned_tickets : null}
          icon={Inbox}
          footer="Tiket non-closed milik Anda"
          isLoading={isLoading}
        />
        <MetricCard
          label="Sedang Dikerjakan"
          value={data ? data.in_progress_tickets : null}
          icon={Clock}
          footer="Tiket aktif diproses"
          isLoading={isLoading}
        />
        <MetricCard
          label="Antrean OPEN (Bisa Diambil)"
          value={data ? data.open_tickets : null}
          icon={Layers}
          footer="Antrean global seluruh teknisi"
          isLoading={isLoading}
        />
        <MetricCard
          label="SLA Breached"
          value={data ? data.sla_breached : null}
          icon={AlertTriangle}
          tone={isBreachedDanger ? 'danger' : 'default'}
          footer={isBreachedDanger ? 'Segera selesaikan tiket terlambat' : 'Tidak ada tiket breached'}
          isLoading={isLoading}
        />
        <MetricCard
          label="Rata-rata Waktu Selesai"
          value={data ? formatDuration(data.avg_resolution_minutes) : null}
          icon={Timer}
          footer="Waktu penanganan selesai"
          isLoading={isLoading}
        />
        <MetricCard
          label="SLA Compliance Saya"
          value={complianceDisplay}
          icon={CheckCheck}
          footer="Kepatuhan SLA penyelesaian"
          isLoading={isLoading}
        />
      </div>

      <div>
        <DashboardPanel
          title="Aktivitas Terbaru Saya"
          actionLabel="Buka Tiket Layanan"
          actionHref="/tickets"
          actionIcon={ArrowRight}
          isLoading={isLoading}
          isEmpty={!isLoading && (!data?.recent_activity || data.recent_activity.length === 0)}
          emptyMessage="Belum ada aktivitas."
        >
          <TechnicianActivityList
            activities={data?.recent_activity ?? []}
            isLoading={isLoading}
          />
        </DashboardPanel>
      </div>
    </div>
  );
}
