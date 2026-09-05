# Sub-tahap 10c — CI & Dokumentasi

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini (1) membuat GitHub Actions CI yang jalan di setiap push/PR ke `main`, dan (2) menyelesaikan seluruh dokumentasi yang menjadi syarat lulus (ROADMAP:894-902). Dokumentasi bisa dikerjakan paralel dengan CI.

**Goal:** CI hijau di `main` (ROADMAP:931) + dokumentasi lengkap: `README.md` produk, `docs/ops/DEPLOYMENT.md` (final), `docs/ops/TESTING.md`, sinkron `docs/schema.sql` dengan migration final, perbarui `API-CONTRACT.md`, catatan arsitektur presentasi.

**Branch:** `feat/phase-10c-ci-docs`
**Estimasi:** ~1,0 hari
**Prasyarat:** 10b selesai (CI memakai `compose.prod.yaml`/langkah build yang benar).

---

## Task 1: GitHub Actions — `.github/workflows/ci.yml`

**Files:**
- Create: `.github/workflows/ci.yml`

**Detail (K6):** Satu workflow `ci` yang jalan di `push` & `pull_request` ke `main`, dua job paralel:
- **backend**: PHP 8.3/8.4, `composer install` (cache), buat `.env` dari `.env.example` (`APP_KEY` generate), jalankan `vendor/bin/pint --test`, lalu `php artisan test` (Pest) — SQLite in-memory (sesuai `phpunit.xml`), tanpa butuh MySQL.
- **frontend**: Node 22, `npm ci` (cache), `npx tsc --noEmit`, `npm run lint`, `npm run build`.

> **Jebakan — backend butuh APP_KEY:** `php artisan test` di CI butuh `APP_KEY` di `.env`. Langkah: `cp .env.example .env && php artisan key:generate`.
>
> **Jebakan — cache dependency:** Pakai `actions/cache` untuk `~/.composer/cache` & `~/.npm` (atau `~/.cache/npm`) dengan key berbasis lockfile. Jangan cache `vendor/`/`node_modules/` antar-job (versi lockfile sudah kunci).
>
> **Jebakan — E2E tidak di CI default (K6):** Tidak menjalankan Playwright E2E di workflow utama (butuh service MySQL + build web + browser; mahal & rawan flaky). Cukup unit/component Vitest + typecheck + lint + build. E2E tetap lokal/10e. Bila buffer cukup, job terpisah `e2e` dengan `services: mysql` bisa ditambahkan — **opsional**, jangan menunda hijau-nya CI inti.

### Step 1 — Tulis workflow.
### Step 2 — Verifikasi lokal (simulasi perintah yang sama):
```bash
cd apps/api && composer install && cp .env.example .env && php artisan key:generate
vendor/bin/pint --test
php artisan test
cd ../web && npm ci && npx tsc --noEmit && npm run lint && npm run build
```
### Step 3 — Commit & push (bila origin tersedia) untuk melihat badge/jalur:
```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (pint, pest, typecheck, lint, build)"
git push origin <branch>
```
> Catatan: pada lingkungan tanpa akses push, cukup pastikan file workflow valid secara sintaks YAML dan perintah-perintahnya hijau lokal.

### Step 4 — Verifikasi hasil run di GitHub Actions tab.

---

## Task 2: `README.md` — gambaran produk & setup

**Files:**
- Modify: `README.md` (root)

**Detail (ROADMAP:896):** README produk harus memuat:
- Gambaran singkat produk (ITSM: tickets, SLA, aset, KB, notifikasi, audit, dashboard).
- Struktur monorepo (`apps/api`, `apps/web`, `docs/`) ringkas.
- Cara setup dev (`make up`, `make fresh`, akun demo).
- Kredensial demo (`admin@jarvisops.test` / `Password123!` — **untuk dev saja**; tautan ke `DEPLOYMENT.md` untuk produksi).
- Status fase (Fase 9 selesai — update dari "Phase 8 complete" bila perlu; lihat konvensi AGENTS.md).

> **Jebakan — jangan menulis password produksi:** README hanya memuat kredensial **dev/demo**. Produksi → `docs/ops/DEPLOYMENT.md` (ganti password).

### Step 1 — Update README.
### Step 2 — Commit:
```bash
git add README.md
git commit -m "docs: refresh README with product overview, structure, and dev setup"
```

---

## Task 3: `docs/ops/DEPLOYMENT.md` (final)

**Files:**
- Modify: `docs/ops/DEPLOYMENT.md` (draft 10b → final)

**Detail (ROADMAP:897):** Lengkapi draft 10b:
- Arsitektur deploy (diagram service compose prod).
- Prasyarat: Docker, env yang dibutuhkan (`APP_KEY`, `DB_*`, `FRONTEND_URL`, `API_BASE_URL`).
- Langkah deploy dari bersih + update (migrate, rebuild image, tag image `:v1.0.0`).
- **Setup scheduler** (kenapa terpisah; verifikasi `schedule:work`).
- **Backup DB** (`mysqldump`) & volume `storage/app` — jadwal & perintah.
- Keamanan: ganti password demo (Addendum §2.3), `APP_DEBUG=false`, CORS `FRONTEND_URL`, cookie secure.
- HTTPS: Caddy di dalam FrankenPHP / reverse proxy di depan VPS (ROADMAP:871).
- Known-risk & troubleshooting (dari 10a, 10b).

### Step 1 — Lengkapi dokumen.
### Step 2 — Commit:
```bash
git add docs/ops/DEPLOYMENT.md
git commit -m "docs(ops): finalize deployment guide (compose prod, scheduler, backup, security)"
```

