'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { auditKeys } from '@/lib/query-keys';
import type { AuditLogDetail, AuditLogListItem } from '@/types/audit';

export interface AuditLogQueryParams {
  page?: number;
  per_page?: number;
  user_id?: string | number | null;
  module?: string | null;
  action?: string | null;
  module_id?: string | number | null;
  date_from?: string | null;
  date_to?: string | null;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  [key: string]: unknown;
}

export function useAuditLogs(
  params: AuditLogQueryParams = {},
  enabled = true
) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.set(key, String(val));
        }
      });
      const query = searchParams.toString();
      const endpoint = query ? `/audit-logs?${query}` : '/audit-logs';
      return apiFetch<AuditLogListItem[]>(endpoint);
    },
    enabled,
  });
}

export function useAuditLogDetail(id: number | null) {
  return useQuery({
    queryKey: id ? auditKeys.detail(id) : ['audit-logs', 'detail', 'null'],
    queryFn: () => apiFetch<AuditLogDetail>(`/audit-logs/${id}`),
    enabled: Boolean(id && Number.isFinite(id)),
  });
}
