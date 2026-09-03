import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import type { AuditLogListItem } from '@/types/audit';
import type { PaginationMeta } from '@/types/api';

const mockLogs: AuditLogListItem[] = [
  {
    id: 101,
    user: { id: 1, full_name: 'Super Administrator' },
    action: 'status_change',
    module: 'ticket',
    module_id: 12,
    description: 'Status tiket diubah menjadi IN_PROGRESS',
    ip_address: '192.168.1.10',
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 102,
    user: null, // System event
    action: 'sla_breach',
    module: 'ticket',
    module_id: 15,
    description: 'Tiket terdeteksi melanggar batas SLA',
    ip_address: null,
    created_at: '2026-03-01T11:00:00Z',
  },
];

const mockMeta: PaginationMeta = {
  current_page: 1,
  per_page: 15,
  total: 2,
  last_page: 1,
  from: 1,
  to: 2,
};

describe('AuditLogTable', () => {
  it('renders log items with user, action badge, module, and fallback for null user', () => {
    renderWithProviders(
      <AuditLogTable
        items={mockLogs}
        meta={mockMeta}
        isLoading={false}
        sortBy="created_at"
        sortDir="desc"
        onSort={vi.fn()}
        onPageChange={vi.fn()}
        onPerPageChange={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    // User name & system fallback
    expect(screen.getByText('Super Administrator')).toBeInTheDocument();
    expect(screen.getByText('Sistem')).toBeInTheDocument();

    // Module labels & module IDs
    expect(screen.getAllByText('Tiket').length).toBeGreaterThan(0);
    expect(screen.getByText('#12')).toBeInTheDocument();
    expect(screen.getByText('#15')).toBeInTheDocument();

    // Action labels
    expect(screen.getByText('Mengubah Status')).toBeInTheDocument();
    expect(screen.getByText('Pelanggaran SLA')).toBeInTheDocument();

    // Descriptions & IP
    expect(
      screen.getByText('Status tiket diubah menjadi IN_PROGRESS')
    ).toBeInTheDocument();
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
  });

  it('calls onViewDetail when clicking detail button', () => {
    const onViewDetail = vi.fn();
    renderWithProviders(
      <AuditLogTable
        items={mockLogs}
        meta={mockMeta}
        isLoading={false}
        sortBy="created_at"
        sortDir="desc"
        onSort={vi.fn()}
        onViewDetail={onViewDetail}
      />
    );

    const detailButtons = screen.getAllByRole('button', {
      name: /lihat rincian log/i,
    });
    expect(detailButtons).toHaveLength(2);

    fireEvent.click(detailButtons[0]);
    expect(onViewDetail).toHaveBeenCalledWith(mockLogs[0]);
  });

  it('shows empty state when no audit logs found', () => {
    renderWithProviders(
      <AuditLogTable
        items={[]}
        meta={{ ...mockMeta, total: 0, from: null, to: null }}
        isLoading={false}
        sortBy="created_at"
        sortDir="desc"
        onSort={vi.fn()}
        onViewDetail={vi.fn()}
      />
    );

    expect(
      screen.getByText(/tidak ada log audit ditemukan/i)
    ).toBeInTheDocument();
  });
});
