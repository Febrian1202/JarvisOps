'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { assetKeys } from '@/lib/query-keys';
import type { AssetListItem, AssetDetail, AssetTimelineEvent } from '@/types/assets';

export interface AssetQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  category?: string;
  assigned_user_id?: number | string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  [key: string]: unknown;
}

export function useAssets(params: AssetQueryParams = {}) {
  return useQuery({
    queryKey: assetKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.set(key, String(val));
        }
      });

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/assets?${queryString}` : '/assets';
      return apiFetch<AssetListItem[]>(endpoint);
    },
  });
}

export function useMyAssets(params: AssetQueryParams = {}) {
  return useQuery({
    queryKey: assetKeys.my(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.set(key, String(val));
        }
      });

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/my-assets?${queryString}` : '/my-assets';
      return apiFetch<AssetListItem[]>(endpoint);
    },
  });
}

export function useAsset(id: number) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: () => apiFetch<AssetDetail>(`/assets/${id}`),
    enabled: Number.isFinite(id),
  });
}

export function useAssetHistory(id: number) {
  return useQuery({
    queryKey: assetKeys.history(id),
    queryFn: () => apiFetch<AssetTimelineEvent[]>(`/assets/${id}/history`),
    enabled: Number.isFinite(id),
  });
}