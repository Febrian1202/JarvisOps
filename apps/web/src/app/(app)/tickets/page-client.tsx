'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TicketFilters } from '@/components/tickets/TicketFilters';
import { TicketTable } from '@/components/tickets/TicketTable';
import { useTickets, type TicketQueryParams } from '@/hooks/use-tickets';
import { useAuth } from '@/components/providers/auth-provider';

export function TicketsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can } = useAuth();

  const page = Number(searchParams.get('page')) || 1;
  const perPage = Number(searchParams.get('per_page')) || 10;
  const search = searchParams.get('search') || '';
  const statusId = searchParams.get('status_id') || '';
  const priorityId = searchParams.get('priority_id') || '';
  const categoryId = searchParams.get('category_id') || '';
  const technicianId = searchParams.get('technician_id') || '';
  const departmentId = searchParams.get('department_id') || '';
  const reporterId = searchParams.get('reporter_id') || '';
  const assetId = searchParams.get('asset_id') || '';
  const slaStatus = searchParams.get('sla_status') || '';
  const createdFrom = searchParams.get('created_from') || '';
  const createdTo = searchParams.get('created_to') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') || 'desc';

  const queryParams: TicketQueryParams = {
    page,
    per_page: perPage,
    search,
    status_id: statusId,
    priority_id: priorityId,
    category_id: categoryId,
    technician_id: technicianId,
    department_id: departmentId,
    reporter_id: reporterId,
    asset_id: assetId,
    sla_status: slaStatus,
    created_from: createdFrom,
    created_to: createdTo,
    sort_by: sortBy,
    sort_dir: sortDir,
  };

  const { data: response, isLoading } = useTickets(queryParams);
  const tickets = response?.data ?? [];
  const meta = response?.meta;

  const updateQueryParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateQueryParams({
        sort_dir: sortDir === 'asc' ? 'desc' : 'asc',
        page: 1,
      });
    } else {
      updateQueryParams({
        sort_by: field,
        sort_dir: 'asc',
        page: 1,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-xl text-foreground tracking-tight">
            Daftar Tiket Layanan
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Pantau progres penanganan tiket permohonan bantuan teknis IT.
          </p>
        </div>

        {can('ticket.create') && (
          <Button asChild size="sm" className="gap-1.5 self-start sm:self-auto">
            <Link href="/tickets/new">
              <Plus className="h-4 w-4" />
              <span>Buat Tiket Baru</span>
            </Link>
          </Button>
        )}
      </div>

      {/* 11 Filters toolbar */}
      <TicketFilters />

      {/* Interactive Table with Row Nav & Sorting */}
      <TicketTable
        tickets={tickets}
        meta={meta}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onPageChange={(p) => updateQueryParams({ page: p })}
        onPerPageChange={(pp) => updateQueryParams({ per_page: pp, page: 1 })}
      />
    </div>
  );
}
