import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AuditLogFilters } from '@/components/admin/AuditLogFilters';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockRole = 'administrator';
let mockAbilities: string[] = ['audit-log.viewAny', 'user.viewAny'];

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
  }),
  usePathname: () => '/admin/audit-logs',
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 1, role: { name: mockRole } },
    hasRole: (role: string) => role === mockRole,
    can: (ability: string) => mockAbilities.includes(ability),
  }),
}));

vi.mock('@/hooks/use-users', () => ({
  useUsers: () => ({
    data: {
      data: [
        { id: 1, full_name: 'Super Administrator' },
        { id: 2, full_name: 'Budi Santoso' },
      ],
    },
  }),
}));

describe('AuditLogFilters Component', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
    mockRole = 'administrator';
    mockAbilities = ['audit-log.viewAny', 'user.viewAny'];
  });

  it('renders module, action, user filters and date range picker in a single horizontal row on desktop', () => {
    renderWithProviders(<AuditLogFilters />);

    expect(screen.getByRole('combobox', { name: 'Modul' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Aksi' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Pengguna' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /pilih tanggal/i }).length).toBeGreaterThanOrEqual(1);

    const container = screen.getByTestId('audit-log-filters');
    // One horizontal row on desktop: no wrapping, horizontal scroll when space is tight
    expect(container.className).toMatch(/(^|\s)flex-row(\s|$)/);
    expect(container.className).toContain('items-center');
    expect(container.className).toContain('overflow-x-auto');
    expect(container.className).not.toContain('flex-wrap');
    expect(container).toContainElement(screen.getByRole('combobox', { name: 'Modul' }));
    expect(container).toContainElement(screen.getByRole('combobox', { name: 'Aksi' }));
    expect(container).toContainElement(screen.getByRole('combobox', { name: 'Pengguna' }));
  });

  it('renders mobile filter sheet trigger on mobile viewports', () => {
    renderWithProviders(<AuditLogFilters />);

    const mobileContainer = screen.getByTestId('audit-log-filters-mobile');
    expect(mobileContainer).toBeInTheDocument();
    const filterButtons = screen.getAllByRole('button', { name: /filter/i });
    expect(filterButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('reflects active module and action filters from the URL', () => {
    mockSearchParams = new URLSearchParams('module=ticket&action=create');
    renderWithProviders(<AuditLogFilters />);

    expect(screen.getByRole('combobox', { name: 'Modul' })).toHaveTextContent('Ticket');
    expect(screen.getByRole('combobox', { name: 'Aksi' })).toHaveTextContent('Membuat');
  });

  it('shows placeholder labels when no filter is active', () => {
    renderWithProviders(<AuditLogFilters />);

    expect(screen.getByRole('combobox', { name: 'Modul' })).toHaveTextContent('Semua Modul');
    expect(screen.getByRole('combobox', { name: 'Aksi' })).toHaveTextContent('Semua Aksi');
    expect(screen.getByRole('combobox', { name: 'Pengguna' })).toHaveTextContent('Semua Pengguna');
    expect(screen.getAllByRole('button', { name: /pilih tanggal/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('updates URL when a module filter is selected and resets page', () => {
    mockSearchParams = new URLSearchParams('page=4');
    renderWithProviders(<AuditLogFilters />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Modul' }));
    fireEvent.click(screen.getByRole('option', { name: 'Aset' }));

    expect(mockReplace).toHaveBeenCalled();
    const target = mockReplace.mock.calls.at(-1)![0] as string;
    const params = new URLSearchParams(target.split('?')[1]);
    expect(params.get('module')).toBe('asset');
    expect(params.get('page')).toBe('1');
  });

  it('renders formatted date range when date_from and date_to are present in search params', () => {
    mockSearchParams = new URLSearchParams('date_from=2026-03-01&date_to=2026-03-15');
    renderWithProviders(<AuditLogFilters />);

    expect(
      screen.getAllByRole('button', { name: /1 Mar 2026 - 15 Mar 2026/i }).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders a single formatted date when only date_from is present', () => {
    mockSearchParams = new URLSearchParams('date_from=2026-03-01');
    renderWithProviders(<AuditLogFilters />);

    expect(screen.getAllByRole('button', { name: /1 Mar 2026/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('does not use native date inputs', () => {
    renderWithProviders(<AuditLogFilters />);

    expect(screen.queryByLabelText('Dari:')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('hides the user filter when the user lacks user.viewAny ability', () => {
    mockAbilities = ['audit-log.viewAny'];
    renderWithProviders(<AuditLogFilters />);

    expect(screen.queryByRole('combobox', { name: 'Pengguna' })).not.toBeInTheDocument();
  });

  it('restricts module options for manager role', () => {
    mockRole = 'manager';
    renderWithProviders(<AuditLogFilters />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Modul' }));

    expect(screen.getByRole('option', { name: 'Ticket' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Aset' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Artikel' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kategori Pengetahuan' })).toBeInTheDocument();
    // Restricted modules are hidden for manager
    expect(screen.queryByRole('option', { name: 'Pengguna' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Login' })).not.toBeInTheDocument();
  });

  it('hides the reset button when no filter is active', () => {
    renderWithProviders(<AuditLogFilters />);

    expect(screen.queryByRole('button', { name: /reset semua filter/i })).not.toBeInTheDocument();
  });

  it('shows the reset button and clears every query param on click', () => {
    mockSearchParams = new URLSearchParams(
      'module=ticket&date_from=2026-03-01&page=3&sort_by=created_at'
    );
    renderWithProviders(<AuditLogFilters />);

    const resetButtons = screen.getAllByRole('button', { name: /reset semua filter/i });
    expect(resetButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(resetButtons[0]);
    expect(mockReplace).toHaveBeenCalledWith('/admin/audit-logs');
  });

  it('verifies touch target size on filter triggers', () => {
    renderWithProviders(<AuditLogFilters />);

    const mobileFilterTrigger = screen.getByTestId('audit-log-filters-mobile').querySelector('button');
    expect(mobileFilterTrigger?.className).toMatch(/h-11|min-h-\[44px\]/);

    const dateButtons = screen.getAllByRole('button', { name: /pilih tanggal/i });
    expect(dateButtons[0].className).toMatch(/h-11|min-h-\[44px\]/);
  });
});
