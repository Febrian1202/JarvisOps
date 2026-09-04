import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { UserFilters } from '@/components/admin/UserFilters';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
  }),
  usePathname: () => '/admin/users',
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/hooks/use-users', () => ({
  useUserReferences: () => ({
    roles: [
      { id: 1, name: 'administrator' },
      { id: 4, name: 'employee' },
    ],
    departments: [{ id: 2, name: 'Keuangan' }],
  }),
}));

describe('UserFilters', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it('renders search input and all three filter dropdowns', () => {
    renderWithProviders(<UserFilters />);

    expect(
      screen.getByPlaceholderText(/cari nama atau email pengguna/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Departemen' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
  });

  it('reflects active filters from the URL', () => {
    mockSearchParams = new URLSearchParams({
      role_id: '4',
      department_id: '2',
      status: 'active',
    });

    renderWithProviders(<UserFilters />);

    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveTextContent('employee');
    expect(screen.getByRole('combobox', { name: 'Departemen' })).toHaveTextContent('Keuangan');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Aktif');
  });

  it('shows the placeholder label when no filter is active', () => {
    renderWithProviders(<UserFilters />);

    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveTextContent('Semua Role');
    expect(screen.getByRole('combobox', { name: 'Departemen' })).toHaveTextContent(
      'Semua Departemen'
    );
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Semua Status');
  });

  it('pushes the search term into the URL and resets page', async () => {
    mockSearchParams = new URLSearchParams({ page: '4' });
    const user = userEvent.setup();
    renderWithProviders(<UserFilters />);

    await user.type(screen.getByPlaceholderText(/cari nama atau email pengguna/i), 'andi');

    await vi.waitFor(() => expect(mockReplace).toHaveBeenCalled());

    const target = mockReplace.mock.calls.at(-1)![0] as string;
    expect(target.startsWith('/admin/users?')).toBe(true);
    const params = new URLSearchParams(target.split('?')[1]);
    expect(params.get('search')).toBe('andi');
    expect(params.get('page')).toBe('1');
  });

  it('hides the reset button when no filter is active', () => {
    renderWithProviders(<UserFilters />);

    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument();
  });

  it('shows the reset button and clears every query param on click', () => {
    mockSearchParams = new URLSearchParams({
      role_id: '4',
      status: 'active',
      page: '3',
    });

    renderWithProviders(<UserFilters />);

    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    expect(mockReplace).toHaveBeenCalledWith('/admin/users');
  });
});
