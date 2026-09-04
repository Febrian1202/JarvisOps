import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GantiPasswordPage from '@/app/(auth)/ganti-password/page';
import { apiFetch } from '@/lib/client/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
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

describe('Ganti Password Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('toggles password visibility for all fields', () => {
    render(<GantiPasswordPage />);

    // Initial state: all inputs should be type="password"
    // We use getAllByLabelText and get the first one if there are multiple elements matching the same regex
    const currentPasswordInputs = screen.getAllByLabelText(/kata sandi saat ini/i);
    const currentPasswordInput = currentPasswordInputs[0];
    const newPasswordInput = screen.getByLabelText(/^kata sandi baru/i);
    const confirmPasswordInput = screen.getByLabelText(/konfirmasi kata sandi baru/i);

    expect(currentPasswordInput).toHaveAttribute('type', 'password');
    expect(newPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // Toggle current password
    const toggleCurrentButton = screen.getByRole('button', { name: /tampilkan kata sandi saat ini/i });
    fireEvent.click(toggleCurrentButton);
    expect(currentPasswordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /sembunyikan kata sandi saat ini/i })).toBeInTheDocument();

    // Toggle new password
    const toggleNewButton = screen.getByRole('button', { name: /tampilkan kata sandi baru/i });
    fireEvent.click(toggleNewButton);
    expect(newPasswordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /sembunyikan kata sandi baru/i })).toBeInTheDocument();

    // Toggle confirm password
    const toggleConfirmButton = screen.getByRole('button', { name: /tampilkan konfirmasi kata sandi/i });
    fireEvent.click(toggleConfirmButton);
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /sembunyikan konfirmasi kata sandi/i })).toBeInTheDocument();
  });

  it('renders current password, new password, and confirmation inputs', () => {
    render(<GantiPasswordPage />);
    expect(screen.getAllByLabelText(/kata sandi saat ini/i)[0]).toBeInTheDocument();
    expect(screen.getByLabelText(/^kata sandi baru/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/konfirmasi kata sandi baru/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /simpan & lanjutkan ke sistem/i })
    ).toBeInTheDocument();
  });

  // The page promises "kombinasi huruf dan angka" and the backend enforces
  // Password::min(8)->letters()->numbers(), so client validation must reject a
  // digits-only password instead of spending a 422 round-trip on it.
  it('rejects a digits-only new password without calling the API', async () => {
    render(<GantiPasswordPage />);

    fireEvent.change(screen.getAllByLabelText(/kata sandi saat ini/i)[0], {
      target: { value: 'OldSecret123' },
    });
    fireEvent.change(screen.getByLabelText(/^kata sandi baru/i), {
      target: { value: '12345678' },
    });
    fireEvent.change(screen.getByLabelText(/konfirmasi kata sandi baru/i), {
      target: { value: '12345678' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /simpan & lanjutkan ke sistem/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/password baru harus mengandung huruf/i)
      ).toBeInTheDocument();
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('submits to PUT /me/password when the password satisfies every rule', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'Password updated successfully.',
      data: null,
    });

    render(<GantiPasswordPage />);

    fireEvent.change(screen.getAllByLabelText(/kata sandi saat ini/i)[0], {
      target: { value: 'OldSecret123' },
    });
    fireEvent.change(screen.getByLabelText(/^kata sandi baru/i), {
      target: { value: 'NewSecret123' },
    });
    fireEvent.change(screen.getByLabelText(/konfirmasi kata sandi baru/i), {
      target: { value: 'NewSecret123' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /simpan & lanjutkan ke sistem/i })
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/me/password',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });
});
