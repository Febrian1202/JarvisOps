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
import { SearchInput } from '@/components/shared/search-input';
import { MobileFilterSheet } from '@/components/shared/mobile-filter-sheet';
import type { FilterField } from '@/components/shared/filter-bar';
import { useReferenceData } from '@/hooks/use-reference-data';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';

export function TicketFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { user, hasRole } = useAuth();
  const { categories, priorities, departments, technicians } = useReferenceData();

  const isEmployee = hasRole('employee');
  const isTechnician = hasRole('technician');
  const isAdminOrManager = hasRole('administrator') || hasRole('manager');

  const search = searchParams.get('search') || '';
  const statusId = searchParams.get('status_id') || '';
  const priorityId = searchParams.get('priority_id') || '';
  const categoryId = searchParams.get('category_id') || '';
  const technicianId = searchParams.get('technician_id') || '';
  const departmentId = searchParams.get('department_id') || '';
  const slaStatus = searchParams.get('sla_status') || '';
  const createdFrom = searchParams.get('created_from') || '';
  const createdTo = searchParams.get('created_to') || '';

  const updateFilters = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'ALL') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    params.set('page', '1'); // reset page on filter change

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const resetAll = () => {
    startTransition(() => {
      router.replace(pathname);
    });
  };

  const statusChips = [
    { label: 'Semua Status', value: '' },
    { label: 'Open', value: '1' },
    { label: 'Assigned', value: '2' },
    { label: 'In Progress', value: '3' },
    { label: 'Resolved', value: '4' },
    { label: 'Closed', value: '5' },
  ];

  const hasActiveFilters = Boolean(
    search ||
    statusId ||
    priorityId ||
    categoryId ||
    technicianId ||
    departmentId ||
    slaStatus ||
    createdFrom ||
    createdTo
  );

  // Priority, Category, SLA and Date are always shown; the assignment and
  // department filters depend on the role. Keep the grid balanced so filters
  // never collapse into a one-per-row column.
  const visibleFilterCount =
    4 + (isAdminOrManager || isTechnician ? 1 : 0) + (isEmployee ? 0 : 1);

  // Literal class strings keep the Tailwind scanner able to see every variant.
  const filterGridClass =
    visibleFilterCount >= 6
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6'
      : visibleFilterCount === 5
        ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-4';

  const mobileFilters: FilterField[] = [
    {
      id: 'priority_id',
      label: 'Prioritas',
      value: priorityId,
      options: priorities.map((p) => ({ label: p.name, value: String(p.id) })),
    },
    {
      id: 'category_id',
      label: 'Kategori',
      value: categoryId,
      options: categories.map((c) => ({ label: c.name, value: String(c.id) })),
    },
    {
      id: 'sla_status',
      label: 'Status SLA',
      value: slaStatus,
      options: [
        { label: 'Aman (On Track)', value: 'on_track' },
        { label: 'Terlambat (Breached)', value: 'breached' },
      ],
    },
    ...(isAdminOrManager
      ? [
          {
            id: 'technician_id',
            label: 'Teknisi',
            value: technicianId,
            options: [
              { label: 'Belum Ditugaskan', value: 'unassigned' },
              ...technicians.map((t) => ({ label: t.full_name, value: String(t.id) })),
            ],
          },
        ]
      : isTechnician
        ? [
            {
              id: 'technician_id',
              label: 'Penugasan',
              value: technicianId,
              options: [
                { label: 'Tiket Saya', value: String(user?.id) },
                { label: 'Belum Ditugaskan', value: 'unassigned' },
              ],
            },
          ]
        : []),
    ...(!isEmployee
      ? [
          {
            id: 'department_id',
            label: 'Departemen',
            value: departmentId,
            options: departments.map((d) => ({ label: d.name, value: String(d.id) })),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      {/* Top row: Search + Reset and Status Chips */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          data-testid="ticket-filters-search-row"
          className="flex w-full items-center gap-1.5 sm:max-w-sm"
        >
          <SearchInput
            value={search}
            onChange={(val) => updateFilters({ search: val })}
            placeholder="Cari nomor tiket atau judul…"
            className="w-full max-w-none"
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
              className="size-9 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {statusChips.map((chip) => {
            const active = (statusId === '' && chip.value === '') || statusId === chip.value;
            return (
              <Button
                key={chip.label}
                variant={active ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-8 rounded-full px-3 text-xs transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground font-medium shadow-xs'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                )}
                onClick={() => updateFilters({ status_id: chip.value })}
              >
                {chip.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Second row: filter controls in a responsive grid so they never stack one-per-row */}
      <div
        data-testid="ticket-filters-grid"
        className={cn('hidden sm:grid gap-2', filterGridClass)}
      >
        {/* Priority Filter */}
        <Select
          value={priorityId || 'ALL'}
          onValueChange={(val) => updateFilters({ priority_id: val })}
        >
          <SelectTrigger
            aria-label="Prioritas"
            className="h-8 w-full rounded-lg text-xs bg-card border-border"
          >
            <SelectValue placeholder="Prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Prioritas</SelectItem>
            {priorities.map((p) => (
              <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={categoryId || 'ALL'}
          onValueChange={(val) => updateFilters({ category_id: val })}
        >
          <SelectTrigger
            aria-label="Kategori"
            className="h-8 w-full rounded-lg text-xs bg-card border-border"
          >
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Technician Filter */}
        {isAdminOrManager && (
          <Select
            value={technicianId || 'ALL'}
            onValueChange={(val) => updateFilters({ technician_id: val })}
          >
            <SelectTrigger
              aria-label="Teknisi"
              className="h-8 w-full rounded-lg text-xs bg-card border-border"
            >
              <SelectValue placeholder="Teknisi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Teknisi</SelectItem>
              <SelectItem value="unassigned" className="text-xs">Belum Ditugaskan</SelectItem>
              {technicians.map((t) => (
                <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                  {t.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Technician Presets for Technician role */}
        {isTechnician && (
          <Select
            value={technicianId || 'ALL'}
            onValueChange={(val) => updateFilters({ technician_id: val })}
          >
            <SelectTrigger
              aria-label="Penugasan"
              className="h-8 w-full rounded-lg text-xs bg-card border-border"
            >
              <SelectValue placeholder="Penugasan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Penugasan</SelectItem>
              <SelectItem value={String(user?.id)} className="text-xs">Tiket Saya</SelectItem>
              <SelectItem value="unassigned" className="text-xs">Belum Ditugaskan</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Department Filter (Hidden for Employee to prevent unnecessary clutter) */}
        {!isEmployee && (
          <Select
            value={departmentId || 'ALL'}
            onValueChange={(val) => updateFilters({ department_id: val })}
          >
            <SelectTrigger
              aria-label="Departemen"
              className="h-8 w-full rounded-lg text-xs bg-card border-border"
            >
              <SelectValue placeholder="Departemen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Departemen</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* SLA Status Filter */}
        <Select
          value={slaStatus || 'ALL'}
          onValueChange={(val) => updateFilters({ sla_status: val })}
        >
          <SelectTrigger
            aria-label="Status SLA"
            className="h-8 w-full rounded-lg text-xs bg-card border-border"
          >
            <SelectValue placeholder="Status SLA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua SLA</SelectItem>
            <SelectItem value="on_track" className="text-xs">Aman (On Track)</SelectItem>
            <SelectItem value="breached" className="text-xs">Terlambat (Breached)</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 w-full justify-start rounded-lg border-border bg-card px-2.5 text-xs font-normal transition-colors hover:text-foreground',
                !createdFrom && !createdTo && 'text-muted-foreground',
                (createdFrom || createdTo) && 'font-medium text-foreground border-primary/40'
              )}
            >
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate">
                {createdFrom
                  ? createdTo
                    ? `${format(parseISO(createdFrom), 'd MMM yyyy', { locale: id })} - ${format(parseISO(createdTo), 'd MMM yyyy', { locale: id })}`
                    : format(parseISO(createdFrom), 'd MMM yyyy', { locale: id })
                  : 'Pilih Tanggal'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={createdFrom ? parseISO(createdFrom) : undefined}
              selected={{
                from: createdFrom ? parseISO(createdFrom) : undefined,
                to: createdTo ? parseISO(createdTo) : undefined,
              }}
              onSelect={(range) => {
                updateFilters({
                  created_from: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
                  created_to: range?.to ? format(range.to, 'yyyy-MM-dd') : null,
                });
              }}
              numberOfMonths={1}
            />
            {(createdFrom || createdTo) && (
              <div className="flex items-center justify-end border-t border-border p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    updateFilters({ created_from: null, created_to: null });
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  Hapus Tanggal
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
