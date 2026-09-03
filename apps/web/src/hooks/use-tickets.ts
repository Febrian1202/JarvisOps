import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { ticketKeys } from '@/lib/query-keys';
import type { TicketListItem } from '@/types/tickets';

export interface TicketQueryParams {
  page?: number;
  per_page?: number;
  status_id?: number | string;
  priority_id?: number | string;
  category_id?: number | string;
  technician_id?: number | string;
  department_id?: number | string;
  reporter_id?: number | string;
  asset_id?: number | string;
  sla_status?: string;
  created_from?: string;
  created_to?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  [key: string]: unknown;
}

export function useTickets(params: TicketQueryParams = {}) {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.set(key, String(val));
        }
      });

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/tickets?${queryString}` : '/tickets';
      return apiFetch<TicketListItem[]>(endpoint);
    },
  });
}
