'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { referenceKeys, userKeys } from '@/lib/query-keys';
import type {
  DepartmentReference,
  RoleReference,
  UserAdminDetail,
  UserListItem,
} from '@/types/auth';

export interface UserQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  role_id?: number | string;
  department_id?: number | string;
  status?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  [key: string]: unknown;
}

export function useUsers(params: UserQueryParams = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.set(key, String(val));
        }
      });

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/users?${queryString}` : '/users';
      return apiFetch<UserListItem[]>(endpoint);
    },
    enabled,
  });
}

export function useUserDetail(id: number | null) {
  return useQuery({
    queryKey: userKeys.detail(id ?? 0),
    queryFn: () => apiFetch<UserAdminDetail>(`/users/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}

export function useUserReferences() {
  const rolesQuery = useQuery({
    queryKey: referenceKeys.roles(),
    queryFn: () => apiFetch<RoleReference[]>('/roles'),
    staleTime: 5 * 60 * 1000,
  });

  const departmentsQuery = useQuery({
    queryKey: referenceKeys.departments(),
    queryFn: () => apiFetch<DepartmentReference[]>('/departments'),
    staleTime: 5 * 60 * 1000,
  });

  return {
    roles: rolesQuery.data?.data ?? [],
    departments: departmentsQuery.data?.data ?? [],
  };
}
