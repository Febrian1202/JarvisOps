# Sub-tahap 9e — E2E, A11y, & Finalisasi

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap terakhir sebelum tag `v0.9.0`. Fokus: bukti otomatis bahwa golden path analytics berfungsi, guard role benar, a11y dashboard layak, dan dokumen disinkronkan. Tidak ada fitur baru.

**Goal:** (1) Playwright membuktikan tiap role mendarat di dashboard yang benar + angka UI = respons API, (2) guard otorisasi lintas dashboard, (3) audit aksesibilitas dashboard (kontras, keyboard, label, chart ringkasan), (4) dokumen disinkronkan (API-CONTRACT §10, ROADMAP, README, AGENTS.md), (5) tag `v0.9.0`.

**Branch:** `feat/phase-9e-e2e-finalization`
**Estimasi:** ~0,5 hari
**Prasyarat:** 9a–9d selesai dan di-merge

---

## Task 1: Playwright — router role & angka dashboard

**Files:**
- Create: `apps/web/e2e/dashboard.spec.ts`

**Skenario:**
1. Login `employee@…` → `page.goto('/')` → `expect(page).toHaveURL(/\/dashboard\/employee$/)`.
2. Login `technician@…` → `/` → `/dashboard/technician`.
3. Login `manager@…` → `/` → `/dashboard/manager`.
4. Login `admin@…` → `/` → `/dashboard/admin`.
5. **Angka UI = API (ROADMAP:828):** untuk manager — buka `/dashboard/manager`, ambil teks kartu "Total Ticket" dari UI, lalu bandingkan dengan nilai yang didapat dari panggilan internal API (mis. evaluasi fetch melalui BFF dari `page.request` memakai cookie sesi, atau bandingkan terhadap angka statis seed yang diketahui). Pilih paling stabil: assert teks kartu memuat angka seed yang deterministik (`DemoDataSeeder`), atau intercept `api/proxy/dashboard/manager` dengan `page.route` dan bandingkan teks.

> **Jebakan — determinisme:** bergantung pada `DemoDataSeeder` (jalankan `make fresh` sebelum test — pola 8g). Bila angka seed berubah, sesuaikan assertion.
>
> **Jebakan — cookie:** `page.request` (APIRequestContext) **tidak** berbagi cookie browser secara default di Playwright. Pakai `page.request` dengan konteks yang sama (Playwright mengirim cookie dari konteks halaman) atau lakukan assert terhadap teks UI saja + satu intercept.

### Step 1 — Implementasi spec (pola `test.describe.serial`, seperti 8g).
### Step 2 — Verifikasi:
```bash
make fresh && cd apps/web && npm run test:e2e
```
### Step 3 — Commit:
```bash
git add apps/web/e2e/dashboard.spec.ts
git commit -m "test(e2e): add role-based dashboard routing and metric assertions"
```

---

## Task 2: Playwright — guard otorisasi lintas dashboard

**Files:**
- Modify: `apps/web/e2e/dashboard.spec.ts` (atau file terpisah `e2e/dashboard-guard.spec.ts`)

**Skenario:**
1. Login `employee@…` → buka `/dashboard/manager` → halaman 403 (layout admin guard / `errorMessages[403]`) — bukan chart kosong.
2. Login `technician@…` → buka `/dashboard/admin` → 403.
3. Login `manager@…` → buka `/dashboard/admin` → 403.
4. Login `admin@…` → buka `/dashboard/employee` → 200 (semua role punya ability employee; D-16 — admin boleh baca semua dashboard).
5. Login `employee@…` → buka `/` → tidak redirect ke `/dashboard/manager`.

> **Jebakan — backend 403 untuk ability yang tidak dimiliki:** pastikan guard UI menangkap 403 (bukan error mentah). Bila belum ada halaman/komponen 403 per-dashboard, tampilkan `EmptyState`/"Anda tidak memiliki izin" (K12).

### Step 1 — Implementasi spec.
### Step 2 — Verifikasi: `npm run test:e2e`.
### Step 3 — Commit.

---

## Task 3: Aksesibilitas dashboard (WCAG 2.2 AA)

**Files:**
- Setiap komponen dashboard di 9b–9d (perbaikan bila gagal audit)

**Detail:** Audit permukaan dashboard yang cukup untuk lolos WCAG 2.2 AA (PRODUCT.md:214-220) & checklist Fase 8g:
- **Kontras non-teks ≥ 3:1:** bar chart (created/resolved), bar distribusi, SLA progress bar, badge SLA breached terhadap `bg-cream #f7f4ed`. Ukur warna yang dipakai vs token; jangan pakai muted-gray yang terlalu pucat untuk elemen informatif.
- **`:focus-visible` 2px** pada tombol sort kolom tabel, DateRangePicker, link CTA, baris tabel yang bisa diklik.
- **`aria-label`/`role="img"` + teks ringkasan** pada chart trend ("Tren tiket 30 hari: 120 dibuat, 95 selesai").
- **`scope="col"`** pada `<th>` tabel performa & audit log; `<caption className="sr-only">` ringkasan.
- **Bar distribusi:** pastikan proporsi bisa dipahami tanpa warna (persentase teks), kontras teks ≥ 4.5:1.
- **Keyboard:** navigasi lengkap DateRangePicker & dropdown tanpa mouse.

