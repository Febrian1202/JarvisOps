# FRONTEND ARCHITECTURE (BFF, COMPONENTS & STATE)

## JARVIS OPS — IT Service Management System

**Version:** 1.2
**Status:** Derived — tidak memperkenalkan keputusan baru; mengkonsolidasikan pola yang tersebar
**Sumber:** `docs/product/ROADMAP.md` (Fase 7–8), `docs/tasks/phase-2/2d-walking-skeleton.md`, `docs/api/API-CONTRACT.md`, `docs/product/PRD.md`, `AGENTS.md`
**Dokumen terkait:** `docs/architecture/BACKEND-ARCHITECTURE.md`, `docs/architecture/CONTEXT-DIAGRAM.md`, `docs/architecture/DFD.md`, `docs/product/PERMISSION-MATRIX.md`, `docs/product/STATUS-TRANSITION.md`

---

## 1. Tujuan Dokumen

Dokumen ini menjelaskan arsitektur frontend Next.js (BFF), bagaimana komponen diorganisasikan, bagaimana state dikelola, dan bagaimana data mengalir dari Laravel ke UI. Ia adalah **panduan implementasi** — bukan dokumen keputusan.

**Aturan utamanya: Client Component tidak pernah memanggil Laravel langsung. Semua request melewati BFF proxy Next.js yang menyisipkan token Sanctum dari httpOnly cookie.**

---

## 2. Stack & Versi

| Teknologi | Versi | Keterangan |
| --- | --- | --- |
| Next.js | 16.3 | App Router, React Server Components |
| React | 19 | Server & Client Components |
| TypeScript | 5 | Strict mode |
| Tailwind CSS | 4 | Utility-first CSS |
| shadcn/ui | — | Komponen dasar (button, input, table, dialog, form, dll) |
| TanStack Query | — | Server state, caching, polling, optimistic updates |
| react-hook-form | — | Form state, validasi client-side |
| zod | — | Schema validasi, shared dengan react-hook-form via resolver |
| Recharts | — | Chart & dashboard visualisasi |
| lucide-react | 1.38 | Ikon (lihat §3.7) |
| date-fns | — | Format tanggal & durasi |

Stack ini sudah dikunci di ROADMAP §2 dan tidak boleh diganti. shadcn/ui diinstal di atas Tailwind v4 yang sudah ada.

---

## 3. Design System Integration

Visual theme aplikasi ditentukan **`DESIGN.md`** (di root repo) — spec visual yang mengunci palet, tipografi, komponen styling, elevasi, dan aturan do's & don'ts. Section ini menjelaskan cara menerjemahkan DESIGN.md ke Tailwind v4 + shadcn/ui, bukan mengganti atau melonggarkan aturannya.

### 3.1 Prinsip warna & kontras

- **Dilarang** memakai pure white (`#ffffff`) sebagai latar — basisnya cream `#f7f4ed`.
- Semua gray diturunkan dari charcoal `#1c1c1c` pada opacity bervariasi (0.03, 0.04, 0.4, 0.82, 0.83) — bukan hex arbitrer.
- Border: `#eceae4` untuk pasif, `rgba(28,28,28,0.4)` untuk interaktif. Jangan mencampur gaya border.
- Depth dikendalikan border, bukan box-shadow. Satu-satunya shadow signifikan adalah **inset shadow** pada tombol gelap.
- Maximum weight adalah **600** — weight 700 tidak dipakai.

### 3.2 Tailwind v4 theme (`src/app/globals.css`)

Tailwind v4 memakai `@theme` di CSS (bukan `tailwind.config.js`). Token DESIGN.md dipetakan ke CSS custom properties:

```css
@import "tailwindcss";

@theme {
    --font-sans: 'Camera Plain Variable', ui-sans-serif, system-ui;

    /* warna dasar */
    --color-cream: #f7f4ed;            /* latar halaman & kartu */
    --color-charcoal: #1c1c1c;         /* teks utama, heading, tombol gelap */
    --color-off-white: #fcfbf8;        /* teks tombol gelap, highlight */
    --color-muted-gray: #5f5f5d;       /* teks sekunder, caption */
    --color-cream-border: #eceae4;     /* border pasif, divider */
    --color-charcoal-40: rgba(28, 28, 28, 0.4);  /* border interaktif */
    --color-charcoal-4: rgba(28, 28, 28, 0.04);  /* hover subtle */
    --color-charcoal-3: rgba(28, 28, 28, 0.03);  /* depth halus */

    /* radius scale (DESIGN.md §5) */
    --radius-button: 6px;
    --radius-card: 12px;
    --radius-compact: 8px;
    --radius-container: 16px;
    --radius-pill: 9999px;
}
```

