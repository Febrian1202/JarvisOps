import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArticleTable } from '@/components/knowledge/ArticleTable';
import type { KnowledgeArticleListItem } from '@/types/articles';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const articles: KnowledgeArticleListItem[] = [
  {
    id: 1,
    title: 'Cara Reset Password',
    slug: 'cara-reset-password',
    category: { id: 1, name: 'Akun' },
    author: { id: 2, full_name: 'Andi Kusuma' },
    status: 'published',
    view_count: 12,
    published_at: '2026-09-01T08:00:00Z',
    created_at: '2026-08-30T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
];

describe('ArticleTable', () => {
  it('renders columns and links title to detail', () => {
    const onSort = vi.fn();
    render(
      <ArticleTable
        articles={articles}
        isLoading={false}
        sortBy="title"
        sortDir="asc"
        onSort={onSort}
        showStatus
      />
    );
    expect(screen.getByText('Cara Reset Password')).toBeInTheDocument();
    expect(screen.getByText('Andi Kusuma')).toBeInTheDocument();
    expect(screen.getByText('Dipublikasikan')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('hides status column when showStatus is false (employee)', () => {
    render(
      <ArticleTable
        articles={articles}
        isLoading={false}
        sortBy="title"
        sortDir="asc"
        onSort={vi.fn()}
        showStatus={false}
      />
    );
    expect(screen.queryByText('Dipublikasikan')).not.toBeInTheDocument();
  });

  it('shows empty state when no articles', () => {
    render(<ArticleTable articles={[]} isLoading={false} sortBy="title" sortDir="asc" onSort={vi.fn()} />);
    expect(screen.getByText(/tidak ada artikel/i)).toBeInTheDocument();
  });
});
