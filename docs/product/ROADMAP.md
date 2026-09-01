# JARVIS OPS — DEVELOPMENT ROADMAP

**Version:** 1.0
**Basis:** PRD v1.0 + Addendum v1.1, `docs/adr/DECISIONS.md`, ERD v1.2 (`docs/schema.sql`), `docs/architecture/ERD.md`, `docs/architecture/DFD.md`, `docs/architecture/CONTEXT-DIAGRAM.md`
**Durasi:** 7 minggu kerja + 1 minggu buffer (full-time)
**Status:** Approved — siap dieksekusi

---

## 1. Cara Membaca Dokumen Ini

Roadmap ini dibagi menjadi **10 fase** yang dipetakan ke **8 minggu**. Setiap fase memiliki:

- **Tujuan** — mengapa fase ini ada
- **Task checklist** — pekerjaan konkret yang bisa dicentang
- **Deliverable** — artefak yang dihasilkan
- **Exit criteria** — kondisi terukur yang harus terpenuhi sebelum lanjut ke fase berikutnya

Aturan main: **jangan pindah fase sebelum exit criteria terpenuhi.** Fase berikutnya dibangun di atas asumsi bahwa fase sebelumnya benar. Melanggar ini adalah cara paling umum proyek dengan timeline ketat berakhir dengan integrasi yang gagal di minggu terakhir.

---

## 2. Keputusan Teknis Yang Sudah Dikunci

Keputusan berikut sudah final dan tidak perlu diperdebatkan lagi saat implementasi.

| Topik | Keputusan | Alasan |
| --- | --- | --- |
| Struktur repo | Monorepo, satu `.git` di root | CI tunggal, Docker Compose tunggal, satu submission |
| Backend | Laravel 13.17 + Sanctum 4 (`apps/api`) | Sudah terpasang |
| Frontend | Next.js 16.3 + React 19 + Tailwind v4 (`apps/web`) | Sudah terpasang |
| Database | MySQL 8 (dev & prod), SQLite in-memory (test) | Test cepat, prod sesuai PRD |
| Runtime container | **FrankenPHP classic mode** (bukan PHP-FPM + Nginx) | Satu container, HTTPS otomatis, tanpa risiko state bocor |
| Octane worker mode | **Opsional, Fase 10** | Butuh test suite lengkap sebagai jaring pengaman |
| Testing | **Pest 5** (+ paratest), butuh `phpunit/phpunit: ^13.3` | Sintaks ringkas, dataset provider enak untuk matriks RBAC |
| Skema DB | Migration Laravel = source of truth | Version control + `RefreshDatabase` |
| `docs/schema.sql` | Dokumen lampiran, disinkronkan di Fase 10 | Untuk laporan & ERD |
| Auth | Sanctum API token dalam httpOnly cookie, Next.js sebagai BFF | Token tak pernah tersentuh JS browser |
| Notifikasi | DB + polling 30 detik, tanpa WebSocket | Sesuai Addendum §4 |
| SLA | Snapshot saat create + scheduler 5 menit + hitung defensif di query | Sesuai Addendum §3 |
| Attachment | Laravel Storage lokal, download lewat controller terautentikasi | Sesuai Addendum §6.5 |
| UI kit | shadcn/ui + TanStack Query + Recharts + react-hook-form + zod | Server-side table, polling, chart |

### Ruang lingkup yang dipotong secara sadar

Masuk MVP: attachment, technician performance analytics (keduanya sudah punya tabel di skema dan disebut Addendum §9).

Ditunda ke Fase 10 sebagai opsional: export report, advanced filtering, dark mode, saved filters.

Tidak dikerjakan: email notification (butuh SMTP + queue worker, biaya infra tidak sepadan karena in-app notification sudah ada), WebSocket, mobile native, AI.

---

## 3. Ringkasan Timeline

| Minggu | Fase | Fokus |
| --- | --- | --- |
| 1 | 0, 1, 2 (mulai) | Infra, dokumen desain teknis, migration |
| 2 | 2 (lanjut) | Auth, RBAC, walking skeleton end-to-end |
| 3 | 3 | Ticket core + workflow + history |
| 4 | 4, 5 (mulai) | SLA, notification, audit log, asset |
| 5 | 5 (lanjut), 6, 7 (mulai) | Knowledge base, attachment, dashboard API, fondasi FE |
| 6 | 7 (lanjut), 8 | Fitur frontend |
| 7 | 8 (lanjut), 9, 10 (mulai) | Dashboard UI, quality, deployment |
| 8 | 10 (lanjut) | Buffer: bug fixing, opsional, demo prep |

### Milestone yang bisa didemokan

| Akhir minggu | Yang bisa ditunjukkan |
| --- | --- |
| 1 | `docker compose up` jalan, DB terisi seed, dokumen desain lengkap |
| 2 | Login dari browser → halaman terproteksi menampilkan identitas user |
| 3 | Golden path ticket lengkap via API (Postman/HTTP client) |
| 4 | SLA breach terdeteksi otomatis + notifikasi masuk |
| 5 | Seluruh API MVP selesai, frontend sudah punya shell + auth |
| 6 | Ticket, asset, KB bisa dioperasikan penuh dari UI |
| 7 | Aplikasi utuh, jalan di container produksi |
| 8 | Demo golden path §38 PRD siap dipresentasikan |

---

# FASE 0 — Repo, Docker, Toolchain

**Minggu 1, hari 1–2**

## Tujuan

Menyiapkan satu perintah yang menjalankan seluruh stack, sehingga tidak ada waktu terbuang untuk masalah environment di fase-fase berikutnya.

## Task

### Git & struktur monorepo

- [x] `git init` di root `/JarvisOps`
- [x] Absorb repo `apps/web` yang berdiri sendiri: hapus `apps/web/.git` (history-nya hanya 1 commit template `create-next-app`, tidak ada yang perlu diselamatkan)
- [x] `.gitignore` root: `node_modules/`, `vendor/`, `.env`, `.next/`, `storage/logs/*`, `storage/framework/cache/*`, `*.sqlite`
- [x] Commit awal seluruh isi repo
- [x] Branch strategy: `main` sebagai integrasi, kerja di `feat/<fase>-<topik>`, merge lewat PR (walau solo — bagus untuk jejak review di laporan)
- [x] `README.md` root: deskripsi singkat, struktur folder, cara menjalankan

### Toolchain backend

- [x] Ganti PHPUnit dengan Pest 5:
      `composer require --dev "pestphp/pest:^5.1" "pestphp/pest-plugin-laravel:^5.0" "phpunit/phpunit:^13.3" -W`
      Catatan: bump `phpunit/phpunit` dari `^12.5.12` ke `^13.3` **wajib** — Pest 5 mensyaratkan PHPUnit 13. Laravel 13 dan Collision 8.9 keduanya mengizinkan PHPUnit 13, jadi tidak ada konflik lain.
- [x] Hapus `phpunit.xml`, ganti dengan `phpunit.xml` versi Pest + `tests/Pest.php`
- [x] `tests/Pest.php`: bind `Tests\TestCase` dan `RefreshDatabase` ke `tests/Feature`
- [x] Hapus `tests/Feature/ExampleTest.php` dan `tests/Unit/ExampleTest.php`, ganti dengan satu smoke test Pest (`HealthCheckTest.php`)
- [x] Konfirmasi `php artisan test` hijau lewat runner Pest
- [x] `.env`: `DB_CONNECTION=mysql`, `DB_DATABASE=JarvisOps`; hapus `database/database.sqlite` dari repo
- [x] Pint: pastikan `composer exec pint -- --test` bersih

