# Sub-tahap 11e — Mobile E2E Testing & Release Tag v1.1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuktikan seluruh alur kerja pengguna (Karyawan & Teknisi), card views, bottom sheet filter, navigasi drawer, dan sticky action bar berfungsi mulus di viewport smartphone (360px–430px) tanpa horizontal overflow melalui automated Playwright mobile test suite (`Pixel 7`, `iPhone 14`), menyinkronkan dokumentasi rilis, dan menyematkan release tag `v1.1.0`.

**Architecture:**
- **Playwright Chromium Device Emulation**: Mengonfigurasi projects `Pixel 7` (412×839, Android) dan `iPhone 14` (390×664, iOS) di `playwright.config.ts` dengan engine Chromium terinstal, memisahkan project desktop dan mobile agar eksekusi terfokus dan cepat.
- **Mobile Filter Sheet Integration on Tickets**: Mengintegrasikan `MobileFilterSheet` ke dalam `TicketFilters.tsx` sehingga pengguna mobile dapat membuka filter baris/kategori/prioritas via bottom sheet drawer (`sm:hidden`), sementara desktop tetap menampilkan filter grid (`hidden sm:grid`).
- **Comprehensive Mobile E2E Test Suite (`mobile-responsive.spec.ts`)**: Menguji 5 skenario inti:
  1. Mobile login & drawer navigation (`MobileNav`).
  2. Mobile `/tickets` card view & bottom sheet filter URL synchronization.
  3. Mobile `/tickets/[id]` sticky action bar & quick actions.
  4. Mobile `/tickets/new` ticket creation smoke test.
  5. Automated zero-horizontal-overflow check pada seluruh rute utama (`/`, `/tickets`, `/tickets/[id]`, `/assets`, `/knowledge`, `/profile`, `/admin/users`) pada lebar 390px.
- **Release Documentation & SemVer Tagging**: Menyinkronkan `docs/product/ROADMAP.md`, `README.md`, `AGENTS.md`, dan `docs/tasks/phase-11/` menandai penutupan Fase 11 dan rilis `v1.1.0`.

**Tech Stack:** Next.js 16.3, Playwright 1.62 (`@playwright/test`), Chromium device emulation, Tailwind CSS v4, Radix UI Dialog & Sheet.

**Spec:** `docs/tasks/phase-11/11e-mobile-e2e-audit-tag.md`

## Global Constraints
- Branch kerja: `feat/phase-11e-mobile-e2e-tag`, di-merge ke `main` via PR/merge commit sebelum membuat tag.
- Zero horizontal overflow: pada viewport 360px–430px tidak boleh ada horizontal scrollbar pada `document.body` atau `document.documentElement` (`scrollWidth <= clientWidth + 1`).
- Playwright mobile emulation menggunakan engine Chromium (karena WebKit tidak diinstal secara lokal, `devices['iPhone 14']` dikonfigurasi dengan `defaultBrowserType: 'chromium'`).
- Seluruh gate pengujian (Playwright mobile, Vitest unit tests, `npm run lint`, `npm run typecheck`, `npm run build`) wajib hijau 100% sebelum rilis dan tag.
- Release tag: SemVer `v1.1.0` (annotated tag). Jangan push tag ke remote sampai ada instruksi eksplisit.

---

### Task 1: Integrasi `MobileFilterSheet` pada `TicketFilters` & Unit Test

**Files:**
- Modify: `apps/web/src/components/tickets/TicketFilters.tsx`
- Modify: `apps/web/src/test/ticket-filters.test.tsx`

**Interfaces:**
- Consumes: `MobileFilterSheet` from `@/components/shared/mobile-filter-sheet`, `FilterField`, `useReferenceData`, `useAuth`
- Produces: `TicketFilters` dengan trigger `MobileFilterSheet` di layar kecil (`sm:hidden`) dan grid filter di tablet/desktop (`hidden sm:grid`).

- [ ] **Step 1: Tambahkan unit test untuk `MobileFilterSheet` pada `TicketFilters`**
- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan (RED)**
- [ ] **Step 3: Implementasikan `MobileFilterSheet` pada `TicketFilters.tsx`**
- [ ] **Step 4: Jalankan unit test untuk memastikan lulus (GREEN)**
- [ ] **Step 5: Commit perubahan Task 1**

---

### Task 2: Konfigurasi Playwright Mobile Projects (`playwright.config.ts`)

**Files:**
- Modify: `apps/web/playwright.config.ts`

**Interfaces:**
- Consumes: `devices` from `@playwright/test`
- Produces: Playwright projects `desktop-chromium`, `Pixel 7`, dan `iPhone 14` yang dapat dipanggil dengan flag `--project="Pixel 7"` atau `--project="iPhone 14"`.

- [ ] **Step 1: Perbarui `apps/web/playwright.config.ts`**
- [ ] **Step 2: Verifikasi konfigurasi dengan Playwright CLI dry-run**
- [ ] **Step 3: Commit perubahan Task 2**

---

### Task 3: Implementasi E2E Mobile Suite (`mobile-responsive.spec.ts`)

**Files:**
- Create: `apps/web/e2e/mobile-responsive.spec.ts`

**Interfaces:**
- Consumes: Playwright `test`, `expect`, `Page`, demo user accounts (`employee@jarvisops.test`, `technician@jarvisops.test`).
- Produces: 5 serial E2E tests:
  1. `Test 1: Mobile layout & navigation (sidebar hidden, hamburger opens MobileNav)`
  2. `Test 2: Mobile /tickets renders card view, filter bottom sheet updates URL`
  3. `Test 3: Mobile /tickets/[id] renders sticky action bar and triggers actions`
  4. `Test 4: Mobile /tickets/new smoke test (fill and submit ticket without overflow)`
  5. `Test 5: Zero horizontal overflow on mobile viewport (390px) across main routes`

- [ ] **Step 1: Tulis `apps/web/e2e/mobile-responsive.spec.ts`**
- [ ] **Step 2: Jalankan E2E mobile suite pada project Pixel 7**
- [ ] **Step 3: Jalankan E2E mobile suite pada project iPhone 14**
- [ ] **Step 4: Jalankan seluruh test unit, linter, dan typecheck**
- [ ] **Step 5: Commit perubahan Task 3**

---

### Task 4: Sinkronisasi Status Rilis Dokumentasi Monorepo (v1.1.0)

**Files:**
- Modify: `docs/tasks/phase-11/11e-mobile-e2e-audit-tag.md`
- Modify: `docs/tasks/phase-11/README.md`
- Modify: `docs/product/ROADMAP.md`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Centang seluruh task di `docs/tasks/phase-11/11e-mobile-e2e-audit-tag.md`**
- [ ] **Step 2: Perbarui `docs/tasks/phase-11/README.md`**
- [ ] **Step 3: Perbarui `docs/product/ROADMAP.md`**
- [ ] **Step 4: Perbarui `README.md` dan `AGENTS.md`**
- [ ] **Step 5: Commit perubahan dokumentasi Task 4**

---

### Task 5: Final Verification, Merge ke `main`, dan Pembuatan Git Tag `v1.1.0`

- [ ] **Step 1: Jalankan full verification command suite**
- [ ] **Step 2: Merge branch `feat/phase-11e-mobile-e2e-tag` ke `main`**
- [ ] **Step 3: Buat annotated Git tag `v1.1.0`**
- [ ] **Step 4: Verifikasi tag**
