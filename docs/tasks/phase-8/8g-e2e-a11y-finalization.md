# Sub-tahap 8g — E2E, A11y, & Finalisasi

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap terakhir sebelum tag `v0.8.0`. Fokus: verifikasi bahwa golden path §38 berfungsi penuh dari browser, aksesibilitas dasar, dan sinkronisasi dokumentasi. Tidak ada fitur baru.

**Goal:** (1) Golden path §38 PRD otomatis via Playwright (3 akun, 1 skenario), (2) guard otorisasi diverifikasi Playwright, (3) setiap halaman punya state loading/empty/error yang baik, (4) aksesibilitas dasar (keyboard, kontras, label), (5) dokumen disinkronkan, (6) tag `v0.8.0`.

**Branch:** `feat/phase-8g-e2e-finalization`
**Estimasi:** ~1,0 hari
**Prasyarat:** 8b–8f selesai dan di-merge

---

## Task 1: Playwright golden path — employee → manager → technician → employee

**Files:**
- Create: `apps/web/e2e/golden-path.spec.ts`

**Skenario (PRD §38):**
1. Login `employee@jarvisops.test` → buka `/tickets/new` → isi form → submit → redirect ke `/tickets/[id]`.
2. Logout → login `manager@jarvisops.test` → buka `/tickets` → filter by status → klik ticket → assign ke `technician@jarvisops.test`.
3. Logout → login `technician@jarvisops.test` → buka `/tickets` → klik ticket → Start → komentar → Resolve.
4. Logout → login `employee@jarvisops.test` → buka `/tickets` → klik ticket → Close → verifikasi status CLOSED.

**Detail:** Satu spec `golden-path.spec.ts` dengan `test.describe.serial`. Setiap tahap login/logout memakai `page.goto('/login')` + isi form + `expect(page).toHaveURL(...)`. Tidak perlu `globalSetup` — cukup jalankan sequential.

**Jebakan — seed data:** Spec bergantung pada data seeder. Pastikan `make fresh` sudah dijalankan sebelum test. Data demo: `employee@…` memegang aset `AST-00002`, `technician@…` aktif.

### Step 1 — Implementasi spec.

### Step 2 — Verifikasi:
```bash
make fresh && cd apps/web && npm run test:e2e
```

### Step 3 — Commit:
```bash
git add apps/web/e2e/golden-path.spec.ts
git commit -m "test(e2e): add golden path spec across 3 accounts (employee, manager, technician)"
```

---

## Task 2: Playwright — guard otorisasi

**Files:**
- Create: `apps/web/e2e/auth-guard.spec.ts`

**Skenario:**
1. Login `employee@jarvisops.test` → buka `/admin/users` → redirect ke `/403` atau halaman error.
2. Login `employee@jarvisops.test` → buka `/assets` → redirect ke `/403`.
3. Login `employee@jarvisops.test` → verifikasi sidebar tidak punya link "Admin".
4. Login `manager@jarvisops.test` → buka `/admin/audit-logs` → lihat tabel (berhasil).
5. Login `manager@jarvisops.test` → buka `/admin/users` → redirect ke `/403`.

### Step 1 — Implementasi spec.

### Step 2 — Verifikasi:
```bash
cd apps/web && npm run test:e2e
```

### Step 3 — Commit:
```bash
git add apps/web/e2e/auth-guard.spec.ts
git commit -m "test(e2e): add auth guard spec for role-based routing"
```

---

## Task 3: State loading, empty, error — sweep

**Files:**
- Setiap halaman di 8b–8f

**Detail:** Audit setiap halaman:
- **Loading state:** Apakah skeleton/shimmer muncul saat data belum ter-load? (DataTable, detail card, timeline)
- **Empty state:** Apakah tampilan kosong (tidak ada data) informatif? (khusus daftar)
- **Error state:** Apakah error 403/404/500 ditangani dengan graceful? (halaman detail, form)
- **404 untuk resource tidak ditemukan:** `tickets/[id]` dengan id palsu → 404 page.
- **403 untuk akses ditolak:** `tickets/[id]` milik employee lain → 403 page (backend `AuthorizationException` → 403).

