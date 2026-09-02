# FASE 4 — SLA, Notification, Audit Log · Rencana Implementasi

> **Panduan Eksekusi Dua Jalur:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi rencana ini task demi task. Setiap langkah memakai sintaks checkbox (`- [ ]`) agar progres terlacak.
> - **Untuk developer manusia:** Ikuti alur TDD di [§Alur Kerja Per Task](#alur-kerja-per-task) dan lihat panduan lingkungan di [§Onboarding Developer](#onboarding-developer). Setiap task dilengkapi estimasi waktu, berkas target, snippet test/implementasi, dan blok *Jebakan* untuk menghindari kesalahan umum.

**Goal:** Membuat sistem bereaksi otomatis terhadap berjalannya waktu (deteksi SLA breach via background scheduler), menyediakan API notifikasi in-app untuk konsumsi frontend (dengan polling 30 detik), dan membuka endpoint audit trail yang terlindungi pembatasan peran (Manager scoped, Admin full). Di akhir fase, background container scheduler secara periodik menandai ticket breach dan mengirim notifikasi, sementara query defensif menjamin konsistensi angka SLA meskipun scheduler tertunda.

**Architecture:** 
1. **SLA Scheduler:** Background process `tickets:check-sla` berjalan tiap 5 menit via container scheduler terpisah dengan `withoutOverlapping()`. Logika deteksi breach didelegasikan ke service murni (`SlaBreachDetector`) yang memproses kandidat per chunk dalam transaksi atomik. Perhitungan defensif (`SlaService::isBreached`, `scopeBreached`, `scopeOnTrack`) tetap menjadi sumber kebenaran instan di lapisan query API.
2. **Notification API:** Controller tipis (`NotificationController`) melayani 4 endpoint. Pembacaan selalu tersekat ke user login (`where('user_id', auth()->id())`). Admin tidak memiliki bypass (D-16 pengecualian #3). `POST /read` dan `POST /read-all` mengembalikan `200` dengan `data: null` (bukan 204).
3. **Audit Log API:** Controller tipis (`AuditLogController`) melayani `GET /api/audit-logs` (list ringkas) dan `GET /api/audit-logs/{id}` (detail lengkap dengan `old_data`, `new_data`, `user_agent`). Manager dibatasi di server hanya pada modul `ticket`, `asset`, dan `article`; permintaan di luar cakupan menghasilkan 200 list kosong atau 404 pada detail untuk mencegah kebocoran informasi.
4. **Otorisasi & Keamanan:** Penjagaan berbasis Laravel Gate/Policy (`NotificationPolicy`, `audit-log.viewAny`, `audit-log.view`). Redaksi data sensitif otomatis pada `AuditLogger` (D-07).

**Tech Stack:** PHP 8.5 · Laravel 13.29 · Sanctum 4 · Pest 5 (PHPUnit 13) · Pint · MySQL 8.4 (dev/prod & scheduler container) · SQLite in-memory (test). Tanpa paket baru.

**Spec:** Dokumen `docs/` yang sudah disetujui, dibaca dengan urutan otoritas:

| Dokumen | Perannya untuk Fase 4 |
| --- | --- |
| `docs/adr/DECISIONS.md` | D-01 (SLA 24/7), D-03 (SLA compliance), D-07 (audit redaction), D-08 + Amandemen 1 & 2 (kosakata audit), D-14 (index & kolom), D-16 (pengecualian admin), D-17 (presedensi error), D-23 (timezone UTC), D-24 & D-29 (bahasa), D-27 (tipe notifikasi), D-28 (semantik SLA defensif), D-30 (audit log sistem tanpa aktor). **Otoritas tertinggi.** |
| `docs/product/STATUS-TRANSITION.md` | v1.1. §6 tabel efek samping transisi terhadap notifikasi dan audit log; §7 aturan jam SLA (stop saat resolved/closed, resume saat reopen). |
| `docs/product/PERMISSION-MATRIX.md` | v1.1. §2.2 aturan batas modul audit log Manager; §3.6 `NotificationPolicy`; §3.8 ability audit log; §4 inventori route (baris 282–285, 313–314); §5 aturan 403 vs 404. |
| `docs/api/API-CONTRACT.md` | §2 envelope & meta; §4 filter & pagination; §9 endpoint notifikasi (lines 559–600); §11 endpoint audit logs (lines 757–784); §13 server-set fields. |
| `docs/architecture/BACKEND-ARCHITECTURE.md` | v1.4. Pipeline request, controller tipis, DTO, query service, FormRequest, API Resource. |
| `docs/architecture/ERD.md` | Skema tabel `notifications`, `audit_logs`, `tickets`, index composite `idx_tickets_sla`, index `idx_notifications_user_read`. |
| `docs/product/ROADMAP.md` | Task checklist & exit criteria Fase 4 (baris 429–497). |
| `docs/product/PRD.md` | §14 (SLA metrics), §22 (notifikasi), §23 (audit log); Addendum §3 (SLA architecture), Addendum §4 (notifikasi & polling). |

Urutan otoritas saat bertentangan (DECISIONS §2):
`DECISIONS.md` > `STATUS-TRANSITION.md` / `PERMISSION-MATRIX.md` > `API-CONTRACT.md` > `ERD.md` / `schema.sql` > `ROADMAP.md` > `PRD.md`.

---

## Global Constraints

Berlaku untuk **setiap** task di seluruh sub-tahap Fase 4:

### Envelope & Kontrak API
- Setiap respons API memakai satu format amplop:
  - Sukses berdata: `{ success: true, message: "...", data: {...}, meta?: {...} }`
  - Sukses tanpa data (misal mark read): `{ success: true, message: "...", data: null }`
  - Error: `{ success: false, message: "...", errors: {...} | null }`
- `meta` pada pagination berisi **tepat 6 kunci**: `current_page`, `per_page`, `total`, `last_page`, `from`, `to`. **Tanpa `links`** (API-CONTRACT §2.2).
- **`204 No Content` dilarang keras** — selalu kembalikan status `200` beramplop.
- Endpoint aksi (`POST /read`, `POST /read-all`) mengembalikan status **`200`** (bukan 201).

### Format Data & Waktu
- Timestamp selalu **ISO 8601 UTC** (`YYYY-MM-DDTHH:mm:ssZ`). Server & database berjalan dalam **UTC murni** (D-23).
- Filter rentang tanggal `date_from` dan `date_to` (format `YYYY-MM-DD`) ditafsirkan sebagai `00:00:00` dan `23:59:59` **waktu lokal Asia/Jakarta (WIB / UTC+7)**, lalu dikonversi ke rentang waktu UTC sebelum dieksekusi di query database (D-23).
- Seluruh durasi adalah integer **menit**.

### Bahasa (D-24, D-29)
- Envelope `message`: **Bahasa Inggris** (`"Notifications retrieved successfully."`, `"Notification marked as read."`).
- Validation errors di `errors.<field>`: **Bahasa Indonesia** (`"Format tanggal tidak valid."`).
- Body notifikasi in-app (`data.message`) dan `audit_logs.description`: **Bahasa Indonesia** (`"SLA tiket #TCK-0012 telah terlampaui."`).
- Kode program (nama class, method, variabel, komentar kode): **Bahasa Inggris**.

### Otorisasi & Akses Data
- Otorisasi murni menggunakan Laravel Policy dan Gate.
- **Admin Gate Exception (D-16 #3):** Admin tidak memiliki hak membaca atau menandai notifikasi milik user lain. Notifikasi adalah data pribadi per user.
- **Scoping di Server:** Scoping role (user_id notifikasi, pembatasan modul audit log Manager) diaplikasikan langsung pada query database sebelum filter client diproses. Filter client tidak pernah boleh memperluas cakupan data.
- **Pencegahan Kebocoran Informasi (403 vs 404):** Mengakses notifikasi user lain menghasilkan `404 Not Found`. Membuka detail audit log di luar jangkauan modul Manager menghasilkan `404 Not Found`. Memfilter list audit log ke modul terlarang menghasilkan `200 OK` dengan list kosong.

### Kebersihan & Mutu Kode
- Jalankan `vendor/bin/pint --dirty --format agent` (atau `composer exec pint -- --test`) setelah memodifikasi berkas PHP.
- Seluruh feature test dijalankan terhadap SQLite in-memory (`phpunit.xml`).
- Setiap perubahan migration diverifikasi via `php artisan migrate:fresh --seed` dan `migrate:rollback` terhadap MySQL dev container.

---

## Titik Awal & Prasyarat

### Prasyarat Implementasi
> **Asumsi:** Seluruh task dan exit criteria **Fase 3 (Ticket Core & Workflow)** diasumsikan telah selesai dan tersedia:
> - Model `Ticket`, `TicketHistory`, `TicketComment` sudah terhubung.
> - `TicketStatusService` dan `TicketService` sudah aktif memicu penulisan notifikasi dan audit log pada setiap transisi/aksi ticket.
> - `TicketResource` sudah mengembalikan kalkulasi defensif `sla_status` dan `sla_remaining_minutes`.
> - Data seeder pinned ID (Role 1–4, Priority 1–4, Status 1–5) telah terpasang.

### Status Komponen Saat Ini (dari inspeksi codebase)

| Komponen | Status Saat Ini | Kebutuhan di Fase 4 |
| --- | --- | --- |
| `SlaService` | Method `snapshot`, `recalculateFromCreation`, `markBreached`, `isBreached`, `remainingMinutes`, `scopeBreached`, `scopeOnTrack` sudah ada di `app/Services/Sla/SlaService.php` | Tambahkan query helper untuk scan kandidat breach (`breachCandidates`), serta buat service `SlaBreachDetector` |
| `NotificationService` | Method `notify()` dan `notifyMany()` (dengan auto-exclusion aktor) sudah ada di `app/Services/Notification/NotificationService.php` | Tambahkan query service `NotificationQueryService` untuk melayani pagination, filter, unread count, dan mark read |
| `AuditLogger` | Method `log()` dengan auto-redaction atribut sensitif sudah ada di `app/Services/Audit/AuditLogger.php` | Ubah `$actor` menjadi `?User $actor` agar mendukung event sistem tanpa aktor manusia (seperti scheduler breach) |
| `NotificationType` enum | 10 case Fase 3 (`TICKET_ASSIGNED` .. `TICKET_COMMENTED`) sudah ada | Tambahkan case `TicketSlaBreached = 'TICKET_SLA_BREACHED'` |
| `AuditAction` enum | 16 case (D-08 Amandemen 1) sudah ada | Tambahkan case `SlaBreach = 'sla_breach'` (D-08 Amandemen 2) |
| `AuditModule` enum | 9 case (`ticket`, `asset`, `article`, `user`, `role`, `department`, `ticket_category`, `ticket_priority`, `auth`) | Sudah lengkap |
| `NotificationPolicy` | Class policy sudah ada di `app/Policies/NotificationPolicy.php` | Verifikasi integrasi dengan route controller baru |
| `routes/console.php` | Berisi `sanctum:prune-expired` harian | Daftarkan `tickets:check-sla` tiap 5 menit dengan `withoutOverlapping()` |
| `routes/api.php` | Belum memiliki route notifikasi dan audit log | Daftarkan 4 route notifikasi dan 2 route audit log sesuai PERMISSION-MATRIX §4 |
| Index Database | Single index `sla_deadline` sudah ada | Tambahkan migration composite index `(sla_breached, sla_deadline)` sesuai ERD §6 |

---

## Resolusi Konflik & Keputusan Desain (14 Poin)

Seluruh 14 poin telah dievaluasi dan diputuskan berdasarkan urutan otoritas spec:

| # | Topik | Masalah / Konflik Antar-Dokumen | Keputusan Final & Resolusi | Dasar Otoritas |
| --- | --- | --- | --- | --- |
| **1** | Nama Enum Notifikasi SLA | `D-27` menyebut `TICKET_SLA_BREACHED`, sedangkan `ROADMAP:459` menyebut `SLA_BREACHED`. | Gunakan **`TICKET_SLA_BREACHED`** (SCREAMING_SNAKE dengan prefix domain `TICKET_`). | `DECISIONS.md` D-27 > `ROADMAP.md` |
| **2** | Respon Filter Audit Log Modul Terlarang oleh Manager | `ROADMAP:484` menyebut respon `403`, sedangkan `PERMISSION-MATRIX:71, :334` menetapkan `200` dengan list kosong. | Kembalikan **`200 OK` dengan data list kosong** (`meta.total = 0`). Menjawab 403 membocorkan informasi keberadaan aktivitas modul terlarang. Checkbox ROADMAP dikoreksi. | `PERMISSION-MATRIX.md` §2.2, §5 > `ROADMAP.md` |
| **3** | Bahasa Deskripsi Audit Log | Contoh `API-CONTRACT:774` memakai bahasa Inggris (`"Assigned ticket..."`), sedangkan `D-24` & `D-29` mewajibkan bahasa Indonesia. | `audit_logs.description` **wajib Bahasa Indonesia** (`"Menugaskan tiket TCK-0012 kepada Budi"`). Contoh di API Contract adalah ilustrasi bentuk payload. | `DECISIONS.md` D-24, D-29 > `API-CONTRACT.md` |
| **4** | Deteksi Status Aktif SLA | Rumus teks Addendum §3.4 menyebut `status NOT IN (RESOLVED, CLOSED)`. | Evaluasi menggunakan flag relasi database: **`ticket_statuses.is_closed = false`** (menghindari hardcode ID status). | `STATUS-TRANSITION.md` §2 |
| **5** | Penerima Notifikasi SLA Breach & Reopen | Dokumen menyebut "Manager" (tunggal) vs "seluruh Manager" (jamak). | Notifikasi breach dan reopen dikirim ke teknisi terkait + **seluruh user dengan role Manager yang berstatus aktif**. Admin tidak menerima notifikasi ini. | `ROADMAP.md:444`, `DECISIONS.md` D-27 |
| **6** | Audit Trail untuk SLA Breach (Amandemen D-08) | DFD 4.3 meminta pencatatan log saat breach, tapi kosakata `AuditAction` D-08 belum memuat aksi breach. | **D-08 Amandemen 2:** Tambahkan `sla_breach` ke enum `AuditAction` (total 17 nilai). Menandai breach mengubah status persisten tiket sehingga wajib memiliki audit trail sesuai BR-010. | `DECISIONS.md` D-08 Amandemen 2, `PRD.md` BR-010 |
| **7** | Pencatatan Audit Log dari Background Job (D-30) | `AuditLogger::log()` menuntut objek `User $actor` dan membaca request HTTP, padahal scheduler berjalan tanpa sesi user/request. | **D-30:** Ubah `$actor` menjadi nullable (`?User $actor = null`). Kolom `audit_logs.user_id`, `ip_address`, dan `user_agent` disimpan sebagai `null` untuk aksi sistem background. | `ERD.md:513`, `DECISIONS.md` D-30 |
| **8** | Nilai `actor_name` pada Notifikasi Breach Sistem | `D-27` mewajibkan key `actor_name` pada JSON payload notifikasi, namun scheduler tidak memiliki aktor manusia. | Isi `actor_name` dengan string literal **`"Sistem"`**. | `DECISIONS.md` D-27, D-24 |
| **9** | Akses `GET /api/audit-logs/{id}` di Luar Modul Manager | Tidak ada aturan eksplisit untuk detail audit log lintas batas Manager. | Kembalikan **`404 Not Found`** (bukan 403). Sesuai prinsip PERMISSION-MATRIX §5: keberadaan log modul terlarang tidak boleh dikonfirmasi kepada Manager. | `PERMISSION-MATRIX.md` §5 |
| **10** | Composite Index untuk SLA Scanner | ERD §6 memuat `idx_tickets_sla (sla_breached, sla_deadline)`, namun migrasi Fase 3 baru membuat index tunggal `sla_deadline`. | Buat migration baru di 4a yang menambahkan composite index **`idx_tickets_sla (sla_breached, sla_deadline)`** untuk mengoptimalkan scan scheduler tiap 5 menit. | `ERD.md` §6 |
| **11** | Nullability Kolom `sla_deadline` | Skema migration nullable, sedangkan `docs/schema.sql` NOT NULL. | Migration adalah source of truth (tetap nullable di database). Query scanner SLA wajib memfilter **`whereNotNull('sla_deadline')`**. Sinkronisasi `schema.sql` di Fase 10. | `DECISIONS.md` §2 |
| **12** | Notifikasi Breach untuk Tiket Tanpa Teknisi | Tiket berstatus `OPEN` melewati deadline tanpa `technician_id`. | Tiket tetap ditandai breached, notifikasi dikirimkan ke **seluruh Manager** (tanpa error saat `technician_id` bernilai null). | `PRD Addendum` §4.4 |
| **13** | Eksistensi Kolom `user_agent` di Payload Audit Log | Payload list `API-CONTRACT §11` tidak menampilkan `user_agent`. | `user_agent` **hanya disertakan pada endpoint detail** `GET /api/audit-logs/{id}`, bersama dengan `old_data` dan `new_data`. Payload list tetap ringkas. | `API-CONTRACT.md` §11 |
| **14** | Status Keputusan D-01 (SLA 24/7) | D-01 sebelumnya berstatus `CONFIRM` (default 24/7). | Status D-01 diflip menjadi **`DECIDED`** dalam amandemen Fase 4 karena implementasi scheduler secara langsung mengeksekusi kalender flat 24/7 ini. | `DECISIONS.md` D-01 |

---

## Dekomposisi Sub-Tahap

Fase 4 dibagi menjadi **tiga sub-tahap berurutan**. Setiap sub-tahap dikerjakan dalam satu branch terisolasi, diuji penuh, dan digabungkan melalui Pull Request ke `main`.

```
Fase 4: SLA, Notification, Audit Log
│
├── 4a: SLA Scheduler & Breach Detection  (feat/phase-4a-sla-scheduler)   ~1.5 hari
│   ├── Amandemen spec (D-01, D-08 Amd 2, D-27, D-30)
│   ├── Enum updates (NotificationType, AuditAction)
│   ├── AuditLogger actor-less support
│   ├── Composite index migration
│   ├── SlaBreachDetector service & chunked scanning
│   └── Command tickets:check-sla & console schedule
│
├── 4b: Notification API                  (feat/phase-4b-notification-api) ~1.0 hari
│   ├── NotificationResource & IndexNotificationRequest
│   ├── NotificationQueryService (filter, unread-count, mark-read)
│   ├── NotificationController (4 endpoints)
│   ├── Route registration & policy integration tests
│   └── Verifikasi pengiriman 11 tipe notifikasi (Fase 3 + SLA breach)
│
└── 4c: Audit Log API                     (feat/phase-4c-audit-log-api)    ~0.75 hari
    ├── AuditLogListResource & AuditLogDetailResource
    ├── IndexAuditLogRequest (validation & date range conversion)
    ├── AuditLogQueryService (server-side Manager module scoping)
    ├── AuditLogController (2 endpoints: index & show)
    └── Route registration, authorization tests & audit trail coverage sweep
```

### Rincian Sub-Tahap

| Sub-tahap | Branch | Berkas Rencana | Deliverable Utama | Estimasi |
| --- | --- | --- | --- | --- |
| **4a** | `feat/phase-4a-sla-scheduler` | [`4a-sla-scheduler.md`](4a-sla-scheduler.md) | Amandemen spec, `AuditAction::SlaBreach`, `NotificationType::TicketSlaBreached`, `AuditLogger` nullable actor, migrasi index `idx_tickets_sla`, `SlaBreachDetector`, command `tickets:check-sla`, registrasi jadwal 5 menit di `routes/console.php`, suite test SLA breach dengan `travel()`. | ~1.5 hari |
| **4b** | `feat/phase-4b-notification-api` | [`4b-notification-api.md`](4b-notification-api.md) | `NotificationResource`, `IndexNotificationRequest`, `NotificationQueryService`, `NotificationController` (4 route: index, unread-count, read, read-all), test isolasi user, test 404 pada notifikasi orang lain, test unread count query cost (1 query COUNT), test end-to-end penerimaan 11 tipe notifikasi. | ~1.0 hari |
| **4c** | `feat/phase-4c-audit-log-api` | [`4c-audit-log-api.md`](4c-audit-log-api.md) | `AuditLogListResource`, `AuditLogDetailResource`, `IndexAuditLogRequest`, `AuditLogQueryService`, `AuditLogController` (2 route: index & show), query scope server Manager module scoping, penanganan timezone Asia/Jakarta ke UTC, test 403 untuk Employee/Technician, test 200 list kosong untuk filter terlarang Manager, test 404 pada detail di luar jangkauan Manager, sweep verifikasi pencatatan audit log. | ~0.75 hari |

---

## Onboarding Developer

Bagian ini disiapkan khusus untuk mempermudah developer manusia dalam memahami dan mengoperasikan lingkungan kerja Fase 4.

### 1. Menjalankan Lingkungan Lokal & Scheduler
Stack pengembangan dijalankan via Docker Compose dari root repository:
```bash
# Menyalakan seluruh service (API, Scheduler, MySQL, Web)
make up

# Melihat log container scheduler (memverifikasi eksekusi tiap 5 menit)
docker compose logs -f scheduler

# Masuk ke shell container API
docker compose exec api bash
```

Jika menjalankan di lingkungan host langsung (tanpa Docker):
```bash
cd apps/api
# Menjalankan background worker scheduler lokal
php artisan schedule:work
```

### 2. Perintah Testing & Diagnostik Cepat
```bash
cd apps/api

# Menjalankan seluruh test suite Pest
vendor/bin/pest

# Menjalankan satu file test spesifik
vendor/bin/pest tests/Feature/Sla/SlaSchedulerTest.php
vendor/bin/pest tests/Feature/Notification/NotificationApiTest.php
vendor/bin/pest tests/Feature/Audit/AuditLogApiTest.php

# Menjalankan manual command pengecekan SLA
php artisan tickets:check-sla

# Memeriksa daftar jadwal cron Laravel
php artisan schedule:list

# Linter / Code Formatter (wajib dijalankan sebelum commit)
vendor/bin/pint --dirty --format agent
```

### 3. Cara Memicu SLA Breach Secara Cepat Saat Pengujian Manual
Untuk menguji SLA breach tanpa menunggu waktu nyata:
1. Buat tiket baru dengan priority `Critical` (SLA 120 menit).
2. Ubah `created_at` dan `sla_deadline` di database menjadi 3 jam yang lalu via tinker:
   ```bash
   php artisan tinker --execute="App\Models\Ticket::latest()->first()->update(['created_at' => now()->subHours(3), 'sla_deadline' => now()->subHour()]);"
   ```
3. Jalankan scanner:
   ```bash
   php artisan tickets:check-sla
   ```
4. Verifikasi bahwa tiket berubah menjadi `sla_breached = true` dan notifikasi bertipe `TICKET_SLA_BREACHED` masuk ke tabel `notifications`.

### 4. Glosarium Konsep Kunci
1. **Snapshot SLA:** Nilai durasi (`sla_duration_minutes`) dan batas waktu (`sla_deadline`) disalin permanen ke baris tiket saat dibuat. Perubahan konfigurasi SLA priority di masa depan tidak mengubah target tiket yang sudah berjalan.
2. **Perhitungan Defensif (Defensive Calculation):** Logika evaluasi status SLA (`isBreached`, `scopeBreached`, `scopeOnTrack`) yang dieksekusi on-the-fly saat query dibaca. Menjamin status `sla_status = 'breached'` tampil akurat di API/dashboard meskipun scheduler terlambat berjalan.
3. **SLA Breach Persistence:** Penandaan permanen di database (`sla_breached = true`, `sla_breached_at = now()`) yang dilakukan oleh background scheduler saat mendeteksi pelanggaran batas waktu.
4. **Actor-less Event:** Peristiwa yang diinisiasi oleh sistem background (seperti scheduler breach) tanpa sesi user HTTP. Log audit dan notifikasinya menggunakan `user_id = null` dan `actor_name = "Sistem"`.
5. **Manager Scoped Audit:** Pembatasan akses di level query server di mana Manager hanya diizinkan melihat jejak audit untuk modul operasional IT (`ticket`, `asset`, `article`).
6. **Information Leakage Prevention:** Mengembalikan status `200 OK` (list kosong) atau `404 Not Found` alih-alih `403 Forbidden` pada entitas di luar batas kewenangan, sehingga user tidak mendapat konfirmasi tentang keberadaan data rahasia.
7. **Single Envelope Standard:** Struktur seragam untuk seluruh respon JSON API (`success`, `message`, `data`, `meta` / `errors`).

---

## Alur Kerja Per Task

Setiap task di sub-berkas 4a, 4b, dan 4c dirancang untuk dieksekusi dengan disiplin **Test-Driven Development (TDD)**:

```
┌────────────────────────────────────────────────────────┐
│ 1. Tulis Test Negatif & Positif Terlebih Dahulu (RED)  │
│    - Tulis feature / unit test di tests/Feature atau   │
│      tests/Unit sesuai instruksi Step 1.               │
│    - Jalankan pest --filter=NamaTest -> Pastikan GAGAL │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Tulis Kode Implementasi Minimum (GREEN)             │
│    - Buat/modifikasi Request, Resource, Service,       │
│      Controller, Enum, atau Command.                   │
│    - Jalankan pest --filter=NamaTest -> Pastikan LULUS │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Refactor & Formatting (REFACTOR)                    │
│    - Jalankan vendor/bin/pint --dirty --format agent   │
│    - Pastikan seluruh test suite tetap hijau           │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. Git Commit                                          │
│    - Buat atomic commit sesuai konvensi Conventional   │
│      Commits (feat:, fix:, test:, chore:).             │
└────────────────────────────────────────────────────────┘
```

### Checklist Sebelum Membuka Pull Request (PR)
- [ ] Seluruh test unit & feature sub-tahap lulus (`vendor/bin/pest`).
- [ ] Tidak ada pelanggaran formatting (`vendor/bin/pint --test`).
- [ ] `php artisan migrate:fresh --seed` berhasil dijalankan pada database MySQL.
- [ ] Endpoint yang baru dibuat terdaftar di `docs/product/PERMISSION-MATRIX.md §4`.
- [ ] Checkbox task terkait di sub-berkas telah dicentang.

---

## Exit Criteria Fase 4 (Gabungan)

Fase 4 dinyatakan selesai jika seluruh kondisi berikut terpenuhi:

- [ ] Command `tickets:check-sla` berjalan otomatis di container `scheduler` setiap 5 menit dengan `withoutOverlapping()`.
- [ ] Tiket aktif yang melewati deadline otomatis ditandai `sla_breached = true` dan `sla_breached_at` terisi dalam waktu ≤ 5 menit.
- [ ] Notifikasi `TICKET_SLA_BREACHED` berhasil terkirim ke teknisi yang ditugaskan dan seluruh Manager aktif, dengan `actor_name` bernilai `"Sistem"`.
- [ ] Audit log `sla_breach` pada modul `ticket` berhasil tercatat dengan `user_id = null`.
- [ ] Eksekusi berulang command `tickets:check-sla` bersifat idempoten (tidak menghasilkan notifikasi atau penandaan duplikat).
- [ ] Perhitungan defensif `sla_status` pada list & detail tiket tetap melaporkan `breached` meskipun background scheduler dimatikan.
- [ ] 4 endpoint notifikasi berfungsi penuh (`GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`).
- [ ] Notifikasi user lain terlindungi dengan respon `404 Not Found`.
- [ ] Admin terisolasi pada inbox notifikasinya sendiri (tidak ada bypass via `Gate::before`).
- [ ] `GET /api/notifications/unread-count` tereksekusi dengan efisien (tepat 1 query `COUNT`).
- [ ] 2 endpoint audit log berfungsi penuh (`GET /api/audit-logs`, `GET /api/audit-logs/{id}`).
- [ ] Scoping modul audit log Manager (`ticket`, `asset`, `article`) ditegakkan di server; filter ke modul terlarang mengembalikan `200 OK` dengan list kosong; akses detail ke modul terlarang mengembalikan `404 Not Found`.
- [ ] Filter tanggal `date_from` dan `date_to` pada audit log dikonversi dengan benar dari zona waktu Asia/Jakarta ke UTC.
- [ ] Employee dan Technician ditolak dengan `403 Forbidden` saat mengakses endpoint audit log.
- [ ] Seluruh 11 tipe notifikasi (Fase 3 + Fase 4) terbukti sampai ke recipient yang tepat dan mengecualikan aktor.
- [ ] Seluruh aksi penting sistem (Fase 3 + Fase 4) terbukti menuliskan baris audit log.
- [ ] Seluruh test suite Pest (`php artisan test`) hijau.
- [ ] Linter Pint (`vendor/bin/pint --test`) bersih tanpa peringatan.
- [ ] Checkbox Fase 4 di `docs/product/ROADMAP.md` tersinkronisasi.
- [ ] Git tag `v0.4.0` (Semantic Versioning) ditambahkan dan didorong ke repository saat fase selesai.

---

## Di Luar Cakupan Fase 4

Untuk menjaga fokus dan mencegah *scope creep*, item-item berikut **secara sadar tidak dikerjakan di Fase 4**:

- **Endpoint Agregasi & Metrik Dashboard** (`GET /api/dashboard/employee`, `/technician`, `/manager`, `/admin`, perhitungan compliance rate) → **Fase 6**. Fase 4 hanya menyediakan scope defensif dan data persisten.
- **Frontend App Shell & Notification Bell Polling UI** (`NotificationBell` React component, polling TanStack Query 30s) → **Fase 7**. Verifikasi Fase 4 dilakukan melalui HTTP endpoint testing.
- **Manajemen File Attachment** (`POST /api/tickets/{id}/attachments`, download controller terotentikasi, disk privat) → **Fase 5**.
- **CRUD Modul Asset & Knowledge Base** → **Fase 5**.
- **CRUD Administrasi User & Master Data** → **Fase 5**.
- **Perubahan pada aplikasi web frontend (`apps/web`)** → **Fase 7 & 8**.
- **Sinkronisasi file lampiran `docs/schema.sql`** → **Fase 10**.