Utility yang dihasilkan: `bg-cream`, `text-charcoal`, `border-cream-border`, `rounded-card`, dst.

### 3.3 shadcn/ui customization (`@layer base`)

shadcn/ui memakai CSS variables di `:root`. Override agar komponen mengikuti DESIGN.md:

```css
@layer base {
    :root {
        --background: #f7f4ed;
        --foreground: #1c1c1c;
        --card: #f7f4ed;
        --card-foreground: #1c1c1c;
        --popover: #f7f4ed;
        --popover-foreground: #1c1c1c;
        --primary: #1c1c1c;
        --primary-foreground: #fcfbf8;
        --secondary: #f7f4ed;
        --secondary-foreground: #1c1c1c;
        --muted: #5f5f5d;
        --muted-foreground: #5f5f5d;
        --border: #eceae4;
        --input: #f7f4ed;
        --ring: rgba(59, 130, 246, 0.5);
        --radius: 0.375rem;  /* 6px = radius button/input */
    }
}
```

### 3.4 Typography

- **Font:** `Camera Plain Variable`, fallback `ui-sans-serif, system-ui` — diatur via `--font-sans` di `@theme`.
- **Two weights:** 400 (body/UI/buttons) dan 600 (headings). Weight 480 khusus display moment.
- **Letter-spacing negatif** pada headline, mengikuti skala DESIGN.md: -1.5px @ 60px, -1.2px @ 48px, -0.9px @ 36px, normal @ 16px.

Utility yang disarankan:

```typescript
// contoh: heading section
<h2 className="text-4xl font-semibold tracking-tight text-charcoal">…</h2>

// contoh: body
<p className="text-base font-normal leading-relaxed text-muted-gray">…</p>
```

### 3.5 Component styling reference

| shadcn/ui component | Override DESIGN.md |
| --- | --- |
| `Button` (primary) | `bg-charcoal text-off-white rounded-button`, **inset shadow** signature, active opacity 0.8 |
| `Button` (ghost/outline) | `bg-transparent text-charcoal border-charcoal-40 rounded-button` |
| `Card` | `bg-cream border-cream-border rounded-card`, **tanpa box-shadow** |
| `Input` | `bg-cream border-cream-border rounded-button`, focus ring blue 50% |
| `Badge` | warna status (StatusBadge/PriorityBadge) tetap tegas tapi tetap dalam palette warm-neutral |
| Dialog/modal | `bg-cream rounded-container`, border `#eceae4` |

**Inset shadow signature** (jangan dilewati):

```css
.btn-primary {
    box-shadow:
        rgba(255, 255, 255, 0.2) 0px 0.5px 0px 0px inset,
        rgba(0, 0, 0, 0.2) 0px 0px 0px 0.5px inset,
        rgba(0, 0, 0, 0.05) 0px 1px 2px 0px;
}
```

### 3.6 Do's & Don'ts

Seluruh aturan §7 `DESIGN.md` wajib dipegang. Ringkasan larangan yang paling sering dilanggar oleh tooling otomatis:

- Jangan `bg-white` — pakai `bg-cream`.
- Jangan box-shadow pada kartu — pakai border `#eceae4`.
- Jangan weight 700 — 600 maksimal.
- Jangan `rounded-full` pada tombol persegi — pill hanya untuk ikon/toggle.
- Jangan fokus outline tajam — pakai soft shadow / ring.

### 3.7 Icon Strategy

Ikon memakai **lucide-react** sebagai library ikon tunggal. Library ini sudah menjadi standar ekosistem shadcn/ui dan digunakan secara bawaan oleh komponen yang diinstal di ROADMAP Fase 7.

Aturan:

