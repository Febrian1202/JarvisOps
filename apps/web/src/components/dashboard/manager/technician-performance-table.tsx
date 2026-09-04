'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableColumnHeader } from '@/components/shared/data-table/data-table-column-header';
import { DashboardPanel } from '@/components/dashboard/dashboard-panel';
import { formatDuration } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { TechnicianPerformanceItem } from '@/types/dashboard';

export type SortKey = 'technician' | 'resolved' | 'sla' | 'avg' | 'active' | 'breached';
export type SortDirection = 'asc' | 'desc';

export function sortTechnicians(
  items: TechnicianPerformanceItem[],
  sortKey: SortKey,
  sortDir: SortDirection
): TechnicianPerformanceItem[] {
  return [...items].sort((a, b) => {
    let valA: string | number | null = null;
    let valB: string | number | null = null;

    switch (sortKey) {
      case 'technician':
        valA = a.technician.full_name.toLowerCase();
        valB = b.technician.full_name.toLowerCase();
        break;
      case 'resolved':
        valA = a.resolved;
        valB = b.resolved;
        break;
      case 'sla':
        valA = a.sla_compliance_percentage;
        valB = b.sla_compliance_percentage;
        break;
      case 'avg':
        valA = a.avg_resolution_minutes;
        valB = b.avg_resolution_minutes;
        break;
      case 'active':
        valA = a.open;
        valB = b.open;
        break;
      case 'breached':
        valA = a.breached;
        valB = b.breached;
        break;
    }

    // Jebakan: null values must ALWAYS be sorted to the end regardless of asc or desc
    if (valA === null && valB === null) return 0;
    if (valA === null) return 1;
    if (valB === null) return -1;

    if (valA < valB) {
      return sortDir === 'asc' ? -1 : 1;
    }
    if (valA > valB) {
      return sortDir === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

export interface TechnicianPerformanceTableProps {
  items?: TechnicianPerformanceItem[];
  isLoading?: boolean;
  className?: string;
}

export function TechnicianPerformanceTable({
  items = [],
  isLoading = false,
  className,
}: TechnicianPerformanceTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>('resolved');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'resolved' ? 'desc' : 'asc');
    }
  };

  const sortedItems = useMemo(() => {
    return sortTechnicians(items, sortKey, sortDir);
  }, [items, sortKey, sortDir]);

  const handleRowClick = (technicianId: number) => {
    router.push(`/tickets?technician_id=${technicianId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, technicianId: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(technicianId);
    }
  };

  return (
    <DashboardPanel
      title="Performa Technician"
      actionLabel="Lihat semua tiket"
      actionHref="/tickets"
      isLoading={isLoading}
      isEmpty={!isLoading && items.length === 0}
      emptyTitle="Belum Ada Data"
      emptyMessage="Belum ada teknisi yang menangani tiket pada rentang tanggal ini."
      className={className}
    >
      <div className="rounded-md border border-cream-border overflow-hidden">
        <Table>
          <caption className="sr-only">
            Daftar ringkasan performa dan beban kerja teknisi
          </caption>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-cream-border hover:bg-transparent">
              <TableHead scope="col" className="py-3 font-semibold text-xs text-muted-foreground">
                <DataTableColumnHeader
                  title="TECHNICIAN"
                  sorted={sortKey === 'technician' ? sortDir : false}
                  onSort={() => handleSort('technician')}
                />
              </TableHead>
              <TableHead scope="col" className="py-3 text-right font-semibold text-xs text-muted-foreground">
                <div className="flex justify-end">
                  <DataTableColumnHeader
                    title="SELESAI"
                    sorted={sortKey === 'resolved' ? sortDir : false}
                    onSort={() => handleSort('resolved')}
                  />
                </div>
              </TableHead>
              <TableHead scope="col" className="py-3 text-right font-semibold text-xs text-muted-foreground">
                <div className="flex justify-end">
                  <DataTableColumnHeader
                    title="COMPLIANCE"
                    sorted={sortKey === 'sla' ? sortDir : false}
                    onSort={() => handleSort('sla')}
                  />
                </div>
              </TableHead>
              <TableHead scope="col" className="py-3 text-right font-semibold text-xs text-muted-foreground">
                <div className="flex justify-end">
                  <DataTableColumnHeader
                    title="RATA-RATA"
                    sorted={sortKey === 'avg' ? sortDir : false}
                    onSort={() => handleSort('avg')}
                  />
                </div>
              </TableHead>
              <TableHead scope="col" className="py-3 text-right font-semibold text-xs text-muted-foreground">
                <div className="flex justify-end">
                  <DataTableColumnHeader
                    title="AKTIF"
                    sorted={sortKey === 'active' ? sortDir : false}
                    onSort={() => handleSort('active')}
                  />
                </div>
              </TableHead>
              <TableHead scope="col" className="py-3 text-right font-semibold text-xs text-muted-foreground">
                <div className="flex justify-end">
                  <DataTableColumnHeader
                    title="BREACHED"
                    sorted={sortKey === 'breached' ? sortDir : false}
                    onSort={() => handleSort('breached')}
                  />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => {
              const complianceDisplay =
                item.sla_compliance_percentage !== null
                  ? `${item.sla_compliance_percentage}%`
                  : '—';
              const avgDisplay = formatDuration(item.avg_resolution_minutes);
              const hasBreached = item.breached > 0;

              return (
                <TableRow
                  key={item.technician.id}
                  tabIndex={0}
                  onClick={() => handleRowClick(item.technician.id)}
                  onKeyDown={(e) => handleKeyDown(e, item.technician.id)}
                  className="cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40 transition-colors border-cream-border"
                >
                  <TableCell className="font-medium text-foreground text-sm py-2.5">
                    {item.technician.full_name}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold py-2.5">
                    {item.resolved}
                  </TableCell>
                  <TableCell className="text-right text-xs py-2.5 text-muted-foreground">
                    {complianceDisplay}
                  </TableCell>
                  <TableCell className="text-right text-xs py-2.5 text-muted-foreground">
                    {avgDisplay}
                  </TableCell>
                  <TableCell className="text-right text-xs py-2.5">
                    {item.open}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right text-xs font-semibold py-2.5',
                      hasBreached ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {item.breached}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </DashboardPanel>
  );
}