### Docker Compose (development)

- [x] `compose.yaml` di root dengan service:
  - `api` — image `dunglas/frankenphp:1-php8.5` (disesuaikan dengan host 8.5 agar vendor bind-mount valid), mount `apps/api`, expose `:8000`
  - `scheduler` — image sama, command `php artisan schedule:work`
  - `mysql` — `mysql:8.4`, volume persisten, healthcheck
  - `web` — `node:22-alpine`, mount `apps/web`, command `npm install && npm run dev`, expose `:3000`
- [x] `docker/api/Dockerfile.dev` — FrankenPHP + ekstensi (`pdo_mysql`, `gd`, `zip`, `intl`, `bcmath`, `opcache`) via `install-php-extensions`
- [x] Caddyfile FrankenPHP default dipakai langsung via env `SERVER_NAME=http://:8000` (root ke `public/` + `php_server`)
- [x] Service `scheduler` **wajib terpisah**. FrankenPHP hanya melayani HTTP; tanpa container ini, SLA check tiap 5 menit tidak akan pernah jalan.
- [x] Database kedua `jarvisops_testing` disiapkan di init script MySQL (`docker/mysql/init/01-create-testing-database.sql`)
- [x] `Makefile`: `up`, `down`, `sh`, `migrate`, `fresh`, `seed`, `test`, `pint`, `logs`

### Catatan Penyesuaian Implementasi Fase 0

1. **PHP 8.5 Runtime:** Container `api` dan `scheduler` menggunakan `dunglas/frankenphp:1-php8.5` menyesuaikan PHP host (8.5.8) agar `vendor/` hasil composer host dapat di-bind mount tanpa error `platform_check`.
2. **Caddyfile Configuration:** Default Caddyfile bawaan FrankenPHP sudah menangani server web public Laravel dengan aman; konfigurasi diarahkan via environment variable `SERVER_NAME=http://:8000`.

### Catatan FrankenPHP

FrankenPHP dipakai dalam **classic mode** (satu request satu proses, seperti PHP-FPM tapi tanpa Nginx terpisah). Ini pilihan yang aman: perilakunya identik dengan PHP-FPM, jadi tidak ada risiko state bocor antar-request.

**Worker mode** (Octane, aplikasi tetap di memori antar-request) memberi peningkatan performa besar tapi mengubah asumsi: singleton yang menyimpan state per-request, `static` property, dan container binding yang tidak di-reset bisa membocorkan data antar-user — kelas bug yang sangat mahal untuk didiagnosis. Karena itu worker mode ditunda ke Fase 10, dikerjakan hanya jika test suite sudah lengkap sebagai jaring pengaman, dan hanya dengan `laravel/octane:^2.19` (Octane 3 belum tersedia).

## Deliverable

`compose.yaml`, `docker/`, `Makefile`, `README.md`, Pest terpasang.

## Exit criteria

- [x] `make up` menyalakan seluruh service tanpa error
- [x] `GET http://localhost:8000/up` → `200` dengan body JSON (atau HTML OK untuk Fase 0)
- [x] `http://localhost:3000` menampilkan halaman Next.js
- [x] `make migrate` berhasil terhadap MySQL di container
- [x] `make test` menjalankan Pest dan hijau
- [ ] Repo bersih: `git status` tidak menampilkan file yang seharusnya di-ignore

---

# FASE 1 — Dokumen Desain Teknis

**Minggu 1, hari 3–4**

## Tujuan

PRD menjelaskan *apa*, ERD menjelaskan *data*. Tiga hal berikut belum terdefinisi dan kalau tidak diputuskan sekarang akan jadi keputusan ad-hoc yang tersebar di seluruh kode: bentuk respons API, transisi status yang legal, dan arti "Limited" pada matriks permission.

Fase ini tidak menghasilkan kode. Itu wajar dan sengaja.

> **Status: SELESAI.** Ketiga dokumen sudah ditulis bersamaan dengan roadmap ini. Checklist di bawah disimpan sebagai catatan cakupan, dan exit criteria-nya sudah diverifikasi.

## Task

### `docs/api/API-CONTRACT.md`

- [x] Envelope respons sukses & error yang konsisten (NFR-005, NFR-006)
- [x] Format error validasi (422) yang bisa dipetakan langsung ke field react-hook-form
- [x] Format pagination (§25 PRD)
- [x] Daftar endpoint final beserta query parameter filter/sort/search per resource (§24 PRD)
- [x] Konvensi penamaan, format tanggal (ISO 8601 UTC), dan aturan HTTP status code
- [x] Daftar field yang tidak boleh dipercaya dari client (§13 dokumen tersebut)

### `docs/product/STATUS-TRANSITION.md`

- [x] Matriks transisi legal: status asal × status tujuan × role yang boleh
- [x] Definisi eksplisit transisi **ilegal** — PRD hanya menyebut jalur bahagia dan reopen `RESOLVED → IN_PROGRESS`, tanpa menyatakan misalnya apakah `OPEN → RESOLVED` boleh (lompat tanpa assignment) atau apakah `CLOSED` benar-benar final
- [x] Side effect setiap transisi: field yang diisi (`resolved_at`, `closed_at`), history yang dicatat, notifikasi yang dikirim
- [x] Prasyarat setiap transisi (mis. `ASSIGNED` mensyaratkan `technician_id` tidak null)
- [x] Definisi `available_actions` yang dikembalikan API

### `docs/product/PERMISSION-MATRIX.md`

- [x] Terjemahkan tabel §5 PRD dan §5.2 Addendum ke nama Policy + ability Laravel yang konkret
- [x] Putuskan arti "Limited":
  - Technician boleh edit & unpublish artikel orang lain, tapi hanya boleh delete miliknya sendiri
  - Manager melihat audit log modul `ticket`, `asset`, `article` saja
  - Technician hanya melihat metrik dirinya, tanpa perbandingan antar-technician
- [x] Tentukan mekanisme: Gate/Policy berbasis kolom `role_id`, **tanpa** paket eksternal. Skema sudah single-role per user, jadi `spatie/laravel-permission` menambah tabel dan konsep yang tidak dipakai.
- [x] Petakan setiap endpoint ke ability yang menjaganya (jadi checklist audit di Fase 10)
- [x] Aturan seragam 403 vs 404

## Deliverable

Tiga dokumen di atas, di-commit.

## Exit criteria

- [x] Setiap endpoint di API contract punya baris di permission matrix
- [x] Setiap transisi status punya jawaban legal/ilegal yang eksplisit — tidak ada sel kosong
- [x] Tidak ada "TBD" tersisa di ketiga dokumen

## Keputusan penting yang lahir di fase ini

Beberapa hal berikut tidak ada di PRD dan diputuskan di sini. Semuanya sudah dijelaskan beserta alasannya di dokumen masing-masing, tapi dirangkum di sini karena berdampak langsung ke implementasi Fase 3.

