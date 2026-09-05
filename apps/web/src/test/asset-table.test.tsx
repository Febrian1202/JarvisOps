import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AssetTable } from '@/components/assets/AssetTable';
import type { AssetListItem } from '@/types/assets';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/assets',
}));

const assets: AssetListItem[] = [
  {
    id: 1,
    asset_tag: 'LPT-0001',
    name: 'ThinkPad T14',
    category: 'Laptop',
    brand: 'Lenovo',
    model: 'T14 Gen 3',
    serial_number: 'SN12345',
    status: 'available',
    purchase_date: '2025-01-10',
    current_assignment: null,
    created_at: '2025-01-10T08:00:00Z',
    updated_at: '2025-01-10T08:00:00Z',
  },
  {
    id: 2,
    asset_tag: 'MON-0002',
    name: 'UltraSharp 27',
    category: 'Monitor',
    brand: 'Dell',
    model: 'U2723QE',
    serial_number: 'SN67890',
    status: 'assigned',
    purchase_date: '2025-02-15',
    current_assignment: { id: 1, user_id: 9, full_name: 'Andi Kusuma', assigned_at: '2025-02-20T09:00:00Z' },
    created_at: '2025-02-15T08:00:00Z',
    updated_at: '2025-02-20T09:00:00Z',
  },
];

describe('AssetTable', () => {
  it('renders asset rows with expected columns', () => {
    renderWithProviders(
      <AssetTable
        assets={assets}
        isLoading={false}
        sortBy="asset_tag"
        sortDir="asc"
        onSort={vi.fn()}
      />
    );

    expect(screen.getAllByText('LPT-0001').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ThinkPad T14').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Laptop').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tersedia').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Andi Kusuma').length).toBeGreaterThanOrEqual(1);
  });

  it('shows em dash for asset without holder', () => {
    renderWithProviders(
      <AssetTable
        assets={[assets[0]]}
        isLoading={false}
        sortBy="asset_tag"
        sortDir="asc"
        onSort={vi.fn()}
      />
    );
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates to detail page on row click', () => {
    renderWithProviders(
      <AssetTable
        assets={assets}
        isLoading={false}
        sortBy="asset_tag"
        sortDir="asc"
        onSort={vi.fn()}
      />
    );

    const rows = screen.getAllByRole('row');
    fireEvent.click(rows[1]);
    expect(mockPush).toHaveBeenCalledWith('/assets/1');
  });

  it('shows empty state when no assets', () => {
    renderWithProviders(
      <AssetTable
        assets={[]}
        isLoading={false}
        sortBy="asset_tag"
        sortDir="asc"
        onSort={vi.fn()}
      />
    );
    expect(screen.getAllByText(/tidak ada aset ditemukan/i).length).toBeGreaterThanOrEqual(1);
  });
});