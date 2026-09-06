import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { MobileNav } from '@/components/shell/mobile-nav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/tickets',
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      full_name: 'Demo Administrator',
      email: 'admin@jarvisops.test',
      role: { id: 1, name: 'administrator' },
      permissions: [
        'ticket.viewAny',
        'asset.viewOwn',
        'asset.viewAny',
        'article.viewAny',
        'user.viewAny',
        'department.manage',
        'audit-log.viewAny',
      ],
    },
  }),
}));

describe('MobileNav', () => {
  it('renders brand header and nav sections when open', () => {
    renderWithProviders(<MobileNav open onOpenChange={vi.fn()} />);

    expect(screen.getByText('JARVIS OPS')).toBeInTheDocument();
    expect(screen.getByText('Menu Utama')).toBeInTheDocument();
    expect(screen.getByText('Administrasi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tiket layanan/i })).toBeInTheDocument();
  });

  it('uses flex column layout so content starts directly below compact header', () => {
    renderWithProviders(<MobileNav open onOpenChange={vi.fn()} />);

    const drawer = screen.getByRole('dialog');
    expect(drawer.className).toContain('flex');
    expect(drawer.className).toContain('flex-col');
    expect(drawer.className).not.toMatch(/(^|\s)grid(\s|$)/);
  });

  it('closes drawer when a nav item is clicked', () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<MobileNav open onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('link', { name: /tiket layanan/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders nav links with 44px min touch targets', () => {
    renderWithProviders(<MobileNav open onOpenChange={vi.fn()} />);

    const ticketLink = screen.getByRole('link', { name: /tiket layanan/i });
    expect(ticketLink.className).toContain('min-h-[44px]');
  });
});