| Keputusan | Alasan singkat |
| --- | --- |
| Technician boleh self-assign dari `OPEN` | Tanpa ini seluruh ticket macet menunggu Manager |
| `OPEN → RESOLVED` ilegal | Melompati `IN_PROGRESS` merusak makna average resolution time |
| Technician **tidak** boleh menutup ticket-nya sendiri | Tahap konfirmasi adalah alasan `RESOLVED` dan `CLOSED` dipisah |
| `CLOSED` final untuk semua role | Laporan historis tidak boleh berubah setelah dipublikasikan |
| Reopen tidak mereset SLA | Kalau direset, breach bisa dihindari selamanya lewat resolve-reopen |
| Ubah priority menghitung deadline dari `created_at` | Menghitung dari waktu perubahan membuat eskalasi justru memberi waktu tambahan |
| Notifikasi tidak punya pengecualian Admin | Isinya komunikasi personal, tanpa kegunaan operasional bagi Admin |
| Compliance `null` saat belum ada resolved | `0` atau `100` akan salah dibaca sebagai fakta |

---

# FASE 2 — Backend Fondasi & Walking Skeleton

**Minggu 1 hari 5 – Minggu 2**

## Tujuan

Membangun seluruh lapisan data, autentikasi, dan otorisasi — lalu **membuktikan alur auth berjalan dari browser sampai database** sebelum fitur apa pun dibangun di atasnya.

Walking skeleton di minggu 2 ini adalah mitigasi risiko utama roadmap ini. Strategi Bearer-token-di-httpOnly-cookie-via-BFF adalah bagian paling rawan dari arsitektur ini. Menemukan masalahnya di minggu 2 murah; menemukannya di minggu 6 bisa membatalkan banyak pekerjaan frontend.

## Task

### Migration (18 tabel dari `docs/schema.sql`)

Urutan wajib mengikuti dependency foreign key:

- [ ] `roles`, `departments`
- [ ] `users` (FK ke roles, departments), `employee_profiles`
- [ ] `assets`, `asset_assignments`, `asset_histories`
- [ ] `ticket_categories`, `ticket_priorities`, `ticket_statuses`
- [ ] `tickets` (FK ke 7 tabel), `ticket_comments`, `ticket_attachments`, `ticket_histories`
- [ ] `knowledge_categories`, `knowledge_articles`
- [ ] `notifications`, `audit_logs`
- [ ] `audit_logs` mendapat kolom tambahan `description VARCHAR(500) NULL` yang belum ada di `docs/schema.sql` — PRD §23 memintanya dan contoh log di sana berisi kalimat siap baca. Penyimpangan ini didokumentasikan di API contract §11 dan `docs/schema.sql` disinkronkan di Fase 10.
- [ ] Seluruh index sesuai blok `INDEXES` di `docs/schema.sql`
- [ ] Sesuaikan migration default `users` bawaan Laravel agar tidak bertabrakan dengan skema kustom
- [ ] Verifikasi: `migrate:fresh` lalu `migrate:rollback` bersih tanpa error FK

### Model & relasi

- [ ] 18 model dengan relasi Eloquent lengkap dua arah
- [ ] `SoftDeletes` pada tabel yang punya `deleted_at`; tabel append-only (`asset_histories`, `ticket_attachments`, `ticket_histories`, `audit_logs`) hanya punya `created_at` — jangan dipaksa pakai `timestamps`
- [ ] `$fillable` eksplisit di semua model (proteksi mass assignment)
- [ ] Casting: `data` dan `old_data`/`new_data` sebagai `array`, timestamp sebagai `datetime`, `is_read`/`sla_breached`/`is_closed`/`is_final` sebagai `boolean`
- [ ] Factory untuk seluruh entity (fondasi seluruh test)

### Seeder

- [ ] `RoleSeeder` — employee, technician, manager, admin
- [ ] `DepartmentSeeder`
- [ ] `TicketCategorySeeder` — sesuai §8 PRD (Hardware, Software, Network, Account, Other beserta turunannya)
- [ ] `TicketPrioritySeeder` — Critical 120, High 240, Medium 480, Low 1440 (`sla_minutes`)
- [ ] `TicketStatusSeeder` — OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED dengan flag `is_closed`/`is_final` yang benar
- [ ] `KnowledgeCategorySeeder`
- [ ] `DemoUserSeeder` — 4 akun `@jarvisops.test` sesuai Addendum §2.3
- [ ] `DemoDataSeeder` (terpisah, tidak jalan di test) — asset, ticket, artikel contoh

### Autentikasi

- [ ] `POST /api/login` — validasi kredensial, **tolak user dengan `status != 'active'`** (BR-019), catat `last_login_at`, terbitkan token Sanctum
- [ ] `POST /api/logout` — revoke token yang sedang dipakai
- [ ] `GET /api/me` — profil + role + department + permission yang dimiliki
- [ ] Rate limit pada endpoint login
- [ ] Tidak ada route registrasi publik (BR-016) — pastikan tidak ada sisa route bawaan
- [ ] Token ability diberikan sesuai role

### Otorisasi

- [ ] Enum `RoleName` (backed enum) sebagai sumber tunggal nama role
- [ ] Helper di model `User`: `isAdmin()`, `isManager()`, `isTechnician()`, `isEmployee()`
- [ ] Gate/ability sesuai `docs/product/PERMISSION-MATRIX.md`
- [ ] Middleware `role:` untuk penjagaan kasar di level route (Policy tetap jadi penjaga utama)

### Lapisan aplikasi

> **Pola arsitektur:** Kontroler tipis + DTO layer + service layer + pipeline berlapis dijelaskan lengkap di `docs/architecture/BACKEND-ARCHITECTURE.md`. Task di bawah mengacu pada pola tersebut.

- [ ] Struktur folder: `app/Services/<Domain>/`, `app/Http/Requests/<Domain>/`, `app/Http/Resources/<Domain>/`, `app/Policies/<Domain>/`, `app/Enums/`, `app/Exceptions/` — setiap layer dikelompokkan ke subfolder domain (Auth, Ticket, Asset, Article, Notification, Sla, Audit), lihat `docs/architecture/BACKEND-ARCHITECTURE.md` §5.3
- [ ] `ApiResponse` helper — envelope konsisten sesuai API contract
- [ ] Exception handler: 401/403/404/422/500 selalu JSON dengan bentuk yang sama
- [ ] `HandlesPagination` trait — pagination seragam
- [ ] `GET /api/health` untuk healthcheck container

### Walking skeleton frontend

- [ ] Next.js route handler `POST /api/auth/login` — teruskan ke Laravel, simpan token di cookie `httpOnly` + `secure` + `sameSite=lax`
- [ ] Route handler `POST /api/auth/logout` — revoke di Laravel, hapus cookie
- [ ] BFF proxy `app/api/proxy/[...path]/route.ts` — baca cookie, tambahkan header `Authorization: Bearer`, teruskan request beserta body/query
- [ ] Middleware Next.js — redirect ke `/login` jika cookie tidak ada
- [ ] Halaman `/login` + satu halaman terproteksi yang menampilkan hasil `/me`
- [ ] **Prinsip yang dikunci di sini:** token tidak boleh pernah dikirim ke browser dalam bentuk yang bisa dibaca JavaScript, dan komponen client tidak boleh memanggil Laravel langsung — selalu lewat proxy

### Test (Pest)

