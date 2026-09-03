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

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'user@jarvisops.test', must_change_password: true },
    refetchUser: vi.fn(),
  }),
}));

describe('Ganti Password Page', () => {
  it('renders current password, new password, and confirmation inputs', () => {
    render(<GantiPasswordPage />);
    expect(screen.getByLabelText(/password saat ini/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password baru/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/konfirmasi password baru/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /simpan & masuk/i })
    ).toBeInTheDocument();
  });
});
