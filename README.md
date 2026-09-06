# JARVIS OPS

**IT Service Management System** — platform terpusat untuk mengelola permintaan dan permasalahan IT, aset perusahaan, knowledge base, serta monitoring performa layanan IT.

[![Release](https://img.shields.io/badge/Release-v1.1.0-blue.svg)](https://github.com/Febrian1202/JarvisOps/releases)
[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-727%20Passing-brightgreen.svg)]()
[![Frontend Tests](https://img.shields.io/badge/Frontend%20Tests-352%20Passing-brightgreen.svg)]()
[![Accessibility](https://img.shields.io/badge/WCAG-2.2%20AA-success.svg)]()
[![Stack](https://img.shields.io/badge/Stack-Laravel%2013%20%7C%20Next.js%2016%20%7C%20MySQL%208%20%7C%20FrankenPHP-orange.svg)]()

> **Production-Ready IT Service Management Monorepo (Tag `v1.1.0`)**  
> JARVIS OPS telah melewati seluruh siklus rekayasa perangkat lunak secara komprehensif: 18 model database terindeks, 727 backend test (3300+ assertions), otorisasi berbasis role policy ketat, background SLA scheduler dengan deteksi breach otomatis, notifikasi in-app, 4 dashboard analytics per role (Employee, Technician, Manager, Admin), arsitektur BFF Next.js 16 + React 19 + Tailwind v4, audit aksesibilitas WCAG 2.2 AA (0 violation), Docker stack produksi multi-stage, serta antarmuka responsif mobile & touch ergonomics.

---

## Navigasi Dokumen Penting

Untuk reviewer capstone dan tim pengembang:

- 🚀 **[Panduan Deployment Produksi](docs/ops/DEPLOYMENT.md)** — Konfigurasi `compose.prod.yaml`, SSL/TLS Caddy, optimasi OPcache/standalone.
- 🎯 **[Demo Runbook & Skenario Evaluasi](docs/ops/DEMO-RUNBOOK.md)** — Panduan langkah demi langkah demonstrasi sistem untuk reviewer.
- 🧪 **[Panduan Testing & Kepatuhan DoD](docs/ops/TESTING.md)** — Pemetaan business rules, hasil pengujian unit/feature/E2E, dan verifikasi kriteria sukses teknis.
- 🗺️ **[Roadmap & Riwayat Sprint](docs/product/ROADMAP.md)** — Arsip detail eksekusi Fase 0 s.d. Fase 11.
- 🔒 **[Audit Keamanan & Kepatuhan](docs/ops/SECURITY-AUDIT.md)** — Inventaris 65 route, pembatasan otorisasi, proteksi injection, dan rate limiting.

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
Satu container untuk web server dan PHP, dengan HTTPS otomatis lewat Caddy. Classic mode dipilih karena perilakunya identik dengan PHP-FPM, sehingga tidak ada risiko state bocor antar-request. Worker mode (Octane) telah dievaluasi di Fase 10 dan tetap tersedia sebagai opsi lewat `compose.prod.octane.yaml` — hasil benchmark dan auditnya ada di [`docs/ops/OCTANE-AUDIT.md`](docs/ops/OCTANE-AUDIT.md).

**Notification: database + polling 30 detik.**
WebSocket tidak sepadan untuk MVP internal. Polling menerima keterlambatan sampai 30 detik sebagai ganti kesederhanaan operasional yang besar.

Uraian lengkap ada di [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md) bagian 2 dan [`docs/adr/DECISIONS.md`](docs/adr/DECISIONS.md).

---

## Struktur Repo

```
JarvisOps/
├── apps/
│   ├── api/                  Laravel 13 + Sanctum 4  (PHP 8.3+)
│   └── web/                  Next.js 16 + React 19 + Tailwind v4
├── docker/                   environment dev
├── compose.yaml              stack dev (api, scheduler, mysql, web)
├── compose.prod.yaml         stack produksi multi-stage
├── compose.prod.octane.yaml  override opsional Octane worker mode
├── Makefile                  perintah dev (make up, make test, ...)
├── docs/
│   ├── product/
│   │   ├── PRD.md                    Product requirements + addendum v1.1
│   │   ├── ROADMAP.md                Riwayat eksekusi fase + checklist
│   │   ├── STATUS-TRANSITION.md      Matriks transisi status ticket × role
│   │   └── PERMISSION-MATRIX.md      Ability, Policy, aturan 403 vs 404
│   ├── api/
│   │   └── API-CONTRACT.md           Envelope, endpoint, query param
│   ├── architecture/
│   │   ├── ERD.md                    Penjelasan 18 tabel dan relasinya
│   │   ├── DFD.md                    Data flow level 1 & 2
│   │   ├── CONTEXT-DIAGRAM.md        Batas sistem dan aktor eksternal
│   │   ├── BACKEND-ARCHITECTURE.md    Pola service layer, DTO & request pipeline
│   │   ├── FRONTEND-ARCHITECTURE.md   Pola BFF, komponen & state frontend
│   │   └── CONTEXT-DIAGRAM.drawio
│   ├── adr/
│   │   └── DECISIONS.md              Keputusan teknis D-01..D-24
│   ├── ops/
│   │   ├── DEPLOYMENT.md             Panduan deployment produksi
│   │   ├── TESTING.md                Pemetaan test ↔ business rule
│   │   ├── DEMO-RUNBOOK.md           Skenario demo untuk reviewer
│   │   ├── SECURITY-AUDIT.md         Audit keamanan & hardening
│   │   └── ...
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
| [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md) | Riwayat eksekusi 11 fase beserta exit criteria | Menelusuri keputusan & urutan pengerjaan |
| [`docs/adr/DECISIONS.md`](docs/adr/DECISIONS.md) | Catatan keputusan teknis yang menutup gap pada dokumen desain | Saat menulis migration, policy, dan API controller |

---

## Status Rilis

**Rilis terkini: `v1.1.0`** — seluruh fase roadmap selesai dan diverifikasi menyeluruh. Repositori berada dalam kondisi siap produksi dan siap dievaluasi.

### Metrik kualitas

| Aspek | Hasil |
| --- | --- |
| Backend | Laravel 13.29 + Sanctum 4, 24 migration, 18 model, 40 routes (56 operations) |
| Test backend | 727 passing (3300+ assertions), Pest 5, Pint bersih |
| Frontend | Next.js 16.3 + React 19 + Tailwind v4, 33 app routes |
| Test frontend | 352 unit/component passing (Vitest) |
| Test E2E | 21 skenario Playwright desktop + suite mobile Pixel 7 & iPhone 14 |
| Aksesibilitas | WCAG 2.2 AA — 0 violation (axe-core) |
| Kriteria sukses | 11 poin Definition of Technical Success + 10 poin Definition of Done terverifikasi |
| CI | GitHub Actions otomatis (`.github/workflows/ci.yml`) |
| Keamanan | Rate limiting, validasi ganda MIME + extension, audit mass assignment (`docs/ops/SECURITY-AUDIT.md`) |

### Riwayat fase

| Fase | Cakupan | Tag |
| --- | --- | --- |
| 0 | Repo, Docker, toolchain, Pest 5 | — |
| 2 | Backend fondasi & walking skeleton (auth, BFF proxy) | — |
| 3 | Ticket core & workflow (CRUD, query, transisi, komentar, history) | `v0.3.0` |
| 4 | SLA scheduler & breach detection, notifikasi, audit log API | `v0.4.0` |
| 5 | Asset, knowledge base, file attachment, administrasi master data | — |
| 6 | Dashboard & analytics API untuk 4 role | `v0.6.0` |
| 7 | Frontend foundation, app shell, shared components | `v0.7.0` |
| 8 | Fitur frontend lengkap seluruh modul | `v0.8.0` |
| 9 | Dashboard UI & visual analytics, E2E & aksesibilitas | `v0.9.0` |
| 10 | Quality, deployment produksi, demo, CSV export | `v1.0.0` |
| 11 | Mobile responsive layout & touch ergonomics | `v1.1.0` |

Rincian teknis per fase beserta checklist eksekusinya ada di [`docs/product/ROADMAP.md`](docs/product/ROADMAP.md).

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

### Mode Pengembangan (Docker)

```bash
git clone <repo-url> JarvisOps
cd JarvisOps

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

make up          # menyalakan api, scheduler, mysql, web
make migrate     # menjalankan migration
make seed        # data referensi + akun demo
```

| Layanan | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API | http://localhost:8000/api |
| Health check | http://localhost:8000/api/health |

Container `scheduler` berjalan terpisah dari container web. Ini bukan pilihan gaya: FrankenPHP hanya melayani HTTP, jadi tanpa container tersebut pemeriksaan SLA tiap 5 menit tidak akan pernah jalan.

### Mode Produksi (Docker Compose)

Stack produksi multi-stage (`compose.prod.yaml`) memakai image API FrankenPHP classic + scheduler terisolasi dan Web Next.js standalone:

```bash
docker compose -f compose.prod.yaml up --build -d
docker compose -f compose.prod.yaml exec api php artisan db:seed --force
```

Panduan lengkap — environment produksi, optimasi cache, backup/restore MySQL, opsi Octane worker mode (`compose.prod.octane.yaml`) — ada di [`docs/ops/DEPLOYMENT.md`](docs/ops/DEPLOYMENT.md).

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
make test                    # jalankan test suite backend (Pest)
make test-web                # jalankan test frontend (Vitest)
make lint-web                # eslint frontend
make typecheck-web           # tsc --noEmit frontend
make check                   # test-api + pint + lint + typecheck + test-web
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

Cakupan pengujian menyentuh seluruh lapis: business-critical logic di backend, komponen UI di frontend, dan skenario end-to-end pengguna.

### Backend (Pest 5)

Fokus pada matriks otorisasi seluruh role, workflow dan transisi status ticket, perhitungan dan pelanggaran SLA, validasi kepemilikan aset, serta validasi file attachment.

```bash
cd apps/api
php artisan test                              # seluruh test
php artisan test --filter=TicketWorkflow      # satu berkas atau grup
php artisan test --parallel                   # paralel via paratest
```

Test memakai SQLite in-memory supaya cepat. Karena migration adalah satu-satunya sumber kebenaran skema, `RefreshDatabase` selalu menghasilkan struktur yang sama dengan MySQL produksi.

Catatan versi: Pest 5 mensyaratkan `phpunit/phpunit ^13.3`, lebih tinggi dari default skeleton Laravel. Bump ini sudah diverifikasi kompatibel dengan Laravel 13 dan Collision 8.9.

### Frontend (Vitest) & E2E (Playwright)

```bash
cd apps/web
npm run test        # 352 unit/component test
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npx playwright test # 21 skenario E2E desktop + mobile (Pixel 7, iPhone 14)
```

Pemetaan antara test dan business rule yang dijaganya ada di [`docs/ops/TESTING.md`](docs/ops/TESTING.md).

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
