'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { referenceKeys } from '@/lib/query-keys';
import { useAuth } from '@/components/providers/auth-provider';
import type {
  TicketCategory,
  TicketPriority,
  TicketStatusReference,
} from '@/types/tickets';
import type { DepartmentReference, TechnicianOption } from '@/types/auth';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useReferenceData() {
  const { can } = useAuth();
  const canViewTechnicians = can('technician.list');

  const categoriesQuery = useQuery({
    queryKey: referenceKeys.ticketCategories(),
    queryFn: () => apiFetch<TicketCategory[]>('/ticket-categories'),
    staleTime: STALE_TIME,
  });

  const prioritiesQuery = useQuery({
    queryKey: referenceKeys.ticketPriorities(),
    queryFn: () => apiFetch<TicketPriority[]>('/ticket-priorities'),
    staleTime: STALE_TIME,
  });

  const statusesQuery = useQuery({
    queryKey: referenceKeys.ticketStatuses(),
    queryFn: () => apiFetch<TicketStatusReference[]>('/ticket-statuses'),
    staleTime: STALE_TIME,
  });

  const departmentsQuery = useQuery({
    queryKey: referenceKeys.departments(),
    queryFn: () => apiFetch<DepartmentReference[]>('/departments'),
    staleTime: STALE_TIME,
  });

  const techniciansQuery = useQuery({
    queryKey: referenceKeys.technicians(),
    queryFn: () => apiFetch<TechnicianOption[]>('/technicians'),
    staleTime: STALE_TIME,
    enabled: canViewTechnicians,
  });

  return {
    categories: categoriesQuery.data?.data ?? [],
    priorities: prioritiesQuery.data?.data ?? [],
    statuses: statusesQuery.data?.data ?? [],
    departments: departmentsQuery.data?.data ?? [],
    technicians: techniciansQuery.data?.data ?? [],
    isLoading:
      categoriesQuery.isLoading ||
      prioritiesQuery.isLoading ||
      statusesQuery.isLoading ||
      departmentsQuery.isLoading ||
      (canViewTechnicians && techniciansQuery.isLoading),
  };
}
