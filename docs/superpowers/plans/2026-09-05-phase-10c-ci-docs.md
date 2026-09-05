# Sub-tahap 10c: CI & Dokumentasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun pipeline CI otomatis di GitHub Actions yang hijau di `main` (linting, testing, typecheck, build) serta melengkapi seluruh dokumentasi akhir capstone project: `README.md` produk, `docs/ops/DEPLOYMENT.md` (final), `docs/ops/TESTING.md`, sinkronisasi skema `docs/schema.sql`, pembaruan `API-CONTRACT.md` & status `ROADMAP.md`, dan penyusunan `docs/ops/ARCHITECTURE-NOTES.md` untuk persiapan evaluasi reviewer.

**Architecture:** 
- CI Pipeline: `.github/workflows/ci.yml` dengan dua job paralel (`backend` dan `frontend`) berbasis cache lockfile (`composer.lock` & `package-lock.json`), SQLite in-memory untuk backend test (tanpa dependensi MySQL eksternal).
- Dokumentasi Operasional: Dokumentasi deploy dan testing standar enterprise di `docs/ops/`, menyertakan pemetaan business rules (BR-001 s.d. BR-020) ke unit/feature test.
- Sinkronisasi Skema: `docs/schema.sql` disinkronkan 100% terhadap 24 file migrasi Laravel (penambahan kolom `must_change_password`, `level`, `description`, serta index performa).
- Catatan Arsitektur Capstone: `docs/ops/ARCHITECTURE-NOTES.md` mendokumentasikan rasionalisasi teknis 7 keputusan arsitektural utama untuk menjawab pertanyaan reviewer (§33 PRD).

**Tech Stack:** GitHub Actions, Pest 5 / PHPUnit 13.3, Pint, Next.js 16 (Turbopack), TypeScript 5, MySQL 8 DDL, Markdown.

**Spec:** `docs/tasks/phase-10/10c-ci-dokumentasi.md`

## Global Constraints
- Branch kerja: `feat/phase-10c-ci-docs` (bercabang dari `main`).
- Bahasa dokumentasi dan catatan user-facing adalah **Bahasa Indonesia** (D-24).
- CI backend wajib menyertakan generate `APP_KEY` dan menggunakan SQLite in-memory bawaan `phpunit.xml`.
- CI default **tidak menjalankan Playwright E2E** (K6) untuk menjaga runtime cepat, hemat resource, dan mencegah flakiness di runner publik.
- Kredensial akun di `README.md` **hanya untuk dev/demo lokal**, jangan mencantumkan password produksi.
- `docs/schema.sql` adalah lampiran laporan arsitektur, bukan file migration executable — jaga kerapian format DrawDB dan komentar per tabel.

---

