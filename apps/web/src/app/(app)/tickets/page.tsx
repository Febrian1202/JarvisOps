'use client';

import React, { useTransition, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/shared/data-table/data-table';
import { DataTableColumnHeader } from '@/components/shared/data-table/data-table-column-header';
import { FilterBar } from '@/components/shared/filter-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriorityBadge } from '@/components/shared/priority-badge';
import { SlaIndicator } from '@/components/shared/sla-indicator';
import { RelativeTime } from '@/components/shared/relative-time';
import { Skeleton } from '@/components/ui/skeleton';
import { useTickets, type TicketQueryParams } from '@/hooks/use-tickets';
import { useAuth } from '@/components/providers/auth-provider';
import type { TicketListItem } from '@/types/tickets';

function TicketsTableContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can } = useAuth();

  // Read params from URL
  const page = Number(searchParams.get('page')) || 1;
  const perPage = Number(searchParams.get('per_page')) || 10;
  const search = searchParams.get('search') || '';
  const statusId = searchParams.get('status_id') || '';
  const priorityId = searchParams.get('priority_id') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') || 'desc';

  const queryParams: TicketQueryParams = {
    page,
    per_page: perPage,
    search,
    status_id: statusId,
    priority_id: priorityId,
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
      router.push(`${pathname}?${params.toString()}`);
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

  const columns: ColumnDef<TicketListItem>[] = [
    {
      id: 'ticket_number',
      header: (
        <DataTableColumnHeader
          title="Nomor Tiket"
          sorted={sortBy === 'ticket_number' ? sortDir : false}
          onSort={() => handleSort('ticket_number')}
        />
      ),
      cell: ({ row }) => (
        <span className="font-semibold text-primary font-mono text-xs">
          {row.ticket_number}
        </span>
      ),
    },
    {
      id: 'title',
      header: (
        <DataTableColumnHeader
          title="Judul Permohonan"
          sorted={sortBy === 'title' ? sortDir : false}
          onSort={() => handleSort('title')}
        />
      ),
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="font-medium text-foreground text-sm line-clamp-1">
            {row.title}
          </p>
          <p className="text-muted-foreground text-xs">{row.category.name}</p>
        </div>
      ),
    },
    {
      id: 'priority',
      header: 'Prioritas',
      cell: ({ row }) => <PriorityBadge priority={row.priority.name} />,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.status.name} />,
    },
    {
      id: 'sla',
      header: 'Batas Waktu (SLA)',
      cell: ({ row }) => (
        <SlaIndicator
          slaStatus={row.sla_status}
          durationMinutes={row.priority.sla_minutes}
          deadline={row.sla_deadline}
        />
      ),
    },
    {
      id: 'reporter',
      header: 'Pelapor',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.reporter?.full_name ?? '-'}
        </span>
      ),
    },
    {
      id: 'technician',
      header: 'Teknisi',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.technician?.full_name ?? (
            <em className="text-muted-foreground/60 not-italic">Belum ditugaskan</em>
          )}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: (
        <DataTableColumnHeader
          title="Dibuat"
          sorted={sortBy === 'created_at' ? sortDir : false}
          onSort={() => handleSort('created_at')}
        />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          <RelativeTime date={row.created_at} />
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-10 text-right',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Link href={`/tickets/${row.id}`} aria-label={`Buka tiket ${row.ticket_number}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  const filterFields = [
    {
      id: 'status_id',
      label: 'Status',
      value: statusId,
      options: [
        { label: 'Menunggu (OPEN)', value: '1' },
        { label: 'Ditugaskan (ASSIGNED)', value: '2' },
        { label: 'Sedang Dikerjakan (IN_PROGRESS)', value: '3' },
        { label: 'Selesai (RESOLVED)', value: '4' },
        { label: 'Ditutup (CLOSED)', value: '5' },
      ],
    },
    {
      id: 'priority_id',
      label: 'Prioritas',
      value: priorityId,
      options: [
        { label: 'Kritis (Critical)', value: '1' },
        { label: 'Tinggi (High)', value: '2' },
        { label: 'Sedang (Medium)', value: '3' },
        { label: 'Rendah (Low)', value: '4' },
      ],
    },
  ];

  const hasActiveFilters = Boolean(search || statusId || priorityId);

  return (
    <div className="space-y-6">
      {/* Header with Title & Create Ticket Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-xl text-foreground tracking-tight">
            Daftar Tiket Layanan
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Pantau progress penanganan tiket permohonan bantuan teknis IT.
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

      {/* Filter & Search Bar */}
      <FilterBar
        search={search}
        onSearchChange={(val) => updateQueryParams({ search: val, page: 1 })}
        searchPlaceholder="Cari nomor tiket atau judul…"
        filters={filterFields}
        onFilterChange={(filterId, val) => updateQueryParams({ [filterId]: val, page: 1 })}
        onResetFilters={() =>
          updateQueryParams({ search: null, status_id: null, priority_id: null, page: 1 })
        }
        hasActiveFilters={hasActiveFilters}
      />

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={tickets}
        meta={meta}
        isLoading={isLoading}
        emptyTitle="Tidak Ada Tiket Ditemukan"
        emptyDescription="Belum ada permohonan tiket bantuan teknis yang cocok dengan kriteria pencarian Anda."
        onPageChange={(p) => updateQueryParams({ page: p })}
        onPerPageChange={(pp) => updateQueryParams({ per_page: pp, page: 1 })}
      />
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <TicketsTableContent />
    </Suspense>
  );
}

