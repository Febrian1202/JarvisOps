import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Activity } from 'lucide-react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import { MetricCard } from '@/components/dashboard/metric-card';
import { DashboardPanel } from '@/components/dashboard/dashboard-panel';
import { TechnicianPerformanceTable } from '@/components/dashboard/manager/technician-performance-table';
import { TicketMiniTable } from '@/components/dashboard/employee/ticket-mini-table';
import { MetricCard as ExportedMetricCard, DashboardPanel as ExportedDashboardPanel } from '@/components/dashboard';

describe('Dashboard Index Exports', () => {
  it('exports MetricCard and DashboardPanel from index.ts', () => {
    expect(ExportedMetricCard).toBeDefined();
    expect(ExportedDashboardPanel).toBeDefined();
  });
});

describe('MetricCard Component', () => {
  it('renders label, value, icon and footer correctly', () => {
    render(
      <MetricCard
        label="Total Tiket"
        value={128}
        icon={Activity}
        footer={<span data-testid="metric-footer">+12% dari minggu lalu</span>}
      />
    );

    expect(screen.getByText('Total Tiket')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByTestId('metric-footer')).toBeInTheDocument();
  });

  it('has compact padding and responsive typography', () => {
    const { container } = render(
      <MetricCard
        label="Total Tiket"
        value={128}
        icon={Activity}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('p-3');
    expect(card.className).toContain('sm:p-4');

    const valueEl = screen.getByText('128');
    expect(valueEl.className).toContain('text-lg');
    expect(valueEl.className).toContain('sm:text-2xl');
  });

  it('renders "—" when value is null (K6 requirement)', () => {
    render(
      <MetricCard
        label="Rata-rata Resolusi"
        value={null}
      />
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders Skeleton when isLoading is true and hides normal value/footer', () => {
    const { container } = render(
      <MetricCard
        label="Tiket Terbuka"
        value={42}
        isLoading={true}
        footer="Footer text"
      />
    );

    expect(screen.getByText('Tiket Terbuka')).toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
    expect(screen.queryByText('Footer text')).not.toBeInTheDocument();
    
    // Check skeleton is rendered
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('applies danger tone styles when tone is "danger"', () => {
    const { container } = render(
      <MetricCard
        label="SLA Breached"
        value={5}
        icon={Activity}
        tone="danger"
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Check danger class or indicator presence
    const dangerElements = container.querySelectorAll('.text-destructive, .text-\\[\\#991b1b\\], .border-destructive');
    expect(dangerElements.length).toBeGreaterThan(0);
  });
});

describe('DashboardPanel Component', () => {
  it('renders title, action link, and children', () => {
    render(
      <DashboardPanel
        title="Tiket Membutuhkan Tindakan"
        actionLabel="Lihat Semua"
        actionHref="/tickets"
        actionIcon={Activity}
      >
        <div data-testid="panel-content">Daftar Tiket</div>
      </DashboardPanel>
    );

    expect(screen.getByText('Tiket Membutuhkan Tindakan')).toBeInTheDocument();
    const actionLink = screen.getByRole('link', { name: /lihat semua/i });
    expect(actionLink).toBeInTheDocument();
    expect(actionLink).toHaveAttribute('href', '/tickets');
    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
  });

  it('renders skeleton rows when isLoading is true', () => {
    const { container } = render(
      <DashboardPanel
        title="Tiket Terbaru"
        isLoading={true}
      >
        <div data-testid="panel-content">Content</div>
      </DashboardPanel>
    );

    expect(screen.getByText('Tiket Terbaru')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-content')).not.toBeInTheDocument();
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders EmptyState when isEmpty is true', () => {
    render(
      <DashboardPanel
        title="Aktivitas Terkini"
        isEmpty={true}
        emptyMessage="Tidak ada aktivitas terbaru saat ini."
      >
        <div data-testid="panel-content">Content</div>
      </DashboardPanel>
    );

    expect(screen.getByText('Aktivitas Terkini')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-content')).not.toBeInTheDocument();
    expect(screen.getByText('Tidak ada aktivitas terbaru saat ini.')).toBeInTheDocument();
  });
});

describe('TechnicianPerformanceTable Responsive Hiding', () => {
  it('hides secondary columns on mobile with responsive classes', () => {
    const mockItems = [
      {
        technician: { id: 1, full_name: 'Budi Santoso' },
        handled: 48,
        resolved: 42,
        open: 4,
        breached: 3,
        avg_resolution_minutes: 195,
        sla_compliance_percentage: 93.0,
      },
    ];

    const { container } = render(<TechnicianPerformanceTable items={mockItems} />);

    // Th checks
    const thElements = Array.from(container.querySelectorAll('th'));
    const complianceTh = thElements.find((th) => th.textContent?.includes('COMPLIANCE'));
    const avgTh = thElements.find((th) => th.textContent?.includes('RATA-RATA'));
    const activeTh = thElements.find((th) => th.textContent?.includes('AKTIF'));

    expect(complianceTh?.className).toContain('hidden');
    expect(complianceTh?.className).toContain('sm:table-cell');

    expect(avgTh?.className).toContain('hidden');
    expect(avgTh?.className).toContain('md:table-cell');

    expect(activeTh?.className).toContain('hidden');
    expect(activeTh?.className).toContain('sm:table-cell');

    // Td checks
    const tdElements = Array.from(container.querySelectorAll('tbody tr td'));
    // Order of tds: 0: technician, 1: resolved, 2: compliance, 3: avg, 4: active, 5: breached
    const complianceTd = tdElements[2];
    const avgTd = tdElements[3];
    const activeTd = tdElements[4];

    expect(complianceTd.className).toContain('hidden');
    expect(complianceTd.className).toContain('sm:table-cell');

    expect(avgTd.className).toContain('hidden');
    expect(avgTd.className).toContain('md:table-cell');

    expect(activeTd.className).toContain('hidden');
    expect(activeTd.className).toContain('sm:table-cell');
  });
});

describe('TicketMiniTable Responsive Hiding', () => {
  it('hides secondary columns on mobile with responsive classes', () => {
    const mockTickets = [
      {
        id: 1,
        ticket_number: 'TICK-001',
        title: 'Printer Rusak',
        status: { id: 1, name: 'OPEN' as const },
        priority: { id: 1, name: 'HIGH' as const, sla_minutes: 240 },
        category: { id: 1, name: 'Hardware' },
        reporter: { id: 1, full_name: 'User 1' },
        sla_deadline: '2026-09-06T10:00:00Z',
        sla_breached: false,
        sla_status: 'on_track' as const,
        created_at: '2026-09-05T08:00:00Z',
      },
    ];

    const { container } = render(<TicketMiniTable tickets={mockTickets} />);

    // Th checks
    const thElements = Array.from(container.querySelectorAll('th'));
    const priorityTh = thElements.find((th) => th.textContent?.includes('PRIORITAS'));
    const slaTh = thElements.find((th) => th.textContent?.includes('SISA SLA'));
    const createdTh = thElements.find((th) => th.textContent?.includes('DIBUAT'));

    expect(priorityTh?.className).toContain('hidden');
    expect(priorityTh?.className).toContain('sm:table-cell');

    expect(slaTh?.className).toContain('hidden');
    expect(slaTh?.className).toContain('md:table-cell');

    expect(createdTh?.className).toContain('hidden');
    expect(createdTh?.className).toContain('sm:table-cell');

    // Td checks
    const tdElements = Array.from(container.querySelectorAll('tbody tr td'));
    // Order of tds: 0: NOMOR, 1: JUDUL, 2: STATUS, 3: PRIORITAS, 4: SISA SLA, 5: DIBUAT
    const priorityTd = tdElements[3];
    const slaTd = tdElements[4];
    const createdTd = tdElements[5];

    expect(priorityTd.className).toContain('hidden');
    expect(priorityTd.className).toContain('sm:table-cell');

    expect(slaTd.className).toContain('hidden');
    expect(slaTd.className).toContain('md:table-cell');

    expect(createdTd.className).toContain('hidden');
    expect(createdTd.className).toContain('sm:table-cell');
  });
});
