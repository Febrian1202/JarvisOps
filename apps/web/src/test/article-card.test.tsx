import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArticleCardGrid } from '@/components/knowledge/ArticleCardGrid';
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

describe('ArticleCardGrid', () => {
  it('renders cards and links title to detail', () => {
    render(
      <ArticleCardGrid
        articles={articles}
        isLoading={false}
        showStatus
      />
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/knowledge/cara-reset-password');
    expect(screen.getByText('Cara Reset Password')).toBeInTheDocument();
    expect(screen.getByText('Andi Kusuma')).toBeInTheDocument();
    expect(screen.getByText('Dipublikasikan')).toBeInTheDocument();
    expect(screen.getByText('12 dilihat')).toBeInTheDocument();
  });

  it('hides status badge when showStatus is false (employee)', () => {
    render(
      <ArticleCardGrid
        articles={articles}
        isLoading={false}
        showStatus={false}
      />
    );
    expect(screen.queryByText('Dipublikasikan')).not.toBeInTheDocument();
  });

  it('shows empty state when no articles', () => {
    render(<ArticleCardGrid articles={[]} isLoading={false} />);
    expect(screen.getByText(/tidak ada artikel ditemukan/i)).toBeInTheDocument();
  });

  it('does not render an edit link by default', () => {
    render(<ArticleCardGrid articles={articles} isLoading={false} showStatus />);
    expect(screen.queryByRole('link', { name: /ubah artikel/i })).not.toBeInTheDocument();
  });

  it('renders an edit link to the edit route when canEdit is true', () => {
    render(<ArticleCardGrid articles={articles} isLoading={false} showStatus canEdit />);
    const editLink = screen.getByRole('link', { name: /ubah artikel/i });
    expect(editLink).toHaveAttribute('href', '/knowledge/cara-reset-password/edit');
    // Title still links to the detail page.
    expect(screen.getByRole('link', { name: 'Cara Reset Password' })).toHaveAttribute(
      'href',
      '/knowledge/cara-reset-password'
    );
  });
});