### Task 1: GitHub Actions CI Pipeline (`.github/workflows/ci.yml`)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Trigger: `push` ke branch `main`, `pull_request` ke branch `main`.
- Jobs:
  1. `backend`:
     - PHP 8.4 via `shivammathur/setup-php` dengan extensions: `mbstring, xml, ctype, iconv, intl, pdo_sqlite, bcmath`.
     - Cache composer: `~/.composer/cache` berdasar `apps/api/composer.lock`.
     - Langkah: `composer install --prefer-dist --no-interaction`, `cp .env.example .env`, `php artisan key:generate`, `vendor/bin/pint --test`, `php artisan test`.
  2. `frontend`:
     - Node.js 22 LTS via `actions/setup-node`.
     - Cache npm: `~/.npm` berdasar `apps/web/package-lock.json`.
     - Langkah: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build`.

- [ ] **Step 1: Buat direktori `.github/workflows/` dan file `ci.yml`**
- [ ] **Step 2: Konfigurasikan job `backend` lengkap dengan cache, `.env`, Pint check, dan Pest test**
- [ ] **Step 3: Konfigurasikan job `frontend` lengkap dengan cache, typecheck, lint, vitest, dan Next.js build**
- [ ] **Step 4: Uji simulasi eksekusi perintah CI secara lokal**
- [ ] **Step 5: Commit perubahan Task 1**

---

### Task 2: Perbarui `README.md` Utama

**Files:**
- Modify: `README.md`

**Detail:**
- Update status fase ke Fase 10 (Fase 9 selesai, Tag `v0.9.0`, Fase 10 in progress).
- Pastikan memuat gambaran produk (ITSM: tiket, SLA snapshot + defensif, aset, KB, notifikasi polling 30s, audit log, visual analytics 4 role).
- Ringkasan struktur monorepo (`apps/api`, `apps/web`, `docs/`, `docker/`).
- Panduan setup development (`make up`, `make fresh`, `make seed`).
- Kredensial akun demo dev (`admin@jarvisops.test`, `manager@jarvisops.test`, `technician@jarvisops.test`, `employee@jarvisops.test` / password: `Password123!`).
- Peringatan keamanan tegas: kredensial di README hanya untuk dev/demo; deployment produksi wajib merujuk ke `docs/ops/DEPLOYMENT.md`.

- [ ] **Step 1: Edit `README.md` memperbarui badge/status fase dan menyelaraskan panduan instalasi**
- [ ] **Step 2: Verifikasi keterbacaan markdown dan validitas tautan internal**
- [ ] **Step 3: Commit perubahan Task 2**

---

### Task 3: Finalisasi Panduan Deployment (`docs/ops/DEPLOYMENT.md`)

**Files:**
- Modify: `docs/ops/DEPLOYMENT.md`

**Detail:**
- Lengkapi draft yang dibuat pada 10b menjadi versi final:
  - Diagram arsitektur compose produksi (Browser -> Next.js Standalone -> FrankenPHP Classic API & Scheduler -> MySQL 8.4).
  - Variabel environment wajib (`APP_KEY`, `DB_*`, `FRONTEND_URL`, `API_BASE_URL`).
  - Prosedur deployment clean start dan update rolling (`docker compose -f compose.prod.yaml up --build -d`).
  - Penjelasan mendalam kenapa `scheduler` wajib berjalan terpisah.
  - Prosedur backup berkala: MySQL database (`mysqldump`) dan lampiran file di shared volume `app-storage`.
  - Prosedur hardening keamanan produksi: penggantian kata sandi default demo, `APP_DEBUG=false`, CORS restriction, flag cookie `secure` & `httpOnly`.
  - Konfigurasi HTTPS via Caddy bawaan FrankenPHP atau reverse proxy eksternal.
  - Troubleshooting & Known Risks.

- [ ] **Step 1: Periksa dan lengkapi seksi scheduler, backup, HTTPS, dan checklist hardening di `docs/ops/DEPLOYMENT.md`**
- [ ] **Step 2: Commit perubahan Task 3**

---

### Task 4: Panduan Testing & Pemetaan Business Rules (`docs/ops/TESTING.md`)

**Files:**
- Create: `docs/ops/TESTING.md`

**Detail:**
- Panduan menjalankan suite pengujian backend, frontend, E2E, dan Pint.
- Penjelasan lingkungan uji SQLite in-memory vs MySQL produksi.
- Tabel Pemetaan Business Rules (BR-001 s.d. BR-020) dan aturan NFR/D ke file test konkret.
- Panduan konvensi penulisan test baru di repositori.

- [ ] **Step 1: Tulis panduan lengkap di `docs/ops/TESTING.md` beserta tabel matriks kepatuhan BR-001 s.d. BR-020**
- [ ] **Step 2: Verifikasi seluruh path file test yang dirujuk benar-benar ada di repositori**
- [ ] **Step 3: Commit perubahan Task 4**

---

### Task 5: Sinkronisasi `docs/schema.sql` dengan Migrasi Final

**Files:**
- Modify: `docs/schema.sql`

**Detail:**
- Sinkronkan file DDL lampiran `docs/schema.sql` dengan 24 migrasi di `apps/api/database/migrations/`:
  1. Bump header metadata menjadi `ERD v1.3 (Final Report Attachment)`.
  2. Tabel `users`: Tambahkan kolom `must_change_password BOOLEAN NOT NULL DEFAULT FALSE` sesudah `status`.
  3. Tabel `ticket_priorities`: Tambahkan kolom `level INT UNSIGNED NULL UNIQUE` sesudah `name`.
  4. Tabel `audit_logs`: Tambahkan kolom `description VARCHAR(500) NULL` sesudah `module_id`.
  5. Tambahkan seluruh index baru dari migrasi (`idx_tickets_title`, `idx_tickets_sla_deadline`, `idx_tickets_status_technician`, `idx_assets_name`, `idx_knowledge_articles_title`, `idx_users_status`).

- [ ] **Step 1: Perbarui DDL `docs/schema.sql` dengan kolom dan index baru**
- [ ] **Step 2: Verifikasi syntax SQL dan jumlah `CREATE TABLE`**
- [ ] **Step 3: Commit perubahan Task 5**

---

### Task 6: Sinkronisasi Kontrak API, Permission Matrix, & Status Roadmap

**Files:**
- Modify: `docs/api/API-CONTRACT.md`
- Verify / Modify: `docs/product/PERMISSION-MATRIX.md`
- Modify: `docs/product/ROADMAP.md`

**Detail:**
- `API-CONTRACT.md`: Verifikasi seluruh endpoint dashboard & amandemen B1–B4, serta amandemen A2–A4.
- `PERMISSION-MATRIX.md`: Verifikasi kelengkapan 65 route rows.
- `ROADMAP.md`: Centang seluruh deliverable Fase 9 serta sub-tahap 10a dan 10b.

- [ ] **Step 1: Periksa dan perbarui `docs/api/API-CONTRACT.md`**
- [ ] **Step 2: Audit keselarasan `docs/product/PERMISSION-MATRIX.md`**
- [ ] **Step 3: Centang item yang telah diselesaikan pada `docs/product/ROADMAP.md`**
- [ ] **Step 4: Commit perubahan Task 6**

---

### Task 7: Catatan Arsitektur untuk Presentasi (`docs/ops/ARCHITECTURE-NOTES.md`)

**Files:**
- Create: `docs/ops/ARCHITECTURE-NOTES.md`

**Detail:**
- Menyusun panduan komprehensif 7 pilar arsitektur JarvisOps untuk menjawab pertanyaan reviewer (§33 PRD).

- [ ] **Step 1: Tulis dokumen arsitektur komprehensif di `docs/ops/ARCHITECTURE-NOTES.md`**
- [ ] **Step 2: Review keselarasan isi dengan PRD §33 dan dokumen ADR `DECISIONS.md`**
- [ ] **Step 3: Commit perubahan Task 7**

---

### Task 8: Verifikasi Menyeluruh Exit Criteria 10c

**Files:**
- Modify: `docs/tasks/phase-10/10c-ci-dokumentasi.md`
- Modify: `docs/tasks/phase-10/README.md`

- [ ] **Step 1: Jalankan linter & formatter backend (`vendor/bin/pint --test`)**
- [ ] **Step 2: Jalankan backend test suite (`php artisan test --compact`)**
- [ ] **Step 3: Jalankan frontend check (`tsc`, `lint`, `vitest`, `build`)**
- [ ] **Step 4: Pastikan validitas seluruh dokumen deliverable**
- [ ] **Step 5: Centang checklist 10c pada `docs/tasks/phase-10/10c-ci-dokumentasi.md` dan `docs/tasks/phase-10/README.md`**
