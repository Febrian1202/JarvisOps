import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AssetForm } from '@/components/assets/AssetForm';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/assets/new',
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: { data: ['Laptop', 'Monitor'] }, isLoading: false })),
  };
});

describe('AssetForm Calendar DatePicker', () => {
  it('renders Popover trigger button for purchase date instead of raw date input', () => {
    renderWithProviders(<AssetForm />);
    // Should render a button trigger for purchase date with Calendar icon
    const dateButton = screen.getByRole('button', { name: /pilih tanggal pembelian|tanggal pembelian/i });
    expect(dateButton).toBeInTheDocument();
    // Raw <input type="date"> should no longer be present
    expect(screen.queryByDisplayValue('mm/dd/yyyy')).not.toBeInTheDocument();
  });

  it('displays selected date formatted when asset prop is provided', () => {
    const mockAsset = {
      id: 1,
      asset_tag: 'AST-0001',
      name: 'MacBook Pro',
      category: 'Laptop',
      brand: 'Apple',
      model: 'M3',
      serial_number: 'C02XYZ',
      purchase_date: '2025-01-10',
      status: 'available' as const,
      notes: null,
      current_assignment: null,
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z',
    };

    renderWithProviders(<AssetForm asset={mockAsset} />);
    // 10 Jan 2025 in Indonesian locale
    expect(screen.getByText(/10 Jan 2025/i)).toBeInTheDocument();
  });
});