- [ ] Login: kredensial valid, password salah, email tidak ada, user inactive
- [ ] `/me` tanpa token → 401
- [ ] Logout membuat token tidak bisa dipakai lagi
- [ ] Matriks role: dataset provider Pest yang menabrakkan setiap role ke endpoint terlarang → 403
- [ ] Seeder bisa dijalankan berulang tanpa error

## Deliverable

Migration + model + factory + seeder lengkap, auth API, RBAC, BFF proxy, halaman login yang berfungsi.

## Exit criteria

- [ ] `migrate:fresh --seed` sukses, 18 tabel terisi data referensi
- [ ] Login dari browser berhasil, cookie httpOnly terpasang, halaman terproteksi menampilkan nama user
- [ ] Token tidak terlihat di `document.cookie` maupun di response body yang diterima browser
- [ ] Employee yang inactive tidak bisa login
- [ ] Semua test Pest hijau
- [ ] Setiap ability di permission matrix punya minimal satu test negatif

---

# FASE 3 — Ticket Core & Workflow

**Minggu 3**

## Tujuan

Membangun entitas inti produk beserta seluruh business rule-nya. Ini fase paling padat dan paling menentukan nilai teknis proyek.

## Task

### Ticket CRUD

- [ ] `TicketService::create()` di dalam transaksi database:
  - generate `ticket_number` format `TCK-0001` — gunakan `lockForUpdate()` atau tabel counter, **jangan** `max(id)+1` tanpa lock (rawan tabrakan)
  - status awal `OPEN` (BR-002), `technician_id` null (BR-003)
  - reporter diambil dari user terautentikasi, **bukan** dari request body (BR-001)
  - `department_id` diturunkan dari department reporter
  - snapshot SLA (lihat bawah)
  - catat ticket history + audit log
- [ ] `GET /api/tickets` — scoping berdasarkan role: Employee hanya ticket miliknya, Technician/Manager/Admin semua
- [ ] `GET /api/tickets/{id}` — Policy `view`, eager load relasi untuk hindari N+1
- [ ] `PUT /api/tickets/{id}` — field yang boleh diubah berbeda per role; ticket `CLOSED` tidak bisa diubah Employee (BR-009)
- [ ] `DELETE /api/tickets/{id}` — soft delete, Admin saja

### Snapshot SLA saat create

- [ ] `sla_duration_minutes` dan `sla_deadline` diisi dari `ticket_priorities.sla_minutes` saat ticket dibuat
- [ ] Kolom snapshot ini **wajib** diisi, bukan dihitung ulang lewat join ke priority setiap kali dibaca. Kalau Admin mengubah konfigurasi SLA di kemudian hari, ticket lama harus tetap dinilai dengan SLA yang berlaku saat ia dibuat — kalau tidak, angka compliance historis berubah sendiri dan analytics jadi tidak bisa dipercaya. Skema sudah menyediakan kolom ini dengan benar.
- [ ] Saat priority ticket diubah, putuskan dan dokumentasikan: `sla_deadline` dihitung ulang dari `created_at` dengan durasi baru (bukan dari waktu perubahan), dan perubahannya dicatat di history

### Assignment

- [ ] `POST /api/tickets/{id}/assign` — Manager/Admin saja (BR-004)
- [ ] Validasi target benar-benar user dengan role technician dan berstatus active
- [ ] Status berpindah `OPEN → ASSIGNED`, history dicatat, notifikasi ke technician (Skenario 2 §31)
- [ ] Reassign ticket yang sudah punya technician: diizinkan, dicatat sebagai perubahan `technician_id`

### Status transition

- [ ] `POST /api/tickets/{id}/status` dilayani `TicketStatusService`
- [ ] Validasi terhadap matriks di `docs/product/STATUS-TRANSITION.md` — transisi ilegal → 422 dengan pesan jelas
- [ ] Technician hanya boleh memproses ticket yang di-assign kepadanya (BR-005)
- [ ] `RESOLVED` mengisi `resolved_at`; `CLOSED` mengisi `closed_at`
- [ ] `CLOSED` hanya oleh reporter, Manager, atau Admin (Skenario 5 §31)
- [ ] Reopen `RESOLVED → IN_PROGRESS` oleh reporter (§12 PRD)
- [ ] Setiap transisi menulis ticket history (BR-008) dan audit log (BR-010)

### Relasi asset (Addendum §1)

- [ ] `asset_id` opsional/nullable (BR-011)
- [ ] `GET /api/assets/assignable` — daftar asset yang sedang di-assign ke user login, status layak pakai, bukan retired/lost (Addendum §1.3)
- [ ] **Validasi kepemilikan di backend** (BR-014): rule kustom yang memastikan asset benar-benar ter-assign ke reporter. Filter di frontend hanya kenyamanan, bukan mekanisme keamanan.
- [ ] Employee tidak bisa memilih asset milik Employee lain (BR-012) — ini poin nomor 1 di "Definition of Technical Success" Addendum §12
- [ ] Hapus asset tidak menghapus histori ticket (BR-015) — soft delete + `ON DELETE SET NULL`

### Komentar & history

- [ ] `POST /api/tickets/{id}/comments` — hanya partisipan ticket (reporter, technician, manager, admin)
- [ ] `GET /api/tickets/{id}/comments` — paginated
- [ ] `GET /api/tickets/{id}/histories` — timeline perubahan
- [ ] Notifikasi komentar ke partisipan lain (bukan ke diri sendiri)

### Search, filter, pagination (§24, §25)

- [ ] Search: `ticket_number`, `title`
- [ ] Filter: status, priority, category, technician, rentang tanggal
- [ ] Sort: `created_at`, `sla_deadline`, priority
- [ ] Pagination sesuai format API contract
- [ ] Filter diterapkan **setelah** scoping role — jangan sampai filter jadi jalan memutar untuk melihat ticket orang lain

### Test (Pest)

- [ ] Keenam skenario acceptance criteria §31 PRD, masing-masing satu test
- [ ] Setiap BR-001 sampai BR-015 punya test negatif
- [ ] Employee mencoba memilih asset milik orang lain → 422
- [ ] Technician mencoba memproses ticket yang bukan miliknya → 403
- [ ] Employee mencoba assign technician → 403
- [ ] Transisi ilegal (mis. `OPEN → CLOSED`) → 422
- [ ] Employee mencoba mengubah ticket `CLOSED` → 403
- [ ] Employee melihat daftar ticket → hanya miliknya
- [ ] `ticket_number` unik di bawah pembuatan bersamaan

## Deliverable

Ticket API lengkap dengan workflow, history, komentar, relasi asset, search/filter/pagination, dan test.

## Exit criteria

- [ ] Golden path §38 PRD (create → assign → in progress → resolve → close) bisa diselesaikan penuh via HTTP client
- [ ] Seluruh 6 skenario §31 punya test yang lulus
- [ ] Setiap BR punya test
- [ ] Tidak ada N+1 pada endpoint list dan detail (verifikasi dengan query log)

---

# FASE 4 — SLA, Notification, Audit Log

**Minggu 4, hari 1–3**

## Tujuan

Membuat sistem bereaksi terhadap waktu dan mencatat jejaknya — bagian yang membedakan aplikasi ini dari CRUD biasa.

## Task

### Scheduled SLA check (Addendum §3.3)