- **Satu sumber:** lucide-react. Jangan menambah library ikon lain (react-icons, heroicons, Font Awesome, SVG).
- **Import langsung:** `import { Plus, Search } from 'lucide-react'` — tree-shakeable, hanya ikon yang dipakai masuk bundle.
- **Ukuran:** default 16px (sizing `size-4` di Tailwind) untuk ikon UI, 20px (`size-5`) untuk ikon yang lebih menonjol. Hindari ikon di bawah 14px — aksesibilitas.
- **Stroke width:** `strokeWidth={1.5}` sebagai default; `strokeWidth={2}` untuk ikon kecil (≤14px). Jangan mengubah global — lucide sudah dioptimalkan.
- **Custom / brand icon:** untuk logo atau ikon spesifik domain (bukan dari set lucide), buat sebagai **React component** inline SVG di `src/components/shared/icons/` dengan ukuran yang konsisten dan stroke style yang menyerupai lucide. Jangan meng-customize lucide itu sendiri.
- **Pill icon button** (DESIGN.md): `rounded-full bg-cream border-charcoal-40` + lucide icon di dalamnya. Contoh:

```tsx
import { Search } from 'lucide-react';

<button className="rounded-full bg-cream border border-charcoal-40 p-2">
    <Search size={16} strokeWidth={1.5} />
</button>
```

---

## 4. BFF Architecture (Backend For Frontend)

### 4.1 Alur request

```
Browser (Client Component)
    │
    │ fetch('/api/proxy/tickets')
    ▼
Route Handler Next.js (server-side)
    │
    │ baca httpOnly cookie → sisipkan Authorization: Bearer
    ▼
Laravel API (apps/api)
    │
    │ response JSON
    ▼
Route Handler → stream response ke browser
```

### 4.2 Prinsip keamanan token

- Token Sanctum disimpan di **httpOnly cookie** oleh Route Handler — **tidak pernah** dikirim ke browser dalam bentuk yang bisa dibaca JavaScript.
- Client Component memanggil `/api/proxy/...` (Route Handler), bukan Laravel langsung.
- `fetch('http://localhost:8000/api/...')` dari client component adalah **bug**.
- Login handler (`/api/auth/login`) meneruskan kredensial ke Laravel, menyimpan token di cookie, dan mengembalikan response **tanpa token** ke browser.
- Logout handler (`/api/auth/logout`) merevoke token di Laravel dan menghapus cookie.

### 4.3 Komponen BFF

| File | Fungsi |
| --- | --- |
| `src/lib/server/session.ts` | `setToken()`, `getToken()`, `deleteToken()` via `next/headers` `cookies()` |
| `src/lib/server/api.ts` | `laravelFetch(endpoint)` — base API fetcher, sisipkan token, `Accept: application/json` |
| `src/app/api/auth/login/route.ts` | `POST` — login, simpan cookie, return user tanpa token |
| `src/app/api/auth/logout/route.ts` | `POST` — revoke token, hapus cookie |
| `src/app/api/proxy/[...path]/route.ts` | Catch-all — teruskan GET/POST/PUT/DELETE ke Laravel, tangani 401 (hapus cookie) |
| `src/middleware.ts` | Cek cookie, redirect `/login` jika tidak ada, redirect `/` jika sudah login |

### 4.4 Konfigurasi cookie

```typescript
const cookieOptions: ResponseCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60, // 12 jam, sejajar dengan expiration Sanctum
};
```

### 4.5 Environment variables

| Variable | Default | Keterangan |
| --- | --- | --- |
| `API_BASE_URL` | `http://api:8000/api` | Base URL Laravel API (Docker internal) |

---

## 5. Folder Structure

Struktur sesuai ROADMAP (`Setup`):

```
src/
├── app/                          ← Next.js App Router
│   ├── (auth)/                   ← route group untuk halaman login
│   │   └── login/page.tsx
│   ├── (app)/                    ← route group untuk halaman terproteksi
│   │   ├── dashboard/page.tsx
│   │   ├── tickets/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/login/route.ts   ← BFF login handler
│   │   ├── auth/logout/route.ts  ← BFF logout handler
│   │   └── proxy/[...path]/route.ts  ← BFF proxy
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                       ← shadcn/ui components (button, input, table, dll)
│   └── shared/                   ← komponen bersama aplikasi
│       ├── DataTable.tsx
│       ├── FilterBar.tsx
│       ├── StatusBadge.tsx
│       ├── SlaIndicator.tsx
│       ├── EmptyState.tsx
│       ├── LoadingSkeleton.tsx
│       ├── ConfirmDialog.tsx
│       ├── FileUpload.tsx
│       └── RelativeTime.tsx
├── features/                     ← komponen per domain
│   ├── auth/
│   │   ├── AuthProvider.tsx
│   │   ├── LoginForm.tsx
│   │   └── useAuth.ts
│   ├── tickets/
│   │   ├── TicketList.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── TicketForm.tsx
│   │   └── TicketStatusBadge.tsx
│   ├── notifications/
│   │   ├── NotificationBell.tsx
│   │   └── NotificationDropdown.tsx
│   └── dashboard/
│       └── SlaChart.tsx
├── hooks/                        ← custom hooks
│   ├── useDebounce.ts
│   └── useMediaQuery.ts
├── lib/
│   ├── server/                   ← hanya jalan di server
│   │   ├── session.ts
│   │   └── api.ts
│   └── client/                   ← hanya jalan di client
│       └── apiFetch.ts
├── types/                        ← TypeScript types
│   └── api.ts
└── middleware.ts                 ← Next.js middleware
```

