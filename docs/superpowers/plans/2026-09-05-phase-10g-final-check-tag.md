# Sub-tahap 10g: Final Check & Tag v1.0.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memverifikasi secara formal 11 poin *Definition of Technical Success* (§12 PRD), 10 poin *Definition of Done* (§37 PRD), menjalankan *full quality verification* di seluruh stack (backend unit/feature tests, frontend tests, typecheck, lint, build, dan E2E smoke), menyinkronkan status dokumentasi akhir rilis ke `v1.0.0`, dan membuat Git tag rilis `v1.0.0` (D-30).

**Architecture:** 
- **Automated Verification Harness**: Menambahkan `DefinitionOfTechnicalSuccessTest.php` di backend yang secara eksplisit memetakan dan menguji 11 poin §12 PRD dalam satu test runner yang dapat dipresentasikan ke reviewer.
- **DoD Traceability Audit**: Memverifikasi pemenuhan 10 kriteria Definition of Done (§37 PRD) untuk seluruh modul inti ITSM.
- **Full Monorepo Quality Gate**: Memastikan seluruh suite backend (716+ test), frontend (352+ test, typecheck, lint, Next.js build), dan E2E Playwright berjalan 100% hijau dari kondisi bersih.
- **Release Documentation Synchronization**: Memperbarui status proyek di `README.md`, `ROADMAP.md`, `AGENTS.md`, dan checklist `docs/tasks/phase-10/` menandai penutupan Fase 10 dan status rilis penuh `v1.0.0`.
- **Release Tagging & Artifact Packaging**: Merge ke branch `main`, penambahan signed/annotated git tag `v1.0.0` (D-30), dan penandaan tag image Docker produksi (`jarvisops-api:v1.0.0` & `jarvisops-web:v1.0.0`).

**Tech Stack:** Laravel 13, Pest 5 / PHPUnit 13.3, Next.js 16 (Turbopack), Vitest, Playwright, Docker Compose, Git.

**Spec:** `docs/tasks/phase-10/10g-final-check-tag.md`

## Global Constraints
- Branch kerja: `feat/phase-10g-final` (bercabang dari `main`), di-merge kembali ke `main` sebelum tag (D-30).
- Bahasa respon API tetap Inggris, pesan validasi/audit log/dokumentasi tetap Bahasa Indonesia (D-24).
- Sebelum membuat Git tag `v1.0.0`, seluruh gate pengujian **wajib hijau penuh** tanpa kompromi (*verification-before-completion*).
- Tag git menggunakan format Semantic Versioning `v1.0.0` (D-30).

---

### Task 1: Buat Dedicated Feature Test untuk 11 Poin Definition of Technical Success (§12 PRD)

**Files:**
- Create: `apps/api/tests/Feature/Security/DefinitionOfTechnicalSuccessTest.php`

**Interfaces:**
- Consumes: Models (`Ticket`, `Asset`, `AssetAssignment`, `User`, `Article`, `Notification`, `TicketAttachment`), Enums (`AssetStatus`), Services (`SlaService`, `NotificationService`).
- Produces: 11 automated test cases yang memvalidasi setiap poin PRD §12 secara tegas:
  1. Employee tidak dapat memilih asset milik employee lain (BR-012).
  2. Employee tidak dapat membuat akun sendiri (tidak ada registrasi publik, BR-016).
  3. Hanya Admin yang dapat membuat user (BR-017).
  4. Ticket otomatis mendapatkan SLA deadline (BR-006 / D-01).
  5. Scheduler dapat mendeteksi SLA breach (D-02).
  6. SLA breach tersimpan di database (`sla_breached`, `sla_breached_at`).
  7. Notification dibuat ketika event penting terjadi (Ticket Assigned, SLA Breached, dll).
  8. Notification query & polling endpoint berfungsi dengan paging & scoping.
  9. Technician dapat membuat dan mem-publish Knowledge Base article.
  10. Attachment divalidasi maksimal 5 MB dan hanya format yang diizinkan (JPG, JPEG, PNG, PDF).
  11. Semua business-critical authorization divalidasi di Laravel backend (Gate/Policy/BFF).

- [ ] **Step 1: Buat file test `apps/api/tests/Feature/Security/DefinitionOfTechnicalSuccessTest.php`**
- [ ] **Step 2: Jalankan test untuk memastikan 11 poin lolos 100%**
- [ ] **Step 3: Format kode dengan Pint**
- [ ] **Step 4: Commit perubahan Task 1**

---

### Task 2: Verifikasi & Dokumentasi Matriks Definition of Done (§37 PRD)

**Files:**
- Modify: `docs/ops/TESTING.md`
- Modify: `docs/tasks/phase-10/10g-final-check-tag.md`

- [ ] **Step 1: Perbarui `docs/ops/TESTING.md` dengan tabel audit 10 poin DoD dan update referensi test `DefinitionOfTechnicalSuccessTest`**
- [ ] **Step 2: Centang status verifikasi di `docs/tasks/phase-10/10g-final-check-tag.md`**
- [ ] **Step 3: Commit perubahan Task 2**

---

### Task 3: Sinkronisasi Status Dokumentasi Akhir Monorepo

**Files:**
- Modify: `README.md`
- Modify: `docs/product/ROADMAP.md`
- Modify: `AGENTS.md`
- Modify: `docs/tasks/phase-10/README.md`

- [ ] **Step 1: Perbarui `README.md` dengan status rilis `v1.0.0`**
- [ ] **Step 2: Perbarui `docs/product/ROADMAP.md` mencentang seluruh deliverable Fase 10 dan menandai rilis `v1.0.0`**
- [ ] **Step 3: Perbarui `AGENTS.md` mencerminkan status akhir Fase 10 selesai**
- [ ] **Step 4: Perbarui `docs/tasks/phase-10/README.md` menandai seluruh exit criteria selesai**
- [ ] **Step 5: Commit perubahan Task 3**

---

### Task 4: Full Suite Quality Verification (Verification-Before-Completion)

**Files:** None (verifikasi operasional).

- [ ] **Step 1: Jalankan verifikasi backend (Pint & Pest)**
- [ ] **Step 2: Jalankan verifikasi frontend (Typecheck, Lint, Test, Build)**
- [ ] **Step 3: Validasi sintaks `compose.prod.yaml`**

---

### Task 5: Git Branch Merge, Tagging `v1.0.0`, & Docker Image Release Tag

**Files:** None (Git & Docker operations).

- [ ] **Step 1: Merge branch fitur ke `main`**
- [ ] **Step 2: Buat annotated git tag `v1.0.0`**
- [ ] **Step 3: Verifikasi tag**
