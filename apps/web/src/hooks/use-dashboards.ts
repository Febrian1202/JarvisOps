import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { dashboardKeys } from '@/lib/query-keys';
import { toQueryString } from '@/lib/dashboard-params';
import type {
  EmployeeDashboardData,
  TechnicianDashboardData,
  ManagerDashboardData,
} from '@/types/dashboard';

export { buildDashboardParams, toQueryString } from '@/lib/dashboard-params';
export type {
  DashboardDateParams,
  DashboardDateParamsInput,
} from '@/lib/dashboard-params';

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

export function useManagerDashboard(params: { date_from?: string; date_to?: string } = {}) {
  const qs = toQueryString(params);

  return useQuery({
    queryKey: dashboardKeys.manager(params),
    queryFn: () => apiFetch<ManagerDashboardData>(`/dashboard/manager${qs}`),
    select: (res) => res.data,
    staleTime: 60_000,
    refetchIntervalInBackground: false,
  });
}

