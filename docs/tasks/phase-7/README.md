# Fase 7 — Frontend Foundation, App Shell, & Shared Components (Master Plan)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi rencana ini per sub-tahap. Setiap berkas sub-tahap (7a–7e) memiliki langkah rinci dengan checkbox (`- [ ]`).
> - **Untuk developer manusia:** Bacalah dokumen ini sebagai peta navigasi arsitektur dan urutan ketergantungan. Sub-tahap 7a–7e dirancang independen dan modular, namun harus dieksekusi berurutan karena setiap tahap menjadi fondasi bagi tahap berikutnya.

**Goal:** Membangun seluruh fondasi aplikasi web Next.js 16 (App Router), mengonfigurasi tema desain sistem warm-neutral (DESIGN.md) dan font Plus Jakarta Sans, memperluas kemampuan BFF proxy, mendefinisikan tipe TypeScript lengkap untuk seluruh API, menyediakan komponen aplikasi inti (App Shell, role-based Sidebar, Topbar dengan polling notifikasi), serta membangun pustaka Shared Components (DataTable, FilterBar, StatusBadge, SlaIndicator) yang siap pakai dan teruji untuk halaman-halaman fungsional Fase 8.

**Architecture:** Next.js 16 App Router dengan arsitektur BFF (Backend-For-Frontend). Server Components digunakan sebagai default untuk memuat data langsung dari internal backend via `laravelFetch`, sedangkan Client Components dibatasi pada daun interaktif (form, tabel dinamis, dropdown, polling). State server dikelola terpusat oleh TanStack Query v5. Autentikasi menggunakan token Sanctum yang disimpan secara aman di cookie `httpOnly`, diteruskan transparan oleh Next.js Route Handlers (`/api/proxy/*`).

**Tech Stack:** Next.js 16.3 (App Router, Turbopack default), React 19, Tailwind CSS v4 (`@theme inline`), shadcn/ui (Radix UI primitives), TanStack Query v5, react-hook-form + zod, Plus Jakarta Sans (`next/font/google`), date-fns, Recharts (persiapan token grafik), Vitest + @testing-library/react (testing shared components & utils).

**Spesifikasi Acuan:**
- `docs/product/ROADMAP.md` — Fase 7 (Frontend Foundation)
- `docs/architecture/FRONTEND-ARCHITECTURE.md` — Pola BFF, state, folder structure, UI rules
- `DESIGN.md` — Palet warna warm-neutral, tipografi, radius, shadow, elevasi, etika visual
- `docs/product/PRODUCT.md` — Persona role, batasan, accessibility WCAG 2.2 AA
- `docs/api/API-CONTRACT.md` — Kontrak response envelope, query parameters, payload entitas
- `docs/product/PERMISSION-MATRIX.md` — Matriks otorisasi ability per role (66 ability)
- `docs/design/wireframe.pen` — Sumber layout visual shell, navigasi sidebar, dan komponen

---

## 1. Konteks & Status Sistem

Fase 7 dieksekusi dengan asumsi bahwa **Fase 5 (Asset, Knowledge Base, Attachment)** dan **Fase 6 (Dashboard & Analytics API)** telah selesai secara penuh:
- Backend Laravel 13 telah memiliki seluruh 65 endpoint operasional aktif (Auth, Ticket Core & Workflow, SLA Scheduler, Notification, Audit Log, Asset Management, Knowledge Base, Attachment Private Storage, Dashboard 4 Role).
- Endpoint `/api/me` diperluas di sub-tahap 7b untuk mengembalikan 66 ability lengkap (29 role abilities + 37 policy abilities) serta status `must_change_password` agar navigasi role-based dan alur reset password dapat beroperasi presisi.
- Seluruh tipe API Resource dan envelope JSON telah stabil dan diverifikasi di Fase 1–6.

---

## 2. Struktur Sub-Tahap & Estimasi Waktu

Total estimasi waktu pengerjaan Fase 7 adalah **~5.5 hari kerja** (merupakan *conscious overrun* yang terencana dan realistis dari estimasi kasar awal roadmap 3 hari, demi memastikan testing, a11y, dan pondasi tipe tuntas).

