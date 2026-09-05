# Sub-tahap 9e — E2E, A11y, & Finalisasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuktikan secara otomatis via Playwright bahwa router role mengarahkan ke dashboard yang tepat, angka metrik UI identik dengan respons API, otorisasi lintas dashboard terjaga (403), audit a11y WCAG 2.2 AA terpenuhi, dokumentasi disinkronkan, dan aplikasi siap diberi tag `v0.9.0`.

**Architecture:** Playwright serial E2E testing di `apps/web/e2e/dashboard.spec.ts` dan `dashboard-guard.spec.ts` menggunakan sesi cookie browser dan route intercept. Client guard hardening pada `TechnicianDashboardPageClient` dan `EmployeeDashboardPageClient`. Sinkronisasi dokumen desain (`ROADMAP.md`, `API-CONTRACT.md`, `README.md`, `AGENTS.md`).

**Tech Stack:** Next.js 16.3 App Router, React 19, Playwright Test, Vitest, Tailwind CSS v4, Laravel 13, FrankenPHP.

**Spec:** `docs/tasks/phase-9/9e-e2e-finalization.md`

## Global Constraints

- Branch pengerjaan: `feat/phase-9e-e2e-finalization` (bercabang dari `main`).
- Playwright tests berjalan sequential (`workers: 1`, `fullyParallel: false`).
- Akun demo: `employee@jarvisops.test`, `technician@jarvisops.test`, `manager@jarvisops.test`, `admin@jarvisops.test` (password: `Password123!`).
- Tidak ada penambahan fitur/tampilan baru; fokus pada verifikasi otomatis, a11y polish, dan sinkronisasi dokumen.
- Bahasa UI & pesan audit/validasi tetap Bahasa Indonesia (D-24/K8).
- Seluruh verifikasi suite (`pest`, `vitest`, `playwright`, `typecheck`, `lint`, `build`) harus 100% hijau sebelum tag `v0.9.0`.

---

### Task 1: Playwright — Router Role & Asersi Metrik UI = API

**Files:**
- Create: `apps/web/e2e/dashboard.spec.ts`

**Interfaces:**
- Menguji 4 role login dan navigasi ke `/`:
  1. `employee@jarvisops.test` -> `/` -> `/dashboard/employee`
  2. `technician@jarvisops.test` -> `/` -> `/dashboard/technician`
  3. `manager@jarvisops.test` -> `/` -> `/dashboard/manager`
  4. `admin@jarvisops.test` -> `/` -> `/dashboard/admin`
- Asersi UI = API (ROADMAP:828):
  - Intercept request `/api/proxy/dashboard/manager` dengan `page.waitForResponse` saat membuka `/dashboard/manager`.
  - Ekstrak nilai `total_tickets` dari payload JSON API.
  - Cari kartu "Total Ticket" di UI manager dan asersikan teks angka kartu identik dengan `total_tickets` dari API.

- [ ] **Step 1: Tulis spec Playwright `apps/web/e2e/dashboard.spec.ts`**
- [ ] **Step 2: Jalankan test Playwright untuk verifikasi**
  Run: `cd apps/web && npx playwright test e2e/dashboard.spec.ts`
- [ ] **Step 3: Commit**
  ```bash
  git add apps/web/e2e/dashboard.spec.ts
  git commit -m "test(e2e): add role-based dashboard routing and metric assertions"
  ```

---

### Task 2: Playwright — Guard Otorisasi Lintas Dashboard & Client Guard Hardening

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/technician/page-client.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/employee/page-client.tsx`
- Create: `apps/web/e2e/dashboard-guard.spec.ts`

**Interfaces:**
- Skenario otorisasi lintas dashboard:
  1. `employee` buka `/dashboard/manager` -> 403 (redirect `/403`).
  2. `technician` buka `/dashboard/admin` -> 403 (redirect `/403`).
  3. `manager` buka `/dashboard/admin` -> 403 (redirect `/403`).
  4. `admin` buka `/dashboard/employee` -> 200 (admin memiliki kemampuan employee; D-16).
  5. `employee` buka `/dashboard/technician` -> 403 (redirect `/403`).

- [ ] **Step 1: Perbarui client guard di `TechnicianDashboardPageClient` dan `EmployeeDashboardPageClient`**
- [ ] **Step 2: Tulis spec Playwright `apps/web/e2e/dashboard-guard.spec.ts`**
- [ ] **Step 3: Jalankan test E2E guard**
  Run: `cd apps/web && npx playwright test e2e/dashboard-guard.spec.ts`
- [ ] **Step 4: Jalankan Vitest unit/component tests**
  Run: `cd apps/web && npm run test`
- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/src/app/\(app\)/dashboard/technician/page-client.tsx \
          apps/web/src/app/\(app\)/dashboard/employee/page-client.tsx \
          apps/web/e2e/dashboard-guard.spec.ts
  git commit -m "test(e2e): add cross-role dashboard authorization guard and client protections"
  ```

