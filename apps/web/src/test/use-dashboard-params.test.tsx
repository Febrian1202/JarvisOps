import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { buildDashboardParams, toQueryString } from '@/lib/dashboard-params';
import { useManagerDashboard, useAdminDashboard } from '@/hooks/use-dashboards';
import * as apiModule from '@/lib/client/api';
import { dashboardKeys } from '@/lib/query-keys';
import type { ManagerDashboardData, AdminDashboardData } from '@/types/dashboard';
import type { ApiResponse } from '@/types/api';

const mockManagerData: ManagerDashboardData = {
  total_tickets: 10,
  open_tickets: 4,
  unassigned_tickets: 2,
  resolved_tickets: 3,
  closed_tickets: 1,
  sla: {
    within_sla: 3,
    breached: 1,
    compliance_percentage: 75,
    avg_resolution_minutes: 120,
  },
  ticket_trend: [],
  by_priority: [],
  by_category: [],
  technician_performance: [],
};

const mockAdminData: AdminDashboardData = {
  ...mockManagerData,
  total_users: 25,
  total_technicians: 5,
  total_departments: 4,
  total_assets: 40,
  assets_by_status: [{ status: 'in_use', count: 30 }],
  recent_system_activity: [],
};

describe('buildDashboardParams & toQueryString (Rule C11)', () => {
  it('returns both date_from and date_to when both are provided in URLSearchParams', () => {
    const params = new URLSearchParams({
      date_from: '2026-09-01',
      date_to: '2026-09-04',
    });
    expect(buildDashboardParams(params)).toEqual({
      date_from: '2026-09-01',
      date_to: '2026-09-04',
    });
  });

  it('returns both when provided via an object with get() method', () => {
    const map = new Map<string, string>([
      ['date_from', '2026-08-01'],
      ['date_to', '2026-08-31'],
    ]);
    const getter = { get: (k: string) => map.get(k) ?? null };
    expect(buildDashboardParams(getter)).toEqual({
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    });
  });

  it('returns both when provided via a plain object record', () => {
    expect(
      buildDashboardParams({ date_from: '2026-08-01', date_to: '2026-08-31' })
    ).toEqual({
      date_from: '2026-08-01',
      date_to: '2026-08-31',
    });
  });

  it('returns undefined (or omits params) if only date_from is provided (Rule C11)', () => {
    const params = new URLSearchParams({ date_from: '2026-09-01' });
    expect(buildDashboardParams(params)).toBeUndefined();
    expect(buildDashboardParams({ date_from: '2026-09-01' })).toBeUndefined();
  });

  it('returns undefined (or omits params) if only date_to is provided (Rule C11)', () => {
    const params = new URLSearchParams({ date_to: '2026-09-04' });
    expect(buildDashboardParams(params)).toBeUndefined();
    expect(buildDashboardParams({ date_to: '2026-09-04' })).toBeUndefined();
  });

  it('returns undefined if neither date_from nor date_to is provided', () => {
    expect(buildDashboardParams(new URLSearchParams())).toBeUndefined();
    expect(buildDashboardParams({})).toBeUndefined();
    expect(buildDashboardParams(undefined)).toBeUndefined();
    expect(buildDashboardParams(null)).toBeUndefined();
  });

  it('returns undefined if empty string is provided for either parameter', () => {
    const params = new URLSearchParams({
      date_from: '',
      date_to: '2026-09-04',
    });
    expect(buildDashboardParams(params)).toBeUndefined();

    const params2 = new URLSearchParams({
      date_from: '2026-09-01',
      date_to: '',
    });
    expect(buildDashboardParams(params2)).toBeUndefined();
  });

  describe('toQueryString', () => {
    it('returns empty string when undefined or empty object passed', () => {
      expect(toQueryString()).toBe('');
      expect(toQueryString(undefined)).toBe('');
      expect(toQueryString({})).toBe('');
    });

    it('returns empty string if only one param is present', () => {
      expect(toQueryString({ date_from: '2026-09-01' })).toBe('');
      expect(toQueryString({ date_to: '2026-09-04' })).toBe('');
    });

    it('attaches encoded query string when both date_from and date_to are present', () => {
      expect(
        toQueryString({ date_from: '2026-09-01', date_to: '2026-09-04' })
      ).toBe('?date_from=2026-09-01&date_to=2026-09-04');
    });
  });
});

