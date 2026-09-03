'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { AuditLogDetailDialog } from '@/components/admin/AuditLogDetailDialog';
import { useAuditLogs, type AuditLogQueryParams } from '@/hooks/use-audit-logs';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/components/providers/auth-provider';
import { auditActionLabels, auditModuleLabels } from '@/lib/labels';

const MANAGER_MODULES = ['ticket', 'asset', 'article', 'knowledge_category'];

export function AuditLogsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can, hasRole, isLoading: isAuthLoading } = useAuth();

  const canView = can('audit-log.viewAny');
  const canViewUsers = can('user.viewAny');
  const isManager = hasRole('manager');

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

  const { data: usersResponse } = useUsers(
    { per_page: 100, status: 'active' },
    !isAuthLoading && canViewUsers
  );
  const usersList = usersResponse?.data ?? [];

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

  const resetFilters = () => {
    startTransition(() => router.replace(pathname));
  };

  const hasActiveFilters = Boolean(
    moduleParam || actionParam || userIdParam || dateFrom || dateTo
  );

  const availableModules = isManager
    ? Object.entries(auditModuleLabels).filter(([key]) =>
        MANAGER_MODULES.includes(key)
      )
    : Object.entries(auditModuleLabels);

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

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-xs">
        {/* Module Filter */}
        <Select
          value={moduleParam || 'ALL'}
          onValueChange={(val) => updateQueryParams({ module: val, page: 1 })}
        >
          <SelectTrigger className="h-8 min-w-[140px] rounded-lg text-xs bg-background border-border">
            <SelectValue placeholder="Semua Modul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Modul</SelectItem>
            {availableModules.map(([val, label]) => (
              <SelectItem key={val} value={val} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Action Filter */}
        <Select
          value={actionParam || 'ALL'}
          onValueChange={(val) => updateQueryParams({ action: val, page: 1 })}
        >
          <SelectTrigger className="h-8 min-w-[140px] rounded-lg text-xs bg-background border-border">
            <SelectValue placeholder="Semua Aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Aksi</SelectItem>
            {Object.entries(auditActionLabels).map(([val, label]) => (
              <SelectItem key={val} value={val} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* User Filter (Admin Only) */}
        {canViewUsers && (
          <Select
            value={userIdParam || 'ALL'}
            onValueChange={(val) => updateQueryParams({ user_id: val, page: 1 })}
          >
            <SelectTrigger className="h-8 min-w-[150px] rounded-lg text-xs bg-background border-border">
              <SelectValue placeholder="Semua Pengguna" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Pengguna</SelectItem>
              {usersList.map((u) => (
                <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date From */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">Dari:</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => updateQueryParams({ date_from: e.target.value || null, page: 1 })}
            className="h-8 w-32 text-xs bg-background border-border"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">S/d:</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => updateQueryParams({ date_to: e.target.value || null, page: 1 })}
            className="h-8 w-32 text-xs bg-background border-border"
          />
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

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
