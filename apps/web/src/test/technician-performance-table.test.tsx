import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  TechnicianPerformanceTable,
  sortTechnicians,
} from '@/components/dashboard/manager/technician-performance-table';
import type { TechnicianPerformanceItem } from '@/types/dashboard';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('sortTechnicians helper', () => {
  const sampleItems: TechnicianPerformanceItem[] = [
    {
      technician: { id: 1, full_name: 'Budi Santoso' },
      handled: 48,
      resolved: 42,
      open: 4,
      breached: 3,
      avg_resolution_minutes: 195,
      sla_compliance_percentage: 93.0,
    },
    {
      technician: { id: 2, full_name: 'Andi Pratama' },
      handled: 30,
      resolved: 20,
      open: 8,
      breached: 0,
      avg_resolution_minutes: null,
      sla_compliance_percentage: null,
    },
    {
      technician: { id: 3, full_name: 'Citra Dewi' },
      handled: 50,
      resolved: 45,
      open: 2,
      breached: 1,
      avg_resolution_minutes: 120,
      sla_compliance_percentage: 98.0,
    },
  ];

  it('sorts by technician name ascending and descending', () => {
    const asc = sortTechnicians(sampleItems, 'technician', 'asc');
    expect(asc.map((i) => i.technician.full_name)).toEqual([
      'Andi Pratama',
      'Budi Santoso',
      'Citra Dewi',
    ]);

    const desc = sortTechnicians(sampleItems, 'technician', 'desc');
    expect(desc.map((i) => i.technician.full_name)).toEqual([
      'Citra Dewi',
      'Budi Santoso',
      'Andi Pratama',
    ]);
  });

  it('sorts by resolved tickets ascending and descending', () => {
    const asc = sortTechnicians(sampleItems, 'resolved', 'asc');
    expect(asc.map((i) => i.resolved)).toEqual([20, 42, 45]);

    const desc = sortTechnicians(sampleItems, 'resolved', 'desc');
    expect(desc.map((i) => i.resolved)).toEqual([45, 42, 20]);
  });

  it('sorts by open/active tickets ascending and descending', () => {
    const asc = sortTechnicians(sampleItems, 'active', 'asc');
    expect(asc.map((i) => i.open)).toEqual([2, 4, 8]);

    const desc = sortTechnicians(sampleItems, 'active', 'desc');
    expect(desc.map((i) => i.open)).toEqual([8, 4, 2]);
  });

  it('sorts by breached tickets ascending and descending', () => {
    const asc = sortTechnicians(sampleItems, 'breached', 'asc');
    expect(asc.map((i) => i.breached)).toEqual([0, 1, 3]);

    const desc = sortTechnicians(sampleItems, 'breached', 'desc');
    expect(desc.map((i) => i.breached)).toEqual([3, 1, 0]);
  });

  it('sorts null values to the end regardless of direction for sla and avg', () => {
    // Sla compliance
    const slaAsc = sortTechnicians(sampleItems, 'sla', 'asc');
    expect(slaAsc.map((i) => i.technician.id)).toEqual([1, 3, 2]); // 93, 98, null

    const slaDesc = sortTechnicians(sampleItems, 'sla', 'desc');
    expect(slaDesc.map((i) => i.technician.id)).toEqual([3, 1, 2]); // 98, 93, null

    // Avg resolution
    const avgAsc = sortTechnicians(sampleItems, 'avg', 'asc');
    expect(avgAsc.map((i) => i.technician.id)).toEqual([3, 1, 2]); // 120, 195, null

    const avgDesc = sortTechnicians(sampleItems, 'avg', 'desc');
    expect(avgDesc.map((i) => i.technician.id)).toEqual([1, 3, 2]); // 195, 120, null
  });

  it('handles empty or single-item array gracefully', () => {
    expect(sortTechnicians([], 'resolved', 'desc')).toEqual([]);
    expect(sortTechnicians([sampleItems[0]], 'resolved', 'desc')).toEqual([sampleItems[0]]);
  });
});