### Aturan penamaan

- File & folder: **kebab-case** (`ticket-list.tsx`, `notification-bell.tsx`).
- Komponen fungsi: **PascalCase** (`TicketList`, `NotificationBell`).
- Hooks: `use` prefix (`useAuth`, `useDebounce`).
- Fitur per domain di `features/<domain>/` — singular snake_case (`tickets`, `auth`, `notifications`, `dashboard`).

---

## 6. API Layer

### 5.1 Server-side fetcher (`src/lib/server/api.ts`)

Fungsi `laravelFetch(endpoint, options?)` dipakai oleh Route Handler dan Server Component. Ia menyisipkan token dari httpOnly cookie dan header `Accept: application/json`.

### 5.2 Client-side fetcher (`src/lib/client/apiFetch.ts`)

Client Component memanggil API melalui BFF proxy:

```typescript
// client component
const { data, isLoading } = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => apiFetch('/tickets', { params: filters }),
});
```

`apiFetch` membungkus `fetch('/api/proxy/...')` dan melakukan:

- **unwrap envelope** — mengambil `data` dari response `{ success, message, data, meta }`.
- **error mapper** — untuk 422 Laravel, map `errors` ke format yang bisa dibaca react-hook-form `setError`.
- **401 handling** — redirect ke `/login` (sudah ditangani proxy di server, client hanya perlu redirect).

### 5.3 Query key factory

TanStack Query key factory yang konsisten agar invalidasi cache tidak saling tabrakan:

```typescript
const ticketKeys = {
    all: ['tickets'] as const,
    lists: () => [...ticketKeys.all, 'list'] as const,
    list: (filters: TicketFilters) => [...ticketKeys.lists(), filters] as const,
    details: () => [...ticketKeys.all, 'detail'] as const,
    detail: (id: number) => [...ticketKeys.details(), id] as const,
};
```

### 5.4 TypeScript types

Semua tipe entity diturunkan dari API contract (`docs/api/API-CONTRACT.md`), bukan dari tebakan. File `types/api.ts` berisi interface untuk setiap bentuk response.

---

## 7. App Shell

### 6.1 Route groups

- `(auth)` — halaman login, tidak butuh autentikasi.
- `(app)` — halaman terproteksi, layout dengan sidebar + topbar, navigasi difilter role.

### 6.2 AuthProvider

`AuthProvider` di root layout `(app)` menyediakan data user dari `/me`:

```typescript
const { user, permissions, can } = useAuth();
can('ticket.create'); // true/false
```

Navigasi berbasis role **hanya untuk kenyamanan** — menyembunyikan menu bukan mekanisme keamanan. Penjaga sebenarnya tetap Policy di Laravel (PERMISSION-MATRIX §1).

### 6.3 Layout

- Sidebar (desktop) → drawer (mobile).
- Topbar dengan `NotificationBell` + avatar user.
- Responsive: sidebar jadi drawer di mobile (NFR-003).
- Error boundary global + halaman 403/404 kustom.

---

## 8. Component Patterns

Semua komponen UI mengacu pada visual theme di `DESIGN.md` dan Tailwind v4 theme yang didefinisikan di §3. Styling visual (warna, radius, tipografi, shadow) diimplementasikan lewat utility class dari `@theme`, bukan inline style.

### 8.1 Shared components

