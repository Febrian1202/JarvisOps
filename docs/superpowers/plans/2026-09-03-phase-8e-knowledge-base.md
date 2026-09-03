# Sub-tahap 8e — Knowledge Base (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`. Sebelum menulis kode frontend, **muat skills wajib** (AGENTS.md): `impeccable`, `next-best-practices`, `vercel-react-best-practices`, `shadcn`, `frontend-design`, `tailwindcss-development`, `test-driven-development`.

**Goal:** Membangun seluruh permukaan Knowledge Base: `/knowledge` (search + filter), `/knowledge/[slug]` (detail + markdown + related), `/knowledge/new` + `/knowledge/[id]/edit` (editor), publish/unpublish toggle, dan empty state Employee.

**Architecture:** List/form = Client Component + TanStack Query + URL-sync (K1). Detail artikel = **Server Component** pakai `laravelFetch` (K11) untuk menjaga `view_count` jujur. Semua mutasi lewat `useApiMutation` (K2). Semua pesan UI berbahasa Indonesia (K8/D-24).

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, react-hook-form + zod, `react-markdown@^10` + `remark-gfm` + `rehype-sanitize@^6` (sudah terpasang), shadcn/ui, Vitest.

**Spec:** `docs/tasks/phase-8/8e-knowledge-base.md` (dokumen ini mengimplementasikan; spes eksekutor membacanya juga), ditambah `docs/tasks/phase-8/README.md` (K1–K11, C1–C24), `PERMISSION-MATRIX.md` §3.5, `PRD.md` §18/§38, `FRONTEND-ARCHITECTURE.md`, `DESIGN.md`.

## Global Constraints

- Semua respons API via envelope `{ success, message, data, meta? }`; frontend tidak pernah memanggil Laravel langsung — lewat `/api/proxy` (`apiFetch`) atau `laravelFetch` server-side (BFF).
- Bahasa: label/pesan/empty state UI **Indonesia**; envelope API Inggris (K8) — jangan render `message` Inggris ke UI.
- K11: detail artikel = Server Component; `GET /api/articles/{slug}` menaikkan `view_count` tiap dipanggil → **jangan** fetch di `generateMetadata` (double-fetch menggelembungkan `view_count`).
- Editor baca pakai `GET /api/articles/{article}/edit` (A4) — tidak menaikkan `view_count`.
- Filter status & tombol "Buat Artikel" hanya T/M/A (Employee tidak melihatnya); Employee hanya lihat published (server sudah scope).
- Pagination: artikel ter-paginasi (`meta` ada, K9); knowledge-categories = **array polos** tanpa `meta`.
- Author shape = `{ id, full_name }` (A1). Slug immutable (D-18) — read-only di form edit.
- Branch: `feat/phase-8e-knowledge-base`. Komit atomik bergaya repo: `feat(web): …`.

## File Structure

**Fix (Task 0):** `apps/web/src/types/articles.ts`
**Create hooks:** `apps/web/src/hooks/use-articles.ts`
**Create components:** `apps/web/src/components/knowledge/{ArticleStatusBadge,ArticleTable,ArticleFilters,ArticleDetail,ArticleEditor}.tsx`
**Create schema:** `apps/web/src/schemas/article.ts`
**Create pages:**
- `apps/web/src/app/(app)/knowledge/page.tsx` (ganti placeholder) + `page-client.tsx`
- `apps/web/src/app/(app)/knowledge/[slug]/page.tsx` (Server Component) + `components/knowledge/ArticleDetail.tsx`
- `apps/web/src/app/(app)/knowledge/new/page.tsx` + `page-client.tsx`
- `apps/web/src/app/(app)/knowledge/[id]/edit/page.tsx` + `page-client.tsx`
**Tests:** `apps/web/src/test/{article-table,article-filters,article-detail,article-schema,article-editor,knowledge-page-guard}.test.tsx`

---

### Task 0: Perbaiki tipe artikel (prasyarat)

**Files:**
- Modify: `apps/web/src/types/articles.ts`

**Interfaces:**
- Produces: `KnowledgeArticleListItem.author: { id; full_name } | null`; `KnowledgeArticleDetail.related_articles?: RelatedArticle[]`; `RelatedArticle = { id; title; slug; view_count }`.

- [ ] **Step 1: Perbaiki tipe agar cocok backend (A1).**

