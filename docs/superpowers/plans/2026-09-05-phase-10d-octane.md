# Sub-tahap 10d: Octane Worker Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menginstal, mengonfigurasi, mengaudit, dan memverifikasi Laravel Octane dengan runtime server FrankenPHP agar seluruh endpoint dan test suite bebas dari kebocoran state antar-request, serta merumuskan keputusan deployment final (Classic Mode vs Worker Mode) di `docs/ops/DEPLOYMENT.md` dan `docs/ops/OCTANE-AUDIT.md`.

**Architecture:**
- **Runtime Engine:** `laravel/octane:^2.19` menggunakan server driver `frankenphp` (konsisten dengan base image produksi `dunglas/frankenphp:1-php8.4`).
- **State Leak Protection:** Audit sistematis terhadap Service Container bindings (memastikan tiada singleton yang menampung data per-user), ketiadaan mutable `static` properties, ketiadaan mutasi runtime `config()`, dan perlindungan isolasi Gate/Sanctum tokens.
- **Verification Strategy:** Automated feature test (`OctaneStateLeakTest.php`) yang mensimulasikan multiple sequential requests lintas pengguna (Employee, Manager, Technician, Unauthenticated) dalam siklus hidup container yang sama, verifikasi live FrankenPHP worker, serta uji manual dua-user.
- **Production Stance (Prinsip K5):** Keputusan terdokumentasi bahwa Classic Mode tetap menjadi default yang aman untuk sistem ITSM, sementara Octane Worker Mode didukung penuh sebagai konfigurasi performa tinggi opsional melalui compose override (`compose.prod.octane.yaml`).

**Tech Stack:** Laravel 13, Laravel Octane 2.19, FrankenPHP 1.12+, Pest 5 / PHPUnit 13.3, Docker Compose.

**Spec:** `docs/tasks/phase-10/10d-octane-worker-mode.md`

## Global Constraints
- Branch kerja: `feat/phase-10d-octane` (bercabang dari `main`).
- Versi Octane dikunci ke `laravel/octane:^2.19` (Octane 3 belum ada).
- Server yang dipilih wajib `frankenphp` (bukan Swoole atau RoadRunner).
- Mengikuti prinsip K5 (ROADMAP:871): Worker mode adalah opsi performa, bukan tujuan; jika ada keraguan, default produksi tetap Classic Mode.
- Bahasa dokumentasi audit dan deployment adalah **Bahasa Indonesia** (D-24).
- Formatting kode PHP wajib lolos `vendor/bin/pint --dirty --format agent`.

---

### Task 1: Pasang & Konfigurasi Laravel Octane

**Files:**
- Modify: `apps/api/composer.json`, `apps/api/composer.lock`
- Create: `apps/api/config/octane.php`

**Interfaces:**
- Consumes: Composer dependency manager, PHP 8.4 runtime, FrankenPHP binary.
- Produces: Konfigurasi Octane (`apps/api/config/octane.php`), perintah artisan `octane:status`, `octane:start`, `octane:stop`.

- [ ] **Step 1: Install laravel/octane:^2.19 di apps/api**
- [ ] **Step 2: Jalankan instalasi Octane dengan driver frankenphp**
- [ ] **Step 3: Verifikasi file apps/api/config/octane.php**
- [ ] **Step 4: Uji status perintah Octane**
- [ ] **Step 5: Commit perubahan Task 1**

---

### Task 2: Audit State Bocor & Automated State Leak Test

**Files:**
- Create: `apps/api/tests/Feature/Security/OctaneStateLeakTest.php`
- Create: `docs/ops/OCTANE-AUDIT.md`

**Interfaces:**
- Consumes: `AppServiceProvider`, 22 Domain Services, Auth/Sanctum tokens, Gate definitions.
- Produces: Dokumen audit `docs/ops/OCTANE-AUDIT.md` dan test suite `OctaneStateLeakTest.php`.

- [ ] **Step 1: Buat failing feature test OctaneStateLeakTest.php**
- [ ] **Step 2: Jalankan test untuk memverifikasi eksekusinya**
- [ ] **Step 3: Lakukan audit kode sistematis di seluruh apps/api/app/**
- [ ] **Step 4: Tulis dokumen temuan docs/ops/OCTANE-AUDIT.md**
- [ ] **Step 5: Format kode dan commit perubahan Task 2**

---

### Task 3: Verifikasi Test Suite terhadap Mode Worker & Local FrankenPHP

**Files:**
- Modify: `apps/api/tests/**` (hanya bila ditemukan test failure/flakiness saat Octane aktif)

**Interfaces:**
- Consumes: FrankenPHP binary lokal (`/usr/bin/frankenphp`), Pest test runner.
- Produces: Seluruh 650+ backend test passing tanpa kegagalan.

- [ ] **Step 1: Uji coba menjalankan Octane server di port non-konflik (dev port 8001)**
- [ ] **Step 2: Verifikasi respons health endpoint pada server Octane aktif**
- [ ] **Step 3: Hentikan server Octane dev**
- [ ] **Step 4: Jalankan seluruh test suite Pest**

---

### Task 4: Uji Manual Dua-User & Pencatatan Hasil Uji

**Files:**
- Modify: `docs/ops/OCTANE-AUDIT.md` (bagian Protokol Uji Dua-User & Bukti Bebas Data Tertukar)

**Interfaces:**
- Consumes: Akun `employee@jarvisops.test` dan `manager@jarvisops.test`.
- Produces: Log pengujian empiris dua pengguna di `OCTANE-AUDIT.md`.

- [ ] **Step 1: Jalankan simulasi alur dua user bergantian**
- [ ] **Step 2: Dokumentasikan log pengujian dan bukti empiris ke docs/ops/OCTANE-AUDIT.md**
- [ ] **Step 3: Commit Task 4**

---

### Task 5: Keputusan Final Arsitektur & Konfigurasi Deployment

**Files:**
- Modify: `docs/ops/DEPLOYMENT.md`
- Create: `compose.prod.octane.yaml`
- Modify: `docs/product/ROADMAP.md`

**Interfaces:**
- Consumes: Temuan Task 2, 3, dan 4.
- Produces: Panduan deployment mode worker dan classic di `DEPLOYMENT.md`.

- [ ] **Step 1: Buat file override compose.prod.octane.yaml**
- [ ] **Step 2: Perbarui docs/ops/DEPLOYMENT.md dengan Bagian 9**
- [ ] **Step 3: Perbarui status checklist di docs/product/ROADMAP.md**
- [ ] **Step 4: Commit perubahan Task 5**
