import { useMemo } from 'react';
import { parseISO, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

import { DashboardPanel } from '../dashboard-panel';
import type { TicketTrendItem } from '@/types/dashboard';

export function formatTrendTick(dateIso: string): string {
  return format(parseISO(dateIso), 'd MMM', { locale: id });
}

export function summarizeTrend(trend: TicketTrendItem[]): { totalCreated: number; totalResolved: number } {
  return trend.reduce(
    (acc, curr) => ({
      totalCreated: acc.totalCreated + curr.created,
      totalResolved: acc.totalResolved + curr.resolved,
    }),
    { totalCreated: 0, totalResolved: 0 }
  );
}

interface TicketTrendChartPanelProps {
  trend: TicketTrendItem[];
  isLoading?: boolean;
  range?: { from?: string; to?: string };
}

export function TicketTrendChartPanel({ trend, isLoading }: TicketTrendChartPanelProps) {
  const { totalCreated, totalResolved } = useMemo(() => summarizeTrend(trend), [trend]);
  
  const isEmpty = trend.length === 0 || (totalCreated === 0 && totalResolved === 0);

  return (
    <DashboardPanel 
      title="Tren Ticket" 
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Belum ada data tren pada rentang ini."
    >
      <figure role="img" aria-label="Grafik tren tiket" className="w-full h-[280px]">
        <figcaption className="sr-only">
          {`Total ${totalCreated} ticket dibuat, ${totalResolved} selesai.`}
        </figcaption>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} accessibilityLayer>
            <XAxis 
              dataKey="date" 
              tickFormatter={formatTrendTick} 
              minTickGap={28}
            />
            <YAxis allowDecimals={false} width={32} />
            <Tooltip 
              labelFormatter={(label) => formatTrendTick(label as string)}
              formatter={(value, name) => [value, name === 'created' ? 'Dibuat' : 'Selesai']}
            />
            <Legend formatter={(value) => value === 'created' ? 'Ticket Dibuat' : 'Ticket Selesai'} />
            <Bar 
              dataKey="created" 
              fill="var(--chart-1)" 
              radius={[3, 3, 0, 0]} 
              maxBarSize={28} 
            />
            <Bar 
              dataKey="resolved" 
              fill="var(--chart-2)" 
              radius={[3, 3, 0, 0]} 
              maxBarSize={28} 
            />
          </BarChart>
        </ResponsiveContainer>
      </figure>
    </DashboardPanel>
  );
}