### Step 1 — Audit: render tiap dashboard di browser, jalankan checklist di atas + (opsional) axe-core bila ada.
### Step 2 — Perbaiki temuan; verifikasi build.
### Step 3 — Commit:
```bash
git commit -am "fix(web): dashboard accessibility (contrast, focus-visible, chart summaries, table semantics)"
```

---

## Task 4: State loading / empty / error — sweep dashboard

**Files:** komponen dashboard (9b–9d)

**Detail:** Verifikasi per dashboard:
- **Loading:** skeleton per kartu muncul saat data belum tiba (K3). Tidak ada satu spinner penutup seluruh halaman.
- **Empty:** tiap panel menampilkan `EmptyState` informatif saat data kosong (akun baru tanpa tiket — exit criteria ROADMAP:829).
- **Error:** 401 (sesi habis, D-25) → redirect login (proxy); 403 → pesan/403; 500 → `errorMessages[500]` toast/halaman.
- **Refetch on focus:** angka segar saat kembali ke tab (TanStack default `refetchOnWindowFocus`) tanpa `refetchIntervalInBackground` (tab tak aktif tidak memicu polling — pola 9b).

### Step 1 — Audit & perbaiki.
### Step 2 — Commit:
```bash
git commit -am "fix(web): add loading, empty, and error states across all Phase 9 dashboards"
```

---

## Task 5: Dokumentasi & sinkronisasi

**Files:**
- Modify: `docs/product/ROADMAP.md` (centang Fase 9 + status)
- Modify: `docs/api/API-CONTRACT.md` (perbarui §10 Dashboard: B1–B4)
- Modify: `README.md` (root — status fase)
- Modify: `AGENTS.md` (root — status fase & jumlah test)
- Verifikasi saja: `docs/product/PERMISSION-MATRIX.md` (tidak ada ability/route baru — cek, jangan ubah)

**Detail:**
- API-CONTRACT §10: tambahkan pada contoh & deskripsi —
  - Technician: `sla_compliance_percentage` (formula D-03, `null` bila 0 resolved).
  - Manager: `unassigned_tickets` (snapshot live, `technician_id IS NULL` + status non-closed).
  - Technician `recent_activity[]`: item kini memuat `ticket: { ticket_number, title }` (opsional, saat relasi ter-load).
  - Employee `recent_articles[]`: bentuk `ArticleListResource` (tanpa `content`, dengan `category`/`author`).
- ROADMAP: centang seluruh checklist Fase 9; catat penyesuaian cakupan (C1–C18 dirangkum merujuk `docs/tasks/phase-9/`).
- README/AGENTS: status → "Phase 9 (Dashboard UI) complete — next: Phase 10".
- PERMISSION-MATRIX: verifikasi ability dashboard (`dashboard.employee|technician|manager|admin`) & `analytics.technician-performance` tidak berubah.

### Step 1 — Update dokumen.
### Step 2 — Commit:
```bash
git add docs/product/ROADMAP.md docs/api/API-CONTRACT.md README.md AGENTS.md
git commit -m "docs: sync Phase 9 dashboard documentation (roadmap, api-contract, status)"
```

---

## Task 6: Tag `v0.9.0`

**Detail:**
```bash
git checkout main
git merge feat/phase-9e-e2e-finalization
git tag v0.9.0
git push origin main --tags
```

### Step 1 — Verifikasi penuh sebelum tag:
```bash
cd apps/api && vendor/bin/pest
cd apps/web && npm run test && npm run test:e2e && npm run typecheck && npm run lint && npm run build
```

### Step 2 — Tag & push.

---

## Exit Criteria 9e

- [x] Playwright: 4 role login → URL dashboard benar (`/dashboard/{role}`); admin akses employee OK; employee/technician/manager akses dashboard lebih tinggi → 403.
- [x] Angka di UI sama dengan respons API (assert salah satu metrik manager).
- [x] Audit a11y dashboard lolos: kontras, `:focus-visible`, `aria-label`, chart ringkasan, `scope="col"`.
- [x] Seluruh dashboard punya loading (skeleton per kartu), empty, error yang layak; refetch saat tab fokus.
- [x] `docs/api/API-CONTRACT.md` §10, `docs/product/ROADMAP.md`, `README.md`, `AGENTS.md` disinkronkan; `PERMISSION-MATRIX.md` terverifikasi.
- [x] `vendor/bin/pest`, `npm run test`, `npm run test:e2e`, `npm run typecheck`, `npm run lint`, `npm run build` hijau.
- [x] Tag `v0.9.0` dibuat di `main` (D-30).
