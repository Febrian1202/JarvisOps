# JARVIS OPS

**IT Service Management System** — platform terpusat untuk mengelola permintaan dan permasalahan IT, aset perusahaan, knowledge base, serta monitoring performa layanan IT.

Laravel 13 · Next.js 16 · MySQL 8 · FrankenPHP · Docker

> **Status: Fase 10 Sedang Berjalan (Fase 9 Selesai — Tag `v0.9.0`, Sub-tahap 10a, 10b, 10c aktif).**
> Seluruh dokumen desain (PRD, ERD, DFD, API contract, matriks transisi status, matriks permission, roadmap) sudah lengkap. Backend telah memiliki 18 model, 24 migration, autentikasi + otorisasi berbasis policy, modul tiket lengkap (CRUD, query/search/filter, workflow status machine, komentar, history timeline, golden path test — Fase 3 Selesai), background SLA breach scheduler (Fase 4a Selesai), API notifikasi in-app (Fase 4b Selesai), API Audit Log dengan pembatasan peran & timezone conversion (Fase 4c Selesai — Tag `v0.4.0`), seluruh modul pendukung Fase 5 (Asset, Knowledge Base, File Attachment, Administrasi Master Data & User), Dashboard API untuk 4 Role (Fase 6 Selesai — Tag `v0.6.0`), pondasi frontend Next.js 16, App Shell responsif, Plus Jakarta Sans, warm-neutral theme, 16 baseline UI + 9 shared components, TanStack Query polling notifikasi 30 detik (Fase 7 Selesai — Tag `v0.7.0`), seluruh fitur frontend lengkap (Tiket, Aset, Knowledge Base, Administrasi, Profil — Fase 8 Selesai, Tag `v0.8.0`), Dashboard UI & Visual Analytics per role dengan visualisasi Recharts, E2E testing Playwright komprehensif, dan audit aksesibilitas WCAG 2.2 AA (Fase 9 Selesai — Tag `v0.9.0`), serta Docker stack produksi multi-stage (`compose.prod.yaml`) dan CI otomatis GitHub Actions (Fase 10). Lihat [Status Implementasi](#status-implementasi) untuk rincian yang sudah dan belum ada.

---

## Masalah Yang Diselesaikan

Di banyak perusahaan, masalah IT dilaporkan lewat WhatsApp, email, atau disampaikan langsung ke tim IT. Akibatnya permintaan sulit dilacak, tidak ada standar prioritas, riwayat penanganan tidak terdokumentasi, dan manajemen tidak punya gambaran performa tim IT maupun kepatuhan SLA.

JARVIS OPS menggantikan proses itu dengan satu alur yang terstruktur, terukur, dan terekam.

## Fitur

| Modul | Cakupan |
| --- | --- |
| **Ticket management** | Pelaporan, assignment technician, workflow 5 status, komentar, attachment, riwayat perubahan |
| **SLA** | Deadline otomatis per priority, deteksi pelanggaran terjadwal, metrik kepatuhan |
| **Asset management** | Inventaris perangkat IT, assignment ke karyawan, riwayat kepemilikan, keterkaitan dengan ticket |
| **Knowledge base** | Artikel troubleshooting, kategori, pencarian, draft/published |
| **Dashboard & analytics** | Empat dashboard per role, tren ticket, distribusi, performa technician |
| **Notification** | Notifikasi in-app berbasis database dengan polling |
| **Audit log** | Jejak seluruh aktivitas penting beserta pelaku dan waktunya |

### Peran pengguna

| Role | Kemampuan utama |
| --- | --- |
| **Employee** | Melaporkan masalah, memantau ticket sendiri, melihat aset yang dipegang, membaca knowledge base |
| **Technician** | Menangani ticket yang di-assign, memperbarui status, mendokumentasikan troubleshooting, mengelola aset & artikel |
| **Manager** | Melihat seluruh ticket, melakukan assignment, memantau SLA dan performa tim |
| **Administrator** | Mengelola user, role, department, kategori, priority/SLA, serta melihat audit log |

Aturan lengkapnya ada di [`docs/product/PERMISSION-MATRIX.md`](docs/product/PERMISSION-MATRIX.md).

---

## Arsitektur

```
┌─────────────────────────────────────────┐
│  Next.js 16 (apps/web)                  │
│  UI · Dashboard · Forms · Charts         │
│                                          │
│  Route Handler sebagai BFF:              │
│  token disimpan di httpOnly cookie,      │
│  seluruh request diteruskan via proxy    │
└──────────────────┬──────────────────────┘
                   │ REST API + Bearer token
┌──────────────────▼──────────────────────┐
│  Laravel 13 (apps/api)                  │
│  Controllers · FormRequests · Services   │
│  Policies · API Resources · Scheduler    │
└──────────────────┬──────────────────────┘
                   │ Eloquent ORM
┌──────────────────▼──────────────────────┐
│  MySQL 8 — 18 tabel                     │
└─────────────────────────────────────────┘
```

### Keputusan teknis dan alasannya

**Autentikasi: Sanctum API token di httpOnly cookie, lewat BFF Next.js.**
Token tidak pernah dikirim ke browser dalam bentuk yang bisa dibaca JavaScript, dan komponen client tidak pernah memanggil Laravel langsung. Ini menghilangkan seluruh kelas serangan pencurian token via XSS, sekaligus tetap bekerja walau frontend dan backend berbeda domain.

**SLA: snapshot saat pembuatan + scheduler + perhitungan defensif.**
Setiap ticket menyimpan `sla_duration_minutes` dan `sla_deadline` sendiri, bukan mengambilnya lewat join ke tabel priority. Kalau konfigurasi SLA diubah di kemudian hari, ticket lama tetap dinilai dengan aturan yang berlaku saat ia dibuat — tanpa ini, angka kepatuhan historis akan berubah sendiri. Scheduler (tiap 5 menit) mengurus persistensi dan notifikasi; API tetap menghitung kondisi SLA saat request supaya angka yang ditampilkan akurat meski scheduler tertinggal.

**Otorisasi: Gate dan Policy bawaan Laravel, tanpa paket eksternal.**
Skema menetapkan satu role per user lewat `users.role_id`. `spatie/laravel-permission` akan menambah lima tabel dan konsep permission-per-user yang tidak dipakai, sementara nilai utamanya — pengelolaan permission dinamis lewat UI — bukan bagian MVP.

**Attachment: disimpan di disk private, diunduh lewat controller.**
File tidak bisa diakses hanya karena seseorang tahu URL-nya. Setiap permintaan unduh melewati Policy ticket induknya.

**Runtime: FrankenPHP classic mode.**
Satu container untuk web server dan PHP, dengan HTTPS otomatis lewat Caddy. Classic mode dipilih karena perilakunya identik dengan PHP-FPM, sehingga tidak ada risiko state bocor antar-request. Worker mode (Octane) ditunda sebagai opsional dan hanya dipertimbangkan setelah test suite lengkap.

**Notification: database + polling 30 detik.**
WebSocket tidak sepadan untuk MVP internal. Polling menerima keterlambatan sampai 30 detik sebagai ganti kesederhanaan operasional yang besar.

Uraian lengkap ada di [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md) bagian 2.

---

## Struktur Repo

```
JarvisOps/
├── apps/
│   ├── api/                  Laravel 13 + Sanctum 4  (PHP 8.3+)
│   └── web/                  Next.js 16 + React 19 + Tailwind v4
├── docs/
│   ├── product/
│   │   ├── PRD.md                    Product requirements + addendum v1.1
│   │   ├── ROADMAP.md                10 fase, 8 minggu, checklist eksekusi
│   │   ├── STATUS-TRANSITION.md      Matriks transisi status ticket × role
│   │   └── PERMISSION-MATRIX.md      Ability, Policy, aturan 403 vs 404
│   ├── api/
│   │   └── API-CONTRACT.md           Envelope, 51 endpoint, query param
│   ├── architecture/
│   │   ├── ERD.md                    Penjelasan 18 tabel dan relasinya
│   │   ├── DFD.md                    Data flow level 1 & 2
│   │   ├── CONTEXT-DIAGRAM.md        Batas sistem dan aktor eksternal
│   │   ├── BACKEND-ARCHITECTURE.md    Pola service layer, DTO & request pipeline
│   │   ├── FRONTEND-ARCHITECTURE.md   Pola BFF, komponen & state frontend
│   │   └── CONTEXT-DIAGRAM.drawio
│   └── schema.sql                    ERD v1.2 dalam DDL MySQL
└── README.md
```

---

## Dokumentasi

Baca dengan urutan ini kalau baru pertama kali masuk ke proyek:

| Dokumen | Isi | Kapan dibutuhkan |
| --- | --- | --- |
| [`docs/product/PRD.md`](docs/product/PRD.md) | Masalah, pengguna, fitur, business rule, acceptance criteria | Memahami *apa* yang dibangun |
| [`docs/architecture/CONTEXT-DIAGRAM.md`](docs/architecture/CONTEXT-DIAGRAM.md) | Batas sistem dan aktornya | Gambaran paling luas |
| [`docs/architecture/ERD.md`](docs/architecture/ERD.md) | 18 tabel, relasi, alasan desainnya | Sebelum menulis migration |
| [`docs/architecture/DFD.md`](docs/architecture/DFD.md) | Aliran data antar proses | Memahami alur kerja sistem |
| [`docs/architecture/BACKEND-ARCHITECTURE.md`](docs/architecture/BACKEND-ARCHITECTURE.md) | Pola service layer, DTO, controller tipis, request pipeline | Sebelum menulis business logic |
| [`docs/architecture/FRONTEND-ARCHITECTURE.md`](docs/architecture/FRONTEND-ARCHITECTURE.md) | Pola BFF, komponen, state, folder structure frontend | Sebelum menulis komponen UI |
| [`DESIGN.md`](DESIGN.md) | Visual theme: palet, tipografi, komponen styling, do's & don'ts | Sebelum menulis styling UI |
| [`docs/api/API-CONTRACT.md`](docs/api/API-CONTRACT.md) | Bentuk request/response seluruh endpoint | Sebelum menulis controller atau memanggil API |
| [`docs/product/STATUS-TRANSITION.md`](docs/product/STATUS-TRANSITION.md) | Transisi status yang legal beserta efek sampingnya | Sebelum menyentuh workflow ticket |
| [`docs/product/PERMISSION-MATRIX.md`](docs/product/PERMISSION-MATRIX.md) | Ability per role, pemetaan endpoint | Sebelum menulis Policy |
| [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md) | Rencana eksekusi 10 fase beserta exit criteria | Setiap hari selama pengerjaan |
| [`docs/adr/DECISIONS.md`](docs/adr/DECISIONS.md) | Catatan keputusan teknis yang menutup gap pada dokumen desain | Saat menulis migration, policy, dan API controller |

---

## Status Implementasi

### Sudah ada

- Seluruh dokumen desain di `docs/` — lengkap dan sudah saling diverifikasi konsisten
- **Fase 0 (Repo, Docker, Toolchain) — SELESAI**: `compose.yaml`, `docker/`, `Makefile`, Pest 5 terpasang, smoke test hijau
- **Fase 2 (Backend Fondasi & Walking Skeleton) — SELESAI**: auth (login/logout/profile) via Sanctum, middleware, `/api/health`, halaman login + dashboard terproteksi di `apps/web`, BFF proxy dengan httpOnly cookie
- **Fase 3 (Ticket Core & Workflow) — SELESAI (Tag: `v0.3.0`)**:
  - **3a (Ticket Foundation)**: enums, matriks transisi status, TicketPolicy/AssetPolicy/TicketCommentPolicy/NotificationPolicy, SlaService (snapshot + defensif), AuditLogger, NotificationService, state TicketFactory, `ApiResponse::paginated()` resource-aware, migration index
  - **3b (Ticket CRUD)**: DTO + FormRequest + rule kepemilikan asset, `TicketService::create/update/delete/find`, `TicketResource`/`TicketListResource`, `TicketController`, `GET /api/assets/assignable`
  - **3c (Ticket Query & References)**: list dengan scoping role, 11 filter, search LIKE, sort whitelist, dan 4 endpoint referensi read-only (`/ticket-categories`, `/ticket-priorities`, `/ticket-statuses`, `/technicians`)
  - **3d (Ticket Workflow & Concurrency)**: `TicketStatusService` (assign/unassign/self-assign/status/priority), optimistic locking `expected_status_id` (409 Conflict), `available_actions`, `editable_fields`
  - **3e (Comments, History, & Golden Path)**: komentar CRUD (jendela 15 menit), history timeline berurutan menaik dengan label manusia, notifikasi `TICKET_COMMENTED`, dan `GoldenPathTest` end-to-end via HTTP
- **Fase 4 (SLA, Notification, Audit Log) — SELESAI (Tag: `v0.4.0`)**:
  - **4a (SLA Scheduler & Breach Detection)**: background command `tickets:check-sla`, persistensi breach status & timestamp, audit trail sistem `sla_breach` (`user_id = null`), notifikasi `TICKET_SLA_BREACHED` ke teknisi & manager
  - **4b (Notification API & Event Delivery)**: endpoint `GET /api/notifications` (filter, pagination, ISO 8601 UTC), `GET /api/notifications/unread-count` (1 query COUNT), `POST /api/notifications/{id}/read` & `POST /api/notifications/read-all`, isolasi kepemilikan ketat (404 untuk akses notifikasi user lain tanpa bypass admin), verifikasi pengiriman 11 tipe notifikasi
  - **4c (Audit Log API)**: endpoint `GET /api/audit-logs` (ringkas) dan `GET /api/audit-logs/{id}` (lengkap dengan old/new data & user_agent), pembatasan query server Manager (hanya modul ticket, asset, article), pencegahan kebocoran data (200 list kosong & 404 detail), konversi presisi filter tanggal Asia/Jakarta ke UTC, dan verifikasi cakupan seluruh event sistem
- **Fase 5 (Modul Pendukung & Administrasi) — SELESAI**:
  - **5a (Foundation, Spec, Policy, Enum, Index, Disk) — SELESAI**: amandemen D-08/D-11, `ArticlePolicy`, `AttachmentPolicy`, `AssetPolicy` lengkap, enum `ArticleStatus` & `AssetHistoryAction`, penambahan 3 index skema, disk `private` (`serve => false`), factory states.
  - **5b (Asset Management) — SELESAI**: CRUD asset (T/M/A, tanpa delete utk T), assign & release dengan row locking `lockForUpdate()` (D-09) & validasi status/konflik, search 3-field + filter + sort whitelist + meta pagination tanpa N+1, detail asset dengan relasi pemegang aktif, timeline riwayat gabungan `GET /api/assets/{id}/history`, dan endpoint kepemilikan `GET /api/my-assets`.
  - **5c (Knowledge Base) — SELESAI**: CRUD artikel, category, publish/unpublish workflow, slug uniqueness, view counter.
  - **5d (File Attachment) — SELESAI**: Private disk storage, upload validation (MIME & extension), secure download controller under TicketPolicy.
  - **5e (User & Master Data Administration) — SELESAI**: CRUD user, role, department, ticket categories, ticket priorities & SLA configs.
- **Fase 6 (Dashboard & Analytics API) — SELESAI (Tag: `v0.6.0`)**:
  - **6a (Foundation & Query Kernel) — SELESAI**: `DashboardDateRange`, `DashboardCountsQuery`, `SlaMetricsCalculator`, `TicketTrendQuery`, `TechnicianPerformanceQuery`.
  - **6b (Employee & Technician Dashboards) — SELESAI**: `GET /api/dashboard/employee` & `GET /api/dashboard/technician` dengan scoping ketat.
  - **6c (Manager Dashboard) — SELESAI**: `GET /api/dashboard/manager` dengan SLA metrics (D-03), daily trend WIB, distribusi priority & category, serta performa teknisi.
  - **6d (Admin Dashboard & Finalisasi) — SELESAI**: `GET /api/dashboard/admin` memperluas metrik manager dengan sistem totals (user, technician, department, asset), status asset breakdown, recent system audit logs, serta verifikasi N+1/performa (<500ms).
- **Fase 7 (Frontend Foundation, App Shell, & Shared Components) — SELESAI (Tag: `v0.7.0`)**:
  - App Shell responsif, Plus Jakarta Sans, warm-neutral theme, 16 baseline UI + 9 shared components, TanStack Query polling notifikasi 30 detik.
- **Fase 8 (Fitur Frontend Lengkap) — SELESAI (Tag: `v0.8.0`)**:
  - Seluruh halaman modul operasional: tiket, aset, knowledge base, administrasi master data/user, profil, audit logs, serta unit testing frontend komprehensif.
- **Fase 9 (Dashboard UI & Visual Analytics) — SELESAI (Tag: `v0.9.0`)**:
  - **9a (Amandemen Backend & Komponen Bersama)**: Amandemen API B1 (`sla_compliance_percentage` technician), B2 (`unassigned_tickets` manager), B3 (`ticket` referensi pada recent activity), dan B4 (`ArticleListResource` recent articles employee); komponen `MetricCard`, `DashboardPanel`, `LazyChart`, `DateRangePicker`.
  - **9b (Dashboard Employee & Technician)**: Metrik ringkasan, tiket aktif/assigned, highlight pelanggaran SLA, kartu aset & artikel terbaru, serta tautan cepat.
  - **9c (Dashboard Manager)**: Kartu operasional & tiket unassigned, SLA compliance gauge/ring, tren tiket harian responsif Recharts (Area/Bar) dengan date range picker, pie/donut charts breakdown, serta tabel performa teknisi yang dapat diurutkan.
  - **9d (Dashboard Admin)**: Gabungan metrik analitik manager + total sistem pengguna/teknisi/departemen/aset, status aset breakdown chart, audit log aktivitas sistem real-time, dan router dashboard otomatis sesuai role di `/`.
  - **9e (E2E Testing & Accessibility)**: Playwright automated test suite mencakup keempat tampilan dashboard role, interaksi filter date range, pengurutan tabel, verifikasi empty state akun baru, dan audit kepatuhan aksesibilitas WCAG 2.2 AA (axe-core 0 violation).
- **Fase 10 (Quality, Deployment, Demo — Berjalan)**:
  - **10a (Security Audit & Hardening)**: Verifikasi 65 route rows, rate limiting login/upload/search/api, proteksi mass assignment audit, exception handling tanpa stack trace di production.
  - **10b (Docker Produksi)**: Multi-stage Dockerfile untuk API (FrankenPHP classic) dan Web (Next.js standalone), isolated scheduler container, persistent volume data MySQL & shared attachment, stack `compose.prod.yaml` terverifikasi.
  - **10c (CI & Dokumentasi)**: GitHub Actions CI pipeline (`.github/workflows/ci.yml`), panduan deployment produksi final (`docs/ops/DEPLOYMENT.md`), panduan testing & pemetaan business rules (`docs/ops/TESTING.md`), sinkronisasi skema ERD (`docs/schema.sql`), catatan arsitektur presentasi (`docs/ops/ARCHITECTURE-NOTES.md`).
- `apps/api` — Laravel 13.29 + Sanctum 4, 24 migration, 18 model, 37 routes (53 operations), 699 test passing (2975 assertions, 0 failures), Pint bersih
- `apps/web` — Next.js 16.3 + React 19 + Tailwind v4, 33 app routes, 347 passing unit/component tests, Playwright E2E test suite

### Dalam Pengerjaan (Fase 10)

- 10d (Octane Worker Mode evaluation & benchmarking)
- 10e (Demo Data & Golden Path scenario)
- 10f (Buffer, CSV Export, final polish)
- 10g (Final verification & Tag `v1.0.0`)

Urutan pengerjaan beserta checklistnya ada di [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md).

---

## Menjalankan Proyek

### Prasyarat

| Kebutuhan | Versi | Catatan |
| --- | --- | --- |
| Docker + Compose | Docker 24+, Compose v2+ | Jalur yang direkomendasikan |
| PHP | 8.3+ | Hanya untuk pengembangan tanpa Docker |
| Composer | 2.x | |
| Node.js | 22 LTS | |
| MySQL | 8.x | Hanya untuk pengembangan tanpa Docker |

### Dengan Docker

```bash
git clone <repo-url> JarvisOps
cd JarvisOps

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# generate application key jika belum ada di apps/api/.env
# cd apps/api && php artisan key:generate

make up          # menyalakan api, scheduler, mysql, web
make migrate     # menjalankan migration
make seed        # data referensi + akun demo
```

| Layanan | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API | http://localhost:8000/api |
| Health check | http://localhost:8000/up |

Container `scheduler` berjalan terpisah dari container web. Ini bukan pilihan gaya: FrankenPHP hanya melayani HTTP, jadi tanpa container tersebut pemeriksaan SLA tiap 5 menit tidak akan pernah jalan.

### Tanpa Docker

```bash
# Backend
cd apps/api
composer install
cp .env.example .env
php artisan key:generate
# sesuaikan DB_* di .env ke MySQL lokal
php artisan migrate --seed
php artisan serve                 # http://localhost:8000

# Scheduler, di terminal terpisah
php artisan schedule:work

# Frontend, di terminal terpisah
cd apps/web
npm install
npm run dev                       # http://localhost:3000
```

### Perintah yang sering dipakai

```bash
make up / make down          # nyalakan / matikan seluruh service
make sh                      # shell ke container api
make migrate                 # jalankan migration
make fresh                   # migrate:fresh --seed
make test                    # jalankan test suite (Pest)
make pint                    # format kode PHP
make logs                    # ikuti log seluruh service
```

---

## Akun Demo

Dibuat oleh seeder. **Untuk pengembangan dan demo lokal saja** — dilarang keras menggunakan kredensial default ini pada deployment publik atau server produksi (lihat panduan pengamanan di [`docs/ops/DEPLOYMENT.md`](docs/ops/DEPLOYMENT.md)).

| Email | Role | Password Dev |
| --- | --- | --- |
| `admin@jarvisops.test` | Administrator | `Password123!` |
| `manager@jarvisops.test` | Manager | `Password123!` |
| `technician@jarvisops.test` | Technician | `Password123!` |
| `employee@jarvisops.test` | Employee | `Password123!` |

Tidak ada registrasi publik. Akun hanya dibuat oleh Administrator atau seeder — JARVIS OPS adalah sistem internal perusahaan. Prosedur penggantian kata sandi wajib (`must_change_password`) aktif secara otomatis untuk akun yang baru di-reset oleh administrator.

---

## Testing

Backend memakai **Pest 5**. Cakupan yang dituju adalah business-critical logic: matriks otorisasi seluruh role, workflow dan transisi status ticket, perhitungan dan pelanggaran SLA, validasi kepemilikan aset, serta validasi file attachment.

```bash
cd apps/api
php artisan test                              # seluruh test
php artisan test --filter=TicketWorkflow      # satu berkas atau grup
php artisan test --parallel                   # paralel via paratest
```

Test memakai SQLite in-memory supaya cepat. Karena migration adalah satu-satunya sumber kebenaran skema, `RefreshDatabase` selalu menghasilkan struktur yang sama dengan MySQL produksi.

Catatan versi: Pest 5 mensyaratkan `phpunit/phpunit ^13.3`, lebih tinggi dari default skeleton Laravel. Bump ini sudah diverifikasi kompatibel dengan Laravel 13 dan Collision 8.9.

---

## Alur Kerja Utama

```
Employee membuat ticket
        ↓  status OPEN, SLA deadline dihitung
Manager assign technician
        ↓  status ASSIGNED, notifikasi ke technician
Technician mulai mengerjakan
        ↓  status IN_PROGRESS
Komentar + attachment didokumentasikan
        ↓
Technician menandai selesai
        ↓  status RESOLVED, resolved_at tersimpan
Employee mengonfirmasi
        ↓  status CLOSED, closed_at tersimpan
Manager melihat analytics: SLA compliance & performa tim
```

Berjalan paralel: scheduler memeriksa setiap ticket aktif tiap 5 menit, menandai yang melewati deadline sebagai SLA breached, lalu mengirim notifikasi ke technician pemegang dan Manager.

Aturan lengkap termasuk jalur pembatalan dan reopen ada di [`docs/product/STATUS-TRANSITION.md`](docs/product/STATUS-TRANSITION.md).

---

## Catatan Keamanan

Prinsip yang berlaku di seluruh basis kode:

- Backend adalah satu-satunya sumber kebenaran untuk permission, SLA, kepemilikan aset, kepemilikan ticket, dan seluruh business rule. Frontend tidak pernah menentukan salah satunya.
- Menyembunyikan menu atau tombol di frontend adalah kenyamanan pengguna, bukan mekanisme keamanan.
- Field yang menentukan kepemilikan dan SLA selalu ditetapkan server, dan diabaikan bila dikirim client. Daftar lengkapnya ada di [`docs/api/API-CONTRACT.md`](docs/api/API-CONTRACT.md) bagian 13.
- Untuk resource yang keberadaannya sendiri bersifat sensitif, respons kegagalan adalah 404, bukan 403 — 403 memberi tahu penyerang bahwa ID tersebut ada.
- Attachment hanya bisa diakses melalui controller yang memeriksa Policy ticket induknya.
- Upload dibatasi 5 MB dan hanya menerima JPG, JPEG, PNG, PDF. Validasi dilakukan di backend terhadap MIME type sekaligus ekstensi.

---

## Konteks Proyek

JARVIS OPS adalah capstone project. Keberhasilannya tidak diukur dari banyaknya fitur, melainkan dari kemampuan menunjukkan pembangunan aplikasi secara end-to-end: memahami masalah nyata, merancang alur kerja, mendesain basis data relasional, membangun API yang andal beserta otorisasinya, dan menyajikannya lewat antarmuka yang bisa dipakai.

Fitur yang secara sadar tidak dikerjakan: real-time chat, aplikasi mobile native, chatbot AI, payroll, manajemen keuangan, akuntansi inventaris, dan arsitektur multi-tenant. Alasan dan batasan lengkapnya ada di [`docs/product/PRD.md`](docs/product/PRD.md) bagian 32 dan 34.