- [ ] Command `tickets:check-sla`
- [ ] Query ticket aktif yang `sla_deadline` terlewati dan status bukan RESOLVED/CLOSED (Addendum §3.4)
- [ ] Set `sla_breached = true` dan `sla_breached_at`
- [ ] Kirim notifikasi ke technician yang di-assign dan seluruh Manager
- [ ] Jadwalkan tiap 5 menit di `routes/console.php`, dengan `withoutOverlapping()`
- [ ] Proses per-chunk supaya tidak memuat seluruh tabel ke memori
- [ ] Idempoten: ticket yang sudah ditandai breached tidak dinotifikasi ulang
- [ ] Verifikasi container `scheduler` benar-benar menjalankannya

### Perhitungan SLA defensif (Addendum §3.5)

- [ ] Query scope yang menghitung kondisi SLA saat ini dari `sla_deadline` + status + waktu sekarang
- [ ] Dashboard dan list ticket memakai perhitungan ini, bukan hanya membaca kolom `sla_breached`
- [ ] Pembagian tanggung jawab: **scheduler** mengurus persistensi + notifikasi, **API** menjamin angka yang tampil akurat walau scheduler terlambat

### Notification (Addendum §4)

- [ ] `NotificationService` dengan tabel `notifications` kustom (bukan `Illuminate\Notifications\Notifiable` — skema sudah punya bentuk tabel sendiri, mencampur keduanya hanya menambah kebingungan)
- [ ] Enum tipe notifikasi: `TICKET_ASSIGNED`, `TICKET_STATUS_CHANGED`, `TICKET_COMMENTED`, `TICKET_RESOLVED`, `SLA_BREACHED`
- [ ] Payload `data` (JSON) berisi cukup informasi untuk render tanpa query tambahan: ticket number, judul, aktor, URL tujuan
- [ ] `GET /api/notifications` — paginated, filter unread
- [ ] `GET /api/notifications/unread-count`
- [ ] `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`
- [ ] Recipient sesuai Addendum §4.4; aktor tidak menerima notifikasi atas aksinya sendiri
- [ ] Sambungkan ke seluruh event Fase 3

### Audit log

- [ ] `AuditLogger` service yang **dipanggil eksplisit dari service layer**, bukan lewat model observer. Pemanggilan eksplisit lebih mudah ditest, jelas terbaca reviewer, dan tidak ikut tercatat saat seeding atau factory berjalan.
- [ ] Rekam `user_id`, `action`, `module`, `module_id`, `old_data`, `new_data`, `ip_address`, `user_agent`
- [ ] Terapkan pada: login, ticket create/update/assign/status change, asset create/update/assign, user create/update, perubahan konfigurasi
- [ ] `GET /api/audit-logs` — Admin penuh, Manager terbatas sesuai permission matrix
- [ ] Filter: user, module, action, rentang tanggal

### Test (Pest)

- [ ] SLA breach dengan `travel()` melewati deadline → ticket ditandai + notifikasi terkirim
- [ ] Ticket RESOLVED yang melewati deadline → **tidak** ditandai breached
- [ ] Command dijalankan dua kali → tidak ada notifikasi duplikat
- [ ] Setiap tipe notifikasi sampai ke recipient yang benar dan tidak ke aktor
- [ ] Unread count dan mark-as-read akurat
- [ ] User tidak bisa menandai notifikasi milik user lain
- [ ] Audit log tercatat pada setiap aksi yang diwajibkan
- [ ] Manager mengakses audit log di luar batasnya → 403

## Deliverable

Command SLA + scheduler, notification API, audit log API, seluruh event tersambung.

## Exit criteria

- [ ] Ticket yang melewati deadline otomatis ditandai breached oleh container scheduler dalam ≤ 5 menit
- [ ] Notifikasi SLA breach muncul di `GET /api/notifications` recipient yang benar
- [ ] Dashboard tetap melaporkan breach yang benar meski scheduler dimatikan
- [ ] Semua test Fase 4 hijau

---

# FASE 5 — Asset Management, Knowledge Base, Attachment

**Minggu 4 hari 4 – Minggu 5 hari 2**

## Tujuan

Melengkapi dua modul pendukung dan menyelesaikan penanganan file dengan benar.

## Task

### Asset management

- [ ] CRUD asset — Technician/Manager/Admin
- [ ] Enum status: `AVAILABLE`, `ASSIGNED`, `MAINTENANCE`, `RETIRED`, `LOST`
- [ ] `POST /api/assets/{id}/assign` — buat baris `asset_assignments`, ubah status asset jadi `ASSIGNED`
- [ ] `POST /api/assets/{id}/release` — isi `released_at`, status balik ke `AVAILABLE`
- [ ] **Asset `MAINTENANCE` tidak boleh di-assign** (§16 PRD) — validasi di service
- [ ] Satu asset hanya boleh punya satu assignment aktif (`released_at` null) pada satu waktu
- [ ] `asset_histories` dicatat pada setiap create, update status, assign, release
- [ ] `GET /api/assets/{id}/history` — riwayat kepemilikan seperti contoh §17 PRD
- [ ] `GET /api/my-assets` — asset milik user login
- [ ] Search (asset tag, serial number) + filter (status, kategori, pemegang) + pagination

### Knowledge base

- [ ] CRUD artikel, slug otomatis dan unik
- [ ] Status `draft`/`published`; **Technician boleh publish langsung** (Addendum §5.1)
- [ ] `POST /api/articles/{id}/publish`, `POST /api/articles/{id}/unpublish`
- [ ] Employee hanya bisa melihat artikel `published` (§19 PRD)
- [ ] Increment `view_count` saat artikel dibaca
- [ ] Search judul + isi, filter kategori
- [ ] Related articles — kategori sama, kecuali dirinya sendiri
- [ ] CRUD `knowledge_categories` — Admin
- [ ] Policy sesuai keputusan "Limited" di permission matrix

### File attachment (Addendum §6)

- [ ] `POST /api/tickets/{id}/attachments` — hanya partisipan ticket
- [ ] Validasi backend: MIME type, ekstensi, maksimum 5 MB, hanya `jpg/jpeg/png/pdf` (Addendum §6.2–6.3)
- [ ] Tolak eksplisit `exe/sh/bat` dan file yang MIME-nya tidak cocok dengan ekstensinya
- [ ] Simpan di disk **private**, nama file di-generate (jangan pakai nama asli), simpan metadata lengkap (Addendum §6.4)
- [ ] `GET /api/attachments/{id}/download` — **stream lewat controller setelah cek Policy** (Addendum §6.5). File tidak boleh bisa diakses hanya karena seseorang tahu URL-nya. Ini poin security yang layak ditonjolkan saat presentasi.
- [ ] `DELETE /api/attachments/{id}` — uploader atau Manager/Admin
- [ ] Hapus record juga menghapus file fisik

### Administrasi

- [ ] CRUD user — Admin saja (BR-017), email unik (BR-018), role ditentukan Admin (BR-020)
- [ ] Toggle active/inactive; user inactive langsung tidak bisa login dan token-nya dicabut
- [ ] CRUD department, ticket category, knowledge category
- [ ] CRUD ticket priority termasuk `sla_minutes` (§9 PRD) — perubahan tidak memengaruhi ticket lama karena snapshot
- [ ] `employee_profiles` dikelola bersama user

### Test (Pest)

