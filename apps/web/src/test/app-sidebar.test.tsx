import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AppSidebar } from '@/components/shell/app-sidebar';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/tickets',
}));

// Mock useAuth
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      full_name: 'Budi Santoso',
      email: 'budi@jarvisops.test',
      role: { id: 4, name: 'employee' },
      permissions: ['ticket.viewAny', 'ticket.create'],
    },
  }),
}));

describe('AppSidebar Version Display', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('renders configured NEXT_PUBLIC_APP_VERSION when set', () => {
    process.env.NEXT_PUBLIC_APP_VERSION = 'v1.0.0';
    render(<AppSidebar />);
    expect(screen.getByText(/JARVIS OPS v1\.0\.0/i)).toBeInTheDocument();
  });

  it('formats version prefix properly if "v" is omitted in env', () => {
    process.env.NEXT_PUBLIC_APP_VERSION = '1.0.0';
    render(<AppSidebar />);
    expect(screen.getByText(/JARVIS OPS v1\.0\.0/i)).toBeInTheDocument();
  });

  it('falls back to v1.0.0 when NEXT_PUBLIC_APP_VERSION is not defined', () => {
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    render(<AppSidebar />);
    expect(screen.getByText(/JARVIS OPS v1\.0\.0/i)).toBeInTheDocument();
  });
});
