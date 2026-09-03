'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/components/providers/auth-provider';
import { filterNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const permissions = user?.permissions ?? [];
  const role = user?.role?.name;
  const navItems = filterNavItems(permissions, role);

  const mainItems = navItems.filter((item) => item.section === 'main');
  const adminItems = navItems.filter((item) => item.section === 'admin');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed top-0 bottom-0 left-0 right-auto z-50 h-full w-72 max-w-none translate-x-0 translate-y-0 rounded-none border-r border-border bg-card p-0 shadow-xl data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
        <DialogHeader className="border-b border-border p-4 text-left">
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-xs shadow-sm">
              JO
            </span>
            <span className="font-semibold text-foreground text-sm tracking-tight">
              JARVIS OPS
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="mb-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Menu Utama
            </p>
            <nav className="space-y-1">
              {mainItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-secondary text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {adminItems.length > 0 && (
            <div>
              <p className="mb-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Administrasi
              </p>
              <nav className="space-y-1">
                {adminItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-secondary text-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
