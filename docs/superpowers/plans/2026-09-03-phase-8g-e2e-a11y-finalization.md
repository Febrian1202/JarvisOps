# Sub-tahap 8g — E2E, A11y, & Finalisasi (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Muat skill frontend wajib (AGENTS.md): `impeccable`, `next-best-practices`, `vercel-react-best-practices`, `shadcn`, `frontend-design`, `tailwindcss-development`, `test-driven-development`.

**Goal:** Menyelesaikan Task 1–6 di Sub-tahap 8g: (1) E2E Golden path otomatis via Playwright (PRD §38 lintas 3 akun), (2) E2E Guard otorisasi role-based, (3) Audit & polish state loading/empty/error lintas halaman, (4) Aksesibilitas dasar WCAG 2.2 AA (kontras, :focus-visible, aria-label, th scope="col", aria-describedby), (5) Sinkronisasi dokumen (ROADMAP, API-CONTRACT, PERMISSION-MATRIX, README), (6) Verifikasi penuh dan persiapan tagging `v0.8.0`.

**Architecture:** Playwright sequential specs di `apps/web/e2e/` memanfaatkan seed demo database. State audit & a11y memperbaiki komponen dan template halaman secara presisi tanpa merombak API contract. Dokumentasi disinkronkan sesuai realitas Phase 8.

**Tech Stack:** Next.js 16 App Router, React 19, Playwright Test, Vitest, Tailwind CSS v4, shadcn/ui.

**Spec:** `docs/tasks/phase-8/8g-e2e-a11y-finalization.md`, `docs/tasks/phase-8/README.md`, `docs/product/PRD.md` §38.

## Global Constraints

- Playwright tests harus berjalan sequential (`workers: 1`, `fullyParallel: false`) karena serial login dan mutasi tiket bergantung pada state data.
- UI text tetap bahasa Indonesia (D-24/K8).
- Akun demo: `employee@jarvisops.test`, `manager@jarvisops.test`, `technician@jarvisops.test`, password `Password123!`.
- Tidak ada penambahan fitur baru (fitur 8b-8f sudah selesai).
- Seluruh suite verifikasi (`pest`, `vitest`, `playwright`, `typecheck`, `lint`, `build`) harus 100% hijau.

---

### Task 1: Playwright Golden Path Spec (PRD §38)

**Files:**
- Create: `apps/web/e2e/golden-path.spec.ts`

**Interfaces:**
- Menjalankan 4 langkah berurutan:
  1. Login employee → buka `/tickets/new` → isi kategori, prioritas, judul, deskripsi → submit → tunggu URL `/tickets/\d+` → ambil Ticket ID / nomor tiket.
  2. Logout → login manager → buka `/tickets` → filter / klik tiket tersebut → buka dialog Assign → pilih `technician@jarvisops.test` → submit → status ASSIGNED.
  3. Logout → login technician → buka `/tickets` → klik tiket → klik tombol "Mulai Proses" (IN_PROGRESS) → tambah komentar diskusi → klik tombol "Selesaikan Tiket" (RESOLVED) + isi solusi.
  4. Logout → login employee → buka `/tickets` → klik tiket → klik tombol "Tutup Tiket" (CLOSED) → verifikasi badge status "Selesai Ditutup" / CLOSED.

- [ ] **Step 1: Tulis spec `golden-path.spec.ts`**
- [ ] **Step 2: Jalankan test e2e lokal untuk verifikasi skenario**
  Run: `npx playwright test e2e/golden-path.spec.ts`
- [ ] **Step 3: Pastikan semua langkah pass**
- [ ] **Step 4: Commit**
  ```bash
  git add apps/web/e2e/golden-path.spec.ts
  git commit -m "test(e2e): add golden path spec across 3 accounts (employee, manager, technician)"
  ```

---

### Task 2: Playwright Auth Guard Spec

**Files:**
- Create: `apps/web/e2e/auth-guard.spec.ts`

**Interfaces:**
- Skenario:
  1. Login `employee@jarvisops.test` → buka `/admin/users` → pastikan diarahkan ke `/403` atau menampilkan pesan akses ditolak (403).
  2. Login `employee@jarvisops.test` → buka `/assets` → pastikan diarahkan ke `/403`.
  3. Login `employee@jarvisops.test` → verifikasi sidebar tidak merender menu/link "Administrasi" atau link admin.
  4. Login `manager@jarvisops.test` → buka `/admin/audit-logs` → halaman audit log tampil normal (ada heading "Audit Log" dan tabel).
  5. Login `manager@jarvisops.test` → buka `/admin/users` → diarahkan ke `/403`.

- [ ] **Step 1: Tulis spec `auth-guard.spec.ts`**
- [ ] **Step 2: Jalankan test e2e lokal**
  Run: `npx playwright test e2e/auth-guard.spec.ts`
- [ ] **Step 3: Pastikan semua 5 assertion lolos**
- [ ] **Step 4: Commit**
  ```bash
  git add apps/web/e2e/auth-guard.spec.ts
  git commit -m "test(e2e): add auth guard spec for role-based routing"
  ```