| Sub-tahap | Judul & Fokus Utama | Estimasi | Berkas Rencana Rinci |
|---|---|---|---|
| **7a** | **Foundation, Dependencies, & Theme System**<br>shadcn/ui init, Tailwind v4 theme, Plus Jakarta Sans, Vitest setup, 16 baseline UI components. | ~1.0 hari | [`7a-foundation-theme.md`](7a-foundation-theme.md) |
| **7b** | **Backend Amendment, API Client, & Type System**<br>Extend `/me` ability & must_change_password, BFF proxy upgrade (PATCH, multipart, stream), `apiFetch` wrapper, types generator, Indonesian label maps. | ~1.0 hari | [`7b-backend-api-layer.md`](7b-backend-api-layer.md) |
| **7c** | **App Shell, Role-Based Navigation, & Auth Flow**<br>Route groups `(auth)`/`(app)`, Sidebar & Topbar layout, AuthProvider & `can()` helper, error boundaries, custom 403/404, forced password change page `/ganti-password`. | ~1.25 hari | [`7c-app-shell-auth.md`](7c-app-shell-auth.md) |
| **7d** | **Shared Components & Tickets Proof-of-Concept**<br>DataTable (server pagination/sort), FilterBar (URL sync), StatusBadge, SlaIndicator, FileUpload, RelativeTime, minimal `/tickets` list page proof. | ~1.25 hari | [`7d-shared-components-tickets.md`](7d-shared-components-tickets.md) |
| **7e** | **Notification UI, A11y Audit, & Finalisasi**<br>NotificationBell (30s polling), dropdown menu, mark-as-read action, full `/notifications` page, a11y sweep, doc sync, git tag `v0.7.0`. | ~1.0 hari | [`7e-notification-finalization.md`](7e-notification-finalization.md) |

---

## 3. Matriks Keputusan Arsitektur Terkunci

| Topik | Keputusan Terkunci | Dasar Pertimbangan |
|---|---|---|
| **Font Primer** | **Plus Jakarta Sans** (`next/font/google`, weight 400, 480, 600) | Camera Plain Variable tidak tersedia di repo/Google Fonts. Plus Jakarta Sans adalah variable humanist sans gratis, modern, dan bernuansa lokal Indonesia yang selaras dengan tema sistem. |
| **Resolusi Permission** | **Backend Amendment di `/me`** | Mengembalikan 29 role abilities + 37 policy abilities (total 66) via `ProfileService`. Backend tetap *single source of truth*; frontend tidak menduplikasi logika matriks gate. |
| **Testing Strategy** | **Vitest + @testing-library/react** | Menjamin keandalan fungsi murni (error mapper, query keys, formatters, relative time) dan komponen UI bersama (DataTable, StatusBadge, SlaIndicator) sebelum dipakai di 20+ halaman Fase 8. |
| **Proof Endpoint** | **`/api/tickets` (Minimal List Page)** | Halaman list tiket adalah komponen paling kompleks (11 filter, search, sort, SLA indicators, role scoping). Mengujinya di 7d memitigasi risiko kegagalan integrasi di Fase 8. |
| **Forced Password** | **Halaman `/ganti-password` di Phase 7** | Menangani D-11 (`must_change_password = true`). User hasil reset password admin otomatis dialihkan dan tidak terjebak 403 di shell utama. |
| **BFF Multipart** | **Raw Stream / `request.formData()` Forwarding** | Proxy Next.js meneruskan body binary murni beserta header `Content-Type` asli yang memuat boundary multipart tanpa membaca/mengubah string payload. |
| **Aksesibilitas (A11y)** | **WCAG 2.2 AA Strict** | Kontras minimum 3:1 untuk batas kontrol form (`rgba(28,28,28,0.55)`), ring fokus keyboard `:focus-visible` biru (`rgba(59,130,246,0.5)`), dan atribut ARIA lengkap pada tabel & dialog. |
| **Bahasa UI** | **Bahasa Indonesia Penuh** | Seluruh label status, aksi, pesan validasi, dan teks sistem ditampilkan dalam Bahasa Indonesia terpusat via `src/lib/labels.ts`. Enum API tetap uppercase/snake_case bahasa Inggris. |

