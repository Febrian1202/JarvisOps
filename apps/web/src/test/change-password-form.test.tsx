import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { apiFetch, ApiClientError } from '@/lib/client/api';

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates password mismatch and min length requirements', async () => {
    renderWithProviders(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText(/password saat ini/i), {
      target: { value: 'OldPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/^password baru/i), {
      target: { value: 'short1' }, // < 8 chars
    });
    fireEvent.change(screen.getByLabelText(/konfirmasi password baru/i), {
      target: { value: 'different123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /perbarui password/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password baru minimal 8 karakter/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/konfirmasi password baru tidak cocok/i)
      ).toBeInTheDocument();
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('handles 422 incorrect current password with Indonesian message', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiClientError(422, 'The given data was invalid.', {
        current_password: ['The current password is incorrect.'],
      })
    );

    renderWithProviders(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText(/password saat ini/i), {
      target: { value: 'WrongCurrentPass1' },
    });
    fireEvent.change(screen.getByLabelText(/^password baru/i), {
      target: { value: 'NewSecret123' },
    });
    fireEvent.change(screen.getByLabelText(/konfirmasi password baru/i), {
      target: { value: 'NewSecret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /perbarui password/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Password saat ini tidak sesuai.')
      ).toBeInTheDocument();
    });
  });

  it('shows success banner and logout option upon successful password change', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'Password updated successfully.',
      data: null,
    });

    renderWithProviders(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText(/password saat ini/i), {
      target: { value: 'CorrectPass123' },
    });
    fireEvent.change(screen.getByLabelText(/^password baru/i), {
      target: { value: 'NewSecret123' },
    });
    fireEvent.change(screen.getByLabelText(/konfirmasi password baru/i), {
      target: { value: 'NewSecret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /perbarui password/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/password anda telah berhasil diperbarui/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /keluar sesi sekarang/i })
      ).toBeInTheDocument();
    });
  });
});
