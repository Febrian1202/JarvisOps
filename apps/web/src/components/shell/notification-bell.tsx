'use client';

import React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationBellProps {
  unreadCount?: number;
}

export function NotificationBell({ unreadCount = 0 }: NotificationBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      asChild
      className="relative rounded-[var(--radius)] text-muted-foreground hover:text-foreground"
    >
      <Link href="/notifications" aria-label="Pusat Notifikasi">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-bold text-[10px] text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
