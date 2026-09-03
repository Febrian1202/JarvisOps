import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { UsersTable } from '@/components/admin/UsersTable';
import type { UserListItem } from '@/types/auth';
import type { PaginationMeta } from '@/types/api';

const users: UserListItem[] = [
  {
    id: 1,
    full_name: 'Andi Kusuma',
    email: 'andi@jarvis.test',
    status: 'active',
    role: { id: 1, name: 'administrator' },
    department: { id: 1, name: 'IT' },
    employee_code: 'EMP-001',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 2,
    full_name: 'Budi Santoso',
    email: 'budi@jarvis.test',
    status: 'inactive',
    role: { id: 3, name: 'technician' },
    department: null,
    employee_code: null,
    created_at: '2026-02-15T08:00:00Z',
  },
];

const meta: PaginationMeta = {
  current_page: 1,
  per_page: 10,
  total: 2,
  last_page: 1,
  from: 1,
  to: 2,
};

function renderTable(overrides?: Partial<Parameters<typeof UsersTable>[0]>) {
  return renderWithProviders(
    <UsersTable
      items={users}
      meta={meta}
      isLoading={false}
      sortBy="full_name"
      sortDir="asc"
      onSort={vi.fn()}
      onPageChange={vi.fn()}
      onPerPageChange={vi.fn()}
      onEdit={vi.fn()}
      onResetPassword={vi.fn()}
      onDelete={vi.fn()}
      onToggleStatus={vi.fn()}
      {...overrides}
    />
  );
}

describe('UsersTable', () => {
  it('renders user rows with name, email, role badge, department, status and employee_code', () => {
    renderTable();

    expect(screen.getByText('Andi Kusuma')).toBeInTheDocument();
    expect(screen.getAllByText('andi@jarvis.test').length).toBeGreaterThan(0);
    expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getAllByText('budi@jarvis.test').length).toBeGreaterThan(0);

    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('Teknisi')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText('Nonaktif')).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
  });

  it('renders action buttons with accessible labels', () => {
    renderTable();

    expect(
      screen.getAllByRole('button', { name: /edit pengguna/i })
    ).toHaveLength(2);
    expect(
      screen.getAllByRole('button', { name: /reset password/i })
    ).toHaveLength(2);
    expect(
      screen.getAllByRole('button', { name: /nonaktifkan pengguna/i })
    ).toHaveLength(1);
    expect(
      screen.getAllByRole('button', { name: /^aktifkan pengguna/i })
    ).toHaveLength(1);
    expect(
      screen.getAllByRole('button', { name: /hapus pengguna/i })
    ).toHaveLength(2);
  });

  it('calls onEdit with the row user when edit button clicked', () => {
    const onEdit = vi.fn();
    renderTable({ onEdit });

    fireEvent.click(screen.getAllByRole('button', { name: /edit pengguna/i })[0]);
    expect(onEdit).toHaveBeenCalledWith(users[0]);
  });

  it('calls onResetPassword with the row user when reset button clicked', () => {
    const onResetPassword = vi.fn();
    renderTable({ onResetPassword });

    fireEvent.click(
      screen.getAllByRole('button', { name: /reset password/i })[1]
    );
    expect(onResetPassword).toHaveBeenCalledWith(users[1]);
  });

  it('calls onDelete with the row user when delete button clicked', () => {
    const onDelete = vi.fn();
    renderTable({ onDelete });

    fireEvent.click(screen.getAllByRole('button', { name: /hapus pengguna/i })[0]);
    expect(onDelete).toHaveBeenCalledWith(users[0]);
  });

  it('calls onToggleStatus with the row user when toggle button clicked', () => {
    const onToggleStatus = vi.fn();
    renderTable({ onToggleStatus });

    fireEvent.click(
      screen.getAllByRole('button', { name: /nonaktifkan pengguna/i })[0]
    );
    expect(onToggleStatus).toHaveBeenCalledWith(users[0]);
  });

  it('shows empty state text when there are no users', () => {
    renderTable({ items: [], meta: { ...meta, total: 0, from: null, to: null } });

    expect(screen.getByText(/tidak ada pengguna ditemukan/i)).toBeInTheDocument();
  });
});