- [ ] Asset `MAINTENANCE` di-assign → 422
- [ ] Asset yang sudah ter-assign di-assign lagi → 422
- [ ] Soft delete asset → ticket lama tetap utuh
- [ ] Employee membaca artikel `draft` → 403/404
- [ ] Technician membuat lalu publish artikel → sukses
- [ ] Upload 6 MB → 422; upload `.exe` → 422; upload PDF valid → sukses
- [ ] User non-partisipan mengunduh attachment → 403
- [ ] Admin membuat user dengan email duplikat → 422
- [ ] Non-admin membuat user → 403

## Deliverable

Asset API, KB API, attachment API, admin API, beserta test.

## Exit criteria

- [ ] Riwayat kepemilikan asset bisa ditampilkan seperti contoh §17 PRD
- [ ] Artikel bisa dibuat, dipublikasikan, dicari
- [ ] Attachment tidak bisa diunduh tanpa otorisasi ticket
- [ ] Seluruh poin 1–11 "Definition of Technical Success" (Addendum §12) sudah punya test yang lulus, kecuali yang bergantung pada UI

---

# FASE 6 — Dashboard & Analytics API

**Minggu 5, hari 3–5**

## Tujuan

Menyediakan data agregat untuk empat dashboard sesuai §20 PRD.

## Task

- [ ] `GET /api/dashboard/employee` — my open, my in progress, recently resolved, my assets, artikel terbaru
- [ ] `GET /api/dashboard/technician` — assigned, open, in progress, SLA breached, rata-rata waktu penyelesaian, aktivitas terbaru
- [ ] `GET /api/dashboard/manager` — total, open, resolved, SLA compliance, tren ticket, distribusi priority & category, performa technician
- [ ] `GET /api/dashboard/admin` — seluruh metrik Manager + total user, asset, technician, department, aktivitas sistem
- [ ] SLA metrics §14: total, within SLA, breached, persentase compliance, rata-rata waktu penyelesaian
- [ ] Formula compliance persis §14: `resolved within SLA / total resolved × 100`
- [ ] Tren ticket harian untuk rentang yang bisa dipilih
- [ ] Technician performance §21: ditangani, diselesaikan, rata-rata waktu, compliance, open, breached
- [ ] Semua agregasi dilakukan di SQL (`selectRaw`, `groupBy`) — jangan tarik seluruh baris lalu hitung di PHP
- [ ] Setiap endpoint dijaga Policy sesuai role
- [ ] Cache ringan jika query berat, dengan invalidasi yang jelas

### Test (Pest)

- [ ] Skenario data terkontrol → angka compliance sesuai perhitungan manual
- [ ] Employee mengakses dashboard manager → 403
- [ ] Dashboard employee hanya memuat data miliknya
- [ ] Rata-rata waktu penyelesaian dihitung dari `created_at` ke `resolved_at`
- [ ] Nol pembagi ditangani (tidak ada ticket resolved → compliance tidak error)

## Deliverable

Empat endpoint dashboard beserta test.

## Exit criteria

- [ ] Setiap angka di §20 PRD punya sumber data di API
- [ ] Angka SLA di dashboard konsisten dengan hasil query manual
- [ ] Setiap endpoint dashboard di bawah 500 ms dengan data seed
<!--MARKER-P7-->
- [ ] **Backend MVP selesai** — mulai sini fokus berpindah ke frontend

---

# FASE 7 — Fondasi Frontend

**Minggu 5 hari 5 – Minggu 6 hari 2**

## Tujuan

Membangun kerangka aplikasi dan komponen bersama yang dipakai seluruh fitur. Pekerjaan di fase ini menentukan seberapa cepat Fase 8 dan 9 selesai.

## Task

### Setup

- [ ] Inisialisasi shadcn/ui di atas Tailwind v4 yang sudah ada
- [ ] Pasang komponen dasar: button, input, select, textarea, table, dialog, dropdown-menu, badge, card, tabs, toast, skeleton, pagination, form, avatar, popover, calendar
- [ ] TanStack Query provider di root layout, atur `staleTime` dan retry default
- [ ] Recharts, react-hook-form, zod, `date-fns`
- [ ] Struktur folder: `src/lib/api/`, `src/components/ui/`, `src/components/shared/`, `src/features/<domain>/`, `src/hooks/`, `src/types/` — detail pola arsitektur di `docs/architecture/FRONTEND-ARCHITECTURE.md`
- [ ] Path alias `@/*`
- [ ] Pastikan `tsc --noEmit` dan `next lint` bersih sejak awal

### API layer

- [ ] Lengkapi BFF proxy dari Fase 2: dukung seluruh method, teruskan query string, `multipart/form-data` untuk upload, streaming untuk download
- [ ] Proxy menangani 401 dengan menghapus cookie dan mengarahkan ke login
- [ ] Client `apiFetch` typed dengan unwrapping envelope sesuai API contract
- [ ] Tipe TypeScript untuk seluruh entity dan bentuk respons — turunkan dari API contract, jangan dari tebakan
- [ ] Mapper error validasi Laravel (422) → `setError` react-hook-form per field
- [ ] Query key factory yang konsisten agar invalidasi cache tidak saling tabrakan

### App shell

- [ ] Route group `(auth)` untuk login dan `(app)` untuk halaman terproteksi
- [ ] Sidebar + topbar, navigasi difilter berdasarkan role dari `/me`
- [ ] `AuthProvider` — data user dari `/me`, hook `useAuth`, helper `can()`
- [ ] **Navigasi berbasis role hanya untuk kenyamanan.** Penjaga sebenarnya tetap Policy di Laravel. Menyembunyikan menu bukan mekanisme keamanan.
- [ ] Responsive: sidebar jadi drawer di mobile (NFR-003)
- [ ] Error boundary + halaman 403/404
- [ ] Toast global untuk sukses/gagal

### Komponen bersama

- [ ] `DataTable` — pagination server-side, sorting, kolom yang bisa dikonfigurasi, state loading/empty/error
- [ ] `FilterBar` — filter yang tersinkron dengan URL search params supaya bisa di-share dan tahan refresh
- [ ] `SearchInput` dengan debounce
- [ ] `StatusBadge`, `PriorityBadge`, `SlaIndicator` (aman/mendekati deadline/breached)
- [ ] `EmptyState`, `LoadingSkeleton`, `ConfirmDialog`
- [ ] `FileUpload` — validasi ukuran/tipe di client sebagai kenyamanan, tetap mengandalkan backend
- [ ] `RelativeTime`, formatter tanggal dan durasi

### Notification UI

- [ ] `NotificationBell` dengan badge unread count
- [ ] Polling 30 detik lewat TanStack Query `refetchInterval` (Addendum §4.2)
- [ ] Polling berhenti saat tab tidak aktif — hemat request tanpa mengorbankan pengalaman
- [ ] Dropdown daftar notifikasi, klik menandai read + menuju ticket terkait
- [ ] Tombol mark-all-as-read

## Deliverable

App shell, layer API, komponen bersama, notification bell yang berfungsi.

## Exit criteria

- [ ] Login → dashboard placeholder, navigasi tampil sesuai role
- [ ] `DataTable` sudah terbukti jalan dengan satu endpoint nyata (pagination + filter + search)
- [ ] Notification bell menampilkan jumlah unread yang benar dan bertambah setelah aksi
- [ ] Layout enak dipakai di 375px, 768px, dan 1440px
- [ ] `tsc --noEmit` bersih

---

# FASE 8 — Fitur Frontend

