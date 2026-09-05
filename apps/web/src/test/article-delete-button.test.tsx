import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { ArticleDeleteButton } from '@/components/knowledge/ArticleDeleteButton';
import { apiFetch } from '@/lib/client/api';

const mocks = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockCan: vi.fn(),
  mockHasRole: vi.fn(),
  user: { id: 0 } as { id: number } | null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.mockPush, replace: vi.fn() }),
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    can: mocks.mockCan,
    hasRole: mocks.mockHasRole,
    user: mocks.user,
    isLoading: false,
    logout: vi.fn(),
    refetchUser: vi.fn(),
  }),
}));

vi.mock('@/lib/client/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({ success: true, message: 'ok', data: null }),
  ApiClientError: class ApiClientError extends Error {},
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  (globalThis as unknown as { Element: typeof Element }).Element.prototype.scrollIntoView = vi.fn();
  (globalThis as unknown as { Element: typeof Element }).Element.prototype.hasPointerCapture = vi.fn();
  (globalThis as unknown as { Element: typeof Element }).Element.prototype.setPointerCapture = vi.fn();
  (globalThis as unknown as { Element: typeof Element }).Element.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockCan.mockReturnValue(false);
  mocks.mockHasRole.mockReturnValue(false);
  mocks.user = { id: 99 };
});

describe('ArticleDeleteButton', () => {
  it('renders for an administrator', () => {
    mocks.mockCan.mockImplementation((a: string) => a === 'article.delete');
    mocks.mockHasRole.mockImplementation((r: string) => r === 'administrator');
    renderWithProviders(<ArticleDeleteButton articleId={1} authorId={2} />);
    expect(screen.getByRole('button', { name: /hapus artikel/i })).toBeInTheDocument();
  });

  it('renders for the author (technician) of the article', () => {
    mocks.mockCan.mockImplementation((a: string) => a === 'article.delete');
    mocks.user = { id: 2 };
    renderWithProviders(<ArticleDeleteButton articleId={1} authorId={2} />);
    expect(screen.getByRole('button', { name: /hapus artikel/i })).toBeInTheDocument();
  });

  it('is hidden for a technician who is not the author', () => {
    mocks.mockCan.mockImplementation((a: string) => a === 'article.delete');
    mocks.user = { id: 7 };
    const { container } = renderWithProviders(<ArticleDeleteButton articleId={1} authorId={2} />);
    expect(screen.queryByRole('button', { name: /hapus artikel/i })).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('is hidden without the article.delete ability', () => {
    mocks.mockHasRole.mockImplementation((r: string) => r === 'administrator');
    renderWithProviders(<ArticleDeleteButton articleId={1} authorId={2} />);
    expect(screen.queryByRole('button', { name: /hapus artikel/i })).not.toBeInTheDocument();
  });

  it('deletes the article after confirmation and redirects to the list', async () => {
    mocks.mockCan.mockImplementation((a: string) => a === 'article.delete');
    mocks.mockHasRole.mockImplementation((r: string) => r === 'manager');
    const user = userEvent.setup();
    renderWithProviders(<ArticleDeleteButton articleId={1} authorId={2} />);

    await user.click(screen.getByRole('button', { name: /hapus artikel/i }));
    await user.click(await screen.findByRole('button', { name: /ya, hapus/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/articles/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
    await waitFor(() => {
      expect(mocks.mockPush).toHaveBeenCalledWith('/knowledge');
    });
  });
});
