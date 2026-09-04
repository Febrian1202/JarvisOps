'use client';

import React from 'react';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { ManagerMetrics } from './manager-metrics';
import { useManagerDashboard } from '@/hooks/use-dashboards';

export interface ManagerDashboardProps {
  dateFrom?: string;
  dateTo?: string;
  onDateChange?: (range: { from: string; to: string } | null) => void;
}

export function ManagerDashboard({
  dateFrom,
  dateTo,
  onDateChange,
}: ManagerDashboardProps) {
  const { data, isLoading } = useManagerDashboard({
    date_from: dateFrom,
    date_to: dateTo,
  });

  return (
    <div className="space-y-6">
      {/* Header & Date Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Dashboard Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Pantau metrik SLA operasional, tren tiket layanan, dan distribusi kerja teknisi.
          </p>
        </div>

        {onDateChange && (
          <div className="self-start sm:self-auto">
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChange={onDateChange}
            />
          </div>
        )}
      </div>

      {/* 6 Metric Cards */}
      <ManagerMetrics data={data} isLoading={isLoading} />
    </div>
  );
}
