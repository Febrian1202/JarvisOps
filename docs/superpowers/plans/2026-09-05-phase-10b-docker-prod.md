# Sub-tahap 10b: Docker Produksi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docker compose -f compose.prod.yaml up --build` dari kondisi bersih menghasilkan aplikasi yang berfungsi penuh: API FrankenPHP classic multi-stage, scheduler SLA terpisah, MySQL 8.4 dengan data persisten, dan Web Next.js 16 standalone multi-stage, dengan tag image mengikuti SemVer (D-30: `jarvisops-api:v1.0.0`, `jarvisops-web:v1.0.0`).

**Architecture:** 
- `apps/api/Dockerfile`: Multi-stage build (`dunglas/frankenphp:1-php8.4`) tanpa test & file dev. Entrypoint runtime mengeksekusi migrasi database (`migrate --force`) dan pemanasan cache (`config:cache`, `route:cache`, `view:cache`) saat startup API.
- `apps/web/Dockerfile`: Multi-stage build (`node:22-alpine`) memanfaatkan Next.js `output: 'standalone'` untuk container runtime minimal yang efisien.
- `compose.prod.yaml`: 4 service terisolasi (`mysql`, `api`, `scheduler`, `web`) dengan volume persisten `mysql-data-prod` dan `app-storage` (shared storage attachment), batas healthcheck ketat, dan jaringan internal.

**Tech Stack:** Docker, Docker Compose v2, FrankenPHP 1 (PHP 8.4), Next.js 16.3 (Standalone Node 22), MySQL 8.4.

**Spec:** `docs/tasks/phase-10/10b-docker-produksi.md`

## Global Constraints
- Branch kerja: `feat/phase-10b-docker-prod` (bercabang dari `main`).
- Jangan memodifikasi konfigurasi development yang sudah ada (`compose.yaml`, `docker/api/Dockerfile.dev`, `docker/web/Dockerfile.dev`).
- Multi-stage image produksi **tidak boleh** memuat direktori `tests/`, `.git`, atau file rahasia `.env`.
- Service `scheduler` wajib berjalan terpisah dari `api` dengan image yang sama dan berbagi volume `storage/app`.
- Nilai `APP_DEBUG=false` di lingkungan produksi.
- Semua pemeriksaan konfigurasi dan healthcheck harus 100% valid dari kondisi bersih (`clean slate`).

---

### Task 1: `apps/api/Dockerfile` (Produksi, Multi-Stage) & Entrypoint

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/api/.dockerignore`
- Create: `apps/api/docker-entrypoint.sh`

**Interfaces:**
- Input: Source code `apps/api`, `composer.json`, `composer.lock`.
- Output: Image Docker `jarvisops-api:${APP_VERSION:-v1.0.0}` berbasis `dunglas/frankenphp:1-php8.4`.
- Runtime command:
  - Default (API): `./docker-entrypoint.sh frankenphp run --config /etc/caddy/Caddyfile`
  - Override (Scheduler): `./docker-entrypoint.sh php artisan schedule:work`

- [ ] **Step 1: Buat `.dockerignore` untuk API**
- [ ] **Step 2: Buat entrypoint script `apps/api/docker-entrypoint.sh`**
- [ ] **Step 3: Buat `apps/api/Dockerfile` multi-stage**
- [ ] **Step 4: Uji build manual image API**
- [ ] **Step 5: Commit perubahan Task 1**

---

### Task 2: `apps/web/Dockerfile` (Produksi, Multi-Stage Standalone) & Next Config

**Files:**
- Modify: `apps/web/next.config.ts`
- Create: `apps/web/.dockerignore`
- Create: `apps/web/Dockerfile`

**Interfaces:**
- Input: Source code `apps/web`, `package.json`, `package-lock.json`.
- Output: Image Docker `jarvisops-web:${APP_VERSION:-v1.0.0}` berbasis `node:22-alpine` dengan mode `standalone`.

- [ ] **Step 1: Modifikasi `apps/web/next.config.ts` untuk mengaktifkan `output: 'standalone'`**
- [ ] **Step 2: Buat `.dockerignore` untuk Web**
- [ ] **Step 3: Buat `apps/web/Dockerfile` multi-stage**
- [ ] **Step 4: Uji build lokal Next.js dan Docker image**
- [ ] **Step 5: Commit perubahan Task 2**

---

### Task 3: `compose.prod.yaml`, Environment Examples, & Persistent Volumes

**Files:**
- Create: `compose.prod.yaml`
- Create: `apps/api/.env.production.example`
- Create: `apps/web/.env.production.example`

**Interfaces:**
- 4 Service terintegrasi: `mysql` (8.4), `api` (FrankenPHP), `scheduler` (Artisan worker), `web` (Next.js standalone).
- Volumes: `mysql-data-prod` (Database), `app-storage` (Shared `/app/storage/app` untuk attachment API & scheduler).

- [ ] **Step 1: Buat `apps/api/.env.production.example`**
- [ ] **Step 2: Buat `apps/web/.env.production.example`**
- [ ] **Step 3: Buat `compose.prod.yaml`**
- [ ] **Step 4: Verifikasi sintaks compose**
- [ ] **Step 5: Commit perubahan Task 3**

---

### Task 4: Uji Nyata dari Kondisi Bersih (Clean-Slate Verification)

**Files:**
- None (Hanya runtime testing & perbaikan konfigurasi jika ada).

- [ ] **Step 1: Siapkan file env produksi dari contoh**
- [ ] **Step 2: Generate production `APP_KEY` dan sematkan ke `apps/api/.env.production`**
- [ ] **Step 3: Pastikan kondisi benar-benar bersih dan build seluruh stack**
- [ ] **Step 4: Monitor status kesehatan container**
- [ ] **Step 5: Uji fungsionalitas HTTP & Log**
- [ ] **Step 6: Uji persistensi volume (restart)**
- [ ] **Step 7: Bersihkan container pengujian prod**
- [ ] **Step 8: Commit jika ada perbaikan minor selama pengujian**

---

### Task 5: Dokumentasi Deployment `docs/ops/DEPLOYMENT.md`

**Files:**
- Create: `docs/ops/DEPLOYMENT.md`

**Interfaces:**
- Panduan komprehensif bagi sysadmin / reviewer untuk deploy JarvisOps menggunakan `compose.prod.yaml`.

- [ ] **Step 1: Tulis `docs/ops/DEPLOYMENT.md`**
- [ ] **Step 2: Commit dokumentasi deployment**

---

## Exit Criteria 10b Checklist
- [ ] `apps/api/Dockerfile` & `apps/web/Dockerfile` multi-stage build berhasil tanpa memasukkan file test, `.git`, dan `.env`.
- [ ] `compose.prod.yaml` menjalankan 4 service (`mysql`, `api`, `scheduler`, `web`) dari kondisi bersih hingga semuanya `healthy`.
- [ ] Migrasi dijalankan otomatis saat startup API dan cache framework dioptimasi (`config:cache`, `route:cache`, `view:cache`).
- [ ] Shared volume `app-storage` dimount bersama oleh `api` dan `scheduler`.
- [ ] File `.env.production.example` tersedia untuk kedua aplikasi dengan nilai default produksi yang aman (`APP_DEBUG=false`).
- [ ] Dokumen `docs/ops/DEPLOYMENT.md` tersedia dan lengkap.
