import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { AssetsPageClient } from '@/app/(app)/assets/page-client';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/assets',
}));

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 1, full_name: 'Test Employee' },
    isLoading: false,
    can: vi.fn(() => false),
  }),
}));

vi.mock('@/hooks/use-assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-assets')>();
  return {
    ...actual,
    useAssets: () => ({ data: { data: [], meta: undefined }, isLoading: false }),
  };
});

vi.mock('@/components/assets/AssetFilters', () => ({
  AssetFilters: () => null,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => null,
}));

describe('AssetsPageClient guard', () => {
  it('redirects to /403 when user lacks asset.viewAny (employee)', async () => {
    render(<AssetsPageClient />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/403');
    });
  });
});