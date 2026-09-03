import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { UserFormDialog } from '@/components/admin/UserFormDialog';
import { apiFetch } from '@/lib/client/api';
import type { UserAdminDetail, UserListItem } from '@/types/auth';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/users',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    can: () => true,
    user: null,
    isLoading: false,
    hasRole: () => false,
    logout: vi.fn(),
    refetchUser: vi.fn(),
  }),
}));

vi.mock('@/lib/client/api', () => ({
  apiFetch: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    constructor(
      public status: number,
      message: string,
      public errors?: Record<string, string[]>
    ) {
      super(message);
    }
  },
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;
  (
    globalThis as unknown as { Element: typeof Element }
  ).Element.prototype.hasPointerCapture = vi.fn();
  (
    globalThis as unknown as { Element: typeof Element }
  ).Element.prototype.setPointerCapture = vi.fn();
  (
    globalThis as unknown as { Element: typeof Element }
  ).Element.prototype.releasePointerCapture = vi.fn();
  (
    globalThis as unknown as { Element: typeof Element }
  ).Element.prototype.scrollIntoView = vi.fn();
});

const roles = [
  { id: 1, name: 'administrator' },
  { id: 2, name: 'manager' },
  { id: 3, name: 'technician' },
  { id: 4, name: 'employee' },
];

const departments = [
  { id: 1, name: 'IT' },
  { id: 2, name: 'Finance' },
];

const listItem: UserListItem = {
  id: 1,
  full_name: 'Andi Kusuma',
  email: 'andi@jarvis.test',
  status: 'active',
  role: { id: 4, name: 'employee' },
  department: { id: 1, name: 'IT' },
  employee_code: 'EMP-001',
  created_at: '2026-01-10T08:00:00Z',
};

const detail: UserAdminDetail = {
  ...listItem,
  must_change_password: false,
  profile: {
    employee_code: 'EMP-001',
    phone: '081234567890',
    position: 'Staf IT',
    hire_date: '2026-01-10',
  },
  updated_at: '2026-01-11T08:00:00Z',
};

function mockApi() {
  (apiFetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (url: string, options?: RequestInit) => {
      if (url === '/users/1' && !options?.method) {
        return Promise.resolve({
          success: true,
          message: 'User retrieved.',
          data: detail,
        });
      }
      if (url === '/users' && options?.method === 'POST') {
        return Promise.resolve({
          success: true,
          message: 'User created.',
          data: detail,
        });
      }
      if (url === '/users/1' && options?.method === 'PUT') {
        return Promise.resolve({
          success: true,
          message: 'User updated.',
          data: detail,
        });
      }
      return Promise.resolve({ success: true, message: 'OK', data: {} });
    }
  );
}

describe('UserFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('create mode shows password, password confirmation and status fields', () => {
    renderWithProviders(
      <UserFormDialog open user={null} roles={roles} departments={departments} onClose={vi.fn()} />
    );

    expect(screen.getByLabelText(/nama lengkap/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/konfirmasi password/i)).toBeInTheDocument();
    expect(screen.getByText(/status user/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tambah pengguna/i })).toBeInTheDocument();
  });

  it('edit mode hides password, password confirmation and status fields and loads detail', async () => {
    renderWithProviders(
      <UserFormDialog
        open
        user={listItem}
        roles={roles}
        departments={departments}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/nama lengkap/i)).toHaveValue('Andi Kusuma');
    });
    expect(screen.getByLabelText(/email/i)).toHaveValue('andi@jarvis.test');
    expect(screen.queryByLabelText(/^password/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/konfirmasi password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/status user/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simpan perubahan/i })).toBeInTheDocument();
  });

  it('create mode with mismatched password confirmation shows Indonesian validation error and does not submit', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <UserFormDialog open user={null} roles={roles} departments={departments} onClose={onClose} />
    );

    await user.type(screen.getByLabelText(/nama lengkap/i), 'Budi Santoso');
    await user.type(screen.getByLabelText(/email/i), 'budi@jarvis.test');
    await user.type(screen.getByLabelText(/^password/i), 'rahasia123');
    await user.type(screen.getByLabelText(/konfirmasi password/i), 'rahasia456');

    await user.click(screen.getByRole('button', { name: /tambah pengguna/i }));

    expect(await screen.findByText(/konfirmasi password tidak cocok/i)).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({ method: 'POST' })
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});