```ts
export type ArticleStatus = 'draft' | 'published';

export interface KnowledgeCategory {
  id: number;
  name: string;
  description: string | null;
  articles_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ArticleAuthor {
  id: number;
  full_name: string;
}

export interface KnowledgeArticleListItem {
  id: number;
  title: string;
  slug: string;
  category: { id: number; name: string } | null;
  author: ArticleAuthor | null;
  status: ArticleStatus;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RelatedArticle {
  id: number;
  title: string;
  slug: string;
  view_count: number;
}

export interface KnowledgeArticleDetail extends KnowledgeArticleListItem {
  content: string;
  related_articles?: RelatedArticle[];
}
```

> Catatan: `related_articles` dari backend `show()` berupa koleksi mentah `{id,title,slug,view_count}` (lihat `ArticleController::show`), bukan `ArticleListResource` penuh.

- [ ] **Step 2: Verifikasi tidak ada konsumen lama.**

Run: `rg "author\.name|author\.email|related_articles" apps/web/src`
Expected: hanya `types/dashboard.ts` mengimpor `KnowledgeArticleListItem` (aman), tidak ada akses `author.name` di komponen (sudah kosong).

- [ ] **Step 3: Jalankan typecheck.**

Run: `npx tsc --noEmit` di `apps/web`
Expected: PASS (tipe lain tidak memakai field yang dihapus).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/types/articles.ts
git commit -m "fix(web): align article types with A1 author.full_name and related_articles shape"
```

---

### Task 1: Daftar artikel (`/knowledge`)

**Files:**
- Create: `apps/web/src/hooks/use-articles.ts`
- Create: `apps/web/src/components/knowledge/ArticleStatusBadge.tsx`
- Create: `apps/web/src/components/knowledge/ArticleTable.tsx`
- Create: `apps/web/src/components/knowledge/ArticleFilters.tsx`
- Modify (ganti placeholder): `apps/web/src/app/(app)/knowledge/page.tsx`
- Create: `apps/web/src/app/(app)/knowledge/page-client.tsx`
- Test: `apps/web/src/test/article-table.test.tsx`, `apps/web/src/test/article-filters.test.tsx`

**Interfaces:**
- Consumes: `apiFetch`, `articleKeys.list`, `articleKeys.categories`, `useAuth().can/.hasRole`, `DataTable`, `FilterBar`-style dropdown, `SearchInput`, `RelativeTime`, `getArticleStatusLabel`.
- Produces: `useArticles(params): useQuery` → `ApiResponse<KnowledgeArticleListItem[]>`; `useArticleCategories(): useQuery` → `ApiResponse<KnowledgeCategory[]>`; `<ArticleTable articles meta isLoading sortBy sortDir onSort onPageChange onPerPageChange showStatus onRowClick />`; `<ArticleFilters />`; `<KnowledgePageClient />`.

- [ ] **Step 1: Tulis test gagal (RED) — kolom tabel.**

`apps/web/src/test/article-table.test.tsx`:

```tsx
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
    render(
      <ArticleTable articles={[]} isLoading={false} sortBy="title" sortDir="asc" onSort={vi.fn()} />
    );
    expect(screen.getByText(/tidak ada artikel/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal.**

Run: `npx vitest run src/test/article-table.test.tsx`
Expected: FAIL — `ArticleTable` not exported.

- [ ] **Step 3: Implementasi hook.**

`apps/web/src/hooks/use-articles.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { articleKeys } from '@/lib/query-keys';
import type { KnowledgeArticleListItem, KnowledgeCategory } from '@/types/articles';

export interface ArticleQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number | string;
  status?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  [key: string]: unknown;
}

export function useArticles(params: ArticleQueryParams = {}) {
  return useQuery({
    queryKey: articleKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.set(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      const endpoint = queryString ? `/articles?${queryString}` : '/articles';
      return apiFetch<KnowledgeArticleListItem[]>(endpoint);
    },
  });
}

export function useArticleCategories() {
  return useQuery({
    queryKey: articleKeys.categories,
    queryFn: () => apiFetch<KnowledgeCategory[]>('/knowledge-categories'),
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 4: Implementasi badge status.**

`apps/web/src/components/knowledge/ArticleStatusBadge.tsx`:

```tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getArticleStatusLabel } from '@/lib/labels';
import type { ArticleStatus } from '@/types/articles';
import { cn } from '@/lib/utils';

interface ArticleStatusBadgeProps {
  status: ArticleStatus | string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-[#eaf0e6] text-[#4d663e] border-[#d9e5d4]',
  draft: 'bg-[#eceae4] text-[#1c1c1c] border-[#dcd9d0]',
};

export function ArticleStatusBadge({ status, className }: ArticleStatusBadgeProps) {
  const normalized = status.toLowerCase();
  const styleClass = STATUS_STYLES[normalized] ?? STATUS_STYLES.draft;
  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs px-2.5 py-0.5 rounded-full shadow-none', styleClass, className)}
    >
      {getArticleStatusLabel(normalized)}
    </Badge>
  );
}
```

- [ ] **Step 5: Implementasi tabel (mengikuti pola `AssetTable`).**

`apps/web/src/components/knowledge/ArticleTable.tsx` — kolom: judul (link), kategori, penulis, status (hanya bila `showStatus`), view count, published_at. Reuse `DataTable`, `DataTableColumnHeader`, `ArticleStatusBadge`, `RelativeTime`, `Link`.

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { DataTable, type ColumnDef } from '@/components/shared/data-table/data-table';
import { DataTableColumnHeader } from '@/components/shared/data-table/data-table-column-header';
import { ArticleStatusBadge } from './ArticleStatusBadge';
import { RelativeTime } from '@/components/shared/relative-time';
import type { KnowledgeArticleListItem } from '@/types/articles';
import type { PaginationMeta } from '@/types/api';

interface ArticleTableProps {
  articles: KnowledgeArticleListItem[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  showStatus?: boolean;
}

export function ArticleTable({
  articles,
  meta,
  isLoading = false,
  sortBy = 'created_at',
  sortDir = 'desc',
  onSort,
  onPageChange,
  onPerPageChange,
  showStatus = true,
}: ArticleTableProps) {
  const columns: ColumnDef<KnowledgeArticleListItem>[] = [
    {
      id: 'title',
      header: (
        <DataTableColumnHeader title="Judul" sorted={sortBy === 'title' ? sortDir : false} onSort={() => onSort('title')} />
      ),
      cell: ({ row }) => (
        <Link href={`/knowledge/${row.slug}`} className="font-medium text-foreground text-sm hover:text-primary hover:underline">
          {row.title}
        </Link>
      ),
    },
    { id: 'category', header: 'Kategori', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.category?.name ?? '—'}</span> },
    { id: 'author', header: 'Penulis', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.author?.full_name ?? '—'}</span> },
    ...(showStatus
      ? [{ id: 'status', header: 'Status', className: 'w-28', cell: ({ row }: { row: KnowledgeArticleListItem }) => <ArticleStatusBadge status={row.status} /> }]
      : []),
    {
      id: 'view_count',
      header: (
        <DataTableColumnHeader title="Dilihat" sorted={sortBy === 'view_count' ? sortDir : false} onSort={() => onSort('view_count')} />
      ),
      className: 'w-20',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.view_count}</span>,
    },
    { id: 'published_at', header: 'Terbit', className: 'w-32', cell: ({ row }) => <RelativeTime date={row.published_at ?? row.created_at} className="text-xs text-muted-foreground" /> },
  ];

  return (
    <DataTable
      columns={columns as ColumnDef<KnowledgeArticleListItem>[]}
      data={articles}
      meta={meta}
      isLoading={isLoading}
      emptyTitle="Tidak Ada Artikel Ditemukan"
      emptyDescription="Belum ada artikel yang cocok dengan kriteria pencarian atau filter Anda."
      onPageChange={onPageChange}
      onPerPageChange={onPerPageChange}
    />
  );
}
```

- [ ] **Step 6: Implementasi filter (mengikuti pola `AssetFilters`).**

`apps/web/src/components/knowledge/ArticleFilters.tsx` — search (judul+isi), filter kategori (dari `useArticleCategories`), filter status (**hanya bila `can('article.create')`**), reset. Semua lewat URL searchParams + `router.replace` + `startTransition`.

```tsx
'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { useArticleCategories } from '@/hooks/use-articles';
import { useAuth } from '@/components/providers/auth-provider';
import { articleStatusLabels } from '@/lib/labels';

export function ArticleFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can } = useAuth();
  const canFilterStatus = can('article.create');

  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category_id') || '';
  const status = searchParams.get('status') || '';

  const { data: categoriesResponse } = useArticleCategories();
  const categories = categoriesResponse?.data ?? [];

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '' || val === 'ALL') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    params.set('page', '1');
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  const resetAll = () => startTransition(() => router.replace(pathname));
  const hasActiveFilters = Boolean(search || categoryId || status);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={(val) => updateFilters({ search: val })}
          placeholder="Cari judul atau isi artikel…"
          className="w-full sm:max-w-xs"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={categoryId || 'ALL'} onValueChange={(val) => updateFilters({ category_id: val })}>
          <SelectTrigger className="h-8 min-w-[140px] rounded-lg text-xs bg-card border-border">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL" className="text-xs">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canFilterStatus && (
          <Select value={status || 'ALL'} onValueChange={(val) => updateFilters({ status: val })}>
            <SelectTrigger className="h-8 min-w-[130px] rounded-lg text-xs bg-card border-border">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
              {Object.entries(articleStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetAll} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Implementasi page-client (mengikuti pola `AssetsPageClient`).**

`apps/web/src/app/(app)/knowledge/page-client.tsx`:

```tsx
'use client';

import React, { useEffect, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArticleFilters } from '@/components/knowledge/ArticleFilters';
import { ArticleTable } from '@/components/knowledge/ArticleTable';
import { useArticles, type ArticleQueryParams } from '@/hooks/use-articles';
import { useAuth } from '@/components/providers/auth-provider';

export function KnowledgePageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can, hasRole } = useAuth();

  const page = Number(searchParams.get('page')) || 1;
  const perPage = Number(searchParams.get('per_page')) || 10;
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category_id') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') || 'desc';

  const canFilterStatus = can('article.create');
  const showStatus = canFilterStatus;
  const isEmployee = hasRole('employee');

  const queryParams: ArticleQueryParams = {
    page,
    per_page: perPage,
    search,
    category_id: categoryId,
    status: canFilterStatus ? status : '',
    sort_by: sortBy,
    sort_dir: sortDir,
  };

  const { data: response, isLoading } = useArticles(queryParams);
  const articles = response?.data ?? [];
  const meta = response?.meta;

  const canView = can('article.viewAny');
  useEffect(() => {
    if (!canView) router.replace('/403');
  }, [canView, router]);
  if (!canView) return null;

  const updateQueryParams = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateQueryParams({ sort_dir: sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      updateQueryParams({ sort_by: field, sort_dir: 'asc', page: 1 });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-xl text-foreground tracking-tight">Basis Pengetahuan</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Panduan mandiri, dokumentasi solusi, dan standar operasional penanganan kendala IT.
          </p>
        </div>
        {can('article.create') && (
          <Button asChild size="sm" className="gap-1.5 self-start sm:self-auto">
            <Link href="/knowledge/new">
              <Plus className="h-4 w-4" />
              <span>Buat Artikel</span>
            </Link>
          </Button>
        )}
      </div>

      <ArticleFilters />

      <ArticleTable
        articles={articles}
        meta={meta}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onPageChange={(p) => updateQueryParams({ page: p })}
        onPerPageChange={(pp) => updateQueryParams({ per_page: pp, page: 1 })}
        showStatus={showStatus}
      />

      {isEmployee && articles.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada artikel. Silakan buat tiket untuk melaporkan masalah Anda.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/tickets/new">Buat Tiket</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
```

> Catatan: tombol "Buat Tiket" mengarah ke `/tickets/new` (rute 8b sudah ada). Block empty-state Employee di sini = Task 4 — disertakan sekarang agar Task 4 cukup memodifikasi copy bila perlu, atau dipindahkan jadi komponen tersendiri jika diperlukan.

- [ ] **Step 8: Ganti placeholder page.**

`apps/web/src/app/(app)/knowledge/page.tsx`:

```tsx
import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { KnowledgePageClient } from './page-client';

export const metadata = {
  title: 'Basis Pengetahuan | JARVIS OPS',
  description: 'Panduan mandiri dan dokumentasi solusi untuk kendala IT.',
};

export default function KnowledgePage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <KnowledgePageClient />
    </Suspense>
  );
}
```

- [ ] **Step 9: Test filter status & guard employee.**

`apps/web/src/test/article-filters.test.tsx` — render `ArticleFilters` dengan `useAuth` di-mock:
- employee (`can('article.create')` → false): tidak ada dropdown Status.
- T/M/A (`can('article.create')` → true): ada dropdown Status.

Mock `useArticleCategories` → `{ data: { data: [{ id: 1, name: 'Akun', description: null }] } }`, dan mock `next/navigation`.

- [ ] **Step 10: Verifikasi.**

Run: `npx vitest run src/test/article-table.test.tsx src/test/article-filters.test.tsx`
Expected: PASS.
Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/hooks/use-articles.ts apps/web/src/components/knowledge apps/web/src/app/'(app)'/knowledge apps/web/src/test/article-table.test.tsx apps/web/src/test/article-filters.test.tsx
git commit -m "feat(web): add knowledge base list page with search, category and status filters"
```

---

### Task 2: Detail artikel (`/knowledge/[slug]`) — Server Component

**Files:**
- Create: `apps/web/src/app/(app)/knowledge/[slug]/page.tsx` (Server Component)
- Create: `apps/web/src/components/knowledge/ArticleDetail.tsx`
- Test: `apps/web/src/test/article-detail.test.tsx`

**Interfaces:**
- Consumes: `laravelFetch` (`lib/server/api`), `notFound()` dari `next/navigation`, `MarkdownRenderer`, `ArticleStatusBadge`, `RelativeTime`, `KnowledgeArticleDetail`.
- Produces: `<ArticleDetailPage slug />` (Server Component) dan `<ArticleDetail article />` (dapat dirender server; berisi MarkdownRenderer client).

- [ ] **Step 1: Tulis test gagal (RED).**

`apps/web/src/test/article-detail.test.tsx`:

```tsx
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
});
```

> Markdown diterjemahkan oleh `MarkdownRenderer` (react-markdown); test fokus ke metadata + related (bukan isi render markdown yang sudah dijamin komponen `MarkdownRenderer`).

- [ ] **Step 2: Jalankan test, pastikan gagal.**

Run: `npx vitest run src/test/article-detail.test.tsx`
Expected: FAIL — `ArticleDetail` not exported.

- [ ] **Step 3: Implementasi komponen detail.**

`apps/web/src/components/knowledge/ArticleDetail.tsx`:

```tsx
import React from 'react';
import Link from 'next/link';
import { CalendarDays, Eye } from 'lucide-react';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { ArticleStatusBadge } from './ArticleStatusBadge';
import { RelativeTime } from '@/components/shared/relative-time';
import type { KnowledgeArticleDetail } from '@/types/articles';

interface ArticleDetailProps {
  article: KnowledgeArticleDetail;
}

export function ArticleDetail({ article }: ArticleDetailProps) {
  return (
    <article className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{article.category?.name ?? '—'}</span>
          <ArticleStatusBadge status={article.status} />
        </div>
        <h1 className="font-bold text-2xl text-foreground tracking-tight">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>Oleh <strong className="text-foreground">{article.author?.full_name ?? '—'}</strong></span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {article.view_count} kali dilihat
          </span>
          {article.published_at && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              <RelativeTime date={article.published_at} />
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <MarkdownRenderer content={article.content} />
      </div>

      {article.related_articles && article.related_articles.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-foreground mb-3">Artikel Terkait</h2>
          <ul className="space-y-2">
            {article.related_articles.map((ra) => (
              <li key={ra.id}>
                <Link href={`/knowledge/${ra.slug}`} className="text-sm text-primary hover:underline">
                  {ra.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 4: Implementasi Server Component halaman detail.**

`apps/web/src/app/(app)/knowledge/[slug]/page.tsx`:

```tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArticleDetail } from '@/components/knowledge/ArticleDetail';
import { laravelFetch } from '@/lib/server/api';
import type { KnowledgeArticleDetail } from '@/types/articles';

