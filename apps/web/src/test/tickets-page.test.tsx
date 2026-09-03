import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TicketsPage from '@/app/(app)/tickets/page';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/tickets',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 1, permissions: ['ticket.viewAny', 'ticket.create'] },
    can: () => true,
    hasRole: (role: string) => role === 'manager',
  }),
}));

describe('Tickets Proving Ground Page', () => {
  it('renders page title and filter toolbar', () => {
    renderWithProviders(<TicketsPage />);
    expect(screen.getByRole('heading', { name: /daftar tiket layanan/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/cari nomor tiket/i)).toBeInTheDocument();
  });
});
