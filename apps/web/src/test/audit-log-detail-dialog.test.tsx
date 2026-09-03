import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AuditLogDetailDialog } from '@/components/admin/AuditLogDetailDialog';
import { apiFetch } from '@/lib/client/api';
import type { AuditLogDetail } from '@/types/audit';

vi.mock('@/lib/client/api', () => ({
  apiFetch: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    constructor(
      public status: number,
      message: string,
      public errors?: Record<string, string[]>
    ) {
      super(message);
    }
  },
}));

const mockDetail: AuditLogDetail = {
  id: 42,
  user: { id: 2, full_name: 'Budi Manager' },
  action: 'update',
  module: 'asset',
  module_id: 8,
  description: 'Mengubah status aset menjadi MAINTENANCE',
  ip_address: '10.0.0.5',
  created_at: '2026-03-02T14:30:00Z',
  user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
  old_data: {
    status: 'active',
    note: null,
  },
  new_data: {
    status: 'maintenance',
    note: 'Kipas pendingin rusak',
  },
};

describe('AuditLogDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete audit log details and comparison table on open', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'Audit log retrieved.',
      data: mockDetail,
    });

    renderWithProviders(
      <AuditLogDetailDialog open={true} logId={42} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('#42')).toBeInTheDocument();
      expect(screen.getByText('Budi Manager')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.5')).toBeInTheDocument();
    });

    // Check action & module
    expect(screen.getByText('Memperbarui')).toBeInTheDocument();
    expect(screen.getByText('Aset')).toBeInTheDocument();

    // Check user agent
    expect(
      screen.getByText('Mozilla/5.0 (X11; Linux x86_64)')
    ).toBeInTheDocument();

    // Check comparison keys and values
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('maintenance')).toBeInTheDocument();

    expect(screen.getByText('note')).toBeInTheDocument();
    expect(screen.getByText('Kipas pendingin rusak')).toBeInTheDocument();
  });

  it('handles null old_data and new_data gracefully', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'Audit log retrieved.',
      data: {
        ...mockDetail,
        old_data: null,
        new_data: null,
      },
    });

    renderWithProviders(
      <AuditLogDetailDialog open={true} logId={42} onClose={vi.fn()} />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/tidak ada rekaman perubahan data/i)
      ).toBeInTheDocument();
    });
  });
});