---

## 4. Diagram Alur Navigasi & Proteksi Shell

```
[ Akses URL Browser ]
         │
         ▼
[ proxy.ts (Middleware Next.js 16) ]
   ├── Belum ada Cookie Token?
   │      ├── Ke Route Terproteksi `/(app)/*` ──► Redirect ke `/login`
   │      └── Ke Route Auth `/(auth)/*` ───────► Lolos
   │
   └── Sudah ada Cookie Token?
          ├── Ke `/login` ─────────────────────► Redirect ke `/` (Dashboard)
          └── Ke `/(app)/*` ───────────────────► Lolos ke Layout App
                                                       │
                                                       ▼
                                             [ AuthProvider / Layout ]
                                                       │
                                                       ├── must_change_password == true?
                                                       │      ├── URL bukan `/ganti-password` ──► Redirect paksa `/ganti-password`
                                                       │      └── URL adalah `/ganti-password` ─► Tampilkan Form Ganti Password
                                                       │
                                                       └── Normal User
                                                              │
                                                              ▼
                                                   [ Render App Shell ]
                                                    ├── Sidebar (Filter menu via `can()`)
                                                    ├── Topbar (User info + NotificationBell)
                                                    └── Content Area (Placeholder / Real Page)
```

---

## 5. Rencana Pembagian Berkas (Directory Blueprint)

Setelah Fase 7 selesai, struktur direktori `apps/web/src` akan terbentuk teratur sebagai berikut:

```text
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                    # Layout minimal auth (centered card, clean background)
│   │   ├── login/
│   │   │   └── page.tsx                  # Halaman Login (RHF + zod + shadcn/ui)
│   │   └── ganti-password/
│   │       └── page.tsx                  # Halaman Ganti Password Paksa (D-11)
│   ├── (app)/
│   │   ├── layout.tsx                    # App Shell (Sidebar + Topbar + AuthProvider + QueryProvider)
│   │   ├── page.tsx                      # Dashboard root (Placeholder bercabang per role)
│   │   ├── tickets/
│   │   │   └── page.tsx                  # Proving ground DataTable (List tiket minimal)
│   │   ├── notifications/
│   │   │   └── page.tsx                  # Halaman daftar notifikasi lengkap
│   │   ├── [placeholder-routes]/         # Placeholder pages untuk 12 route lain (assets, kb, admin/*)
│   │   ├── 403/page.tsx                  # Halaman Akses Ditolak kustom
│   │   └── not-found.tsx                 # Halaman 404 kustom
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   └── logout/route.ts
│   │   └── proxy/
│   │       └── [...path]/route.ts        # Catch-all BFF proxy (GET, POST, PUT, PATCH, DELETE, Stream)
│   ├── globals.css                       # Token tema warm-neutral, font bindings, shadcn rules
│   ├── layout.tsx                        # Root HTML & body font class loader (lang="id")
│   └── error.tsx                         # Global React Error Boundary
├── components/
│   ├── ui/                               # 16+ Komponen dasar shadcn/ui
│   │   ├── button.tsx, input.tsx, select.tsx, textarea.tsx, table.tsx, dialog.tsx
│   │   ├── dropdown-menu.tsx, badge.tsx, card.tsx, tabs.tsx, sonner.tsx, skeleton.tsx
│   │   ├── pagination.tsx, form.tsx, avatar.tsx, popover.tsx, calendar.tsx, separator.tsx
│   ├── shared/                           # Komponen domain bersama (Fase 7d)
│   │   ├── data-table/
│   │   │   ├── data-table.tsx
│   │   │   ├── data-table-pagination.tsx
│   │   │   └── data-table-column-header.tsx
│   │   ├── filter-bar.tsx
│   │   ├── search-input.tsx
│   │   ├── status-badge.tsx
│   │   ├── priority-badge.tsx
│   │   ├── sla-indicator.tsx
│   │   ├── relative-time.tsx
│   │   ├── file-upload.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── empty-state.tsx
│   │   └── page-header.tsx
│   └── shell/                            # Komponen kerangka aplikasi (Fase 7c)
│       ├── app-sidebar.tsx
│       ├── app-topbar.tsx
│       ├── nav-user.tsx
│       ├── notification-bell.tsx
│       └── mobile-nav.tsx
├── hooks/
│   ├── use-auth.ts                       # Custom hook membaca auth context & permissions
│   ├── use-debounce.ts                   # Debounce hook untuk pencarian input
│   └── use-notifications-poll.ts         # Hook TanStack Query polling unread count 30s
├── lib/
│   ├── client/
│   │   ├── api.ts                        # Client-side apiFetch wrapper (envelope, 422 error mapper)
│   │   └── query-client.ts               # Konfigurasi TanStack Query client & defaults
│   ├── server/
│   │   ├── api.ts                        # Server-side laravelFetch (SSR / Route Handler)
│   │   └── session.ts                    # Helper cookie token httpOnly
│   ├── labels.ts                         # Mapping kamus bahasa Indonesia untuk seluruh enum
│   ├── permissions.ts                    # Helper pengecekan ability & role navigation
│   ├── query-keys.ts                     # Query key factory terpusat per domain
│   └── utils.ts                          # cn() Tailwind merge helper
├── types/
│   ├── api.ts                            # Amplop ApiResponse, ApiError, PaginationMeta
│   ├── auth.ts                           # User, Role, Profile, Ability types
│   ├── tickets.ts                        # Ticket, Comment, History, Category, Priority, Status
│   ├── assets.ts                         # Asset, AssetHistory, AssetStatus
│   ├── articles.ts                       # Article, KnowledgeCategory
│   └── notifications.ts                  # Notification, NotificationType, UnreadCount
└── test/
    ├── setup.ts                          # Vitest global setup (jsdom environment)
    └── test-utils.tsx                    # Custom render helper dengan QueryClient & Theme Provider
```

---

## 6. Exit Criteria & Checklist Fase 7

- [x] **Dependencies & Theme (7a):** shadcn/ui terpasang, Plus Jakarta Sans aktif, `@theme` warm-neutral di `globals.css` tanpa dark-mode leak, Vitest siap.
- [x] **API Client & Types (7b):** Endpoint `/me` backend mengembalikan 66 ability + `must_change_password`, BFF proxy mendukung seluruh HTTP method (termasuk PATCH & multipart), `apiFetch` me-map error 422 ke format form, tipe TypeScript entitas lengkap.
- [x] **App Shell & Auth (7c):** Route groups `(auth)` dan `(app)` aktif, Sidebar dinamis menyaring menu berdasarkan `can()`, Topbar menampilkan info pengguna, Halaman `/ganti-password` menangani reset password secara aman, seluruh 15 rute memiliki halaman placeholder.
- [ ] **Shared Components (7d):** Pustaka komponen bersama (DataTable, FilterBar, StatusBadge, SlaIndicator, FileUpload, RelativeTime, ConfirmDialog) tuntas dan teruji di Vitest. Halaman `/tickets` membuktikan integrasi DataTable nyata (pagination, sorting, filter, SLA indicator).
- [ ] **Notification & A11y (7e):** NotificationBell melakukan polling 30 detik pada kondisi window fokus, dropdown notifikasi dapat menandai baca, halaman `/notifications` paginated berfungsi penuh, kontras warna dan keyboard focus lolos WCAG 2.2 AA.
- [ ] **Kualitas Kode:** `npm run typecheck` (`tsc --noEmit`) 0 error, `npm run lint` bersih, `npm run test` (Vitest) 100% lulus, `npm run build` sukses membuat artefak produksi Next.js.
- [ ] **Dokumentasi & Versi:** `docs/product/ROADMAP.md` Fase 7 tercentang, git tag `v0.7.0` diterbitkan.