---

### Task 3: Aksesibilitas Dashboard (WCAG 2.2 AA) Audit & Polish

**Files:**
- Modify: `apps/web/src/components/shared/data-table/data-table-column-header.tsx`
- Modify: `apps/web/src/components/dashboard/date-range-picker.tsx`
- Check & Polish: `apps/web/src/components/dashboard/manager/ticket-trend-chart.tsx`
- Check & Polish: `apps/web/src/components/dashboard/manager/priority-distribution.tsx` dan `category-distribution.tsx`

**Detail Checklist A11y:**
1. Focus ring: Tombol sort header tabel di `DataTableColumnHeader` harus memiliki `focus-visible:ring-2 focus-visible:ring-ring rounded-sm`.
2. DateRangePicker: Trigger dan preset button memiliki keyboard outline yang jelas.
3. Chart text summary: `TicketTrendChartPanel` memiliki `<figure role="img" aria-label="Grafik tren tiket">` dan `<figcaption className="sr-only">Total X ticket dibuat, Y selesai.</figcaption>`.
4. Semantik Tabel: Seluruh tabel di dashboard memiliki `scope="col"` pada elemen `<th>` dan `<caption className="sr-only">`.
5. Kontras Non-Teks: Seluruh warna chart, status badge, dan bar progress SLA memenuhi rasio kontras non-teks minimal 3:1 terhadap background warm cream `#f7f4ed`.

- [ ] **Step 1: Sempurnakan styling focus-visible di `data-table-column-header.tsx`**
- [ ] **Step 2: Jalankan test dan typecheck**
  Run: `cd apps/web && npm run typecheck && npm run test`
- [ ] **Step 3: Commit perbaikan a11y**
  ```bash
  git add apps/web/src/components/shared/data-table/data-table-column-header.tsx \
          apps/web/src/components/dashboard/
  git commit -m "fix(web): enhance dashboard accessibility (focus-visible rings and semantic compliance)"
  ```

---

### Task 4: State Loading, Empty, & Error Sweep

**Files:**
- Audit komponen dashboard di:
  - `apps/web/src/app/(app)/dashboard/employee/page.tsx` & `page-client.tsx`
  - `apps/web/src/app/(app)/dashboard/technician/page.tsx` & `page-client.tsx`
  - `apps/web/src/app/(app)/dashboard/manager/page.tsx` & `page-client.tsx`
  - `apps/web/src/app/(app)/dashboard/admin/page.tsx` & `page-client.tsx`
- Audit hook `apps/web/src/hooks/use-dashboards.ts`

- [ ] **Step 1: Audit seluruh kartu dan panel dashboard untuk memastikan handling loading, empty, dan error sudah tertutup**
- [ ] **Step 2: Jalankan lint & test untuk memverifikasi kebersihan kode**
  Run: `cd apps/web && npm run lint && npm run test`
- [ ] **Step 3: Commit (jika ada penyesuaian state)**
  ```bash
  git commit -am "fix(web): verify loading, empty, and error states across Phase 9 dashboards"
  ```

---

### Task 5: Dokumentasi & Sinkronisasi

**Files:**
- Modify: `docs/product/ROADMAP.md`
- Modify: `docs/api/API-CONTRACT.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Verifikasi: `docs/product/PERMISSION-MATRIX.md`

- [ ] **Step 1: Perbarui `docs/api/API-CONTRACT.md` §10**
- [ ] **Step 2: Perbarui `docs/product/ROADMAP.md`**
- [ ] **Step 3: Perbarui `README.md` dan `AGENTS.md`**
- [ ] **Step 4: Commit dokumentasi**
  ```bash
  git add docs/api/API-CONTRACT.md docs/product/ROADMAP.md README.md AGENTS.md
  git commit -m "docs: sync Phase 9 dashboard documentation (api-contract, roadmap, status)"
  ```

---

### Task 6: Verifikasi Penuh & Persiapan Tag `v0.9.0`

- [ ] **Step 1: Jalankan backend test suite (`vendor/bin/pest`)**
- [ ] **Step 2: Jalankan frontend unit & component test suite (`npm run test`)**
- [ ] **Step 3: Jalankan E2E Playwright test suite (`npm run test:e2e`)**
- [ ] **Step 4: Jalankan TypeScript typecheck (`npm run typecheck`)**
- [ ] **Step 5: Jalankan Linter (`npm run lint`)**
- [ ] **Step 6: Jalankan Production Build (`npm run build`)**
- [ ] **Step 7: Merge ke `main` dan buat tag `v0.9.0`**
