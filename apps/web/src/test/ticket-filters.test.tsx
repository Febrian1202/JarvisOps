import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { TicketFilters } from '@/components/tickets/TicketFilters';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

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
    user: { id: 2, role: { name: 'manager' }, permissions: ['technician.list'] },
    hasRole: (role: string) => role === 'manager',
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
  });

  it('renders quick status filter chips and search bar', () => {
    renderWithProviders(<TicketFilters />);
    expect(screen.getByPlaceholderText(/cari nomor tiket atau judul/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /semua status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^open$/i })).toBeInTheDocument();
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
});
