import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { ArticleFilters } from '@/components/knowledge/ArticleFilters';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockCan: (ability: string) => boolean = () => false;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
  }),
  usePathname: () => '/knowledge',
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 1, role: { name: 'employee' }, permissions: [] },
    hasRole: (role: string) => role === 'employee',
    can: (ability: string) => mockCan(ability),
  }),
}));

vi.mock('@/hooks/use-articles', () => ({
  useArticleCategories: () => ({
    data: { data: [{ id: 1, name: 'Akun', description: null }] },
  }),
}));

describe('ArticleFilters', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it('renders search input and category dropdown', () => {
    mockCan = () => false;
    renderWithProviders(<ArticleFilters />);
    expect(screen.getByPlaceholderText(/cari judul atau isi artikel/i)).toBeInTheDocument();
    expect(screen.getByText('Semua Kategori')).toBeInTheDocument();
  });

  it('hides status dropdown for employee (no article.create)', () => {
    mockCan = () => false;
    renderWithProviders(<ArticleFilters />);
    expect(screen.getByText('Semua Kategori')).toBeInTheDocument();
    expect(screen.queryByText('Semua Status')).not.toBeInTheDocument();
  });

  it('shows status dropdown for technician/manager/admin (article.create granted)', () => {
    mockCan = (ability: string) => ability === 'article.create';
    renderWithProviders(<ArticleFilters />);
    expect(screen.getByText('Semua Status')).toBeInTheDocument();
  });

  it('renders mobile filter trigger on small viewports', () => {
    mockCan = () => false;
    renderWithProviders(<ArticleFilters />);
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });
});
