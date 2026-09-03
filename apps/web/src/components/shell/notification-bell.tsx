'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Ticket, AlertTriangle, MessageSquare, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RelativeTime } from '@/components/shared/relative-time';
import { useNotificationsPoll } from '@/hooks/use-notifications-poll';
import { apiFetch } from '@/lib/client/api';
import { notificationKeys } from '@/lib/query-keys';
import type { NotificationItem, NotificationType } from '@/types/notifications';
import { cn } from '@/lib/utils';

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'TICKET_SLA_BREACHED':
      return <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />;
    case 'TICKET_COMMENTED':
      return <MessageSquare className="h-4 w-4 text-primary shrink-0" />;
    default:
      return <Ticket className="h-4 w-4 text-primary shrink-0" />;
  }
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const { data: pollData } = useNotificationsPoll();
  const unreadCount = pollData?.unread_count ?? 0;

  // Fetch top 5 recent notifications when popover is open
  const { data: listResponse, isLoading } = useQuery({
    queryKey: notificationKeys.list({ per_page: 5 }),
    queryFn: async () => {
      const res = await apiFetch<NotificationItem[]>('/notifications?per_page=5');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  const notifications = listResponse ?? [];

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-[var(--radius)] text-muted-foreground hover:text-foreground"
          aria-label={`Buka menu notifikasi (${unreadCount} belum dibaca)`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-bold text-[10px] text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 sm:w-96 p-0 border border-border bg-card shadow-lg" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground text-sm">Notifikasi</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                {unreadCount} baru
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Tandai semua dibaca
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Memuat notifikasi…
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Tidak ada notifikasi untuk ditampilkan.
            </div>
          ) : (
            notifications.map((item) => (
              <DropdownMenuItem
                key={item.id}
                asChild
                className={cn(
                  'flex items-start gap-3 p-3 cursor-pointer transition-colors focus:bg-muted/40',
                  !item.is_read && 'bg-primary/[0.03]'
                )}
                onClick={() => {
                  if (!item.is_read) {
                    markAsReadMutation.mutate(item.id);
                  }
                }}
              >
                <Link
                  href={
                    item.data.ticket_id
                      ? `/tickets/${item.data.ticket_id}`
                      : '/notifications'
                  }
                  className="w-full"
                >
                  <div className="mt-0.5">{getNotificationIcon(item.type)}</div>
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <p className={cn('text-xs line-clamp-2 text-foreground', !item.is_read && 'font-medium')}>
                      {item.data.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      <RelativeTime date={item.created_at} />
                    </p>
                  </div>
                  {!item.is_read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </Link>
              </DropdownMenuItem>
            ))
          )}
        </div>

        {/* Footer */}
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2 bg-muted/10 text-center">
          <Button variant="ghost" size="sm" asChild className="w-full h-8 text-xs font-medium">
            <Link href="/notifications">
              <span>Lihat Semua Notifikasi</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
