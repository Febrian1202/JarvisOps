import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ArticleDetail } from '@/components/knowledge/ArticleDetail';
import type { KnowledgeArticleDetail } from '@/types/articles';

const detail: KnowledgeArticleDetail = {
  id: 1,
  title: 'Cara Reset Password',
  slug: 'cara-reset-password',
  content: '## Langkah\n1. Buka portal.\n2. Klik **Reset**.',
  category: { id: 1, name: 'Akun' },
  author: { id: 2, full_name: 'Andi Kusuma' },
  status: 'published',
  view_count: 12,
  published_at: '2026-09-01T08:00:00Z',
  created_at: '2026-08-30T08:00:00Z',
  updated_at: '2026-09-01T08:00:00Z',
  related_articles: [
    { id: 3, title: 'Lupa Password VPN', slug: 'lupa-password-vpn', view_count: 4 },
  ],
};

describe('ArticleDetail', () => {
  it('renders title, author, category, and content', () => {
    render(<ArticleDetail article={detail} />);
    expect(screen.getByText('Cara Reset Password')).toBeInTheDocument();
    expect(screen.getByText('Andi Kusuma')).toBeInTheDocument();
    expect(screen.getByText('Akun')).toBeInTheDocument();
  });

  it('renders related articles links', () => {
    render(<ArticleDetail article={detail} />);
    expect(screen.getByRole('link', { name: /lupa password vpn/i })).toBeInTheDocument();
  });

  it('renders responsive padding and break-words classes for mobile readability', () => {
    const { container } = render(<ArticleDetail article={detail} />);
    const heading = screen.getByRole('heading', { level: 1, name: /cara reset password/i });
    expect(heading).toHaveClass('break-words');

    const firstCard = container.querySelector('article > div');
    expect(firstCard).toHaveClass('p-4');
    expect(firstCard).toHaveClass('sm:p-6');
  });
});