'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
import type { FilterField } from '@/components/shared/filter-bar';
import { useUserReferences } from '@/hooks/use-users';
import { userStatusLabels } from '@/lib/labels';

export function UserFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const search = searchParams.get('search') || '';
  const roleId = searchParams.get('role_id') || '';
  const departmentId = searchParams.get('department_id') || '';
  const status = searchParams.get('status') || '';

  const { roles, departments } = useUserReferences();

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
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  const resetAll = () => {
    startTransition(() => router.replace(pathname));
  };

  const hasActiveFilters = Boolean(search || roleId || departmentId || status);

  const mobileFilters: FilterField[] = [
    {
      id: 'role_id',
      label: 'Role',
      value: roleId,
      options: roles.map((role) => ({
        label: role.name,
        value: String(role.id),
      })),
    },
    {
      id: 'department_id',
      label: 'Departemen',
      value: departmentId,
      options: departments.map((dept) => ({
        label: dept.name,
        value: String(dept.id),
      })),
    },
    {
      id: 'status',
      label: 'Status',
      value: status,
      options: Object.entries(userStatusLabels).map(([val, label]) => ({
        label,
        value: val,
      })),
    },
  ];

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input and Mobile Filter Button row */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <div className="flex-1 sm:flex-initial">
          <SearchInput
            value={search}
            onChange={(val) => updateFilters({ search: val })}
            placeholder="Cari nama atau email pengguna…"
            className="w-full sm:w-64 max-w-none"
          />
        </div>

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
        <Select value={roleId || 'ALL'} onValueChange={(val) => updateFilters({ role_id: val })}>
          <SelectTrigger
            aria-label="Role"
            className="h-8 min-w-35 rounded-lg text-xs bg-card border-border"
          >
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Role</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={String(role.id)} className="text-xs">
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={departmentId || 'ALL'}
          onValueChange={(val) => updateFilters({ department_id: val })}
        >
          <SelectTrigger
            aria-label="Departemen"
            className="h-8 min-w-37.5 rounded-lg text-xs bg-card border-border"
          >
            <SelectValue placeholder="Departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Departemen</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={String(department.id)} className="text-xs">
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || 'ALL'} onValueChange={(val) => updateFilters({ status: val })}>
          <SelectTrigger
            aria-label="Status"
            className="h-8 min-w-32.5 rounded-lg text-xs bg-card border-border"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
            {Object.entries(userStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
