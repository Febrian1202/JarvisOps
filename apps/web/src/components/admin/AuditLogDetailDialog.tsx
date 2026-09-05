'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLogDetail } from '@/hooks/use-audit-logs';
import { getAuditActionLabel, getAuditModuleLabel } from '@/lib/labels';

interface AuditLogDetailDialogProps {
  open: boolean;
  logId: number | null;
  onClose: () => void;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

export function AuditLogDetailDialog({
  open,
  logId,
  onClose,
}: AuditLogDetailDialogProps) {
  const { data: response, isLoading } = useAuditLogDetail(open ? logId : null);
  const log = response?.data;

  const diffKeys = React.useMemo(() => {
    if (!log) return [];
    const keys = new Set<string>();
    if (log.old_data && typeof log.old_data === 'object') {
      Object.keys(log.old_data).forEach((k) => keys.add(k));
    }
    if (log.new_data && typeof log.new_data === 'object') {
      Object.keys(log.new_data).forEach((k) => keys.add(k));
    }
    return Array.from(keys).sort();
  }, [log]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Rincian Log Audit</span>
            {log && (
              <Badge variant="outline" className="font-mono text-xs">
                #{log.id}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Informasi lengkap peristiwa audit sistem dan perbandingan perubahan data.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !log ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Metadata Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <div>
                <span className="text-muted-foreground block">Aksi</span>
                <span className="font-semibold text-foreground">
                  {getAuditActionLabel(log.action)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Modul</span>
                <span className="font-semibold text-foreground">
                  {getAuditModuleLabel(log.module)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">ID Modul</span>
                <span className="font-mono text-foreground">
                  {log.module_id ? `#${log.module_id}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Pelaku</span>
                <span className="font-medium text-foreground">
                  {log.user?.full_name ?? 'Sistem'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Alamat IP</span>
                <span className="font-mono text-foreground">
                  {log.ip_address ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Waktu Tercatat</span>
                <span className="text-foreground">
                  {new Date(log.created_at).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>

            {/* Description */}
            {log.description && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Keterangan:
                </span>
                <p className="text-sm text-foreground bg-card rounded-md border border-border p-2.5">
                  {log.description}
                </p>
              </div>
            )}

            {/* User Agent */}
            {log.user_agent && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  User Agent:
                </span>
                <p className="font-mono text-xs text-muted-foreground bg-muted/20 rounded p-2 break-all">
                  {log.user_agent}
                </p>
              </div>
            )}

            {/* Data Comparison */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Perbandingan Data
              </h3>

              {diffKeys.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Tidak ada rekaman perubahan data (peristiwa aksi atau event tanpa payload).
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                        <th scope="col" className="p-2.5 w-1/4">Field</th>
                        <th scope="col" className="p-2.5 w-[37.5%]">Nilai Lama</th>
                        <th scope="col" className="p-2.5 w-[37.5%]">Nilai Baru</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {diffKeys.map((key) => {
                        const oldVal = log.old_data?.[key];
                        const newVal = log.new_data?.[key];
                        const isChanged =
                          JSON.stringify(oldVal) !== JSON.stringify(newVal);

                        return (
                          <tr
                            key={key}
                            className={
                              isChanged
                                ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                : 'hover:bg-muted/30'
                            }
                          >
                            <td className="p-2.5 font-mono font-medium text-foreground align-top">
                              {key}
                            </td>
                            <td className="p-2.5 font-mono text-muted-foreground align-top wrap-break-word whitespace-pre-wrap">
                              {formatValue(oldVal)}
                            </td>
                            <td className="p-2.5 font-mono text-foreground font-medium align-top wrap-break-word whitespace-pre-wrap">
                              {formatValue(newVal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
