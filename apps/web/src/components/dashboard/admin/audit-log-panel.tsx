import React from 'react';
import { useRouter } from 'next/navigation';
import { ScrollText } from 'lucide-react';
import { DashboardPanel } from '@/components/dashboard/dashboard-panel';
import { RelativeTime } from '@/components/shared/relative-time';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { getAuditActionLabel, getAuditModuleLabel } from '@/lib/labels';
import type { AdminDashboardData } from '@/types/dashboard';

interface AuditLogPanelProps {
  items?: AdminDashboardData['recent_system_activity'];
  isLoading?: boolean;
}

export function AuditLogPanel({ items, isLoading = false }: AuditLogPanelProps) {
  const router = useRouter();
  const displayItems = items?.slice(0, 8) || [];

  return (
    <DashboardPanel
      title="Audit Log Terbaru"
      actionLabel="Lihat Semua"
      actionHref="/admin/audit-logs"
      actionIcon={ScrollText}
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Catatan riwayat aktivitas dan perubahan sistem terkini.
        </p>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !items || items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Belum ada aktivitas sistem"
            description="Belum ada catatan log aktivitas yang terekam pada sistem."
          />
        ) : (
          <div className="rounded-md border border-cream-border overflow-hidden">
            <Table>
              <caption className="sr-only">
                Daftar aktivitas log sistem terbaru
              </caption>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-cream-border hover:bg-transparent text-xs">
                  <TableHead scope="col" className="py-2.5 font-semibold text-muted-foreground">
                    WAKTU
                  </TableHead>
                  <TableHead scope="col" className="py-2.5 font-semibold text-muted-foreground">
                    PENGGUNA
                  </TableHead>
                  <TableHead scope="col" className="py-2.5 font-semibold text-muted-foreground">
                    AKSI &amp; MODUL
                  </TableHead>
                  <TableHead scope="col" className="py-2.5 font-semibold text-muted-foreground">
                    KETERANGAN
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-cream-border/60">
                {displayItems.map((item) => {
                  const userName = item.user?.full_name ?? 'Sistem';
                  const actionLabel = getAuditActionLabel(item.action);
                  const moduleLabel = getAuditModuleLabel(item.module);

                  return (
                    <TableRow
                      key={item.id}
                      tabIndex={0}
                      onClick={() => router.push('/admin/audit-logs')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push('/admin/audit-logs');
                        }
                      }}
                      className="cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40 transition-colors border-cream-border text-xs"
                    >
                      <TableCell className="py-2.5 whitespace-nowrap text-muted-foreground">
                        <RelativeTime date={item.created_at} />
                      </TableCell>
                      <TableCell className="py-2.5 font-medium text-foreground whitespace-nowrap">
                        {userName}
                      </TableCell>
                      <TableCell className="py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[11px] font-normal">
                            {actionLabel}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px] font-normal">
                            {moduleLabel}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-muted-foreground max-w-xs sm:max-w-md truncate">
                        {item.description || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}