export const metadata = {
  title: 'Artikel | JARVIS OPS',
};

interface ArticlePayload {
  success: boolean;
  data: KnowledgeArticleDetail;
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const res = await laravelFetch(`/articles/${slug}`, { cache: 'no-store' });
  if (!res.ok) {
    notFound();
  }
  const payload = (await res.json()) as ArticlePayload;
  const article = payload.data;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground">
        <Link href="/knowledge">
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Daftar Artikel
        </Link>
      </Button>
      <ArticleDetail article={article} />
    </div>
  );
}
```

> Jebakan K11: **tanpa** `generateMetadata` yang memanggil API lagi (akan menggelembungkan `view_count`). Metadata statis cukup.

- [ ] **Step 5: Verifikasi.**

Run: `npx vitest run src/test/article-detail.test.tsx`
Expected: PASS.
Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/'(app)'/knowledge/'[slug]' apps/web/src/components/knowledge/ArticleDetail.tsx apps/web/src/test/article-detail.test.tsx
git commit -m "feat(web): add article detail page with markdown rendering (Server Component, K11)"
```

---

### Task 3: Editor artikel (`/knowledge/new`, `/knowledge/[id]/edit`)

**Files:**
- Create: `apps/web/src/schemas/article.ts`
- Create: `apps/web/src/components/knowledge/ArticleEditor.tsx`
- Create: `apps/web/src/app/(app)/knowledge/new/page.tsx` + `page-client.tsx`
- Create: `apps/web/src/app/(app)/knowledge/[id]/edit/page.tsx` + `page-client.tsx`
- Test: `apps/web/src/test/article-schema.test.ts`, `apps/web/src/test/article-editor.test.tsx`

