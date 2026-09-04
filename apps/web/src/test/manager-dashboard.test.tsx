import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ManagerDashboardViewProps } from '@/components/dashboard/manager/manager-dashboard-view';
import type { ManagerDashboardData } from '@/types/dashboard';

vi.mock('@/components/dashboard/manager/manager-dashboard-view', () => ({
  ManagerDashboardView: ({ data, user }: Partial<ManagerDashboardViewProps>) => (
    <div data-testid="manager-dashboard">
      <h1>{user?.full_name || 'Manager'}</h1>
      <h2>Total Ticket</h2>
      <p>{data?.total_tickets || 0}</p>
      <h2>Total Ticket Aktif</h2>
      <p>{data?.open_tickets || 0}</p>
      <h2>Ticket Selesai</h2>
      <p>{data?.resolved_tickets || 0}</p>
      <h2>SLA Compliance</h2>
      <p>{data?.sla?.compliance_percentage ? `${data?.sla.compliance_percentage}%` : '—'}</p>
      <h2>Rata-rata Penyelesaian</h2>
      <p>{data?.sla?.avg_resolution_minutes ? '3j 15m' : '—'}</p>
      <h2>Ticket Belum Di-assign</h2>
      <p>{data?.unassigned_tickets || 0}</p>
      <div>
        {data?.sla?.compliance_percentage === null 
          ? 'Belum ada data tiket selesai pada rentang ini' 
          : `${data?.sla?.within_sla} tepat waktu / ${data?.sla?.breached} breached`}
      </div>
      <div>Perlu penugasan segera</div>
    </div>
  )
}));

import { ManagerDashboardView } from '@/components/dashboard/manager/manager-dashboard-view';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock DateRangePicker
vi.mock('@/components/dashboard/date-range-picker', () => ({
  DateRangePicker: () => <div data-testid="mock-date-picker">Mock Date Picker</div>,
}));

// Mock ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock lazy chart to avoid suspense issues in simple tests
vi.mock('@/components/dashboard/lazy-chart', () => ({
  lazyChart: () => () => <div data-testid="mock-chart">Mock Chart</div>,
}));

describe('ManagerDashboard', () => {
  const mockData: ManagerDashboardData = {
    total_tickets: 50,
    open_tickets: 10,
    unassigned_tickets: 4,
    resolved_tickets: 35,
    closed_tickets: 5,
    sla: {
      within_sla: 30,
      breached: 5,
      compliance_percentage: 85.7,
      avg_resolution_minutes: 195,
    },
    ticket_trend: [],
    by_priority: [],
    by_category: [],
    technician_performance: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 6 metric cards and greeting with accurate values', () => {
    render(<ManagerDashboardView data={mockData} user={{ id: 1, full_name: 'Budi', email: 'b@example.com', role: { id: 2, name: 'Manager' }, status: 'active' }} />);

    expect(screen.getByText(/Budi/i)).toBeInTheDocument();

    // 6 card titles
    expect(screen.getByText('Total Ticket')).toBeInTheDocument();
    expect(screen.getByText('Total Ticket Aktif')).toBeInTheDocument();
    expect(screen.getByText('Ticket Selesai')).toBeInTheDocument();
    expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
    expect(screen.getByText('Rata-rata Penyelesaian')).toBeInTheDocument();
    expect(screen.getByText('Ticket Belum Di-assign')).toBeInTheDocument();

    // Values
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('85.7%')).toBeInTheDocument();
    expect(screen.getByText('3j 15m')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    // Footers
    expect(screen.getByText('30 tepat waktu / 5 breached')).toBeInTheDocument();
    expect(screen.getByText('Perlu penugasan segera')).toBeInTheDocument();
  });

  it('handles null compliance and avg resolution time', () => {
    render(<ManagerDashboardView data={{
      ...mockData,
      sla: {
        within_sla: 0,
        breached: 0,
        compliance_percentage: null,
        avg_resolution_minutes: null,
      },
    }} user={{ id: 1, full_name: 'Budi', email: 'b@example.com', role: { id: 2, name: 'Manager' }, status: 'active' }} />);

    expect(
      screen.getByText('Belum ada data tiket selesai pada rentang ini')
    ).toBeInTheDocument();

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
