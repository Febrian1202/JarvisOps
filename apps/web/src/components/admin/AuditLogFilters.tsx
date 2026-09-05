'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { RotateCcw, Calendar as CalendarIcon, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/components/providers/auth-provider';
import { auditActionLabels, auditModuleLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';

const MANAGER_MODULES = ['ticket', 'asset', 'article', 'knowledge_category'];

export function AuditLogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can, hasRole } = useAuth();

  const canViewUsers = can('user.viewAny');
  const isManager = hasRole('manager');

  const moduleParam = searchParams.get('module') || '';
  const actionParam = searchParams.get('action') || '';
  const userIdParam = searchParams.get('user_id') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';

  const { data: usersResponse } = useUsers(
    { per_page: 100, status: 'active' },
    canViewUsers
  );
  const usersList = usersResponse?.data ?? [];

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'ALL') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    params.set('page', '1');

    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  const resetAll = () => {
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

  return (
    <div
      data-testid="audit-log-filters"
      className="flex w-full flex-row items-center gap-2.5 overflow-x-auto rounded-xl border border-border bg-card p-2.5 sm:p-3 shadow-xs"
    >
      {/* Module Filter */}
      <Select
        value={moduleParam || 'ALL'}
        onValueChange={(val) => updateFilters({ module: val })}
      >
        <SelectTrigger
          aria-label="Modul"
          className="h-11 sm:h-8 min-h-[44px] sm:min-h-0 min-w-35 rounded-lg text-xs bg-background border-border"
        >
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
        onValueChange={(val) => updateFilters({ action: val })}
      >
        <SelectTrigger
          aria-label="Aksi"
          className="h-11 sm:h-8 min-h-[44px] sm:min-h-0 min-w-35 rounded-lg text-xs bg-background border-border"
        >
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
          onValueChange={(val) => updateFilters({ user_id: val })}
        >
          <SelectTrigger
            aria-label="Pengguna"
            className="h-11 sm:h-8 min-h-[44px] sm:min-h-0 min-w-37.5 rounded-lg text-xs bg-background border-border"
          >
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

      {/* Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-11 sm:h-8 min-h-[44px] sm:min-h-0 min-w-42.5 justify-start rounded-lg border-border bg-background px-2.5 text-xs font-normal transition-colors hover:text-foreground',
              !dateFrom && !dateTo && 'text-muted-foreground',
              (dateFrom || dateTo) && 'border-primary/40 font-medium text-foreground'
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">
              {dateFrom
                ? dateTo
                  ? `${format(parseISO(dateFrom), 'd MMM yyyy', { locale: id })} - ${format(parseISO(dateTo), 'd MMM yyyy', { locale: id })}`
                  : format(parseISO(dateFrom), 'd MMM yyyy', { locale: id })
                : 'Pilih Tanggal'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateFrom ? parseISO(dateFrom) : undefined}
            selected={{
              from: dateFrom ? parseISO(dateFrom) : undefined,
              to: dateTo ? parseISO(dateTo) : undefined,
            }}
            onSelect={(range) => {
              updateFilters({
                date_from: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
                date_to: range?.to ? format(range.to, 'yyyy-MM-dd') : null,
              });
            }}
            numberOfMonths={1}
          />
          {(dateFrom || dateTo) && (
            <div className="flex items-center justify-end border-t border-border p-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  updateFilters({ date_from: null, date_to: null });
                }}
              >
                <X className="mr-1 h-3 w-3" />
                Hapus Tanggal
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Reset Filter Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetAll}
          aria-label="Reset semua filter"
          className="h-11 sm:h-8 min-h-[44px] sm:min-h-0 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Reset
        </Button>
      )}
    </div>
  );
}
