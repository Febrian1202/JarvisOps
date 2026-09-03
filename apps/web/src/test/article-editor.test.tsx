import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { ArticleEditor } from '@/components/knowledge/ArticleEditor';
import { apiFetch } from '@/lib/client/api';
import type { KnowledgeArticleDetail } from '@/types/articles';

const mocks = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockCan: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.mockPush, replace: vi.fn() }),
}));

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

vi.mock('@/lib/client/api', () => ({
  apiFetch: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    constructor(
      public status: number,
      message: string,
      public errors?: Record<string, string[]>
    ) {
      super(message);
    }
  },
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  (globalThis as unknown as { Element: typeof Element }).Element.prototype.scrollIntoView = vi.fn();
  (globalThis as unknown as { Element: typeof Element }).Element.prototype.scrollTo = vi.fn();
  (globalThis as unknown as { Element: typeof Element }).Element.prototype.hasPointerCapture = vi.fn();
  (globalThis as unknown as { Element: typeof Element }).Element.prototype.setPointerCapture = vi.fn();
  (globalThis as unknown as { Element: typeof Element }).Element.prototype.releasePointerCapture = vi.fn();
});

const article: KnowledgeArticleDetail = {
  id: 1,
  title: 'Cara Reset Password',
  slug: 'cara-reset-password',
  content: '## Langkah\n1. Buka portal.\n2. Klik **Reset**.',
  category: { id: 1, name: 'Akun' },
  author: { id: 2, full_name: 'Andi Kusuma' },
  status: 'draft',
  view_count: 0,
  published_at: null,
  created_at: '2026-08-30T08:00:00Z',
  updated_at: '2026-08-30T08:00:00Z',
};

const publishedArticle: KnowledgeArticleDetail = {
  ...article,
  status: 'published',
  published_at: '2026-09-01T08:00:00Z',
};

function mockCategories() {
  (apiFetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string, options?: RequestInit) => {
    if (url === '/knowledge-categories') {
      return Promise.resolve({ success: true, data: [{ id: 1, name: 'Akun' }] });
    }
    if (url === '/articles' && options?.method === 'POST') {
      return Promise.resolve({
        success: true,
        message: 'Artikel berhasil dibuat.',
        data: { ...article, slug: 'cara-reset-password' },
      });
    }
    if (url === '/articles/1' && options?.method === 'PUT') {
      return Promise.resolve({ success: true, message: 'Artikel berhasil diperbarui.', data: article });
    }
    return Promise.resolve({ success: true, data: {} });
  });
}

describe('ArticleEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockCan.mockReturnValue(false);
  });

  it('renders create mode with Buat Artikel button and no slug field', () => {
    mockCategories();
    renderWithProviders(<ArticleEditor />);
    expect(screen.getByRole('button', { name: 'Buat Artikel' })).toBeInTheDocument();
    expect(screen.getByLabelText(/judul/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kategori/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/konten \(markdown\)/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/slug/i)).not.toBeInTheDocument();
  });

  it('renders edit mode with Simpan Perubahan, read-only slug, and publish controls', () => {
    mocks.mockCan.mockImplementation((ability: string) => ability === 'article.publish');
    mockCategories();
    renderWithProviders(<ArticleEditor article={article} />);
    expect(screen.getByRole('button', { name: 'Simpan Perubahan' })).toBeInTheDocument();
    const slugInput = screen.getByLabelText(/slug/i);
    expect(slugInput).toHaveValue('cara-reset-password');
    expect(slugInput).toHaveAttribute('readonly');
    expect(screen.getByText('Status Publikasi')).toBeInTheDocument();
    expect(screen.getByText('Draf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terbitkan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /turunkan/i })).not.toBeInTheDocument();
  });

  it('shows unpublish button only when article is published and user can unpublish', () => {
    mocks.mockCan.mockImplementation((ability: string) => ability === 'article.unpublish');
    mockCategories();
    renderWithProviders(<ArticleEditor article={publishedArticle} />);
    expect(screen.getByText('Dipublikasikan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turunkan (Unpublish)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Terbitkan' })).not.toBeInTheDocument();
  });

  it('submits create payload with status to POST /articles then navigates to detail', async () => {
    mockCategories();
    const user = userEvent.setup();
    renderWithProviders(<ArticleEditor />);

    await user.type(screen.getByLabelText(/judul/i), 'Cara Reset Password');
    await user.type(screen.getByLabelText(/konten \(markdown\)/i), 'Langkah-langkah…');

    await user.click(screen.getByRole('combobox'));
    const option = await screen.findByRole('option', { name: 'Akun' });
    await user.click(option);

    await user.click(screen.getByRole('button', { name: 'Buat Artikel' }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/articles',
        expect.objectContaining({ method: 'POST' })
      );
    });
    const postCall = (apiFetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) => call[0] === '/articles'
    );
    expect(JSON.parse(postCall![1].body as string)).toEqual({
      title: 'Cara Reset Password',
      category_id: 1,
      content: 'Langkah-langkah…',
      status: 'draft',
    });
    await waitFor(() => {
      expect(mocks.mockPush).toHaveBeenCalledWith('/knowledge/cara-reset-password');
    });
  });

  it('submits edit payload without status to PUT /articles/1', async () => {
    mockCategories();
    const user = userEvent.setup();
    renderWithProviders(<ArticleEditor article={article} />);

    await user.clear(screen.getByLabelText(/judul/i));
    await user.type(screen.getByLabelText(/judul/i), 'Judul Diperbarui');
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/articles/1',
        expect.objectContaining({ method: 'PUT' })
      );
    });
    const putCall = (apiFetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) => call[0] === '/articles/1'
    );
    expect(JSON.parse(putCall![1].body as string)).toEqual({
      title: 'Judul Diperbarui',
      category_id: 1,
      content: '## Langkah\n1. Buka portal.\n2. Klik **Reset**.',
    });
    await waitFor(() => {
      expect(mocks.mockPush).toHaveBeenCalledWith('/knowledge/cara-reset-password');
    });
  });
});