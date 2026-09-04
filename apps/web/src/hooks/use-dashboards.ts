import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { dashboardKeys } from '@/lib/query-keys';
import type { EmployeeDashboardData, TechnicianDashboardData } from '@/types/dashboard';

export function useEmployeeDashboard() {
  return useQuery({
    queryKey: dashboardKeys.employee(),
    queryFn: () => apiFetch<EmployeeDashboardData>('/dashboard/employee'),
    select: (res) => res.data,
    staleTime: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useTechnicianDashboard() {
  return useQuery({
    queryKey: dashboardKeys.technician(),
    queryFn: () => apiFetch<TechnicianDashboardData>('/dashboard/technician'),
    select: (res) => res.data,
    staleTime: 60_000,
    refetchIntervalInBackground: false,
  });
}
