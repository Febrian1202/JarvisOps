import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdminMetrics } from '@/components/dashboard/admin/admin-metrics';
import { ConfigShortcutsPanel } from '@/components/dashboard/admin/config-shortcuts';
import type { AdminDashboardData } from '@/types/dashboard';

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
