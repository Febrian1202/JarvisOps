import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { AssetFilters } from '@/components/assets/AssetFilters';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
const mockCan: (ability: string) => boolean = () => true;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
  }),
  usePathname: () => '/assets',
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 1, role: { name: 'admin' }, permissions: ['user.lookup'] },
    hasRole: (role: string) => role === 'admin',
    can: (ability: string) => mockCan(ability),
  }),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: vi.fn(({ queryKey }) => {
      if (Array.isArray(queryKey) && queryKey[0] === 'asset-categories') {
        return { data: { data: ['Laptop', 'Monitor'] }, isLoading: false };
      }
      if (Array.isArray(queryKey) && queryKey[0] === 'users' && queryKey[1] === 'assignable') {
        return { data: { data: [{ id: 1, full_name: 'Andi' }] }, isLoading: false };
      }
      return { data: undefined, isLoading: false };
    }),
  };
});

describe('AssetFilters', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it('renders search input and desktop filter selects', () => {
    renderWithProviders(<AssetFilters />);
    expect(screen.getByPlaceholderText(/cari kode aset, nomor seri/i)).toBeInTheDocument();
    expect(screen.getByText('Semua Status')).toBeInTheDocument();
    expect(screen.getByText('Semua Kategori')).toBeInTheDocument();
  });

  it('renders mobile filter sheet trigger on mobile viewport', () => {
    renderWithProviders(<AssetFilters />);
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });
});
