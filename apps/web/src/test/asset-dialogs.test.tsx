import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AssignDialog } from '@/components/assets/AssignDialog';
import { ReleaseDialog } from '@/components/assets/ReleaseDialog';
import type { AssetDetail } from '@/types/assets';

vi.mock('@/lib/client/api', () => ({
  apiFetch: vi.fn((url: string) => {
    if (url.includes('/users/assignable')) {
      return Promise.resolve({
        success: true,
        data: [
          { id: 9, full_name: 'Andi Kusuma', department: { id: 1, name: 'Finance' } },
          { id: 10, full_name: 'Budi Santoso', department: { id: 2, name: 'Engineering' } },
        ],
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

const asset: AssetDetail = {
  id: 1,
  asset_tag: 'LPT-0001',
  name: 'ThinkPad T14',
  category: 'Laptop',
  brand: 'Lenovo',
  model: 'T14 Gen 3',
  serial_number: 'SN12345',
  status: 'available',
  purchase_date: '2025-01-10',
  notes: null,
  current_assignment: null,
  created_at: '2025-01-10T08:00:00Z',
  updated_at: '2025-01-10T08:00:00Z',
};

describe('AssignDialog', () => {
  it('renders searchable user list and submit disabled until user selected', async () => {
    renderWithProviders(
      <AssignDialog
        open
        onOpenChange={vi.fn()}
        asset={asset}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText(/tugaskan aset/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /^tugaskan$/i });
    expect(submitBtn).toBeDisabled();

    // Focus on the search input to open the dropdown
    const input = screen.getByPlaceholderText(/cari nama pengguna/i);
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Andi Kusuma')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Andi Kusuma'));
    await waitFor(() => {
      expect(submitBtn).toBeEnabled();
    });
  });

  it('submits selected user with notes', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <AssignDialog
        open
        onOpenChange={vi.fn()}
        asset={asset}
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByPlaceholderText(/cari nama pengguna/i);
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Andi Kusuma')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Andi Kusuma'));
    fireEvent.change(screen.getByLabelText(/catatan tugas/i), {
      target: { value: 'Untuk kebutuhan project' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^tugaskan$/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        user_id: 9,
        notes: 'Untuk kebutuhan project',
      });
    });
  });

  it('calls onOpenChange(false) when close button is clicked', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <AssignDialog
        open
        onOpenChange={onOpenChange}
        asset={asset}
        isSubmitting={false}
        onSubmit={vi.fn()}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /tutup/i });
    fireEvent.click(closeBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('ReleaseDialog', () => {
  it('confirms release with optional notes', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <ReleaseDialog
        open
        onOpenChange={vi.fn()}
        asset={asset}
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText(/lepaskan penugasan aset/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/catatan pelepasan/i), {
      target: { value: 'Perangkat dikembalikan' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^lepaskan$/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ notes: 'Perangkat dikembalikan' });
    });
  });
});