**Minggu 6 hari 3 – Minggu 7 hari 1**

## Tujuan

Menyambungkan seluruh API MVP ke antarmuka yang bisa dipakai.

## Task

### Ticket

- [ ] `/tickets` — DataTable dengan filter status, priority, category, technician, rentang tanggal; search; indikator SLA
- [ ] `/tickets/new` — form dengan react-hook-form + zod: judul, deskripsi, kategori, priority, asset opsional
- [ ] Asset picker mengambil dari `/api/assets/assignable`; jelaskan di UI bahwa field ini opsional
- [ ] `/tickets/[id]` — detail lengkap: atribut, reporter, technician, asset terkait, informasi SLA
- [ ] Tab detail: komentar, riwayat, attachment
- [ ] Timeline riwayat yang terbaca manusia (`ASSIGNED → IN_PROGRESS`, bukan dump ID)
- [ ] Form komentar dengan optimistic update
- [ ] Upload attachment dengan progress + daftar file, unduh lewat proxy
- [ ] Aksi kondisional per role dan status: Assign (Manager/Admin), Start Work/Resolve (Technician pemegang), Confirm Close/Reopen (reporter), Ubah Priority
- [ ] Dialog assign dengan pencarian technician
- [ ] Setelah aksi: invalidasi query terkait, tampilkan toast, perbarui timeline

### Asset

- [ ] `/assets` — DataTable, filter status/kategori/pemegang, search asset tag & serial number
- [ ] `/assets/new`, `/assets/[id]/edit`
- [ ] `/assets/[id]` — detail + riwayat kepemilikan (§17 PRD)
- [ ] Dialog assign/release dengan validasi status
- [ ] `/my-assets` untuk Employee

### Knowledge base

- [ ] `/knowledge` — daftar + search + filter kategori; Employee hanya melihat published
- [ ] `/knowledge/[slug]` — tampilan artikel + related articles
- [ ] `/knowledge/new`, `/knowledge/[id]/edit` — editor (textarea markdown cukup; WYSIWYG bukan prioritas MVP)
- [ ] Toggle publish/unpublish dengan indikator status
- [ ] Empty state yang mengarahkan Employee membaca KB sebelum membuat ticket — ini tujuan modul KB di §18 PRD

### Administrasi

- [ ] `/admin/users` — CRUD, penetapan role & department, toggle active
- [ ] `/admin/departments`, `/admin/categories`, `/admin/knowledge-categories`
- [ ] `/admin/priorities` — termasuk pengaturan `sla_minutes`
- [ ] `/admin/audit-logs` — tabel dengan filter user/module/action/tanggal
- [ ] Seluruh route admin dijaga di middleware Next.js **dan** Policy Laravel

### Profil

- [ ] `/profile` — lihat profil, ubah password
- [ ] `/notifications` — halaman penuh daftar notifikasi

## Deliverable

Seluruh halaman fitur tersambung ke API.

## Exit criteria

- [ ] Golden path §38 PRD bisa diselesaikan **sepenuhnya dari browser**, berpindah antar 3 akun
- [ ] Setiap error validasi backend tampil di field yang tepat
- [ ] Tidak ada aksi yang tampil untuk role yang tidak berhak
- [ ] Upload dan download attachment berfungsi lewat proxy
- [ ] Semua halaman punya state loading, empty, dan error

---

# FASE 9 — Dashboard UI

**Minggu 7, hari 2–3**

## Tujuan

Memvisualisasikan analytics — bagian yang paling terlihat saat presentasi.

## Task

- [ ] Dashboard Employee (§20.1): kartu ringkasan, ticket terbaru, asset saya, artikel terbaru
- [ ] Dashboard Technician (§20.2): assigned, open, in progress, SLA breached, rata-rata penyelesaian, aktivitas terbaru
- [ ] Dashboard Manager (§20.3): kartu total/open/resolved, gauge SLA compliance, line chart tren, pie/bar distribusi priority & category, tabel performa technician
- [ ] Dashboard Admin (§20.4): metrik Manager + total user/asset/technician/department + aktivitas sistem
- [ ] Router dashboard yang mengarahkan sesuai role saat mengakses `/`
- [ ] Chart Recharts: responsif, punya tooltip, dan empty state saat data kosong
- [ ] Pemilih rentang tanggal untuk chart tren
- [ ] Tabel performa technician bisa diurutkan (§21 PRD)
- [ ] Highlight visual untuk SLA breached
- [ ] Skeleton loading per kartu, bukan satu spinner untuk seluruh halaman

## Deliverable

Empat dashboard sesuai §20 PRD.

## Exit criteria

- [ ] Setiap metrik yang disebut §20 PRD tampil di dashboard role yang tepat
- [ ] Chart terbaca di layar mobile
- [ ] Angka di UI sama dengan respons API
- [ ] Dashboard tetap rapi saat data kosong (akun baru)

---

# FASE 10 — Quality, Deployment, Demo

**Minggu 7 hari 4 – Minggu 8**

## Tujuan

Mengubah aplikasi yang berfungsi menjadi aplikasi yang bisa dipertahankan di depan reviewer.

## Task

### Audit security

- [ ] Telusuri `docs/product/PERMISSION-MATRIX.md` baris demi baris terhadap route nyata — pastikan tidak ada endpoint tanpa penjaga
- [ ] Verifikasi `$fillable` di semua model
- [ ] Rate limit: login, upload, endpoint search
- [ ] Ulangi verifikasi validasi file (ukuran, MIME, ekstensi, MIME vs ekstensi cocok)
- [ ] Ulangi verifikasi otorisasi download attachment
- [ ] Uji kebocoran data lintas user: coba akses ticket, asset, notifikasi, attachment milik orang lain lewat manipulasi ID
- [ ] Pastikan respons error produksi tidak membocorkan stack trace
- [ ] CORS dibatasi ke origin frontend saja
- [ ] Konfirmasi `.env` tidak pernah masuk git; `APP_DEBUG=false` di produksi
- [ ] Ganti password akun seeder demo untuk deployment publik (Addendum §2.3)
- [ ] Cookie: `httpOnly`, `secure`, `sameSite` sesuai domain produksi

### Performa

- [ ] Audit N+1 pada seluruh endpoint list dan detail
- [ ] Verifikasi index terpakai lewat `EXPLAIN` pada query terberat
- [ ] Cek ukuran bundle frontend, dynamic import untuk chart yang berat
- [ ] `php artisan config:cache route:cache view:cache` di image produksi

### Docker produksi

- [ ] `compose.prod.yaml`: api (FrankenPHP), scheduler, mysql, web (Next.js standalone)
- [ ] `docker/api/Dockerfile` multi-stage: composer install `--no-dev --optimize-autoloader`, tanpa source test
- [ ] `docker/web/Dockerfile` multi-stage dengan `output: 'standalone'` di `next.config.ts`
- [ ] Migrasi dijalankan saat startup dengan `--force`
- [ ] Volume persisten untuk `storage/app` (attachment) dan data MySQL
- [ ] HTTPS: manfaatkan Caddy di dalam FrankenPHP, atau reverse proxy di depan jika deploy ke VPS
- [ ] Healthcheck untuk seluruh service
- [ ] Batas resource dan kebijakan restart
- [ ] `.env.production.example` untuk kedua app
- [ ] Uji `docker compose -f compose.prod.yaml up` dari kondisi bersih

