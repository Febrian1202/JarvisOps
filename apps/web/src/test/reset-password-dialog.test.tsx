import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { apiFetch } from '@/lib/client/api';
import type { UserListItem } from '@/types/auth';

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

const writeTextMock = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: writeTextMock,
  },
  writable: true,
  configurable: true,
});

const user: UserListItem = {
  id: 1,
  full_name: 'Andi Kusuma',
  email: 'andi@jarvis.test',
  status: 'active',
  role: { id: 4, name: 'employee' },
  department: { id: 1, name: 'IT' },
  employee_code: 'EMP-001',
  created_at: '2026-01-10T08:00:00Z',
};

describe('ResetPasswordDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers POST /users/1/reset-password when opened', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'Password reset successfully.',
      data: { temporary_password: 'TempPass123' },
    });

    renderWithProviders(
      <ResetPasswordDialog open user={user} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/users/1/reset-password',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('displays temporary password, warning text and copy button on success', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'Password reset successfully.',
      data: { temporary_password: 'TempPass123' },
    });

    renderWithProviders(
      <ResetPasswordDialog open user={user} onClose={vi.fn()} />
    );

    expect(
      await screen.findByText('TempPass123')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/password baru hanya ditampilkan satu kali/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/semua sesi login aktif pengguna ini telah dicabut/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /salin/i })
    ).toBeInTheDocument();
  });

  it('copies the temporary password to clipboard', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'Password reset successfully.',
      data: { temporary_password: 'TempPass123' },
    });

    renderWithProviders(
      <ResetPasswordDialog open user={user} onClose={vi.fn()} />
    );

    const copyButton = await screen.findByRole('button', { name: /salin/i });
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith('TempPass123');
    await waitFor(() => {
      expect(screen.getByText('Tersalin')).toBeInTheDocument();
    });
  });
});
