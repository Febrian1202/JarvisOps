import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { KnowledgePageClient } from '@/app/(app)/knowledge/page-client';

const mockReplace = vi.fn();
let mockCan: (a: string) => boolean = vi.fn((a: string) => a === 'article.viewAny');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/knowledge',
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    can: (a: string) => mockCan(a),
    hasRole: (r: string) => r === 'employee',
  }),
}));

vi.mock('@/hooks/use-articles', () => ({
  useArticles: () => ({
    data: { data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } },
    isLoading: false,
  }),
}));

vi.mock('@/components/knowledge/ArticleFilters', () => ({
  ArticleFilters: () => null,
}));

vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));

describe('KnowledgePageClient guard', () => {
  afterEach(() => {
    mockCan = vi.fn((a: string) => a === 'article.viewAny');
  });

  it('redirects to /403 when user lacks article.viewAny', async () => {
    mockCan = vi.fn(() => false);
    render(<KnowledgePageClient />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/403');
    });
  });

  it('shows employee empty state linking to ticket creation', async () => {
    render(<KnowledgePageClient />);
    await waitFor(() => {
      expect(screen.getByText(/belum ada artikel\. silakan buat tiket/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /buat tiket/i })).toHaveAttribute('href', '/tickets/new');
  });

  it('does not render create article button for employee', () => {
    render(<KnowledgePageClient />);
    expect(screen.queryByRole('link', { name: /buat artikel/i })).not.toBeInTheDocument();
  });
});