describe('useManagerDashboard hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('queries without query string when no params given and uses correct queryKey', async () => {
    const apiFetchSpy = vi
      .spyOn(apiModule, 'apiFetch')
      .mockResolvedValueOnce({
        success: true,
        message: 'OK',
        data: mockManagerData,
      } as ApiResponse<ManagerDashboardData>);

    const { result } = renderHook(() => useManagerDashboard(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetchSpy).toHaveBeenCalledWith('/dashboard/manager');
    expect(result.current.data).toEqual(mockManagerData);
    expect(dashboardKeys.manager({})).toEqual(['dashboard', 'manager', {}]);
  });

  it('queries with query string when both date_from and date_to are provided', async () => {
    const apiFetchSpy = vi
      .spyOn(apiModule, 'apiFetch')
      .mockResolvedValueOnce({
        success: true,
        message: 'OK',
        data: mockManagerData,
      } as ApiResponse<ManagerDashboardData>);

    const params = { date_from: '2026-09-01', date_to: '2026-09-04' };
    const { result } = renderHook(() => useManagerDashboard(params), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/dashboard/manager?date_from=2026-09-01&date_to=2026-09-04'
    );
    expect(result.current.data).toEqual(mockManagerData);
  });

  it('omits query string when only one date param is provided', async () => {
    const apiFetchSpy = vi
      .spyOn(apiModule, 'apiFetch')
      .mockResolvedValueOnce({
        success: true,
        message: 'OK',
        data: mockManagerData,
      } as ApiResponse<ManagerDashboardData>);

    const params = { date_from: '2026-09-01' };
    const { result } = renderHook(() => useManagerDashboard(params), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetchSpy).toHaveBeenCalledWith('/dashboard/manager');
    expect(result.current.data).toEqual(mockManagerData);
  });
});

describe('useAdminDashboard hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('queries without query string when no params given and uses correct queryKey', async () => {
    const apiFetchSpy = vi
      .spyOn(apiModule, 'apiFetch')
      .mockResolvedValueOnce({
        success: true,
        message: 'OK',
        data: mockAdminData,
      } as ApiResponse<AdminDashboardData>);

    const { result } = renderHook(() => useAdminDashboard(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetchSpy).toHaveBeenCalledWith('/dashboard/admin');
    expect(result.current.data).toEqual(mockAdminData);
    expect(dashboardKeys.admin({})).toEqual(['dashboard', 'admin', {}]);
  });

  it('queries with query string when both date_from and date_to are provided', async () => {
    const apiFetchSpy = vi
      .spyOn(apiModule, 'apiFetch')
      .mockResolvedValueOnce({
        success: true,
        message: 'OK',
        data: mockAdminData,
      } as ApiResponse<AdminDashboardData>);

    const params = { date_from: '2026-09-01', date_to: '2026-09-04' };
    const { result } = renderHook(() => useAdminDashboard(params), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/dashboard/admin?date_from=2026-09-01&date_to=2026-09-04'
    );
    expect(result.current.data).toEqual(mockAdminData);
  });

  it('omits query string when only one date param is provided', async () => {
    const apiFetchSpy = vi
      .spyOn(apiModule, 'apiFetch')
      .mockResolvedValueOnce({
        success: true,
        message: 'OK',
        data: mockAdminData,
      } as ApiResponse<AdminDashboardData>);

    const params = { date_from: '2026-09-01' };
    const { result } = renderHook(() => useAdminDashboard(params), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetchSpy).toHaveBeenCalledWith('/dashboard/admin');
    expect(result.current.data).toEqual(mockAdminData);
  });
});


