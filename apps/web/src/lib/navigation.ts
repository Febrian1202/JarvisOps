import {
  LayoutDashboard,
  Ticket,
  Laptop,
  FolderKanban,
  BookOpen,
  Users,
  Building2,
  Tags,
  Sliders,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import type { RoleName } from '@/types/auth';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  requiredAbility?: string;
  allowedRoles?: RoleName[];
  badge?: string;
  section?: 'main' | 'admin';
}

export const ROLE_HOME: Record<string, string> = {
  administrator: '/dashboard/admin',
  manager: '/dashboard/manager',
  technician: '/dashboard/technician',
  employee: '/dashboard/employee',
};

export const NAV_ITEMS: NavItem[] = [
  // Main Section
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    section: 'main',
  },
  {
    title: 'Tiket Layanan',
    href: '/tickets',
    icon: Ticket,
    requiredAbility: 'ticket.viewAny',
    section: 'main',
  },
  {
    title: 'Aset Saya',
    href: '/my-assets',
    icon: Laptop,
    requiredAbility: 'asset.viewOwn',
    section: 'main',
  },
  {
    title: 'Semua Aset',
    href: '/assets',
    icon: FolderKanban,
    requiredAbility: 'asset.viewAny',
    section: 'main',
  },
  {
    title: 'Basis Pengetahuan',
    href: '/knowledge',
    icon: BookOpen,
    requiredAbility: 'article.viewAny',
    section: 'main',
  },

  // Admin Section
  {
    title: 'Pengguna',
    href: '/admin/users',
    icon: Users,
    requiredAbility: 'user.viewAny',
    section: 'admin',
  },
  {
    title: 'Departemen',
    href: '/admin/departments',
    icon: Building2,
    requiredAbility: 'department.manage',
    section: 'admin',
  },
  {
    title: 'Kategori Tiket',
    href: '/admin/categories',
    icon: Tags,
    requiredAbility: 'ticket-category.manage',
    section: 'admin',
  },
  {
    title: 'Kategori KB',
    href: '/admin/knowledge-categories',
    icon: FolderKanban,
    requiredAbility: 'knowledge-category.manage',
    section: 'admin',
  },
  {
    title: 'Prioritas & SLA',
    href: '/admin/priorities',
    icon: Sliders,
    requiredAbility: 'ticket-priority.manage',
    section: 'admin',
  },
  {
    title: 'Log Audit',
    href: '/admin/audit-logs',
    icon: ScrollText,
    requiredAbility: 'audit-log.viewAny',
    section: 'admin',
  },
];

export function filterNavItems(
  permissions: string[] = [],
  role?: RoleName | string
): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    // Check specific role constraints if present
    if (item.allowedRoles && role && !item.allowedRoles.includes(role as RoleName)) {
      return false;
    }

    // Check specific permission/ability if present
    if (item.requiredAbility && !permissions.includes(item.requiredAbility)) {
      return false;
    }

    return true;
  });
}
