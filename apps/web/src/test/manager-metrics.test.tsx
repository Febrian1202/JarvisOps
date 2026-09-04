import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManagerMetrics } from '@/components/dashboard/manager/manager-metrics';
import { SlaComplianceCard } from '@/components/dashboard/manager/sla-compliance-card';
import type { ManagerDashboardData } from '@/types/dashboard';

describe('SlaComplianceCard', () => {
  it('renders SLA compliance percentage, progress bar, and within/breached footer', () => {
    render(
      <SlaComplianceCard
        compliancePercentage={87.5}
        withinSla={7}
        breachedSla={1}
      />
    );

    expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
    expect(screen.getByText('87.5%')).toBeInTheDocument();
    expect(screen.getByText('7 tepat waktu / 1 breached')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '87.5');
  });

  it('renders "—" and empty message when compliancePercentage is null or total resolved is 0', () => {
    render(
      <SlaComplianceCard
        compliancePercentage={null}
        withinSla={0}
        breachedSla={0}
      />
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(
      screen.getByText('Belum ada data tiket selesai pada rentang ini')
    ).toBeInTheDocument();
  });

  it('highlights tone danger when compliancePercentage < 85', () => {
    const { container } = render(
      <SlaComplianceCard
        compliancePercentage={82}
        withinSla={82}
        breachedSla={18}
      />
    );

    const card = container.firstElementChild;
    expect(card).toHaveClass('border-[#fae8e8]/80');
    expect(screen.getByText('82%')).toHaveClass('text-[#991b1b]');
  });

  it('renders skeleton during isLoading', () => {
    const { container } = render(<SlaComplianceCard isLoading={true} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('87.5%')).not.toBeInTheDocument();
  });
});

describe('ManagerMetrics', () => {
  const mockData: ManagerDashboardData = {
    total_tickets: 42,
    open_tickets: 8,
    unassigned_tickets: 3,
    resolved_tickets: 30,
    closed_tickets: 4,
    sla: {
      within_sla: 27,
      breached: 3,
      compliance_percentage: 90,
      avg_resolution_minutes: 195,
    },
    ticket_trend: [],
    by_priority: [],
    by_category: [],
    technician_performance: [],
  };

  it('renders 6 metric cards with correct labels and formatted values', () => {
    render(<ManagerMetrics data={mockData} isLoading={false} />);

    // 6 card labels
    expect(screen.getByText('Total Ticket')).toBeInTheDocument();
    expect(screen.getByText('Total Ticket Aktif')).toBeInTheDocument();
    expect(screen.getByText('Ticket Selesai')).toBeInTheDocument();
    expect(screen.getByText('SLA Compliance')).toBeInTheDocument();
    expect(screen.getByText('Rata-rata Penyelesaian')).toBeInTheDocument();
    expect(screen.getByText('Ticket Belum Di-assign')).toBeInTheDocument();

    // Values
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('3j 15m')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Footers & Tooltip/Snapshot note
    expect(screen.getByText('Pada rentang tanggal ini')).toBeInTheDocument();
    expect(
      screen.getByText('Snapshot kondisi saat ini (status 1, 2, 3)')
    ).toBeInTheDocument();
    expect(screen.getByText('Resolved pada rentang tanggal ini')).toBeInTheDocument();
    expect(screen.getByText('27 tepat waktu / 3 breached')).toBeInTheDocument();
    expect(screen.getByText('Berdasarkan tiket resolved')).toBeInTheDocument();
    expect(screen.getByText('Perlu penugasan segera')).toBeInTheDocument();
  });

  it('highlights danger when unassigned_tickets > 0', () => {
    render(<ManagerMetrics data={mockData} isLoading={false} />);

    const unassignedCard = screen
      .getByText('Ticket Belum Di-assign')
      .closest('.rounded-card');
    expect(unassignedCard).toHaveClass('border-[#fae8e8]/80');
  });

  it('handles null values gracefully for avg resolution time and compliance', () => {
    const nullData: ManagerDashboardData = {
      ...mockData,
      unassigned_tickets: 0,
      sla: {
        within_sla: 0,
        breached: 0,
        compliance_percentage: null,
        avg_resolution_minutes: null,
      },
    };

    render(<ManagerMetrics data={nullData} isLoading={false} />);

    // unassigned = 0 -> no danger highlight
    const unassignedCard = screen
      .getByText('Ticket Belum Di-assign')
      .closest('.rounded-card');
    expect(unassignedCard).not.toHaveClass('border-[#fae8e8]/80');

    // Dashes rendered for null avg resolution and null compliance
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Belum ada data tiket selesai pada rentang ini')
    ).toBeInTheDocument();
  });

  it('renders skeletons when isLoading is true', () => {
    const { container } = render(<ManagerMetrics isLoading={true} />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });
});