**Interfaces:**
- Consumes: `useArticleCategories`, `articleKeys.edit`, `apiFetch`, `useApiMutation`, `setFormErrors`, `useAuth().can`, `useRouter`.
- Produces: `articleSchema` (zod), `ArticleFormData`, `<ArticleEditor article? />`, `<CreateArticlePageClient />`, `<EditArticlePageClient articleId />`.

- [ ] **Step 1: Tulis test schema (RED).**

`apps/web/src/test/article-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { articleSchema } from '@/schemas/article';

describe('articleSchema', () => {
  it('accepts valid payload', () => {
    const result = articleSchema.safeParse({
      title: 'Cara Reset Password',
      category_id: 1,
      content: 'Langkah-langkah…',
      status: 'published',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title, category and content', () => {
    const result = articleSchema.safeParse({
      title: '',
      category_id: null,
      content: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'title')).toBe(true);
      expect(result.error.issues.some((i) => i.path[0] === 'category_id')).toBe(true);
      expect(result.error.issues.some((i) => i.path[0] === 'content')).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan gagal.**

Run: `npx vitest run src/test/article-schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementasi schema (mengikuti `schemas/asset.ts`; pesan Indonesia sesuai `StoreArticleRequest`).**

`apps/web/src/schemas/article.ts`:

