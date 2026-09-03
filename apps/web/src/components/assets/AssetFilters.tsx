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
import { apiFetch } from '@/lib/client/api';
import { assetKeys, userKeys } from '@/lib/query-keys';
import { useAuth } from '@/components/providers/auth-provider';
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

  return (
    <div className="space-y-4">
      {/* Top row: search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(val) => updateFilters({ search: val })}
          placeholder="Cari kode aset, nomor seri, atau nama…"
          className="w-full sm:max-w-xs"
        />
      </div>

      {/* Second row: dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <Select value={status || 'ALL'} onValueChange={(val) => updateFilters({ status: val })}>
          <SelectTrigger className="h-8 min-w-[130px] rounded-lg text-xs bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
            {ASSET_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s === 'available' ? 'Tersedia' : s === 'assigned' ? 'Ditugaskan' : s === 'maintenance' ? 'Perbaikan' : s === 'retired' ? 'Pensiun' : 'Hilang'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={category || 'ALL'} onValueChange={(val) => updateFilters({ category: val })}>
          <SelectTrigger className="h-8 min-w-[130px] rounded-lg text-xs bg-card border-border">
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
            <SelectTrigger className="h-8 min-w-[130px] rounded-lg text-xs bg-card border-border">
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