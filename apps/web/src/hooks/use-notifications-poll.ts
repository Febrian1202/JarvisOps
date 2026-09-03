'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { notificationKeys } from '@/lib/query-keys';
import type { UnreadCountResponse } from '@/types/notifications';

export function useNotificationsPoll() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const res = await apiFetch<UnreadCountResponse>('/notifications/unread-count');
      return res.data;
    },
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 10 * 1000,
  });
}
