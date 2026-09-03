import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { ActionDialogs } from '@/components/tickets/action-dialogs';
import type { TicketDetail } from '@/types/tickets';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/tickets/42',
}));

vi.mock('@/hooks/use-reference-data', () => ({
  useReferenceData: () => ({
    categories: [{ id: 1, name: 'Network' }],
    priorities: [
      { id: 1, name: 'Critical', sla_minutes: 120 },
      { id: 2, name: 'High', sla_minutes: 240 },
    ],
    statuses: [],
    departments: [],
    technicians: [],
    isLoading: false,
  }),
}));

vi.mock('@/lib/client/api', () => ({
  apiFetch: vi.fn(() =>
    Promise.resolve({ success: true, data: [{ id: 3, full_name: 'Budi Santoso' }] })
  ),
  ApiClientError: class ApiClientError extends Error {
    constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
      super(message);
    }
  },
}));

const ticket: TicketDetail = {
  id: 42,
  ticket_number: 'TCK-0042',
  title: 'Wi-Fi lantai 3',
  description: 'Deskripsi',
  status: { id: 1, name: 'OPEN' },
  priority: { id: 2, name: 'High', sla_minutes: 240 },
  category: { id: 1, name: 'Network' },
  reporter: { id: 1, full_name: 'Andi', department: 'Finance' },
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
  comments_count: 0,
  attachments_count: 0,
  available_actions: ['cancel'],
  editable_fields: ['title', 'description', 'category_id'],
  created_at: '2026-09-03T14:00:00Z',
  updated_at: '2026-09-03T14:00:00Z',
};

const noopMutations = {
  onAssign: vi.fn(),
  onStatus: vi.fn(),
  onPriority: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
};

describe('ActionDialogs — Cancel', () => {
  it('cancel dialog requires note before submit', async () => {
    renderWithProviders(
      <ActionDialogs
        ticket={ticket}
        activeDialog="cancel"
        activeAction="cancel"
        {...noopMutations}
        isDeletePending={false}
        isEditPending={false}
        isStatusPending={false}
        isAssignPending={false}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /batalkan ticket$/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/alasan pembatalan/i), {
      target: { value: 'alasan' },
    });

    await waitFor(() => {
      expect(submitBtn).toBeEnabled();
    });

    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(noopMutations.onStatus).toHaveBeenCalledWith(
        expect.objectContaining({ status_id: 5, note: 'alasan' })
      );
    });
  });

  it('cancel dialog marks note as required', async () => {
    renderWithProviders(
      <ActionDialogs
        ticket={ticket}
        activeDialog="cancel"
        activeAction="cancel"
        {...noopMutations}
        isDeletePending={false}
        isEditPending={false}
        isStatusPending={false}
        isAssignPending={false}
      />
    );

    // Note field labeled required and submit stays disabled while empty
    const submitBtn = screen.getByRole('button', { name: /batalkan ticket$/i });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByLabelText(/alasan pembatalan/i)).toHaveAttribute('aria-invalid', 'false');
  });
});