| Komponen | Fungsi |
| --- | --- |
| `DataTable` | Pagination server-side, sorting, konfigurasi kolom, state loading/empty/error |
| `FilterBar` | Filter tersinkron URL search params — tahan refresh, bisa di-share |
| `SearchInput` | Input dengan debounce |
| `StatusBadge` | Badge warna status ticket |
| `PriorityBadge` | Badge warna prioritas |
| `SlaIndicator` | Indikator SLA: aman / mendekati deadline / breached |
| `EmptyState` | Halaman/konten kosong |
| `LoadingSkeleton` | Skeleton loading |
| `ConfirmDialog` | Dialog konfirmasi sebelum aksi destruktif |
| `FileUpload` | Validasi ukuran/tipe di client (kenyamanan), backend tetap penjaga |
| `RelativeTime` | Format relative time ("2 jam lalu") + tooltip tanggal absolut |

### 8.2 Server Component vs Client Component

- **Server Component** — default. Render data dari `laravelFetch` langsung. Dipakai untuk halaman (`page.tsx`), layout, dan konten yang tidak perlu interaktivitas.
- **Client Component** — ditandai `'use client'`. Dipakai untuk form, tabel interaktif, polling, animasi. Interaksi dengan backend lewat `apiFetch` → BFF proxy.
- Batas `'use client'` ditarik **serendah mungkin** — prefer Server Component hingga butuh interaktivitas.

### 8.3 Data fetching pattern

```typescript
// Server Component — fetch langsung
const tickets = await laravelFetch('/tickets?page=1');

// Client Component — lewat proxy + TanStack Query
const { data, isLoading } = useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: () => apiFetch(`/tickets`, { params: filters }),
});
```

---

## 9. Notification & Polling

- Polling 30 detik via TanStack Query `refetchInterval`.
- Polling **berhenti saat tab tidak aktif** (`refetchIntervalInBackground: false`) — hemat request tanpa mengorbankan pengalaman.
- `NotificationBell` menampilkan badge unread count.
- Dropdown daftar notifikasi, klik menandai read + navigasi ke ticket terkait.
- Tombol mark-all-as-read.

---

## 10. Form Handling

- **react-hook-form** untuk state form.
- **zod** untuk schema validasi — di-resolve via `@hookform/resolvers`.
- Error 422 dari Laravel dipetakan ke `setError` react-hook-form per field oleh `apiFetch`.
- Validasi client-side hanya **kenyamanan** — backend tetap penjaga sebenarnya.

```typescript
const schema = z.object({
    title: z.string().min(1, 'Judul harus diisi'),
    description: z.string().min(1, 'Deskripsi harus diisi'),
});

const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
});
```

---

## 11. Dashboard & Charts

- Recharts untuk visualisasi (SLA compliance, ticket distribution, dll).
- Dynamic import untuk komponen chart yang berat:

```typescript
const SlaChart = dynamic(() => import('@/features/dashboard/SlaChart'), {
    ssr: false,
    loading: () => <LoadingSkeleton />,
});
```

---

## 12. Pola yang Sengaja Tidak Dipakai

| Pola | Alasan |
| --- | --- |
| WebSocket / SSE / real-time | MVP hanya polling 30 detik; tidak ada integrasi eksternal (ROADMAP §2, PRD §34) |
| Client-side auth/security | Navigasi difilter role hanya kenyamanan; Policy Laravel penjaga sebenarnya (PERMISSION-MATRIX §1) |
| Redux / Zustand / global state | TanStack Query + React context sudah cukup untuk server state; tidak ada client state kompleks |
| Axios | `fetch` bawaan + `apiFetch` wrapper sudah cukup (ROADMAP: hanya restore jika ada masalah) |
| Next.js Pages Router | App Router sudah final |

---

## 13. Referensi & Authority

Dokumen ini adalah dokumen turunan dan **tidak** mengubah urutan otoritas `DECISIONS.md` §2. Keputusan terkait frontend:

| Topik | Sumber |
| --- | --- |
| Envelope API & BFF proxy | `docs/api/API-CONTRACT.md` §2, §5 |
| Permission matrix & UI hiding | `docs/product/PERMISSION-MATRIX.md` §1 |
| Walking skeleton implementasi | `docs/tasks/phase-2/2d-walking-skeleton.md` |
| Task checklist frontend | `docs/product/ROADMAP.md` Fase 7–8 |
| Backend architecture | `docs/architecture/BACKEND-ARCHITECTURE.md` |