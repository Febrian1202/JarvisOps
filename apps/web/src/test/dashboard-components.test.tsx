import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Activity } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { DashboardPanel } from '@/components/dashboard/dashboard-panel';
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
