import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { NotificationBell } from '@/components/shell/notification-bell';

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

describe('App Topbar Components', () => {
  it('renders NotificationBell with accessible link', () => {
    render(<NotificationBell unreadCount={3} />);
    const link = screen.getByRole('link', { name: /pusat notifikasi/i });
    expect(link).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
