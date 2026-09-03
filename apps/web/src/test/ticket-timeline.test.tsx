import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { TicketTimeline } from '@/components/tickets/TicketTimeline';
import { CommentForm } from '@/components/tickets/CommentForm';
import type { TimelineEntry } from '@/components/tickets/timeline-merge';

const mockApiFetch = vi.fn();
vi.mock('@/lib/client/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  ApiClientError: class ApiClientError extends Error {
    constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
      super(message);
    }
  },
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 5, full_name: 'Andi Kusuma' },
    can: () => true,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('TicketTimeline', () => {
  it('renders comments and history entries in merged order', () => {
    const entries: TimelineEntry[] = [
      { type: 'history', id: 1, created_at: '2026-09-03T10:00:00Z', user: null, description: 'Status diubah dari Menunggu menjadi Ditugaskan' },
      { type: 'comment', id: 2, created_at: '2026-09-03T11:00:00Z', user: { id: 5, full_name: 'Andi Kusuma' }, body: 'Mencoba langkah pertama' },
    ];
    render(<TicketTimeline entries={entries} />);
    expect(screen.getByText('Status diubah dari Menunggu menjadi Ditugaskan')).toBeInTheDocument();
    expect(screen.getByText('Mencoba langkah pertama')).toBeInTheDocument();
    expect(screen.getByText('Andi Kusuma')).toBeInTheDocument();
  });

  it('shows empty text when no entries', () => {
    render(<TicketTimeline entries={[]} />);
    expect(screen.getByText(/belum ada komentar atau riwayat/i)).toBeInTheDocument();
  });
});

describe('CommentForm', () => {
  it('renders textarea and submit button when enabled', () => {
    renderWithProviders(<CommentForm ticketId={42} enabled />);
    expect(screen.getByLabelText(/tulis komentar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kirim komentar/i })).toBeDisabled();
  });

  it('does not render when disabled', () => {
    renderWithProviders(<CommentForm ticketId={42} enabled={false} />);
    expect(screen.queryByLabelText(/tulis komentar/i)).not.toBeInTheDocument();
  });

  it('submits comment and calls api', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: { id: 99, ticket_id: 42, user: { id: 5, full_name: 'Andi Kusuma' }, body: 'Sudah dicoba', created_at: '2026-09-03T12:00:00Z', updated_at: '2026-09-03T12:00:00Z' },
    });

    renderWithProviders(<CommentForm ticketId={42} enabled />);
    const input = screen.getByLabelText(/tulis komentar/i);
    fireEvent.change(input, { target: { value: 'Sudah dicoba' } });
    const button = screen.getByRole('button', { name: /kirim komentar/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/tickets/42/comments',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('submits comment with existing cache and updates envelope data', async () => {
    mockApiFetch.mockResolvedValueOnce({
      success: true,
      message: 'ok',
      data: { id: 99, ticket_id: 42, user: { id: 5, full_name: 'Andi Kusuma' }, body: 'Sudah dicoba', created_at: '2026-09-03T12:00:00Z', updated_at: '2026-09-03T12:00:00Z' },
    });

    const { queryClient } = renderWithProviders(<CommentForm ticketId={42} enabled />);
    // Populate queryClient cache with envelope response as produced by useQuery in page-client.tsx
    queryClient.setQueryData(['tickets', 'detail', 42, 'comments'], {
      success: true,
      message: 'Loaded',
      data: [
        { id: 1, ticket_id: 42, user: { id: 1, full_name: 'Admin' }, body: 'Halo', created_at: '2026-09-03T10:00:00Z', updated_at: '2026-09-03T10:00:00Z' },
      ],
    });

    const input = screen.getByLabelText(/tulis komentar/i);
    fireEvent.change(input, { target: { value: 'Sudah dicoba' } });
    const button = screen.getByRole('button', { name: /kirim komentar/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/tickets/42/comments',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const cached = queryClient.getQueryData<{ success: boolean; data: unknown[] }>(['tickets', 'detail', 42, 'comments']);
    expect(cached?.data).toBeDefined();
    expect(cached?.data.length).toBe(2);
  });
});