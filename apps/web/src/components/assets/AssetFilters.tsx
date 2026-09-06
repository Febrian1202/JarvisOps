'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { MobileFilterSheet } from '@/components/shared/mobile-filter-sheet';
import { apiFetch } from '@/lib/client/api';
import { assetKeys, userKeys } from '@/lib/query-keys';
import { useAuth } from '@/components/providers/auth-provider';
import type { FilterField } from '@/components/shared/filter-bar';
import type { AssignableUser } from '@/types/auth';

const ASSET_STATUSES = ['available', 'assigned', 'maintenance', 'retired', 'lost'] as const;

export function AssetFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can } = useAuth();
  const canLookupUsers = can('user.lookup');

  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const category = searchParams.get('category') || '';
  const assignedUserId = searchParams.get('assigned_user_id') || '';

  const { data: categoriesResponse } = useQuery({
    queryKey: assetKeys.categories,
    queryFn: () => apiFetch<string[]>('/assets/categories'),
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesResponse?.data ?? [];

  const { data: usersResponse } = useQuery({
    queryKey: userKeys.assignable(),
    queryFn: () => apiFetch<AssignableUser[]>('/users/assignable'),
    enabled: canLookupUsers,
    staleTime: 5 * 60 * 1000,
  });
  const assignableUsers = usersResponse?.data ?? [];

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'ALL') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    params.set('page', '1');

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const resetAll = () => {
    startTransition(() => {
      router.replace(pathname);
    });
  };

  const hasActiveFilters = Boolean(search || status || category || assignedUserId);

  const statusOptionsMap: Record<string, string> = {
    available: 'Tersedia',
    assigned: 'Ditugaskan',
    maintenance: 'Perbaikan',
    retired: 'Pensiun',
    lost: 'Hilang',
  };

  const mobileFilters: FilterField[] = [
    {
      id: 'status',
      label: 'Status',
      value: status || 'ALL',
      options: ASSET_STATUSES.map((s) => ({
        label: statusOptionsMap[s] ?? s,
        value: s,
      })),
    },
    {
      id: 'category',
      label: 'Kategori',
      value: category || 'ALL',
      options: categories.map((c) => ({
        label: c,
        value: c,
      })),
    },
    ...(canLookupUsers
      ? [
          {
            id: 'assigned_user_id',
            label: 'Pemegang',
            value: assignedUserId || 'ALL',
            options: [
              { label: 'Belum Dipegang', value: 'unassigned' },
              ...assignableUsers.map((u) => ({
                label: u.full_name,
                value: String(u.id),
              })),
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input and Mobile Filter Button row */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <SearchInput
          value={search}
          onChange={(val) => updateFilters({ search: val })}
          placeholder="Cari kode aset, nomor seri, atau nama…"
          className="flex-1 min-w-0 sm:w-64 sm:flex-initial max-w-none"
        />

        <div className="sm:hidden shrink-0">
          <MobileFilterSheet
            filters={mobileFilters}
            onFilterChange={(id, val) => updateFilters({ [id]: val })}
            onResetFilters={resetAll}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={resetAll}
            aria-label="Reset semua filter"
            title="Reset semua filter"
            className="sm:hidden size-11 min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Dropdowns & Reset for Desktop/Tablet */}
      <div className="hidden sm:flex shrink-0 flex-row items-center justify-end gap-2">
        {/* Status Filter */}
        <Select value={status || 'ALL'} onValueChange={(val) => updateFilters({ status: val })}>
          <SelectTrigger className="h-8 min-w-32.5 rounded-lg text-xs bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
            {ASSET_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {statusOptionsMap[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={category || 'ALL'} onValueChange={(val) => updateFilters({ category: val })}>
          <SelectTrigger className="h-8 min-w-32.5 rounded-lg text-xs bg-card border-border">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Holder Filter — only when user.lookup granted */}
        {canLookupUsers && (
          <Select
            value={assignedUserId || 'ALL'}
            onValueChange={(val) => updateFilters({ assigned_user_id: val })}
          >
            <SelectTrigger className="h-8 min-w-32.5 rounded-lg text-xs bg-card border-border">
              <SelectValue placeholder="Pemegang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Pemegang</SelectItem>
              <SelectItem value="unassigned" className="text-xs">Belum Dipegang</SelectItem>
              {assignableUsers.map((u) => (
                <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}