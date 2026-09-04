import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmployeeDashboard } from '@/components/dashboard/employee/employee-dashboard';
import * as dashboardsHook from '@/hooks/use-dashboards';
import * as authProvider from '@/components/providers/auth-provider';
import type { EmployeeDashboardData } from '@/types/dashboard';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('EmployeeDashboard', () => {
  const mockData: EmployeeDashboardData = {
    my_open_tickets: 3,
    my_in_progress_tickets: 1,
    my_resolved_tickets: 5,
    recent_tickets: [
      {
        id: 101,
        ticket_number: 'TCK-2026-0001',
        title: 'Monitor mati saat dinyalakan',
        status: { id: 1, name: 'OPEN' },
        priority: { id: 1, name: 'High', sla_minutes: 240 },
        category: { id: 2, name: 'Hardware' },
        reporter: { id: 10, full_name: 'Ahmad Karyawan' },
        technician: { id: 20, full_name: 'Budi Teknisi' },
        sla_deadline: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
        sla_breached: false,
        sla_status: 'on_track',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: 102,
        ticket_number: 'TCK-2026-0002',
        title: 'Permintaan akses VPN',
        status: { id: 4, name: 'RESOLVED' },
        priority: { id: 2, name: 'Medium', sla_minutes: 480 },
        category: { id: 3, name: 'Network' },
        reporter: { id: 10, full_name: 'Ahmad Karyawan' },
        technician: null,
        sla_deadline: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        sla_breached: false,
        sla_status: 'on_track',
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
    ],
    my_assets: [
      {
        id: 51,
        asset_tag: 'AST-LP-001',
        name: 'MacBook Pro 14"',
        status: 'assigned',
      },
      {
        id: 52,
        asset_tag: 'AST-MN-004',
        name: 'Dell UltraSharp 27"',
        status: 'assigned',
      },
    ],
    recent_articles: [
      {
        id: 1,
        title: 'Panduan Menghubungkan VPN Kantor',
        slug: 'panduan-vpn-kantor',
        category: { id: 1, name: 'Jaringan' },
        author: { id: 20, full_name: 'Budi Teknisi' },
        status: 'published',
        view_count: 42,
        published_at: '2026-08-15T08:00:00Z',
        created_at: '2026-08-10T08:00:00Z',
        updated_at: '2026-08-15T08:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders greeting, 4 metric cards, mini ticket table, assets, and articles', () => {
    vi.spyOn(dashboardsHook, 'useEmployeeDashboard').mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(authProvider, 'useAuth').mockReturnValue({
      user: {
        id: 10,
        full_name: 'Ahmad Karyawan',
        email: 'ahmad@example.com',
        role: { id: 1, name: 'employee' },
        permissions: ['ticket.create'],
      } as any,
      can: (perm: string) => perm === 'ticket.create',
      hasRole: () => true,
      isLoading: false,
      logout: vi.fn(),
      refetchUser: vi.fn(),
    });

    render(<EmployeeDashboard />);

    expect(screen.getByText(/Ahmad Karyawan/i)).toBeInTheDocument();
    expect(screen.getByText(/Kamu punya 3 ticket yang sedang berjalan/i)).toBeInTheDocument();

    expect(screen.getByText('Ticket Terbuka')).toBeInTheDocument();
    expect(screen.getByText('Sedang Dikerjakan')).toBeInTheDocument();
    expect(screen.getAllByText('Selesai').length).toBeGreaterThan(0);
    expect(screen.getByText('Aset Dipegang')).toBeInTheDocument();

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Buat Ticket/i })).toBeInTheDocument();
    expect(screen.getByText('TCK-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Monitor mati saat dinyalakan')).toBeInTheDocument();

    expect(screen.getByText('MacBook Pro 14"')).toBeInTheDocument();
    expect(screen.getByText('AST-LP-001')).toBeInTheDocument();

    expect(screen.getByText('Panduan Menghubungkan VPN Kantor')).toBeInTheDocument();
  });

  it('hides CTA Buat Ticket when can("ticket.create") is false', () => {
    vi.spyOn(dashboardsHook, 'useEmployeeDashboard').mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(authProvider, 'useAuth').mockReturnValue({
      user: {
        id: 10,
        full_name: 'Ahmad Karyawan',
        email: 'ahmad@example.com',
        role: { id: 1, name: 'employee' },
        permissions: [],
      } as any,
      can: () => false,
      hasRole: () => false,
      isLoading: false,
      logout: vi.fn(),
      refetchUser: vi.fn(),
    });

    render(<EmployeeDashboard />);

    expect(screen.queryByRole('link', { name: /Buat Ticket/i })).not.toBeInTheDocument();
  });

  it('navigates to ticket detail when clicking a table row', () => {
    vi.spyOn(dashboardsHook, 'useEmployeeDashboard').mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(authProvider, 'useAuth').mockReturnValue({
      user: {
        id: 10,
        full_name: 'Ahmad Karyawan',
        email: 'ahmad@example.com',
        role: { id: 1, name: 'employee' },
        permissions: ['ticket.create'],
      } as any,
      can: () => true,
      hasRole: () => true,
      isLoading: false,
      logout: vi.fn(),
      refetchUser: vi.fn(),
    });

    render(<EmployeeDashboard />);

    const row = screen.getByText('TCK-2026-0001').closest('tr');
    expect(row).toBeInTheDocument();
    fireEvent.click(row!);

    expect(mockPush).toHaveBeenCalledWith('/tickets/101');
  });

  it('renders empty states when there is no data', () => {
    vi.spyOn(dashboardsHook, 'useEmployeeDashboard').mockReturnValue({
      data: {
        my_open_tickets: 0,
        my_in_progress_tickets: 0,
        my_resolved_tickets: 0,
        recent_tickets: [],
        my_assets: [],
        recent_articles: [],
      },
      isLoading: false,
      error: null,
    } as any);

    vi.spyOn(authProvider, 'useAuth').mockReturnValue({
      user: {
        id: 10,
        full_name: 'Ahmad Karyawan',
        email: 'ahmad@example.com',
        role: { id: 1, name: 'employee' },
        permissions: [],
      } as any,
      can: () => false,
      hasRole: () => false,
      isLoading: false,
      logout: vi.fn(),
      refetchUser: vi.fn(),
    });

    render(<EmployeeDashboard />);

    expect(screen.getByText('Belum ada tiket.')).toBeInTheDocument();
    expect(screen.getByText('Kamu belum memegang aset apa pun.')).toBeInTheDocument();
    expect(screen.getByText('Belum ada artikel terbaru.')).toBeInTheDocument();
  });
});