---

### Task 3: State Loading, Empty, & Error Sweep

**Files:**
- Audit & perbaiki di:
  - `apps/web/src/app/(app)/tickets/page.tsx` & `page-client.tsx`
  - `apps/web/src/app/(app)/tickets/[id]/page.tsx` & `page-client.tsx`
  - `apps/web/src/app/(app)/assets/page.tsx` & `page-client.tsx`
  - `apps/web/src/app/(app)/assets/[id]/page.tsx` & `page-client.tsx`
  - `apps/web/src/app/(app)/knowledge/page.tsx` & `page-client.tsx`
  - `apps/web/src/app/(app)/knowledge/[slug]/page.tsx` & `page-client.tsx`
  - `apps/web/src/app/(app)/admin/users/page.tsx` & `page-client.tsx`
  - `apps/web/src/app/(app)/admin/audit-logs/page.tsx` & `page-client.tsx`

**Checklist Audit:**
- Pastikan loading skeleton / spinner ada dan konsisten saat query pending.
- Pastikan empty state tampil informatif saat filter menghasilkan 0 data.
- Pastikan penanganan 404 pada detail tiket (`/tickets/9999999`) dan detail aset/artikel me-render error/not-found yang ramah.
- Pastikan 403 authorization error ditangani dengan graceful.

- [ ] **Step 1: Periksa implementasi loading, empty, dan error state pada halaman-halaman utama**
- [ ] **Step 2: Jalankan unit & component test untuk memastikan tidak ada regresi**
  Run: `npm run test`
- [ ] **Step 3: Commit perbaikan state jika ada**
  ```bash
  git add apps/web/src/...
  git commit -m "fix(web): add loading/empty/error states across all Phase 8 pages"
  ```

---

### Task 4: Aksesibilitas Dasar (WCAG 2.2 AA)

**Files:**
- Audit & perbaiki di komponen shared dan layout:
  - `apps/web/src/components/shared/data-table.tsx`
  - `apps/web/src/components/shared/search-input.tsx`
  - `apps/web/src/components/shared/filter-bar.tsx`
  - `apps/web/src/components/shell/topbar.tsx`
  - `apps/web/src/components/shell/app-sidebar.tsx`
  - `apps/web/src/components/ui/button.tsx`, `input.tsx`

**Checklist:**
- Pastikan tombol ikon memiliki `aria-label` deskriptif (misal: tombol filter, tombol clear search, tombol pagination, tombol aksi).
- Pastikan heading tabel `<th>` memiliki `scope="col"`.
- Pastikan fokus keyboard (`focus-visible:ring-2`) jelas dan memiliki kontras yang cukup.
- Pastikan form error pesan terhubung dengan `aria-describedby` atau `aria-invalid`.

- [ ] **Step 1: Audit komponen terhadap kriteria a11y di atas**
- [ ] **Step 2: Tambahkan atribut a11y yang belum lengkap (`scope="col"`, `aria-label`)**
- [ ] **Step 3: Jalankan unit test dan typecheck**
  Run: `npm run test && npm run typecheck`
- [ ] **Step 4: Commit**
  ```bash
  git add apps/web/src/...
  git commit -m "fix(web): improve accessibility (contrast, focus-visible, aria-label, scope)"
  ```

---

### Task 5: Dokumentasi & Sinkronisasi

**Files:**
- Modify: `docs/product/ROADMAP.md` (centang Fase 8 selesai)
- Modify: `docs/api/API-CONTRACT.md` (dokumentasikan A2 `/api/assets/categories`, A3 `/api/users/assignable`, A4 `/api/articles/{id}/edit`)
- Modify: `docs/product/PERMISSION-MATRIX.md` (pastikan ability `user.lookup` terdokumentasi)
- Modify: `README.md` (perbarui status Phase 8 selesai)
- Modify: `AGENTS.md` (perbarui status Phase 8 complete, Phase 9 next)

- [ ] **Step 1: Update `ROADMAP.md`, `API-CONTRACT.md`, `PERMISSION-MATRIX.md`, `README.md`, `AGENTS.md`**
- [ ] **Step 2: Commit**
  ```bash
  git add docs/product/ROADMAP.md docs/api/API-CONTRACT.md docs/product/PERMISSION-MATRIX.md README.md AGENTS.md
  git commit -m "docs: sync Phase 8 documentation (roadmap, api-contract, permissions, status)"
  ```

---

### Task 6: Final Verification & Tagging `v0.8.0`

- [ ] **Step 1: Jalankan seluruh suite backend test**
  Run: `make fresh && make test-api`
- [ ] **Step 2: Jalankan seluruh suite frontend test**
  Run: `cd apps/web && npm run test && npm run test:e2e && npm run typecheck && npm run lint && npm run build`
- [ ] **Step 3: Verifikasi git status dan buat tag `v0.8.0`**
  ```bash
  git tag v0.8.0
  ```
