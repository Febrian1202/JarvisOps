import React from 'react';
import Link from 'next/link';
import {
  Settings2,
  Users,
  Building2,
  Tags,
  Sliders,
  FolderKanban,
  ChevronRight,
} from 'lucide-react';
import { DashboardPanel } from '@/components/dashboard/dashboard-panel';

const shortcuts = [
  {
    title: 'Pengguna & Role',
    description: 'Manajemen akun, peran pengguna, dan status aktif/non-aktif.',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Departemen',
    description: 'Kelola divisi, unit kerja, dan pemetaan departemen perusahaan.',
    href: '/admin/departments',
    icon: Building2,
  },
  {
    title: 'Kategori Ticket',
    description: 'Atur kategori pengelompokan laporan kendala IT.',
    href: '/admin/categories',
    icon: Tags,
  },
  {
    title: 'Prioritas & SLA',
    description: 'Konfigurasi tingkat prioritas dan target durasi penanganan.',
    href: '/admin/priorities',
    icon: Sliders,
  },
  {
    title: 'Kategori Basis Pengetahuan',
    description: 'Struktur taksonomi topik untuk artikel knowledge base.',
    href: '/admin/knowledge-categories',
    icon: FolderKanban,
  },
];

export function ConfigShortcutsPanel() {
  return (
    <DashboardPanel
      title="Pintasan Konfigurasi"
      actionLabel="Kelola"
      actionHref="/admin/users"
      actionIcon={Settings2}
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Akses cepat pengelolaan master data &amp; pengaturan sistem.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="group relative flex items-start gap-3 p-3.5 rounded-card border border-cream-border bg-cream hover:bg-cream-card hover:border-cream-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Icon className="h-4.5 w-4.5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-xs font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {shortcut.title}
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                    {shortcut.description}
                  </p>
                </div>
                <ChevronRight
                  className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all"
                  strokeWidth={1.5}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardPanel>
  );
}