describe('TechnicianPerformanceTable component', () => {
  const sampleItems: TechnicianPerformanceItem[] = [
    {
      technician: { id: 1, full_name: 'Budi Santoso' },
      handled: 48,
      resolved: 42,
      open: 4,
      breached: 3,
      avg_resolution_minutes: 195,
      sla_compliance_percentage: 93.0,
    },
    {
      technician: { id: 2, full_name: 'Andi Pratama' },
      handled: 30,
      resolved: 20,
      open: 8,
      breached: 0,
      avg_resolution_minutes: null,
      sla_compliance_percentage: null,
    },
    {
      technician: { id: 3, full_name: 'Unknown' },
      handled: 50,
      resolved: 45,
      open: 2,
      breached: 1,
      avg_resolution_minutes: 120,
      sla_compliance_percentage: 98.0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table inside DashboardPanel with 6 column headers', () => {
    render(<TechnicianPerformanceTable items={sampleItems} />);

    expect(screen.getByText('Performa Technician')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lihat semua tiket/i })).toHaveAttribute('href', '/tickets');

    // 6 headers
    expect(screen.getByRole('button', { name: /Urutkan berdasarkan TECHNICIAN/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Urutkan berdasarkan SELESAI/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Urutkan berdasarkan COMPLIANCE/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Urutkan berdasarkan RATA-RATA/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Urutkan berdasarkan AKTIF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Urutkan berdasarkan BREACHED/i })).toBeInTheDocument();

    // Verify caption for accessibility
    expect(screen.getByText(/Daftar ringkasan performa dan beban kerja teknisi/i)).toBeInTheDocument();
  });

  it('renders default sort order (resolved DESC) and formats rows properly', () => {
    render(<TechnicianPerformanceTable items={sampleItems} />);

    const rows = screen.getAllByRole('row');
    // Header is row 0; data rows are 1, 2, 3
    // Order should be Citra/Unknown (45), Budi (42), Andi (20)
    expect(within(rows[1]).getByText('Unknown')).toBeInTheDocument();
    expect(within(rows[1]).getByText('45')).toBeInTheDocument();
    expect(within(rows[1]).getByText('98%')).toBeInTheDocument();
    expect(within(rows[1]).getByText('2j')).toBeInTheDocument(); // 120m -> 2j

    expect(within(rows[2]).getByText('Budi Santoso')).toBeInTheDocument();
    expect(within(rows[2]).getByText('42')).toBeInTheDocument();
    expect(within(rows[2]).getByText('93%')).toBeInTheDocument();
    expect(within(rows[2]).getByText('3j 15m')).toBeInTheDocument(); // 195m -> 3j 15m

    expect(within(rows[3]).getByText('Andi Pratama')).toBeInTheDocument();
    expect(within(rows[3]).getByText('20')).toBeInTheDocument();
    // Andi has null compliance and avg resolution -> dashes "—"
    const dashes = within(rows[3]).getAllByText('—');
    expect(dashes.length).toBe(2);
  });

  it('highlights breached > 0 with danger tone', () => {
    render(<TechnicianPerformanceTable items={sampleItems} />);

    const rows = screen.getAllByRole('row');
    // Row 1: Unknown has breached 1
    const breachedCell1 = within(rows[1]).getByText('1');
    expect(breachedCell1).toHaveClass('text-destructive');

    // Row 3: Andi has breached 0
    const breachedCell3 = within(rows[3]).getByText('0');
    expect(breachedCell3).not.toHaveClass('text-destructive');
  });

  it('toggles sort direction when header button is clicked', () => {
    render(<TechnicianPerformanceTable items={sampleItems} />);

    const resolvedHeader = screen.getByRole('button', { name: /Urutkan berdasarkan SELESAI/i });

    // Initial state is resolved DESC: Unknown (45), Budi (42), Andi (20)
    let rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Unknown')).toBeInTheDocument();

    // Click to sort ASC
    fireEvent.click(resolvedHeader);
    rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Andi Pratama')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Unknown')).toBeInTheDocument();

    // Click again to sort DESC
    fireEvent.click(resolvedHeader);
    rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Unknown')).toBeInTheDocument();
  });

  it('switches sort column when another header button is clicked', () => {
    render(<TechnicianPerformanceTable items={sampleItems} />);

    const techHeader = screen.getByRole('button', { name: /Urutkan berdasarkan TECHNICIAN/i });

    // Clicking technician sorts by name (default desc or asc depending on toggle)
    fireEvent.click(techHeader);
    const rows = screen.getAllByRole('row');
    // Default switch order is asc: Andi, Budi, Unknown
    expect(within(rows[1]).getByText('Andi Pratama')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Budi Santoso')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Unknown')).toBeInTheDocument();
  });

  it('navigates to /tickets?technician_id={id} on row click and keyboard Enter/Space', () => {
    render(<TechnicianPerformanceTable items={sampleItems} />);

    const rows = screen.getAllByRole('row');
    const budiRow = rows[2]; // Budi is row 2 in default sort

    fireEvent.click(budiRow);
    expect(mockPush).toHaveBeenCalledWith('/tickets?technician_id=1');

    // Keyboard navigation
    fireEvent.keyDown(budiRow, { key: 'Enter' });
    expect(mockPush).toHaveBeenCalledWith('/tickets?technician_id=1');

    fireEvent.keyDown(budiRow, { key: ' ' });
    expect(mockPush).toHaveBeenCalledWith('/tickets?technician_id=1');
  });

  it('renders EmptyState when items list is empty', () => {
    render(<TechnicianPerformanceTable items={[]} />);

    expect(screen.getByText('Belum Ada Data')).toBeInTheDocument();
    expect(
      screen.getByText('Belum ada teknisi yang menangani tiket pada rentang tanggal ini.')
    ).toBeInTheDocument();
  });

  it('renders Skeleton loading when isLoading is true', () => {
    const { container } = render(<TechnicianPerformanceTable items={sampleItems} isLoading={true} />);

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByText('Budi Santoso')).not.toBeInTheDocument();
  });
});