### Octane worker mode (opsional)

Kerjakan **hanya jika** test suite lengkap dan hijau, dan waktu di minggu 8 masih tersisa.

- [ ] `composer require laravel/octane:^2.19` (Octane 3 belum ada)
- [ ] `php artisan octane:install --server=frankenphp`
- [ ] Audit state bocor: singleton yang menyimpan data per-request, `static` property, konfigurasi yang di-mutasi saat runtime
- [ ] Jalankan seluruh test suite terhadap mode worker
- [ ] Uji manual: login sebagai dua user berbeda secara bergantian, pastikan tidak ada data yang tertukar
- [ ] Jika ada keraguan sekecil apa pun, **tetap di classic mode**. Peningkatan performa tidak sebanding dengan risiko kebocoran data antar-user di aplikasi ITSM.

### CI

- [ ] GitHub Actions: Pint `--test`, Pest (dengan paratest), `tsc --noEmit`, `next lint`, `next build`
- [ ] Jalan di setiap push dan PR ke `main`
- [ ] Cache dependency composer dan npm

### Dokumentasi

- [ ] `README.md`: gambaran produk, arsitektur, cara setup, kredensial demo, ringkasan struktur folder
- [ ] `docs/ops/DEPLOYMENT.md`: langkah deploy, variabel environment, setup scheduler, backup DB
- [ ] `docs/ops/TESTING.md`: cara menjalankan test, cakupan yang diuji, pemetaan test ke business rule
- [ ] **Sinkronkan `docs/schema.sql` dengan migration final** — dokumen ini jadi lampiran laporan, jadi harus mencerminkan skema sebenarnya
- [ ] Perbarui `docs/api/API-CONTRACT.md` jika ada endpoint yang berubah selama implementasi
- [ ] Catatan arsitektur untuk presentasi: mengapa BFF proxy, mengapa snapshot SLA, mengapa audit log eksplisit, mengapa attachment lewat controller

### Persiapan demo

- [ ] `DemoDataSeeder` yang menghasilkan data realistis: cukup ticket menyebar di semua status, sebagian breached sehingga compliance mendekati contoh 87% di §14 PRD, riwayat asset dengan beberapa pemegang, beberapa artikel KB
- [ ] Latih golden path §38 PRD dari awal sampai akhir, ukur waktunya
- [ ] Siapkan jawaban untuk enam pertanyaan reviewer di §33 PRD: masalah yang diselesaikan, cara sistem bekerja, alasan pilihan arsitektur, desain database, penerapan security, cara business logic bekerja
- [ ] Siapkan skenario cadangan jika demo live bermasalah (screenshot atau rekaman)

### Buffer minggu 8

Prioritas saat ada waktu sisa, berurutan:

- [ ] Bug fixing dari hasil pengujian manual menyeluruh
- [ ] Export report ke CSV/PDF
- [ ] Advanced filtering (kombinasi filter tersimpan)
- [ ] Dark mode
- [ ] Peningkatan aksesibilitas: label ARIA, navigasi keyboard, kontras warna

## Deliverable

Aplikasi yang berjalan di container produksi, CI hijau, dokumentasi lengkap, demo siap.

## Exit criteria

- [ ] `docker compose -f compose.prod.yaml up` dari kondisi bersih menghasilkan aplikasi yang berfungsi
- [ ] CI hijau di `main`
- [ ] Seluruh 11 poin "Definition of Technical Success" (Addendum §12) terverifikasi
- [ ] Seluruh 10 poin "Definition of Done" (§37 PRD) terpenuhi untuk setiap fitur
- [ ] Tidak ada bug kritis yang diketahui
- [ ] Golden path §38 PRD berhasil dijalankan tanpa kesalahan dalam latihan

---

# Lampiran A — Pemetaan Business Rule ke Fase

Gunakan tabel ini saat audit di Fase 10 untuk memastikan tidak ada rule yang terlewat.

| Rule | Isi | Fase |
| --- | --- | --- |
| BR-001 | Ticket wajib punya reporter | 3 |
| BR-002 | Ticket baru berstatus OPEN | 3 |
| BR-003 | Ticket baru tidak wajib punya technician | 3 |
| BR-004 | Manager/Admin yang melakukan assignment | 3 |
| BR-005 | Technician hanya memproses ticket miliknya | 3 |
| BR-006 | Ticket wajib punya priority | 3 |
| BR-007 | Ticket wajib punya category | 3 |
| BR-008 | Perubahan status masuk ticket history | 3 |
| BR-009 | Employee tidak bisa mengubah ticket CLOSED | 3 |
| BR-010 | Perubahan penting masuk audit log | 4 |
| BR-011 | Asset pada ticket bersifat opsional | 3 |
| BR-012 | Employee hanya memilih asset miliknya | 3 |
| BR-013 | Asset yang dipilih harus valid | 3 |
| BR-014 | Validasi kepemilikan asset di backend | 3 |
| BR-015 | Hapus asset tidak merusak histori ticket | 3, 5 |
| BR-016 | Tidak ada registrasi publik | 2 |
| BR-017 | Hanya Admin membuat user | 5 |
| BR-018 | Email tidak boleh duplikat | 5 |
| BR-019 | User inactive tidak bisa login | 2 |
| BR-020 | Role ditentukan Admin | 5 |

# Lampiran B — Pemetaan Functional Requirement ke Fase

| FR | Isi | Fase |
| --- | --- | --- |
| FR-001 | Authentication | 2 |
| FR-002 | Authorization | 2 |
| FR-003 | Create ticket | 3 |
| FR-004 | Ticket assignment | 3 |
| FR-005 | Ticket processing | 3 |
| FR-006 | Ticket history | 3 |
| FR-007 | SLA calculation | 3, 4 |
| FR-008 | Asset management | 5 |
| FR-009 | Knowledge base | 5 |
| FR-010 | Analytics | 6, 9 |
| FR-011 | Notification | 4, 7 |
| FR-012 | Audit logging | 4 |

# Lampiran C — Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Auth cookie/BFF lebih rumit dari perkiraan | Menghambat seluruh frontend | Walking skeleton di Fase 2, bukan Fase 7 |
| Fase 3 melebar (fase terpadat) | Menggeser seluruh jadwal | Potong lebih dulu: reopen flow dan ubah priority bisa menyusul |
| Scheduler tidak jalan di container | SLA breach tak terdeteksi | Container scheduler terpisah + perhitungan defensif di API |
| Dashboard lambat | Demo terlihat buruk | Agregasi di SQL, index diverifikasi, cache jika perlu |
| Worker mode Octane membocorkan state | Data user tertukar — bug paling parah di ITSM | Classic mode sebagai default; worker mode opsional dan hanya setelah test lengkap |
| Bump PHPUnit 13 untuk Pest merusak paket lain | Test suite tidak jalan | Sudah diverifikasi: Laravel 13 dan Collision 8.9 kompatibel dengan PHPUnit 13 |
| Migration tidak cocok dengan `docs/schema.sql` | ERD di laporan tidak akurat | Sinkronisasi dijadikan task eksplisit di Fase 10 |
| Waktu habis sebelum polish | Presentasi terasa mentah | Minggu 8 sengaja dikosongkan sebagai buffer |

- [ ] **Backend MVP selesai** — mulai sini fokus berpindah ke frontend


