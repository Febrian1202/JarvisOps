# Sub-tahap 8e — Knowledge Base

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini membangun Knowledge Base: daftar artikel publik, halaman detail dengan markdown, editor untuk T/M/A, dan publish/unpublish. Employee hanya melihat published article.

**Goal:** Halaman `/knowledge` (search + kategori filter), `/knowledge/[slug]` (detail + `react-markdown` + related articles), `/knowledge/new` + `/knowledge/[slug]/edit` (editor), dan publish/unpublish toggle.

**Branch:** `feat/phase-8e-knowledge-base`
**Estimasi:** ~1,0 hari
**Prasyarat:** 8a selesai (A4 edit endpoint, `MarkdownRenderer`, `react-markdown` + sanitizer)

---

## Task 1: Daftar artikel (`/knowledge`)

**Files:**
- Create: `apps/web/src/app/(app)/knowledge/page.tsx`
- Create: `apps/web/src/app/(app)/knowledge/page-client.tsx`
- Create: `apps/web/src/components/knowledge/ArticleTable.tsx`
- Create: `apps/web/src/components/knowledge/ArticleFilters.tsx`

**Detail:** DataTable — search (judul+isi), filter kategori, filter status (hanya T/M/A — Employee tidak melihatnya). Kolom: judul (link ke detail), kategori, penulis, status (badge), view count, published_at.

**Employee:** Hanya melihat published article. Filter status tidak dirender. `ArticleListResource` sudah di-scope server.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add knowledge base list page with search and category filter"
```

---

## Task 2: Detail artikel (`/knowledge/[slug]`)

**Files:**
- Create: `apps/web/src/app/(app)/knowledge/[slug]/page.tsx` (Server Component — K11)
- Create: `apps/web/src/components/knowledge/ArticleDetail.tsx`

**Detail:** Server Component (K11) — `laravelFetch` panggil `GET /api/articles/{slug}`. Render:
- Judul, kategori, penulis, view count, status, published_at
- Konten via `MarkdownRenderer` (react-markdown + rehype-sanitize)
- Related articles dari `data.related_articles` (nested di response)

**Jebakan — view count:** Server Component dipanggil sekali per request. Tidak ada double-fetch, Strict Mode, atau `refetchOnWindowFocus`. Ini satu-satunya cara menjaga `view_count` jujur.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add article detail page with markdown rendering (Server Component)"
```

---

## Task 3: Editor artikel (`/knowledge/new`, `/knowledge/[slug]/edit`)

**Files:**
- Create: `apps/web/src/app/(app)/knowledge/new/page.tsx`
- Create: `apps/web/src/app/(app)/knowledge/new/page-client.tsx`
- Create: `apps/web/src/app/(app)/knowledge/[slug]/edit/page.tsx`
- Create: `apps/web/src/app/(app)/knowledge/[slug]/edit/page-client.tsx`
- Create: `apps/web/src/components/knowledge/ArticleEditor.tsx`
- Create: `apps/web/src/schemas/article.ts`

**Detail:** Editor menggunakan `GET /api/articles/{article}/edit` (A4 — tanpa view_count increment). Form:
- title (text input)
- slug (read-only, D-18 — immutable)
- category_id (select dari `/api/knowledge-categories`)
- content (textarea, markdown)
- status (draft/published — toggle atau select)

**Publish/unpublish:** Tombol terpisah `POST /api/articles/{id}/publish` + `POST /api/articles/{id}/unpublish`. Hanya T/M/A.

**Submit:** `POST /api/articles` (create) atau `PUT /api/articles/{id}` (update). Redirect ke detail.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add article editor with markdown textarea and publish toggle"
```

---

## Task 4: Empty state Employee

**Files:**
- Modify: `apps/web/src/app/(app)/knowledge/page-client.tsx`

**Detail:** ROADMAP:762 — saat Employee membuka `/knowledge` dan belum ada artikel, tampilkan state "Belum ada artikel. Silakan buat ticket untuk melaporkan masalah Anda." dengan link ke `/tickets/new`.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add KB empty state for employees with link to create ticket"
```

---

## Exit Criteria 8e

- [x] `/knowledge` — search, filter kategori, filter status (T/M/A), DataTable.
- [x] `/knowledge/[slug]` — markdown rendered, related articles, Server Component, view_count tidak menggelembung.
- [x] `/knowledge/new` + `/knowledge/[slug]/edit` — editor, slug read-only, publish/unpublish toggle.
- [x] Employee tidak melihat tombol "Buat Artikel" / filter status.
- [x] Empty state Employee dengan link ke `/tickets/new`.
- [x] `npm run test`, `npx tsc --noEmit`, `npm run lint` hijau.