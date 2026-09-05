import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminMetrics } from '@/components/dashboard/admin/admin-metrics';
import { ConfigShortcutsPanel } from '@/components/dashboard/admin/config-shortcuts';
import { AuditLogPanel } from '@/components/dashboard/admin/audit-log-panel';
import type { AdminDashboardData } from '@/types/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe('AdminMetrics', () => {
  const mockAdminData: Partial<AdminDashboardData> = {
    total_users: 42,
    total_assets: 120,
    total_technicians: 8,
    total_departments: 5,
  };

  it('renders 4 metric cards with correct labels and values', () => {
    render(<AdminMetrics data={mockAdminData as AdminDashboardData} />);

    expect(screen.getByText('Total Pengguna')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();

    expect(screen.getByText('Total Aset IT')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();

    expect(screen.getByText('Technician')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();

    expect(screen.getByText('Departemen')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('handles loading state with skeletons', () => {
    const { container } = render(<AdminMetrics isLoading={true} />);

    expect(screen.getByText('Total Pengguna')).toBeInTheDocument();
    expect(screen.getByText('Total Aset IT')).toBeInTheDocument();
    expect(screen.getByText('Technician')).toBeInTheDocument();
    expect(screen.getByText('Departemen')).toBeInTheDocument();

    // MetricCard shows skeletons when isLoading is true
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('handles undefined or null data gracefully with placeholder em-dash', () => {
    render(<AdminMetrics data={undefined} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(4);
  });
});

describe('ConfigShortcutsPanel', () => {
  it('renders title, description and all 5 shortcut links', () => {
    render(<ConfigShortcutsPanel />);

    expect(screen.getByText('Pintasan Konfigurasi')).toBeInTheDocument();
    expect(
      screen.getByText('Akses cepat pengelolaan master data & pengaturan sistem.')
    ).toBeInTheDocument();

    const expectedShortcuts = [
      { name: 'Pengguna & Role', href: '/admin/users' },
      { name: 'Departemen', href: '/admin/departments' },
      { name: 'Kategori Ticket', href: '/admin/categories' },
      { name: 'Prioritas & SLA', href: '/admin/priorities' },
      { name: 'Kategori Basis Pengetahuan', href: '/admin/knowledge-categories' },
    ];

    expectedShortcuts.forEach(({ name, href }) => {
      const link = screen.getByRole('link', { name: new RegExp(name, 'i') });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', href);
    });
  });
});

describe('AuditLogPanel', () => {
  const mockActivities: AdminDashboardData['recent_system_activity'] = [
    {
      id: 1,
      user: { id: 10, full_name: 'Budi Santoso' },
      action: 'create',
      module: 'ticket',
      description: 'Membuat tiket #TICK-101',
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: 2,
      user: null, // Rule D-31: System action
      action: 'sla_breach',
      module: 'ticket',
      description: 'SLA tiket #TICK-088 terlampaui otomatis',
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ];

  it('renders panel with title, description, and link to /admin/audit-logs', () => {
    render(<AuditLogPanel items={mockActivities} />);

    expect(screen.getByText('Audit Log Terbaru')).toBeInTheDocument();
    expect(
      screen.getByText('Catatan riwayat aktivitas dan perubahan sistem terkini.')
    ).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Lihat Semua/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/admin/audit-logs');
  });

  it('renders table with user name, action and module badge, description, and waktu', () => {
    render(<AuditLogPanel items={mockActivities} />);

    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('Membuat tiket #TICK-101')).toBeInTheDocument();
    // Action and module badge: "Membuat" & "Tiket"
    expect(screen.getByText('Membuat', { exact: true })).toBeInTheDocument();
    expect(screen.getAllByText('Tiket').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pelanggaran SLA')).toBeInTheDocument();
  });

  it('correctly handles item.user === null by rendering "Sistem" (Rule D-31)', () => {
    render(<AuditLogPanel items={mockActivities} />);

    expect(screen.getByText('Sistem')).toBeInTheDocument();
    expect(screen.getByText('SLA tiket #TICK-088 terlampaui otomatis')).toBeInTheDocument();
  });

  it('renders EmptyState when items array is empty or undefined', () => {
    const { rerender } = render(<AuditLogPanel items={[]} />);

    expect(screen.getByText('Belum ada aktivitas sistem')).toBeInTheDocument();

    rerender(<AuditLogPanel items={undefined} />);
    expect(screen.getByText('Belum ada aktivitas sistem')).toBeInTheDocument();
  });

  it('renders skeleton rows when isLoading is true', () => {
    const { container } = render(<AuditLogPanel isLoading={true} />);

    expect(screen.getByText('Audit Log Terbaru')).toBeInTheDocument();
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});
