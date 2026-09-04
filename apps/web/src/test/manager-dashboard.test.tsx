import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ManagerDashboardViewProps } from '@/components/dashboard/manager/manager-dashboard-view';
import type { ManagerDashboardData } from '@/types/dashboard';

import { ManagerDashboardView } from '@/components/dashboard/manager/manager-dashboard-view';
import { AuthProvider } from '@/components/providers/auth-provider';

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

// Mock CardHeader/CardTitle/CardContent for simpler assertions
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useAuth
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 1, full_name: 'Budi', email: 'b@example.com', role: { id: 2, name: 'Manager' }, status: 'active' },
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock useReferenceData
vi.mock('@/hooks/use-reference-data', () => ({
  useReferenceData: () => ({
    priorities: [
      { id: 1, name: 'Low', color: '#ccc' },
      { id: 2, name: 'High', color: '#f00' }
    ],
    categories: [
      { id: 1, name: 'Hardware' },
      { id: 2, name: 'Software' }
    ],
    isLoading: false
  })
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
