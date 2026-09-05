import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArticleEditButton } from '@/components/knowledge/ArticleEditButton';

const mocks = vi.hoisted(() => ({ mockCan: vi.fn() }));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    can: mocks.mockCan,
    user: null,
    isLoading: false,
    hasRole: () => false,
    logout: vi.fn(),
    refetchUser: vi.fn(),
  }),
}));

describe('ArticleEditButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an edit link to the edit route when the user can update articles', () => {
    mocks.mockCan.mockImplementation((ability: string) => ability === 'article.update');
    render(<ArticleEditButton slug="cara-reset-password" />);

    const link = screen.getByRole('link', { name: /ubah artikel/i });
    expect(link).toHaveAttribute('href', '/knowledge/cara-reset-password/edit');
  });

  it('renders nothing when the user cannot update articles', () => {
    mocks.mockCan.mockReturnValue(false);
    const { container } = render(<ArticleEditButton slug="cara-reset-password" />);

    expect(screen.queryByRole('link', { name: /ubah artikel/i })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
