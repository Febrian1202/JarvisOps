import React from 'react';
import { DashboardPanel } from '../dashboard-panel';
import type { CategoryDistribution } from '@/types/dashboard';

/**
 * Pure helper to calculate category distribution.
 * 1. Calculates percentage against total items.
 * 2. Sorts by count descending.
 */
export function calculateCategoryDistribution(
  apiData: CategoryDistribution[]
): { label: string; count: number; percentage: number }[] {
  const total = apiData.reduce((sum, item) => sum + item.count, 0);

  const result = apiData.map(bucket => {
    return {
      label: bucket.category,
      count: bucket.count,
      percentage: total > 0 ? (bucket.count / total) * 100 : 0
    };
  });

  return result.sort((a, b) => b.count - a.count);
}

export interface CategoryDistributionPanelProps {
  data: CategoryDistribution[];
  isLoading?: boolean;
}

export function CategoryDistributionPanel({
  data,
  isLoading,
}: CategoryDistributionPanelProps) {
  const processed = React.useMemo(() => calculateCategoryDistribution(data), [data]);
  const hasData = data.length > 0;
  
  // For rendering, we need maxCount to calculate the visual width relative to the largest bar
  const maxCount = processed.reduce((max, item) => (item.count > max ? item.count : max), 0);

  return (
    <DashboardPanel
      title="Distribusi Kategori"
      isLoading={isLoading}
      isEmpty={!hasData}
      emptyMessage="Belum ada data distribusi."
    >
      <div className="space-y-4" role="list" aria-label="Distribusi kategori">
        {processed.map((item, i) => (
          <div key={i} className="space-y-1" role="listitem">
            <div className="flex justify-between items-end text-sm">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="text-muted-foreground text-xs">
                {item.count} tiket ({item.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}
