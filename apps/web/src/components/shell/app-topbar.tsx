'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileNav } from '@/components/shell/mobile-nav';
import { NotificationBell } from '@/components/shell/notification-bell';
import { NavUser } from '@/components/shell/nav-user';

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/tickets')) return 'Tiket Layanan';
  if (pathname.startsWith('/my-assets')) return 'Aset Saya';
  if (pathname.startsWith('/assets')) return 'Inventaris Aset';
  if (pathname.startsWith('/knowledge')) return 'Basis Pengetahuan';
  if (pathname.startsWith('/notifications')) return 'Pusat Notifikasi';
  if (pathname.startsWith('/profile')) return 'Profil Pengguna';
  if (pathname.startsWith('/admin/users')) return 'Kelola Pengguna';
  if (pathname.startsWith('/admin/departments')) return 'Kelola Departemen';
  if (pathname.startsWith('/admin/categories')) return 'Kategori Tiket';
  if (pathname.startsWith('/admin/knowledge-categories')) return 'Kategori Pengetahuan';
  if (pathname.startsWith('/admin/priorities')) return 'Prioritas & SLA';
  if (pathname.startsWith('/admin/audit-logs')) return 'Log Audit';
  if (pathname.startsWith('/403')) return 'Akses Ditolak';
  return 'JARVIS OPS';
}

export function AppTopbar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-border border-b bg-card/80 px-4 backdrop-blur-sm sm:px-6">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden"
            aria-label="Buka menu navigasi"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <h1 className="font-semibold text-foreground text-base tracking-tight">
            {pageTitle}
          </h1>
        </div>

        {/* Right: Notification & User Menu */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <NavUser />
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
}
