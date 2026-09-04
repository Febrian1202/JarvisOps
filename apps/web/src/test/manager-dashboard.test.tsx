import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManagerDashboard } from '@/components/dashboard/manager/manager-dashboard';
import * as dashboardsHook from '@/hooks/use-dashboards';
import type { ManagerDashboardData } from '@/types/dashboard';

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

  it('renders 6 metric cards and title with accurate values', () => {
    vi.spyOn(dashboardsHook, 'useManagerDashboard').mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof dashboardsHook.useManagerDashboard>);

    render(<ManagerDashboard />);

    expect(screen.getByText('Dashboard Manager')).toBeInTheDocument();

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
    vi.spyOn(dashboardsHook, 'useManagerDashboard').mockReturnValue({
      data: {
        ...mockData,
        sla: {
          within_sla: 0,
          breached: 0,
          compliance_percentage: null,
          avg_resolution_minutes: null,
        },
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof dashboardsHook.useManagerDashboard>);

    render(<ManagerDashboard />);

    expect(
      screen.getByText('Belum ada data tiket selesai pada rentang ini')
    ).toBeInTheDocument();

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