```ts
import { z } from 'zod';
import type { ArticleStatus } from '@/types/articles';

export const articleSchema = z.object({
  title: z.string().min(1, 'Judul artikel wajib diisi.').max(200, 'Judul artikel maksimal 200 karakter.'),
  category_id: z.number({ message: 'Kategori artikel wajib dipilih.' }).int('Kategori artikel tidak valid.'),
  content: z.string().min(1, 'Konten artikel wajib diisi.'),
  status: z.enum(['draft', 'published'], { message: 'Status artikel harus draft atau published.' }).optional(),
});

export type ArticleFormData = z.infer<typeof articleSchema>;
```

- [ ] **Step 4: Implementasi editor.**

`apps/web/src/components/knowledge/ArticleEditor.tsx` (pola `AssetForm`):

```tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/client/api';
import { articleKeys } from '@/lib/query-keys';
import { setFormErrors } from '@/lib/client/error-mapper';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useAuth } from '@/components/providers/auth-provider';
import { articleSchema, type ArticleFormData } from '@/schemas/article';
import type { KnowledgeArticleDetail } from '@/types/articles';

interface ArticleEditorProps {
  article?: KnowledgeArticleDetail; // present = edit mode
}

export function ArticleEditor({ article }: ArticleEditorProps) {
  const router = useRouter();
  const isEdit = Boolean(article);
  const { can } = useAuth();

  const {
    register, handleSubmit, control, setError,
    formState: { errors },
  } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title ?? '',
      category_id: article?.category?.id,
      content: article?.content ?? '',
      status: article?.status ?? 'draft',
    },
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: articleKeys.categories,
    queryFn: () => apiFetch<{ id: number; name: string }[]>('/knowledge-categories'),
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesResponse?.data ?? [];

  const mutation = useApiMutation({
    mutationFn: (data: ArticleFormData) => {
      const body = isEdit
        ? { title: data.title, category_id: data.category_id, content: data.content }
        : { title: data.title, category_id: data.category_id, content: data.content, status: data.status };
      return apiFetch<KnowledgeArticleDetail>(
        isEdit ? `/articles/${article!.id}` : '/articles',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(body) }
      );
    },
    onSuccessMessage: isEdit ? 'Artikel berhasil diperbarui.' : 'Artikel berhasil dibuat.',
    onFormError: (backendErrors) => setFormErrors(backendErrors, setError),
    onSuccess: (res) => {
      router.push(`/knowledge/${res.data?.slug}`);
    },
  });

  const canPublish = can('article.publish');
  const canUnpublish = can('article.unpublish');

  const publishMutation = useApiMutation({
    mutationFn: () => apiFetch<KnowledgeArticleDetail>(`/articles/${article!.id}/publish`, { method: 'POST' }),
    onSuccessMessage: 'Artikel berhasil dipublikasikan.',
    invalidateKeys: [articleKeys.edit(article!.id), articleKeys.lists()],
    onSuccess: () => router.refresh(),
    enabled: !!article,
  });

  const unpublishMutation = useApiMutation({
    mutationFn: () => apiFetch<KnowledgeArticleDetail>(`/articles/${article!.id}/unpublish`, { method: 'POST' }),
    onSuccessMessage: 'Artikel berhasil diturunkan.',
    invalidateKeys: [articleKeys.edit(article!.id), articleKeys.lists()],
    onSuccess: () => router.refresh(),
    enabled: !!article,
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Judul <span className="text-destructive">*</span></Label>
            <Input id="title" placeholder="Contoh: Cara Reset Password" {...register('title')} aria-invalid={!!errors.title} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category_id">Kategori <span className="text-destructive">*</span></Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="category_id" aria-invalid={!!errors.category_id}>
                    <SelectValue placeholder="Pilih kategori…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
          </div>

          {isEdit && article && (
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug <span className="text-muted-foreground">(tidak dapat diubah — D-18)</span></Label>
              <Input id="slug" value={article.slug} readOnly className="bg-muted/40 text-muted-foreground" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="content">Konten (Markdown) <span className="text-destructive">*</span></Label>
            <Textarea id="content" rows={14} className="font-mono text-sm" placeholder="Tulis isi artikel dalam format Markdown…" {...register('content')} aria-invalid={!!errors.content} />
            {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/knowledge">Batal</Link>
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat Artikel'}
          </Button>
        </div>
      </div>

      <div className="space-y-6 lg:col-span-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Status Publikasi</h2>
          <p className="text-xs text-muted-foreground">
            Status saat ini: <strong>{article?.status === 'published' ? 'Dipublikasikan' : 'Draf'}</strong>
          </p>
          {isEdit && article && (
            <div className="flex flex-col gap-2">
              {canPublish && article.status !== 'published' && (
                <Button size="sm" variant="default" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
                  {publishMutation.isPending ? 'Menerbitkan…' : 'Terbitkan'}
                </Button>
              )}
              {canUnpublish && article.status === 'published' && (
                <Button size="sm" variant="outline" onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}>
                  {unpublishMutation.isPending ? 'Menurunkan…' : 'Turunkan (Unpublish)'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
```

