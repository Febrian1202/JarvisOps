'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { filterNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const permissions = user?.permissions ?? [];
  const role = user?.role?.name;
  const navItems = filterNavItems(permissions, role);

  const mainItems = navItems.filter((item) => item.section === 'main');
  const adminItems = navItems.filter((item) => item.section === 'admin');

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-border border-r bg-card transition-transform md:flex">
      {/* Brand Header */}
      <div className="flex h-14 items-center gap-3 border-border border-b px-6">
        <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius)] bg-primary font-bold text-primary-foreground text-xs shadow-sm">
          JO
        </span>
        <span className="font-semibold text-foreground text-sm tracking-tight">
          JARVIS OPS
        </span>
      </div>

      {/* Navigation List */}
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
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors',
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
                    className={cn(
                      'flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors',
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

      {/* Sidebar Footer */}
      <div className="border-border border-t p-3">
        <div className="rounded-[var(--radius)] bg-muted/50 p-2 text-center">
          <p className="text-[11px] text-muted-foreground">
            JARVIS OPS v0.7.0
          </p>
        </div>
      </div>
    </aside>
  );
}
