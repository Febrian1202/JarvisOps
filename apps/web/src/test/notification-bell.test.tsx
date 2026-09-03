import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationBell } from '@/components/shell/notification-bell';
import { renderWithProviders } from '@/test/test-utils';

vi.mock('@/hooks/use-notifications-poll', () => ({
  useNotificationsPoll: () => ({
    data: { unread_count: 5 },
    isLoading: false,
  }),
}));

describe('NotificationBell Component with Polling', () => {
  it('renders notification bell button with unread count badge', () => {
    renderWithProviders(<NotificationBell />);
    expect(
      screen.getByRole('button', { name: /buka menu notifikasi/i })
    ).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
