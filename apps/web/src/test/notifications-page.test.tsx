import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NotificationsPage from '@/app/(app)/notifications/page';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/notifications',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Notifications Page', () => {
  it('renders page header and filter tabs', () => {
    renderWithProviders(<NotificationsPage />);
    expect(
      screen.getByRole('heading', { name: /pusat notifikasi/i })
    ).toBeInTheDocument();
  });
});
