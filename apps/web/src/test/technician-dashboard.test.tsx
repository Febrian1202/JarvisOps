import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TechnicianDashboard } from '@/components/dashboard/technician/technician-dashboard';
import * as dashboardsHook from '@/hooks/use-dashboards';
import type { TechnicianDashboardData } from '@/types/dashboard';

describe('TechnicianDashboard', () => {
  const mockData: TechnicianDashboardData = {
    assigned_tickets: 4,
    open_tickets: 12,
    in_progress_tickets: 2,
    sla_breached: 3,
    avg_resolution_minutes: 185,
    sla_compliance_percentage: 85.5,
    recent_activity: [
      {
        id: 1,
        field_changed: 'status_id',
        old_value: 'OPEN',
        new_value: 'IN_PROGRESS',
        user: { id: 20, full_name: 'Budi Teknisi' },
        ticket: {
          ticket_number: 'TCK-2026-0042',
          title: 'Laptop tidak mau menyala',
        },
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: 2,
        field_changed: 'priority_id',
        old_value: 'Medium',
        new_value: 'High',
        user: { id: 20, full_name: 'Budi Teknisi' },
        ticket: null,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 6 metric cards with correct values and links in activity list', () => {
    vi.spyOn(dashboardsHook, 'useTechnicianDashboard').mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof dashboardsHook.useTechnicianDashboard>);

    render(<TechnicianDashboard />);

    expect(screen.getByText('Ditugaskan ke Saya')).toBeInTheDocument();
    expect(screen.getByText('Sedang Dikerjakan')).toBeInTheDocument();
    expect(screen.getByText('Antrean OPEN (Bisa Diambil)')).toBeInTheDocument();
    expect(screen.getByText('SLA Breached')).toBeInTheDocument();
    expect(screen.getByText('Rata-rata Waktu Selesai')).toBeInTheDocument();
    expect(screen.getByText('SLA Compliance Saya')).toBeInTheDocument();

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('3j 5m')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();

    const ticketLink = screen.getByRole('link', { name: /TCK-2026-0042/i });
    expect(ticketLink).toBeInTheDocument();
    expect(ticketLink).toHaveAttribute('href', '/tickets?search=TCK-2026-0042');

    expect(screen.getByText(/Mengubah prioritas/i)).toBeInTheDocument();
  });

  it('applies danger tone to SLA Breached card when > 0', () => {
    vi.spyOn(dashboardsHook, 'useTechnicianDashboard').mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof dashboardsHook.useTechnicianDashboard>);

    render(<TechnicianDashboard />);

    const breachedCard = screen.getByText('SLA Breached').closest('.rounded-card');
    expect(breachedCard).toHaveClass('border-[#fae8e8]/80');
  });

  it('renders "—" when compliance or avg resolution time are null', () => {
    vi.spyOn(dashboardsHook, 'useTechnicianDashboard').mockReturnValue({
      data: {
        ...mockData,
        sla_breached: 0,
        avg_resolution_minutes: null,
        sla_compliance_percentage: null,
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof dashboardsHook.useTechnicianDashboard>);

    render(<TechnicianDashboard />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders empty state when there are no activities', () => {
    vi.spyOn(dashboardsHook, 'useTechnicianDashboard').mockReturnValue({
      data: {
        ...mockData,
        recent_activity: [],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof dashboardsHook.useTechnicianDashboard>);

    render(<TechnicianDashboard />);

    expect(screen.getByText('Belum ada aktivitas.')).toBeInTheDocument();
  });
});
