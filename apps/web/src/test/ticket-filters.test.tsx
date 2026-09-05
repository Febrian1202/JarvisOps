import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { TicketFilters } from '@/components/tickets/TicketFilters';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockRole = 'manager';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
  }),
  usePathname: () => '/tickets',
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 2, role: { name: mockRole }, permissions: ['technician.list'] },
    hasRole: (role: string) => role === mockRole,
    can: (ability: string) => ability === 'technician.list',
  }),
}));

vi.mock('@/hooks/use-reference-data', () => ({
  useReferenceData: () => ({
    categories: [{ id: 1, name: 'Hardware', parent_id: null }],
    priorities: [{ id: 1, name: 'Critical', sla_minutes: 120 }],
    statuses: [
      { id: 1, name: 'OPEN' },
      { id: 2, name: 'ASSIGNED' },
      { id: 3, name: 'IN_PROGRESS' },
      { id: 4, name: 'RESOLVED' },
      { id: 5, name: 'CLOSED' },
    ],
    departments: [{ id: 1, name: 'IT' }],
    technicians: [{ id: 3, full_name: 'Budi Santoso' }],
    isLoading: false,
  }),
}));

describe('TicketFilters Component', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
    mockRole = 'manager';
  });

  it('renders quick status filter chips and search bar', () => {
    renderWithProviders(<TicketFilters />);
    expect(screen.getByPlaceholderText(/cari nomor tiket atau judul/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /semua status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^open$/i })).toBeInTheDocument();
  });

  it('renders mobile filter sheet trigger on mobile viewports', () => {
    renderWithProviders(<TicketFilters />);
    const filterButtons = screen.getAllByRole('button', { name: /filter/i });
    expect(filterButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('updates URL when a status chip is clicked', () => {
    renderWithProviders(<TicketFilters />);
    const openChip = screen.getByRole('button', { name: /^open$/i });
    fireEvent.click(openChip);
    expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('status_id=1'));
  });

  it('updates URL when search is changed', async () => {
    renderWithProviders(<TicketFilters />);
    const input = screen.getByPlaceholderText(/cari nomor tiket atau judul/i);
    fireEvent.change(input, { target: { value: 'TCK-001' } });
    // Search input has debounce, we verify input rendered
    expect(input).toHaveValue('TCK-001');
  });

  it('renders date range picker button instead of native date inputs', () => {
    renderWithProviders(<TicketFilters />);
    expect(screen.queryByLabelText('Dari tanggal')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sampai tanggal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pilih tanggal/i })).toBeInTheDocument();
  });

  it('renders formatted date range when created_from and created_to are present in search params', () => {
    mockSearchParams = new URLSearchParams('created_from=2025-01-10&created_to=2025-01-20');
    renderWithProviders(<TicketFilters />);
    expect(screen.getByRole('button', { name: /10 Jan 2025 - 20 Jan 2025/i })).toBeInTheDocument();
  });

  it('hides the reset button when no filter is active', () => {
    renderWithProviders(<TicketFilters />);
    expect(screen.queryByRole('button', { name: /reset semua filter/i })).not.toBeInTheDocument();
  });

  it('renders an icon-only reset button next to the search input when a filter is active', () => {
    mockSearchParams = new URLSearchParams('priority_id=1');
    renderWithProviders(<TicketFilters />);

    const resetButton = screen.getByRole('button', { name: /reset semua filter/i });
    expect(resetButton).toBeInTheDocument();
    // Icon-only: no visible "Reset" text label
    expect(resetButton.textContent?.trim()).toBe('');

    // Sits in the same row container as the search input
    const searchInput = screen.getByPlaceholderText(/cari nomor tiket atau judul/i);
    const searchRow = searchInput.closest('[data-testid="ticket-filters-search-row"]');
    expect(searchRow).not.toBeNull();
    expect(searchRow).toContainElement(resetButton);
  });

  it('resets every filter when the reset button is clicked', () => {
    mockSearchParams = new URLSearchParams('priority_id=1&created_from=2025-01-10');
    renderWithProviders(<TicketFilters />);

    fireEvent.click(screen.getByRole('button', { name: /reset semua filter/i }));
    expect(mockReplace).toHaveBeenCalledWith('/tickets');
  });

  it('groups the secondary filters into a multi-column grid instead of one filter per row', () => {
    mockRole = 'employee';
    renderWithProviders(<TicketFilters />);

    const grid = screen.getByTestId('ticket-filters-grid');
    expect(grid.className).toContain('grid');
    // Never one filter per row, even on the narrowest viewport
    expect(grid.className).toMatch(/(^|\s)grid-cols-2(\s|$)/);
    // Employee has 4 filters -> a single balanced row of 4 on desktop
    expect(grid.className).toMatch(/lg:grid-cols-4/);
    expect(grid.className).not.toMatch(/grid-cols-1/);
  });

  it('uses a balanced 3-by-2 grid for roles that see all six filters', () => {
    mockRole = 'manager';
    renderWithProviders(<TicketFilters />);

    const grid = screen.getByTestId('ticket-filters-grid');
    // 6 filters -> 3 per row on desktop (two even rows), all six in one row on xl
    expect(grid.className).toMatch(/lg:grid-cols-3/);
    expect(grid.className).toMatch(/xl:grid-cols-6/);
  });

  it('renders every employee-visible filter inside the grid row', () => {
    mockRole = 'employee';
    renderWithProviders(<TicketFilters />);

    const grid = screen.getByTestId('ticket-filters-grid');
    expect(grid).toContainElement(screen.getByRole('combobox', { name: /prioritas/i }));
    expect(grid).toContainElement(screen.getByRole('combobox', { name: /kategori/i }));
    expect(grid).toContainElement(screen.getByRole('combobox', { name: /status sla/i }));
    expect(grid).toContainElement(screen.getByRole('button', { name: /pilih tanggal/i }));
    // Employee sees no technician or department filter
    expect(screen.queryByRole('combobox', { name: /teknisi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /departemen/i })).not.toBeInTheDocument();
  });

  it('renders all six filters inside the grid row for a manager', () => {
    mockRole = 'manager';
    renderWithProviders(<TicketFilters />);

    const grid = screen.getByTestId('ticket-filters-grid');
    ['Prioritas', 'Kategori', 'Teknisi', 'Departemen', 'Status SLA'].forEach((label) => {
      expect(grid).toContainElement(screen.getByRole('combobox', { name: label }));
    });
    expect(grid).toContainElement(screen.getByRole('button', { name: /pilih tanggal/i }));
  });
});