---

## Task 4: `docs/ops/TESTING.md`

**Files:**
- Create: `docs/ops/TESTING.md`

**Detail (ROADMAP:898):**
- Cara menjalankan test: backend (`php artisan test`, `vendor/bin/pest --filter`), frontend (`npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`), E2E Playwright (`make fresh && cd apps/web && npm run test:e2e`), Pint.
- Lingkungan test: SQLite in-memory vs MySQL (jelaskan `phpunit.xml` vs `.env`).
- Cakupan yang diuji: daftar area (auth/RBAC, ticket workflow, SLA, notifikasi, audit, asset, KB, attachment, dashboard) → tautan ke file test.
- **Pemetaan test → business rule** (Lampiran A ROADMAP / test `GoldenPathTest`, `Schema/*Test`) supaya reviewer bisa menelusuri.
- Panduan menulis test baru (pola repo).

### Step 1 — Tulis dokumen.
### Step 2 — Commit:
```bash
git add docs/ops/TESTING.md
git commit -m "docs(ops): add testing guide with coverage map to business rules"
```

---

## Task 5: Sinkronkan `docs/schema.sql` dengan migration final

**Files:**
- Modify: `docs/schema.sql`

**Detail (ROADMAP:899; D-… / lampiran):** `docs/schema.sql` adalah **lampiran laporan/ERD** — harus mencerminkan skema final 24 migration. Cara sinkron:
1. Export skema final dari MySQL (atau gunakan migration sebagai source of truth — AGENTS.md: "migrations are the schema source of truth; docs/schema.sql is a report attachment, synced in Phase 10").
2. Bandingkan struktur `docs/schema.sql` (18+ tabel) dengan tabel final: kolom tambahan (`audit_logs.description`, kolom SLA di `tickets`, dsb.), index, foreign key, enum.
3. Update file agar sesuai. Perhatikan konvensi header ("ERD v1.2" → bump versi) dan target MySQL/DrawDB.

> **Jebakan — jangan generate otomatis tanpa review:** Export MySQL (`SHOW CREATE TABLE`) beda gaya dengan file DrawDB. Sinkronkan **secara manual berpedoman migration**, jaga komentar seksi & keterbacaan DrawDB. Verifikasi jumlah tabel = jumlah tabel migration final.

### Step 1 — Bandingkan & update `docs/schema.sql`.
### Step 2 — Verifikasi: `grep -c "CREATE TABLE" docs/schema.sql` = jumlah tabel final (dari migration).
### Step 3 — Commit:
```bash
git add docs/schema.sql
git commit -m "docs: sync schema.sql with final migrations (report attachment)"
```

---

## Task 6: Perbarui `API-CONTRACT.md` + verifikasi PERMISSION-MATRIX + ROADMAP centang Fase 9

**Files:**
- Modify: `docs/api/API-CONTRACT.md`
- Modify (verifikasi): `docs/product/PERMISSION-MATRIX.md`
- Modify: `docs/product/ROADMAP.md` (status Fase 9 bila belum)

**Detail (ROADMAP:900):** Pastikan `API-CONTRACT.md` mencerminkan endpoint final setelah semua amandemen fase (termasuk dashboard & amandemen Phase 9). PERMISSION-MATRIX diverifikasi (tidak ada ability baru di Fase 10 — hanya audit). ROADMAP: centang task Fase 9 & Fase 10 yang sudah selesai.

### Step 1 — Update dokumen.
### Step 2 — Commit:
```bash
git add docs/api/API-CONTRACT.md docs/product/ROADMAP.md
git commit -m "docs: sync API contract and roadmap status through phase 9"
```

---

## Task 7: Catatan arsitektur presentasi

**Files:**
- Create: `docs/ops/ARCHITECTURE-NOTES.md` (atau tempel ke `docs/architecture/`)

**Detail (ROADMAP:901):** Tulis catatan **mengapa** keputusan arsitektur (untuk jawaban reviewer §33 poin 3):
- **BFF proxy + httpOnly cookie**: kenapa token tidak pernah di JS browser; alur request.
- **Snapshot SLA saat create + scheduler 5 menit + hitung defensif di query**: kenapa tiga lapis.
- **Audit log eksplisit**: kenapa audit trail terpisah dari ticket history; `description` siap baca.
- **Attachment lewat controller** (bukan URL publik): kenapa private disk + policy per parent.
- **Envelope API konsisten + bahasa terpisah (D-24)**; **DB design** (relasi, index); **RBAC gate/policy (D-16)**.

### Step 1 — Tulis.
### Step 2 — Commit:
```bash
git add docs/ops/ARCHITECTURE-NOTES.md
git commit -m "docs: add architecture notes for capstone presentation"
```

---

## Exit Criteria 10c

- [x] `.github/workflows/ci.yml` hijau di push/PR ke `main` (Pint --test, Pest, tsc, lint, build; cache dependency).
- [x] `README.md` memuat gambaran produk, struktur, setup dev, kredensial demo, status fase.
- [x] `docs/ops/DEPLOYMENT.md` final (deploy, env, scheduler, backup, keamanan, HTTPS, troubleshooting).
- [x] `docs/ops/TESTING.md` ada (cara test + pemetaan test → business rule).
- [x] `docs/schema.sql` sinkron dengan migration final.
- [x] `API-CONTRACT.md` sinkron; `PERMISSION-MATRIX.md` terverifikasi; `ROADMAP.md` status terkini.
- [x] `docs/ops/ARCHITECTURE-NOTES.md` ada.
