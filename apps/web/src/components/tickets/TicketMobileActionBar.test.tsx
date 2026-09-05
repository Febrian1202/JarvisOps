import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TicketMobileActionBar } from './TicketMobileActionBar';
import type { TicketDetail } from '@/types/tickets';

describe('TicketMobileActionBar', () => {
  const mockTicket: TicketDetail = {
    id: 1,
    ticket_number: 'TKT-2023-001',
    title: 'PC tidak bisa menyala',
    description: 'Deskripsi detail',
    sla_duration_minutes: 60,
    sla_deadline: null,
    sla_breached: false,
    sla_status: 'on_track',
    sla_remaining_minutes: null,
    resolved_at: null,
    closed_at: null,
    comments_count: 0,
    attachments_count: 0,
    created_at: '2023-12-01T08:00:00Z',
    updated_at: '2023-12-01T08:00:00Z',
    status: { id: 1, name: 'OPEN' },
    priority: { id: 1, name: 'HIGH', sla_minutes: 60 },
    category: { id: 1, name: 'Hardware' },
    reporter: { id: 1, full_name: 'John Doe' },
    technician: null,
    department: null,
    asset: null,
    available_actions: ['start', 'comment'],
    editable_fields: [],
  };

  it('renders primary actions and comment button', () => {
    const handleAction = vi.fn();
    const handleComment = vi.fn();

    render(
      <TicketMobileActionBar
        ticket={mockTicket}
        onAction={handleAction}
        onCommentClick={handleComment}
      />
    );

    expect(screen.getByRole('button', { name: /tulis komentar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mulai kerjakan/i })).toBeInTheDocument();
  });

  it('calls onCommentClick when comment button is clicked', () => {
    const handleAction = vi.fn();
    const handleComment = vi.fn();

    render(
      <TicketMobileActionBar
        ticket={mockTicket}
        onAction={handleAction}
        onCommentClick={handleComment}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /tulis komentar/i }));
    expect(handleComment).toHaveBeenCalledTimes(1);
  });

  it('calls onAction when action button is clicked', () => {
    const handleAction = vi.fn();
    const handleComment = vi.fn();

    render(
      <TicketMobileActionBar
        ticket={mockTicket}
        onAction={handleAction}
        onCommentClick={handleComment}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /mulai kerjakan/i }));
    expect(handleAction).toHaveBeenCalledWith('start');
  });
});
