# Changelog

Semua perubahan penting pada proyek **JARVIS OPS** (IT Service Management System) didokumentasikan di berkas ini.

Format berkas ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan menganut [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-09-05

Rilis penuh (**Full Release**) sistem JARVIS OPS. Menyelesaikan seluruh cakupan Fase 10 (Kualitas, Deployment, Audit Keamanan, dan Persiapan Demo Capstone).

### Added
- **Streamed CSV Export (Buffer Prioritas)**:
  - Endpoint export backend-driven dengan UTF-8 BOM dan cursor memory-safe (`GET /api/export/tickets`, `GET /api/export/assets`, `GET /api/export/audit-logs`).
  - Rate limiting khusus `throttle:export` (10 request/menit/user) dan pemisahan logika ke `ExportService`.
  - Komponen frontend `CsvExportButton` terintegrasi pada tabel Ticket, Asset, dan Audit Logs.
- **Verifikasi Kepatuhan Menyeluruh**:
  - Test suite `DefinitionOfTechnicalSuccessTest` yang memverifikasi secara tegas 11 poin *Definition of Technical Success* (§12 PRD).
  - Matriks kepatuhan 10 poin *Definition of Done* (§37 PRD) di `docs/ops/TESTING.md`.
- **Docker Produksi Multi-Stage**:
  - `compose.prod.yaml` dengan 4 layanan: `api` (FrankenPHP), `scheduler` (proses terpisah), `mysql` (8.4), dan `web` (Next.js standalone).
  - `Dockerfile` multi-stage untuk backend (`composer install --no-dev --optimize-autoloader`) dan frontend (`output: 'standalone'`).
  - File panduan `.env.production.example` untuk kedua aplikasi.
- **CI / CD Pipeline**:
  - GitHub Actions workflow `.github/workflows/ci.yml` menjalankan audit Pint, Pest, TypeScript typecheck, ESLint, dan Next.js production build secara paralel dengan caching dependency.
- **Dokumentasi Operasional & Presentasi**:
  - `docs/ops/DEPLOYMENT.md` — Panduan deployment produksi, reverse proxy Caddy, SSL, dan backup.
  - `docs/ops/TESTING.md` — Panduan pengujian menyeluruh dan pemetaan aturan bisnis (BR-001 s.d. BR-020).
  - `docs/ops/DEMO-RUNBOOK.md` — Panduan langkah demi langkah demo live golden path §38 PRD beserta fallback plan.
  - `docs/ops/REVIEWER-ANSWERS.md` — Jawaban komprehensif atas 6 pertanyaan reviewer (§33 PRD).
  - `docs/ops/ARCHITECTURE-NOTES.md` — Rasionalisasi 7 keputusan teknis utama (BFF, SLA snapshot, audit log eksplisit, controller-gated attachments, dll).
  - `docs/ops/OCTANE-AUDIT.md` — Analisis performa dan audit potensi kebocoran state Laravel Octane vs FrankenPHP classic mode.

### Changed
- Kalibrasi `DemoDataSeeder` untuk menghasilkan kepatuhan SLA realistis (~87,5%), tiket breached aktif, serta riwayat kepemilikan aset multi-pemegang yang stabil dan deterministik.
- Sinkronisasi DDL skema relasional `docs/schema.sql` terhadap 24 berkas migrasi Laravel.

---

## [0.9.0] - 2026-09-05

### Added
- **Dashboard UI & Visual Analytics**:
  - Implementasi halaman visual analytics per peran (`/dashboard/employee`, `/dashboard/technician`, `/dashboard/manager`, `/dashboard/admin`).
  - Visualisasi grafik Recharts (PieChart distribusi status tiket, BarChart tren bulanan dan beban departemen, SLA compliance meter).
  - Navigasi filter rentang waktu (7 hari, 30 hari, 90 hari, kuartal berjalan).
- **Pengujian End-to-End & Aksesibilitas**:
  - Test suite otomatis Playwright untuk seluruh peran dan alur skenario golden path §38 PRD.
  - Audit kepatuhan aksesibilitas web WCAG 2.2 AA (axe-core) pada komponen antarmuka utama.

---

## [0.8.0] - 2026-09-03

### Added
- **Fitur Frontend Lengkap**:
  - Manajemen Tiket: Daftar tiket dengan filter status/kategori/prioritas, form pembuatan tiket dengan deteksi kepemilikan aset, dan detail tiket interaktif.
  - Alur Transisi Status: Modal aksi ubah status dengan proteksi optimistik `expected_status_id`, penugasan teknisi, serta komentar dan lampiran file.
  - Manajemen Aset: Katalog aset perusahaan, riwayat penugasan/pelepasan, dan halaman Aset Saya (`/my-assets`).
  - Knowledge Base: Pencarian dan pembacaan artikel, filter kategori, serta editor penulisan draft/publish artikel untuk teknisi.
  - Administrasi & Profil: Halaman kelola pengguna, master data departemen/kategori/prioritas SLA, penelusuran audit log, dan profil pengguna.

---

## [0.7.0] - 2026-09-03

### Added
- **Pondasi Frontend & App Shell**:
  - Arsitektur Next.js 16 App Router dengan React 19 dan Tailwind CSS v4.
  - Warm neutral theme (`#f7f4ed`) dengan tipografi Plus Jakarta Sans.
  - App Shell terpadu: Sidebar desktop yang responsif, drawer mobile, dan Topbar dengan polling notifikasi 30 detik (`NotificationBell`).
  - BFF Proxy Handler (`/api/proxy/[...path]`) yang menyematkan Sanctum bearer token dari httpOnly cookie secara transparan dan aman dari XSS.
  - 16 baseline UI components (shadcn-based) dan 9 reusable shared components (`DataTable`, `FilterBar`, `SearchInput`, `StatusBadge`, `PriorityBadge`, `SlaIndicator`, `RelativeTime`, `FileUpload`, `ConfirmDialog`, `EmptyState`).

---

## [0.6.0] - 2026-09-03

### Added
- **API Dashboard Analytics**:
  - `GET /api/dashboard/employee` — Ringkasan tiket saya, aset aktif saya, artikel bantuan terbaru, dan metrik penyelesaian.
  - `GET /api/dashboard/technician` — Beban tiket yang ditugaskan, kepatuhan SLA personal, dan aktivitas terkini.
  - `GET /api/dashboard/manager` — Metrik kepatuhan SLA tim, tiket belum ter-assign, dan distribusi prioritas/kategori.
  - `GET /api/dashboard/admin` — Metrik sistem holistik, status pengguna aktif, pemanfaatan aset, dan log keamanan terbaru.

---

## [0.5.0] - 2026-09-02

### Added
- **Modul Pendukung ITSM**:
  - Modul Aset (`/api/assets`, `/api/my-assets`, `/api/assets/{id}/assign`, `/api/assets/{id}/release`, `/api/assets/{id}/history`) dengan penugasan transaksi atomik `lockForUpdate`.
  - Modul Knowledge Base (`/api/articles`, `/api/articles/{slug}`, `/api/knowledge-categories`) dengan alur draft/publish dan counter views atomik.
  - Modul File Attachment (`/api/tickets/{id}/attachments`, `/api/attachments/{id}/download`) tersimpan pada disk privat `private` dan diotorisasi via `AttachmentPolicy`.
  - Modul Administrasi (`/api/users`, `/api/departments`, `/api/ticket-categories`, `/api/ticket-priorities`) dengan kontrol penuh Administrator.

---

## [0.4.0] - 2026-09-02

### Added
- **SLA Scheduler & Breach Detection**:
  - Artisan command `tickets:check-sla` mendeteksi keterlambatan tiket aktif dan menandai kolom `sla_breached` / `sla_breached_at`.
- **In-App Notifications**:
  - API Notifikasi berbasis database (`/api/notifications`, `/api/notifications/unread-count`, `/api/notifications/{id}/read`, `/api/notifications/read-all`).
  - Notifikasi otomatis pada event penugasan tiket, perubahan status, dan pelanggaran SLA.
- **Audit Logging API**:
  - API Jejak Audit (`/api/audit-logs`) dengan pencatatan deskripsi bahasa Indonesia siap baca, filter tanggal, dan scoping peran (Manager & Admin).

---

## [0.3.0] - 2026-09-02

### Added
- **Core Ticket Lifecycle & Workflow State Machine**:
  - Siklus 5 status tiket: `OPEN` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`.
  - Snapshot SLA duration & deadline otomatis saat pembuatan tiket (kalender flat 24/7).
  - Pencatatan otomatis ke `ticket_histories` pada setiap perubahan status atau teknisi.
  - Komentar tiket dan alur golden path end-to-end teruji secara menyeluruh.

---

## [0.2.0] - 2026-09-02

### Added
- **Pondasi Backend, Autentikasi & RBAC**:
  - Skeleton Laravel 13 dengan PHP 8.4 runtime.
  - Autentikasi Laravel Sanctum API token dengan perlindungan brute-force (`throttle:login`).
  - Role-Based Access Control (RBAC) bawaan Laravel Gate & Policy untuk 4 role: Employee, Technician, Manager, Administrator.
  - Standardisasi JSON envelope respons API (`success`, `message`, `data`, `meta`).
