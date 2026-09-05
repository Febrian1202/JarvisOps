'use client';

import React from 'react';
import { DateRangePicker } from '@/components/dashboard/date-range-picker';
import { lazyChart } from '../lazy-chart';
import { ManagerMetrics } from './manager-metrics';
import { TechnicianPerformanceTable } from './technician-performance-table';
import { PriorityDistributionPanel } from './priority-distribution';
import { CategoryDistributionPanel } from './category-distribution';
import type { ManagerDashboardData, TicketTrendItem } from '@/types/dashboard';
import type { ComponentType } from 'react';
import { getGreeting } from '@/lib/formatters';
import { User } from '@/types/auth';

const TicketTrendChart = lazyChart<{ trend: TicketTrendItem[]; isLoading?: boolean; range?: { from?: string; to?: string } }, ComponentType<{ trend: TicketTrendItem[]; isLoading?: boolean; range?: { from?: string; to?: string } }>>(() => 
  import('./ticket-trend-chart').then(m => ({ default: m.TicketTrendChartPanel }))
);

export interface ManagerDashboardViewProps {
  data?: ManagerDashboardData;
  isLoading?: boolean;
  range?: { from?: string; to?: string };
  onRangeChange?: (range: { from: string; to: string } | null) => void;
  user?: User | null;
  hideHeader?: boolean;
}

export function ManagerDashboardView({
  data,
  isLoading,
  range,
  onRangeChange,
  user,
  hideHeader = false,
}: ManagerDashboardViewProps) {
  const greeting = getGreeting();
  
  return (
    <div className="space-y-6">
      {/* Header & Date Range Picker */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {greeting}, {user?.full_name || 'Manager'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Pantau metrik SLA operasional, tren tiket layanan, dan distribusi kerja teknisi.
            </p>
          </div>

          {onRangeChange && (
            <div className="self-start sm:self-auto">
              <DateRangePicker
                from={range?.from}
                to={range?.to}
                onChange={onRangeChange}
              />
            </div>
          )}
        </div>
      )}

      {/* 6 Metric Cards */}
      <ManagerMetrics data={data} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <TicketTrendChart 
            trend={data?.ticket_trend ?? []} 
            isLoading={isLoading} 
            range={{ from: range?.from, to: range?.to }} 
          />
          <TechnicianPerformanceTable 
            items={data?.technician_performance ?? []} 
            isLoading={isLoading} 
          />
        </div>
        
        <div className="lg:col-span-4 space-y-6">
          <PriorityDistributionPanel 
            data={data?.by_priority ?? []} 
            isLoading={isLoading} 
          />
          <CategoryDistributionPanel 
            data={data?.by_category ?? []} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </div>
  );
}
