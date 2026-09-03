import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { KnowledgePageClient } from '@/app/(app)/knowledge/page-client';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/knowledge',
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    can: (a: string) => a === 'article.viewAny',
    hasRole: (r: string) => r === 'employee',
  }),
}));

vi.mock('@/hooks/use-articles', () => ({
  useArticles: () => ({ data: { data: [], meta: undefined }, isLoading: false }),
  useArticleCategories: () => ({ data: { data: [] } }),
}));

vi.mock('@/components/knowledge/ArticleFilters', () => ({
  ArticleFilters: () => null,
}));

vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));

describe('KnowledgePageClient employee', () => {
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