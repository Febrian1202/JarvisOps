import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { TicketTable } from '@/components/tickets/TicketTable';
import type { TicketListItem } from '@/types/tickets';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

describe('TicketTable Component', () => {
  const dummyTickets: TicketListItem[] = [
    {
      id: 42,
      ticket_number: 'TCK-0042',
      title: 'Wi-Fi lantai 3 sering putus saat meeting daring',
      category: { id: 1, name: 'Network' },
      priority: { id: 1, name: 'Critical', sla_minutes: 120 },
      status: { id: 1, name: 'OPEN' },
      reporter: { id: 1, full_name: 'Andi Kusuma' },
      technician: null,
      sla_deadline: '2026-09-03T18:00:00Z',
      sla_breached: false,
      sla_status: 'on_track',
      created_at: '2026-09-03T14:00:00Z',
    },
  ];

  it('renders ticket table with proper columns', () => {
    renderWithProviders(
      <TicketTable
        tickets={dummyTickets}
        isLoading={false}
        sortBy="created_at"
        sortDir="desc"
        onSort={vi.fn()}
      />
    );

    expect(screen.getAllByText('TCK-0042').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Wi-Fi lantai 3 sering putus saat meeting daring').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Network').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Andi Kusuma').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Belum ditugaskan').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to detail page on row click', () => {
    renderWithProviders(
      <TicketTable
        tickets={dummyTickets}
        isLoading={false}
        sortBy="created_at"
        sortDir="desc"
        onSort={vi.fn()}
      />
    );

    // We need to click the desktop row, not the mobile card.
    // We can search for the row by role, or just pick the row that contains the text
    const rows = screen.getAllByRole('row');
    // The first row is the header, the second row is the data row
    fireEvent.click(rows[1]);
    expect(mockPush).toHaveBeenCalledWith('/tickets/42');
  });

  it('calls onSort when column header is clicked', () => {
    const onSort = vi.fn();
    renderWithProviders(
      <TicketTable
        tickets={dummyTickets}
        isLoading={false}
        sortBy="created_at"
        sortDir="desc"
        onSort={onSort}
      />
    );

    const numberHeader = screen.getByText(/nomor tiket/i);
    fireEvent.click(numberHeader);
    expect(onSort).toHaveBeenCalledWith('ticket_number');
  });

  it('title column is not sortable', () => {
    const onSort = vi.fn();
    renderWithProviders(
      <TicketTable
        tickets={dummyTickets}
        isLoading={false}
        sortBy="created_at"
        sortDir="desc"
        onSort={onSort}
      />
    );

    // Title header should not be a button
    expect(screen.queryByRole('button', { name: /urutkan berdasarkan judul/i })).not.toBeInTheDocument();

    // Clicking the text should not trigger sort
    const titleHeader = screen.getByText('Judul Permohonan');
    fireEvent.click(titleHeader);
    expect(onSort).not.toHaveBeenCalled();
  });
});
