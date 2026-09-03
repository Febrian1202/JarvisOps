import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TicketDetailBanner } from '@/components/tickets/TicketDetailBanner';
import type { TicketDetail } from '@/types/tickets';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/tickets/42',
}));

const mockCan = vi.fn(() => false);

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 9 },
    can: mockCan,
  }),
}));

const ticket: TicketDetail = {
  id: 42,
  ticket_number: 'TCK-0042',
  title: 'Wi-Fi lantai 3 sering putus',
  description: 'Deskripsi lengkap',
  status: { id: 1, name: 'OPEN' },
  priority: { id: 2, name: 'High', sla_minutes: 240 },
  category: { id: 1, name: 'Network' },
  reporter: { id: 1, full_name: 'Andi Kusuma', department: 'Finance' },
  technician: null,
  department: { id: 1, name: 'Finance' },
  asset: null,
  sla_duration_minutes: 240,
  sla_deadline: '2026-09-03T18:00:00Z',
  sla_breached: false,
  sla_status: 'on_track',
  sla_remaining_minutes: 120,
  resolved_at: null,
  closed_at: null,
  comments_count: 2,
  attachments_count: 1,
  available_actions: ['start', 'change_priority', 'comment', 'attach', 'edit'],
  editable_fields: ['title', 'description', 'category_id'],
  created_at: '2026-09-03T14:00:00Z',
  updated_at: '2026-09-03T14:00:00Z',
};

describe('TicketDetailBanner', () => {
  it('renders ticket number, title, badges, and action buttons', () => {
    render(<TicketDetailBanner ticket={ticket} onAction={vi.fn()} />);
    expect(screen.getByText('TCK-0042')).toBeInTheDocument();
    expect(screen.getByText('Wi-Fi lantai 3 sering putus')).toBeInTheDocument();
    expect(screen.getByText('Menunggu')).toBeInTheDocument();
    expect(screen.getByText('Tinggi')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Andi Kusuma')).toBeInTheDocument();
  });

  it('renders action buttons from available_actions', () => {
    render(<TicketDetailBanner ticket={ticket} onAction={vi.fn()} />);
    expect(screen.getByRole('button', { name: /mulai kerjakan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ubah prioritas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit tiket/i })).toBeInTheDocument();
  });

  it('does not render delete button without ticket.delete permission', () => {
    render(<TicketDetailBanner ticket={ticket} onAction={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /hapus tiket/i })).not.toBeInTheDocument();
  });

  it('renders delete button with ticket.delete permission', async () => {
    mockCan.mockReturnValueOnce(true);
    render(<TicketDetailBanner ticket={ticket} onAction={vi.fn()} />);
    expect(screen.getByRole('button', { name: /hapus tiket/i })).toBeInTheDocument();
  });

  it('does not render an action twice', () => {
    render(<TicketDetailBanner ticket={ticket} onAction={vi.fn()} />);
    const startButtons = screen.getAllByRole('button', { name: /mulai kerjakan/i });
    expect(startButtons.length).toBe(1);
  });
});