Tidak perlu membuat komponen state baru — gunakan `EmptyState`, `Skeleton`, dan `error.tsx` dari Fase 7.

### Step 1 — Audit & perbaiki.

### Step 2 — Commit:
```bash
git commit -m "fix(web): add loading/empty/error states across all Phase 8 pages"
```

---

## Task 4: Aksesibilitas dasar (WCAG 2.2 AA)

**Detail:** Audit permukaan yang cukup untuk lolos WCAG 2.2 AA pada level kontras dan keyboard:
- **Kontras non-teks:** Semua border, badge, status indicator, SLA bar punya kontras ≥ 3:1 terhadap latar belakang.
- **`:focus-visible`:** Setiap tombol, link, input, select memiliki `:focus-visible` outline (warna biru subtle, 2px).
- **`aria-label`:** Tombol ikon (search, filter, hapus, close dialog) punya `aria-label` deskriptif.
- **`scope="col"`:** Heading tabel yang memakai `<th>` memiliki `scope="col"`.
- **Form error:** Setiap error validation terasosiasi dengan input via `aria-describedby`.

### Step 1 — Audit & perbaiki.

### Step 2 — Commit:
```bash
git commit -m "fix(web): improve accessibility (contrast, focus-visible, aria-label, scope)"
```

---

## Task 5: Dokumentasi & sinkronisasi

**Files:**
- Modify: `docs/product/ROADMAP.md` (centang Fase 8)
- Modify: `docs/api/API-CONTRACT.md` (tambah 3 endpoint baru: A2, A3, A4)
- Modify: `docs/product/PERMISSION-MATRIX.md` (sudah di 8a, verifikasi)
- Modify: `README.md` (update status)

**Detail:**
- ROADMAP: centang semua task Fase 8. Update progress.
- API-CONTRACT: tambah § endpoint baru `GET /assets/categories`, `GET /users/assignable`, `GET /articles/{article}/edit`.
- PERMISSION-MATRIX: verifikasi ability `user.lookup` sudah tercatat.
- README: update status dari "Phase 5d (File Attachment) — next work" menjadi "Phase 8 (Frontend Features) — next work" (atau "Phase 8 complete" bila sudah di-merge).

### Step 1 — Update dokumen.

### Step 2 — Commit:
```bash
git add docs/product/ROADMAP.md docs/api/API-CONTRACT.md docs/product/PERMISSION-MATRIX.md README.md
git commit -m "docs: sync Phase 8 documentation (roadmap, api-contract, permissions, status)"
```

---

## Task 6: Tag `v0.8.0`

**Detail:**
```bash
git checkout main
git merge feat/phase-8g-e2e-finalization
git tag v0.8.0
git push origin main --tags
```

### Step 1 — Verifikasi:
```bash
cd apps/api && vendor/bin/pest
cd apps/web && npm run test && npm run test:e2e && npm run typecheck && npm run lint && npm run build
```

### Step 2 — Tag:
```bash
git tag v0.8.0
git push origin main --tags
```

---

## Exit Criteria 8g

- [ ] Playwright golden path hijau (employee → manager → technician → employee, 3 sesi login).
- [ ] Playwright guard otorisasi hijau (Employee ditolak /admin, Manager bisa audit-logs, Employee ditolak /assets).
- [ ] Setiap halaman punya loading/empty/error state yang layak.
- [ ] Tidak ada masalah kontras atau keyboard yang jelas.
- [ ] `ROADMAP.md`, `API-CONTRACT.md`, `PERMISSION-MATRIX.md`, `README.md` disinkronkan.
- [ ] `vendor/bin/pest`, `npm run test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`, `npm run build` semuanya hijau.
- [ ] Tag `v0.8.0` dibuat di `main`.