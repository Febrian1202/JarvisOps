'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { notificationKeys } from '@/lib/query-keys';
import type { NotificationItem } from '@/types/notifications';
import type { StandardQueryParams } from '@/types/api';

export interface NotificationQueryParams extends StandardQueryParams {
  is_read?: number | string;
  [key: string]: unknown;
}

export function useNotifications(params: NotificationQueryParams = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.set(key, String(val));
        }
      });
      const q = searchParams.toString();
      const endpoint = q ? `/notifications?${q}` : '/notifications';
      return apiFetch<NotificationItem[]>(endpoint);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch<null>(`/notifications/${id}/read`, { method: 'POST' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiFetch<null>('/notifications/read-all', { method: 'POST' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  return {
    ...query,
    markAsRead: markAsReadMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAllRead: markAllAsReadMutation.isPending,
  };
}
