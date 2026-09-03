import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import React from 'react';
import { NotificationBell } from '@/components/shell/notification-bell';
import { renderWithProviders } from '@/test/test-utils';

// Mock useAuth
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      full_name: 'Budi Santoso',
      email: 'budi@jarvisops.test',
      role: { id: 4, name: 'employee' },
      permissions: ['ticket.viewAny'],
    },
    logout: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-notifications-poll', () => ({
  useNotificationsPoll: () => ({
    data: { unread_count: 3 },
    isLoading: false,
  }),
}));

describe('App Topbar Components', () => {
  it('renders NotificationBell with accessible trigger', () => {
    renderWithProviders(<NotificationBell />);
    const btn = screen.getByRole('button', { name: /buka menu notifikasi/i });
    expect(btn).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