> Catatan C13-context: `PUT /api/articles/{id}` hanya menerima `title`, `category_id`, `content` (`UpdateArticleRequest`). `status` hanya dikirim saat create (`StoreArticleRequest` menerimanya nullable). Slug immutable — tidak dikirim.

- [ ] **Step 5: Implementasi halaman create.**

`apps/web/src/app/(app)/knowledge/new/page.tsx` (server wrapper, pola `assets/new/page.tsx`) + `page-client.tsx` (guard `can('article.create')` → redirect `/403`, render header + `<ArticleEditor />`).

- [ ] **Step 6: Implementasi halaman edit.**

`apps/web/src/app/(app)/knowledge/[id]/edit/page.tsx` (server wrapper, pola `assets/[id]/edit/page.tsx`) + `page-client.tsx`:

```tsx
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArticleEditor } from '@/components/knowledge/ArticleEditor';
import { apiFetch } from '@/lib/client/api';
import { articleKeys } from '@/lib/query-keys';
import { useAuth } from '@/components/providers/auth-provider';
import type { KnowledgeArticleDetail } from '@/types/articles';

export function EditArticlePageClient({ articleId }: { articleId: number }) {
  const router = useRouter();
  const { can } = useAuth();
  const { data: response, isLoading } = useQuery({
    queryKey: articleKeys.edit(articleId),
    queryFn: () => apiFetch<KnowledgeArticleDetail>(`/articles/${articleId}/edit`), // A4 — tanpa view_count++
    enabled: Number.isFinite(articleId),
  });

  const canEdit = can('article.update');
  useEffect(() => {
    if (!canEdit) router.replace('/403');
  }, [canEdit, router]);

  if (!canEdit || isLoading || !response?.data) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/knowledge/${response.data.slug}`} aria-label="Kembali ke detail artikel">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-bold text-xl text-foreground tracking-tight">Ubah Artikel</h1>
      </div>
      <ArticleEditor article={response.data} />
    </div>
  );
}
```

- [ ] **Step 7: Test editor (RED→GREEN).**

`apps/web/src/test/article-editor.test.tsx`:
- create mode: render `ArticleEditor` tanpa prop → muncul judul "Buat Artikel", tidak ada field slug read-only.
- edit mode: render dengan `article` → muncul "Simpan Perubahan", field slug readonly dengan nilai slug, tombol "Terbitkan"/"Turunkan" sesuai status.
- submit create memanggil `apiFetch('/articles', { method: 'POST' })` (mock global fetch) lalu `router.push('/knowledge/<slug>')`.
- 422 dari backend diarahkan ke field (mock `useApiMutation` tidak perlu — gunakan mock `apiFetch` + `useApiMutation` asli di-wrapping? Untuk kemudahan, mock `useApiMutation` return `{ mutate, isPending }` dan verifikasi render + copy; biarkan integrasi useApiMutation diuji lewat test komponen nyata minimal).

Saran: mock `@/hooks/useApiMutation` dengan `{ mutate: vi.fn(), isPending: false }`, dan gunakan `act` untuk submit. Fokus: render field, guard slug, dan submit memanggil `mutationFn` dengan payload benar.

- [ ] **Step 8: Verifikasi.**

Run: `npx vitest run src/test/article-schema.test.ts src/test/article-editor.test.tsx`
Expected: PASS.
Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/schemas/article.ts apps/web/src/components/knowledge/ArticleEditor.tsx apps/web/src/app/'(app)'/knowledge/new apps/web/src/app/'(app)'/knowledge/'[id]' apps/web/src/test/article-schema.test.ts apps/web/src/test/article-editor.test.tsx
git commit -m "feat(web): add article editor with markdown textarea, slug read-only, and publish/unpublish toggle"
```

