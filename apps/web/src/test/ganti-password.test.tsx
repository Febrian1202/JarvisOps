import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GantiPasswordPage from '@/app/(auth)/ganti-password/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe('Ganti Password Page', () => {
  it('renders current password, new password, and confirmation inputs', () => {
    render(<GantiPasswordPage />);
    expect(screen.getByLabelText(/kata sandi saat ini/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^kata sandi baru/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/konfirmasi kata sandi baru/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /simpan & lanjutkan ke sistem/i })
    ).toBeInTheDocument();
  });
});
