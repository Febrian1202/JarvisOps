'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { AuditLogFilters } from '@/components/admin/AuditLogFilters';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { AuditLogDetailDialog } from '@/components/admin/AuditLogDetailDialog';
import { useAuditLogs, type AuditLogQueryParams } from '@/hooks/use-audit-logs';
import { useAuth } from '@/components/providers/auth-provider';

export function AuditLogsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can, isLoading: isAuthLoading } = useAuth();

  const canView = can('audit-log.viewAny');
  const canViewUsers = can('user.viewAny');

  useEffect(() => {
    if (!isAuthLoading && !canView) {
      router.replace('/403');
    }
  }, [canView, isAuthLoading, router]);

  const page = Number(searchParams.get('page')) || 1;
  const perPage = Number(searchParams.get('per_page')) || 15;
  const moduleParam = searchParams.get('module') || '';
  const actionParam = searchParams.get('action') || '';
  const userIdParam = searchParams.get('user_id') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') || 'desc';

  const queryParams: AuditLogQueryParams = {
    page,
    per_page: perPage,
    module: moduleParam || null,
    action: actionParam || null,
    user_id: canViewUsers && userIdParam ? userIdParam : null,
    date_from: dateFrom || null,
    date_to: dateTo || null,
    sort_by: sortBy,
    sort_dir: sortDir,
  };

  const { data: response, isLoading } = useAuditLogs(queryParams, !isAuthLoading && canView);
  const items = response?.data ?? [];
  const meta = response?.meta;

  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  const updateQueryParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'ALL') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateQueryParams({
        sort_dir: sortDir === 'asc' ? 'desc' : 'asc',
        page: 1,
      });
    } else {
      updateQueryParams({ sort_by: field, sort_dir: 'asc', page: 1 });
    }
  };

  if (isAuthLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-12 w-full bg-muted animate-pulse rounded" />
        <div className="h-64 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!canView) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-xl text-foreground tracking-tight">Log Audit</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Jejak rekaman seluruh aktivitas penting, mutasi data, dan peristiwa keamanan sistem.
        </p>
      </div>

      <AuditLogFilters />

      <AuditLogTable
        items={items}
        meta={meta}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onPageChange={(p) => updateQueryParams({ page: p })}
        onPerPageChange={(pp) => updateQueryParams({ per_page: pp, page: 1 })}
        onViewDetail={(item) => setSelectedLogId(item.id)}
      />

      <AuditLogDetailDialog
        open={Boolean(selectedLogId)}
        logId={selectedLogId}
        onClose={() => setSelectedLogId(null)}
      />
    </div>
  );
}
