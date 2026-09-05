import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TicketCard } from './TicketCard';
import type { TicketListItem } from '@/types/tickets';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('TicketCard', () => {
  const mockTicket: TicketListItem = {
    id: 1,
    ticket_number: 'TKT-2023-001',
    title: 'PC tidak bisa menyala',
    sla_status: 'on_track',
    sla_breached: false,
    sla_deadline: '2023-12-01T10:00:00Z',
    created_at: '2023-12-01T08:00:00Z',
    status: { id: 1, name: 'OPEN' },
    priority: { id: 1, name: 'HIGH', sla_minutes: 60 },
    category: { id: 1, name: 'Hardware' },
    reporter: { id: 1, full_name: 'John Doe' },
    technician: { id: 2, full_name: 'Jane Smith' },
  };

  it('renders ticket details correctly', () => {
    render(<TicketCard ticket={mockTicket} />);
    
    // Check ticket number
    expect(screen.getByText('TKT-2023-001')).toBeInTheDocument();
    
    // Check title
    expect(screen.getByText('PC tidak bisa menyala')).toBeInTheDocument();
    
    // Check reporter & technician
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
  });

  it('navigates to ticket details on click', () => {
    render(<TicketCard ticket={mockTicket} />);
    
    const card = screen.getByRole('button');
    fireEvent.click(card);
    
    expect(mockPush).toHaveBeenCalledWith('/tickets/1');
  });
});
