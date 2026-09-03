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
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/shared/search-input';
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

  return (
    <div className="space-y-4">
      {/* Top row: Search and Status Chips */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(val) => updateFilters({ search: val })}
          placeholder="Cari nomor tiket atau judul…"
          className="w-full sm:max-w-xs"
        />

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

      {/* Second row: Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Priority Filter */}
        <Select
          value={priorityId || 'ALL'}
          onValueChange={(val) => updateFilters({ priority_id: val })}
        >
          <SelectTrigger className="h-8 min-w-[130px] rounded-lg text-xs bg-card border-border">
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
          <SelectTrigger className="h-8 min-w-[130px] rounded-lg text-xs bg-card border-border">
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
            <SelectTrigger className="h-8 min-w-[130px] rounded-lg text-xs bg-card border-border">
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
            <SelectTrigger className="h-8 min-w-[140px] rounded-lg text-xs bg-card border-border">
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
            <SelectTrigger className="h-8 min-w-[130px] rounded-lg text-xs bg-card border-border">
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
          <SelectTrigger className="h-8 min-w-[120px] rounded-lg text-xs bg-card border-border">
            <SelectValue placeholder="Status SLA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua SLA</SelectItem>
            <SelectItem value="on_track" className="text-xs">Aman (On Track)</SelectItem>
            <SelectItem value="breached" className="text-xs">Terlambat (Breached)</SelectItem>
          </SelectContent>
        </Select>

        {/* Date From */}
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={createdFrom}
            onChange={(e) => updateFilters({ created_from: e.target.value })}
            className="h-8 w-32 rounded-lg text-xs bg-card border-border px-2"
            aria-label="Dari tanggal"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            type="date"
            value={createdTo}
            onChange={(e) => updateFilters({ created_to: e.target.value })}
            className="h-8 w-32 rounded-lg text-xs bg-card border-border px-2"
            aria-label="Sampai tanggal"
          />
        </div>

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