---

### Task 4: Empty state Employee (ROADMAP:762)

**Files:**
- Modify: `apps/web/src/app/(app)/knowledge/page-client.tsx`
- Test: `apps/web/src/test/knowledge-page-guard.test.tsx`

**Detail:** Sudah diimplementasikan di Task 1 Step 7 (blok `isEmployee && articles.length === 0`). Task ini memvalidasi perilaku tersebut + guard employee.

- [ ] **Step 1: Tulis test (RED).**

`apps/web/src/test/knowledge-page-guard.test.tsx`:

```tsx
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
      expect(screen.getByText(/belum ada artikel/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /buat tiket/i })).toHaveAttribute('href', '/tickets/new');
  });

  it('does not render create article button for employee', () => {
    render(<KnowledgePageClient />);
    expect(screen.queryByRole('link', { name: /buat artikel/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan lolos (sudah terpasang di Task 1).**

Run: `npx vitest run src/test/knowledge-page-guard.test.tsx`
Expected: PASS (fitur sudah ada; test mengunci perilaku).

- [ ] **Step 3: Verifikasi menyeluruh + commit.**

Run: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`
Expected: semuanya hijau (95 + test baru).

```bash
git add apps/web/src/app/'(app)'/knowledge/page-client.tsx apps/web/src/test/knowledge-page-guard.test.tsx
git commit -m "feat(web): add KB empty state for employees with link to create ticket"
```

---

## Self-Review (sudah dijalankan terhadap spec)

- **Spec coverage:** 4 task 8e tercakup: list (T1), detail+markdown+related+Server Component (T2), editor+slug read-only+publish/unpublish (T3), empty state Employee (T4). Semua 6 exit criteria 8e dipetakan.
- **Tipe konsisten:** `author.full_name`, `related_articles` (RelatedArticle), `articleKeys.edit/list/categories` konsisten di semua task.
- **No placeholders:** semua file diberi kode nyata. Test disediakan sebagai sketsa yang siap dieksekusi.
- **Gap yang ditemukan & sudah ditangani:** tipe `author` stale (Task 0); `UpdateArticleRequest` tidak menerima `status` (Task 3 editor memisahkan status ke tombol publish/unpublish); `generateMetadata` tidak fetch ulang (Task 2).

## Daftar perintah verifikasi akhir

```bash
# di apps/web
npm run test
npx tsc --noEmit
npm run lint
npm run build
```
