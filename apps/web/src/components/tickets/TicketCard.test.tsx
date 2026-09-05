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
    id: '1',
    ticket_number: 'TKT-2023-001',
    title: 'PC tidak bisa menyala',
    description: 'Deskripsi panjang di sini',
    status_id: 1,
    priority_id: 1,
    category_id: 1,
    reporter_id: 'r1',
    technician_id: 't1',
    sla_duration_minutes: 60,
    sla_status: 'ok',
    sla_deadline: '2023-12-01T10:00:00Z',
    created_at: '2023-12-01T08:00:00Z',
    updated_at: '2023-12-01T08:00:00Z',
    status: { id: 1, name: 'OPEN', description: '', created_at: '', updated_at: '' },
    priority: { id: 1, name: 'HIGH', sla_minutes: 60, created_at: '', updated_at: '' },
    category: { id: 1, name: 'Hardware', description: '', created_at: '', updated_at: '' },
    reporter: { id: 'r1', full_name: 'John Doe', nip: '123', email: 'john@example.com', created_at: '', updated_at: '' },
    technician: { id: 't1', full_name: 'Jane Smith', nip: '456', email: 'jane@example.com', created_at: '', updated_at: '' },
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
