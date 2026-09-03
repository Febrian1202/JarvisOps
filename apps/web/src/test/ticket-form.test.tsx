import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { TicketForm } from '@/components/tickets/TicketForm';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
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
  apiFetch: vi.fn((url: string) => {
    if (url.includes('/assets/assignable')) {
      return Promise.resolve({
        success: true,
        data: [{ id: 10, asset_tag: 'AST-LTP-001', name: 'ThinkPad T14' }],
      });
    }
    if (url.includes('/articles')) {
      return Promise.resolve({
        success: true,
        data: [{ id: 1, title: 'Wi-Fi Tidak Terhubung', slug: 'wifi-putus' }],
      });
    }
    return Promise.resolve({ success: true, data: {} });
  }),
  ApiClientError: class ApiClientError extends Error {
    constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
      super(message);
    }
  },
}));

describe('TicketForm Component', () => {
  it('renders form inputs according to wireframe frame 07', () => {
    renderWithProviders(<TicketForm />);
    expect(screen.getByLabelText(/kategori/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prioritas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aset terkait/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/judul permohonan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/deskripsi detail masalah/i)).toBeInTheDocument();
    expect(screen.getByText(/target sla yang berlaku/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kirim tiket/i })).toBeInTheDocument();
  });

  it('validates empty inputs and shows error messages', async () => {
    renderWithProviders(<TicketForm />);
    const submitBtn = screen.getByRole('button', { name: /kirim tiket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/kategori wajib dipilih/i)).toBeInTheDocument();
      expect(screen.getByText(/prioritas wajib dipilih/i)).toBeInTheDocument();
      expect(screen.getByText(/judul wajib diisi/i)).toBeInTheDocument();
      expect(screen.getByText(/deskripsi wajib diisi/i)).toBeInTheDocument();
    });
  });
});
