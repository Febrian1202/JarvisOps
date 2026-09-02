# FASE 3 — Ticket Core & Workflow · Rencana Implementasi

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi rencana ini task demi task.
> Setiap langkah memakai sintaks checkbox (`- [ ]`) supaya progresnya bisa dilacak.

**Goal:** Membangun entitas inti produk — ticket — beserta seluruh business rule, mesin transisi
status, snapshot SLA, komentar, history, dan query berlapis otorisasi. Di akhir fase, golden path
PRD §38 (create → assign → in progress → resolve → close) bisa diselesaikan penuh lewat HTTP.

**Architecture:** Controller tipis → FormRequest → DTO → service → API Resource, sesuai
`docs/architecture/BACKEND-ARCHITECTURE.md`. Satu mesin transisi (`TicketStatusService`) melayani
seluruh perubahan status, assign, unassign, self-assign, dan priority — tidak ada endpoint yang
menulis `status_id` atau `technician_id` di luar mesin itu. Otorisasi memakai Policy Laravel
dengan presedensi 403/404 sebelum 422 (D-17). Notifikasi dan audit log ditulis eksplisit oleh
service, bukan observer.

**Tech Stack:** PHP 8.5 · Laravel 13.29 · Sanctum 4 · Pest 5 (PHPUnit 13) · Pint · MySQL 8.4
(dev/prod) · SQLite in-memory (test). Tanpa paket baru — tidak ada `spatie/laravel-data`, tidak ada
`spatie/laravel-permission`, tidak ada library gambar/PDF.

**Spec:** Fase ini tidak punya design doc terpisah. Spec-nya adalah dokumen `docs/` yang sudah
disetujui, dibaca dengan urutan otoritas di bawah:

| Dokumen | Perannya untuk Fase 3 |
| --- | --- |
| `docs/adr/DECISIONS.md` | D-01..D-29. **Otoritas tertinggi.** Bagian C wajib dibaca sebelum menulis controller. D-26..D-29 lahir dari rencana ini. |
| `docs/product/STATUS-TRANSITION.md` | v1.1. Matriks transisi, prasyarat, efek samping, bentuk error, `available_actions`, checklist test §10 |
| `docs/product/PERMISSION-MATRIX.md` | v1.1. `TicketPolicy` (13 ability), `TicketCommentPolicy`, `AssetPolicy`, aturan 403-vs-404 §5, checklist test §6 |
| `docs/api/API-CONTRACT.md` | §2 envelope, §3 status code, §4 query param, §6 endpoint ticket, §7 asset, §12 rate limit, §13 server-set fields |
| `docs/architecture/BACKEND-ARCHITECTURE.md` | v1.4. Pipeline §2, FormRequest §3, DTO §4, service §5, folder §5.3, controller tipis §6 |
| `docs/architecture/ERD.md` | Relasi ticket & asset, semantik `onDelete`, tabel append-only |
| `docs/product/ROADMAP.md` | Task checklist & exit criteria Fase 3 (baris 321–413) |
| `docs/product/PRD.md` | §8 kategori, §9 priority, §11 BR-001..BR-010, §12 lifecycle, §22 contoh notifikasi, §23 audit, §24–25 search/pagination, §31 enam skenario, §38 golden path, Addendum §1 asset |

Urutan otoritas saat bertentangan (DECISIONS §2):
`DECISIONS.md` > `STATUS-TRANSITION.md` / `PERMISSION-MATRIX.md` > `API-CONTRACT.md` >
`ERD.md` / `schema.sql` > `ROADMAP.md` > `PRD.md`.

---

## Global Constraints

Berlaku untuk **setiap** task di seluruh sub-tahap. Nilai di bawah dikutip verbatim dari spec.

### Envelope & kontrak API

- Setiap respons — sukses maupun gagal — memakai satu envelope:
  sukses `{ success, message, data, meta? }`, gagal `{ success, message, errors }`.
- **Jangan pernah** mengembalikan Eloquent Resource telanjang atau body 422 mentah Laravel.
- `meta` berisi **tepat enam kunci**: `current_page`, `per_page`, `total`, `last_page`, `from`,
  `to`. **Tidak ada `links`** (API-CONTRACT §2.2).
- **`204` tidak pernah dipakai** — selalu kembalikan body beramplop (API-CONTRACT §3).
- Setiap pembuatan resource yang berhasil mengembalikan **`201`** (D-22). `POST` aksi
  (assign, status, priority) mengembalikan **`200`**.
- Header `Accept: application/json` diasumsikan.

### Format data

- Timestamp: **ISO 8601 UTC**, contoh `2026-08-31T10:00:00Z`. Server dan DB **UTC murni**.
  Frontend mengonversi ke `Asia/Jakarta` (D-23).
- Tanggal saja: `YYYY-MM-DD`. Filter `created_from`/`created_to` ditafsirkan sebagai
  `00:00:00` dan `23:59:59` **waktu Asia/Jakarta**, lalu dikonversi ke UTC untuk query (D-23).
- Durasi: **selalu integer menit**.
- Penamaan field: `snake_case`. Penamaan route: `kebab-case`, resource plural.

### Bahasa (D-24, D-29)

- Envelope `message`: **Bahasa Inggris** (`"Ticket created successfully."`).
- Seluruh isi `errors.<field>`: **Bahasa Indonesia** — baik dari `messages()` FormRequest maupun
  dari `ValidationException` yang dilempar service (D-29).
- Body notifikasi in-app + `audit_logs.description`: **Bahasa Indonesia**.
- Dokumen di `docs/` (termasuk berkas rencana ini): **Bahasa Indonesia**.
- Komentar kode, nama variabel, nama method: **Bahasa Inggris**.

### Otorisasi

- **Hanya Gate/Policy bawaan Laravel.** Satu role per user lewat `users.role_id`.
- `Gate::before` meloloskan Admin. Aturan protektif yang juga mengikat Admin (D-16
  pengecualian #2: Admin tidak bisa mengubah ticket `CLOSED`) ditegakkan di **service layer**,
  karena `Gate::before` sudah pulang lebih dulu sebelum Policy dipanggil.
- Policy/Gate **selalu dievaluasi sebelum** validasi state machine (D-17).
- Scoping dilakukan **di query**, bukan dengan memfilter hasil setelah diambil.
- Filter dari client diterapkan **setelah** scoping role — filter tidak boleh memperluas cakupan.
- Urutan error pada endpoint transisi (D-26): `401` → `403`/`404` → `422` validasi field →
  `409` state basi → `422` legalitas matriks → `422` prasyarat.

### Business rule yang tidak boleh dilanggar

- Seluruh field di API-CONTRACT §13 + D-18 ditentukan **server**, diabaikan bila dikirim client:
  `reporter_id`, `status_id`, `technician_id`, `ticket_number`, `sla_duration_minutes`,
  `sla_deadline`, `sla_breached`, `sla_breached_at`, `resolved_at`, `closed_at`, `department_id`.
- Snapshot SLA **wajib** diisi saat create dan tidak pernah dihitung ulang lewat join ke
  `ticket_priorities` saat dibaca.
- Setiap operasi write yang menyentuh banyak tabel dibungkus **satu transaksi database**.
- Setiap perubahan status/technician/priority menulis `ticket_histories` (BR-008) **dan**
  `audit_logs` (BR-010) di transaksi yang sama.

### Perkakas

- `vendor/bin/pint --dirty --format agent` **wajib** dijalankan setelah menyentuh berkas PHP apa pun.
- `laravel/pao` terpasang, jadi Pint dan test mengeluarkan **JSON satu baris**. Itu benar,
  bukan misconfiguration.
- Branch: `feat/phase-3<x>-<topik>`, merge ke `main` lewat PR walau solo.
- Seluruh perintah dijalankan dari `apps/api`.
- Test berjalan terhadap **SQLite in-memory**; `apps/api/.env` mengarah ke MySQL. Migration baru
  wajib diverifikasi `migrate:fresh` + `migrate:rollback` terhadap **MySQL**.

---

## Titik Awal: Apa Yang Sudah Ada

Dibaca dari kode, bukan dari dokumen. Jangan membangun ulang hal-hal ini.

| Sudah ada | Lokasi | Catatan untuk Fase 3 |
| --- | --- | --- |
| 18 tabel, 18 model, 18 factory | `database/migrations/`, `app/Models/`, `database/factories/` | Relasi ticket lengkap dua arah. `TicketFactory` **tanpa state** dan memakai `TicketStatus::factory()` acak — harus diganti ke ID pinned di 3a |
| `ReferenceDataSeeder` | `database/seeders/` | Status 1–5, priority 1–4, role 1–4 sudah pinned; 5 parent + 17 child kategori; idempoten. `TestCase::$seeder` sudah mengarah ke sini, jadi setiap feature test otomatis punya data referensi |
| `ApiResponse` | `app/Support/ApiResponse.php` | `success`/`created`/`error`/`paginated`. **`paginated()` meneruskan `$paginator->items()` mentah** — belum sadar API Resource. Diperbaiki di 3a |
| `HandlesPagination` | `app/Support/HandlesPagination.php` | `getPerPage()` default 10 cap 100, `applySorting()` dengan whitelist. Pesannya masih Inggris — diterjemahkan di 3a (D-29). Belum dipakai controller mana pun |
| Exception handler | `bootstrap/app.php` | `IllegalStatusTransitionException`→422 dan `StateConflictException`→409 **sudah terpasang tapi belum pernah dilempar**. Fase 3 tinggal `throw` |
| `AbilityMatrix` | `app/Authorization/AbilityMatrix.php` | 37 ability `ticket.*`/`asset.*`/`attachment.*` sudah terdaftar di `POLICY_ABILITIES` sebagai `pending`. `permissionsFor()` hanya menyisir `ROLE_ABILITIES` |
| `Gate::before` + gate role | `app/Providers/AppServiceProvider.php` | Admin bypass dengan blacklist D-16. Rate limiter `api` 120/mnt, `login` 5/mnt, `upload` 20/mnt, `search` 60/mnt — dua terakhir **belum dipakai** |
| `NotificationPolicy` | `app/Policies/NotificationPolicy.php` | Satu-satunya policy. Didaftarkan manual lewat `Gate::define`, bukan auto-discovery |
| Pola domain `Auth/` | `Controllers/Auth/`, `Requests/Auth/`, `Resources/Auth/`, `Services/Auth/`, `DTOs/Auth/` | Contoh yang harus ditiru untuk domain `Ticket/` |
| Enum | `app/Enums/` | `RoleName` (`Admin = 'administrator'`), `TicketStatusName` (5 case, **tanpa method apa pun**), `AssetStatus`, `UserStatus` |
| `EnsurePasswordChanged` | `app/Http/Middleware/` | Alias `password.changed`. Setiap route Fase 3 wajib memakainya |

Yang **belum ada sama sekali**: controller/request/resource/service/DTO/policy untuk ticket dan
asset, peta transisi, generator `ticket_number`, logika SLA, `app/Rules/`, state `TicketFactory`,
demo data ticket.

---

## Resolusi Konflik Antar-Dokumen

Pembacaan ulang spec menemukan **15 kontradiksi** dan **12 lubang**. Semuanya sudah diresolusi.
**Jangan buka ulang keputusan ini saat implementasi.**

Sebelas di antaranya diselesaikan dengan mengoreksi dokumen pemiliknya atau menambah decision baru —
amandemennya ikut dalam commit rencana ini, jadi saat 3a mulai dieksekusi seluruh spec sudah
konsisten. Sisanya diresolusi di tabel ini saja.

### Sudah diamandemen di dokumen sumber

| # | Konflik | Resolusi | Di mana |
| --- | --- | --- | --- |
| K-01 | Kosakata `audit_logs.action` D-08 tidak memuat `self_assign`, `reopen`, `resolve`, `close`, `cancel` yang dipakai `STATUS-TRANSITION.md §6` | Kosakata diperluas jadi 16 nilai | `DECISIONS.md` D-08 Amandemen 1 |
| K-02 | D-21 mewajibkan `expected_status_id` tapi bentuk request/response, endpoint mana saja, dan urutan 409-vs-422 tidak pernah ditulis | Dikunci: hanya `/status` dan `/assign`; 409 sebelum 422 legalitas | `DECISIONS.md` D-26 |
| K-03 | `notifications.type` SCREAMING_SNAKE di API-CONTRACT vs lowercase di ERD; 9 side-effect §6 dipetakan ke 5 tipe ERD tanpa aturan | SCREAMING_SNAKE, 10 tipe tertutup, `data` wajib 6 kunci | `DECISIONS.md` D-27 |
| K-04 | `sla_remaining_minutes` ada di respons tapi tidak pernah didefinisikan; `sla_status` tidak punya nilai untuk ticket yang berhenti tepat waktu | `null` setelah resolve/close, integer bertanda selama berjalan; `sla_status` defensif dua nilai | `DECISIONS.md` D-28 |
| K-05 | Contoh pesan di `errors.status_id` berbahasa Inggris, D-24 menuntut Indonesia | Isi `errors.*` selalu Indonesia; contoh Inggris = ilustrasi bentuk | `DECISIONS.md` D-29, `STATUS-TRANSITION.md §8` |
| K-06 | Sel `ASSIGNED → ASSIGNED` berisi `M, A` padahal keterangan matriks yang sama bilang status-sama = 422 | Sel jadi `—`. Reassign hanya lewat `POST /assign`, yang boleh dari `OPEN`/`ASSIGNED`/`IN_PROGRESS` | `STATUS-TRANSITION.md §3` |
| K-07 | `available_actions.assign` muncul pada `RESOLVED`, padahal `RESOLVED → ASSIGNED` ilegal | Dipersempit ke `OPEN`/`ASSIGNED`/`IN_PROGRESS` | `STATUS-TRANSITION.md §9` |
| K-08 | `available_actions.edit` memberi kondisi identik untuk dua belahan aturannya | Disatukan; ditambah `editable_fields` di respons detail | `STATUS-TRANSITION.md §9` |
| K-09 | `PERMISSION-MATRIX §3.2` `update` hanya melarang Employee mengedit `CLOSED`; API-CONTRACT §6 melarang semua role | Tidak ada role yang bisa mengedit ticket `CLOSED` | `PERMISSION-MATRIX.md §3.2` |
| K-10 | D-20 mewajibkan endpoint unassign & ubah/hapus komentar, tapi §4 tidak punya barisnya dan tidak ada nama ability untuk komentar | Ditambah `TicketCommentPolicy@update/delete` + 4 baris route | `PERMISSION-MATRIX.md §3.2b`, §4 |
| K-11 | `BACKEND-ARCHITECTURE` mencontohkan `title` `max:255`, kontrak & kolom bilang 200 | `max:200` | `BACKEND-ARCHITECTURE.md §3` |

### Diresolusi di sini saja

| # | Konflik / lubang | Resolusi | Dasar |
| --- | --- | --- | --- |
| K-12 | `PERMISSION-MATRIX §1` v1.0 menulis `case Admin = 'admin'`, D-15 mem-pin `administrator` | `administrator`. Kode Fase 2 sudah benar; dokumennya yang salah dan sudah dikoreksi | DECISIONS > PERMISSION-MATRIX |
| K-13 | `ROADMAP:398` menjadikan `OPEN → CLOSED` contoh transisi ilegal | `OPEN → CLOSED` **legal** untuk M/A (jalur pembatalan §4.3). Test yang ditulis: `OPEN → RESOLVED` → 422 | STATUS-TRANSITION > ROADMAP |
| K-14 | `ROADMAP:387` menyebut 3 kolom sort, API-CONTRACT menyebut 6 | Enam: `created_at`, `updated_at`, `sla_deadline`, `priority_id`, `status_id`, `ticket_number` | API-CONTRACT > ROADMAP |
| K-15 | `ROADMAP:334` menyuruh `lockForUpdate()` untuk `ticket_number`; D-05 justru menghindari lock | D-05: insert → format dari ID auto-increment → update, di dalam satu transaksi. Keduanya sepakat melarang `max(id)+1` | DECISIONS > ROADMAP |
| K-16 | `ERD.md:546` mengklaim `schema.sql` acuan implementasi | Migration adalah source of truth. `schema.sql` disinkronkan Fase 10 | DECISIONS §2 |
| K-17 | `PERMISSION-MATRIX §3.3` memberi Technician `attachment.create` tanpa kualifikasi | Assigned-only, sesuai D-19. Sudah dikoreksi, tapi baru berlaku di Fase 5 | D-19 |
| K-18 | `API-CONTRACT:161` mencontohkan `role.id = 1` untuk `employee`; D-15 mem-pin 1 = `administrator` | Contohnya basi. Jangan turunkan fixture dari sana | DECISIONS > API-CONTRACT |
| K-19 | Apakah `note` yang tersimpan sebagai komentar memicu notifikasi komentar? | Tidak. Satu aksi = satu notifikasi per penerima | `STATUS-TRANSITION.md §6` v1.1 |
| K-20 | `note` wajib atau opsional di luar jalur pembatalan? | Opsional, maks 2000 karakter. Wajib hanya untuk `→ CLOSED` dari status non-`RESOLVED` | `STATUS-TRANSITION.md §6` v1.1 |
| K-21 | Ubah priority pada ticket `RESOLVED` bisa membalik verdict compliance D-03 | Diblokir pada status `is_closed` (`RESOLVED` dan `CLOSED`) | `STATUS-TRANSITION.md §9` v1.1 |
| K-22 | `department_id` diturunkan dari reporter, tapi reporter boleh punya `department_id` null | Ticket ikut `null`. Kolomnya nullable; filter tinggal tidak menjaringnya | ERD §4 baris 12 |
| K-23 | Attachment: Fase 3 atau Fase 5? | Fase 5. `attachments_count` bernilai 0 di Fase 3 | ROADMAP Fase 5 |
| K-24 | Bentuk respons & urutan `GET /comments` tidak dispesifikasikan | Paginated, urut `created_at` naik — satu timeline dengan histories | ROADMAP:379 + API-CONTRACT §6 histories |
| K-25 | Skenario 6 §31 (SLA breach) butuh scheduler yang baru ada Fase 4 | Diuji dua sisi: perhitungan defensif `sla_status` lewat HTTP, dan `SlaService::markBreached()` dipanggil langsung di test | Addendum §3.5 |
| K-26 | `GET /api/health` disebut PERMISSION-MATRIX §7 sebagai satu-satunya pengecualian selain login | Sudah ada sejak Fase 2b. Bukan isu lagi | kode |
| K-27 | Nilai `ticket_histories.field_changed` tidak dibatasi di mana pun | Tepat tiga: `status_id`, `technician_id`, `priority_id`, sesuai anotasi `ERD.md:230`. Direifikasi jadi enum | ERD |

### Catatan penafsiran exit criteria

`ROADMAP:412` menuntut "Tidak ada N+1 pada endpoint list dan detail (verifikasi dengan query log)".
Penafsiran yang dipakai: test menghitung jumlah query lewat `DB::listen` dan menegaskan bahwa
jumlahnya **tidak bertambah** saat cacah ticket dinaikkan dari 1 ke 10. Ini menangkap N+1 tanpa
memaku angka absolut yang akan pecah setiap kali ada eager load sah ditambahkan.

`ROADMAP:394` menuntut "Setiap BR-001 sampai BR-015 punya test negatif". BR-013 ("asset harus valid
dan terdaftar") diuji lewat `exists:assets,id` pada FormRequest. BR-003 ("ticket baru tidak wajib
punya technician") bersifat permisif — "negatif"-nya diuji sebagai: create tanpa `technician_id`
berhasil, dan `technician_id` yang dikirim client diabaikan.

---

## Dekomposisi Sub-Tahap

Lima sub-tahap berurutan. Masing-masing satu branch → PR → merge ke `main`.
**Jangan mulai sub-tahap berikutnya sebelum exit criteria sub-tahap sebelumnya terpenuhi.**

| Sub-tahap | Branch | Berkas rencana | Deliverable |
| --- | --- | --- | --- |
| 3a | `feat/phase-3a-ticket-foundation` | [`3a-foundation-policy.md`](3a-foundation-policy.md) | Amandemen spec, enum + peta transisi, `TicketPolicy`, `TicketCommentPolicy`, `AssetPolicy`, `SlaService`, `AuditLogger`, `NotificationService`, `ApiResponse::paginated()` sadar Resource, state factory, migration index |
| 3b | `feat/phase-3b-ticket-crud` | [`3b-ticket-crud.md`](3b-ticket-crud.md) | `TicketService` create/update/delete, `AssetAssignedToReporter`, `TicketResource`, `GET /assets/assignable`, 5 route ticket |
| 3c | `feat/phase-3c-ticket-query` | [`3c-ticket-query.md`](3c-ticket-query.md) | List dengan scoping + 11 filter + search + sort, 4 endpoint referensi |
| 3d | `feat/phase-3d-ticket-workflow` | [`3d-ticket-workflow.md`](3d-ticket-workflow.md) | `TicketStatusService`, 4 endpoint transisi, `available_actions`, `editable_fields`, 409 konkurensi |
| 3e | `feat/phase-3e-comments-history` | [`3e-comments-history.md`](3e-comments-history.md) | Komentar CRUD, histories, `GoldenPathTest`, sinkronisasi ROADMAP |

### Kenapa urutannya begitu

3a lebih dulu karena empat sub-tahap lain bergantung pada peta transisi, Policy, dan tiga service
penulis-baris. Menulisnya belakangan berarti menulis pemeriksaan otorisasi ad-hoc di controller,
lalu membongkarnya.

3b sebelum 3c karena test list butuh ticket yang bisa dibuat — dan membuatnya lewat endpoint yang
sudah diuji lebih murah daripada memelihara fixture factory paralel.

3c sebelum 3d karena `available_actions` di respons detail paling mudah diverifikasi kalau bentuk
Resource-nya sudah stabil dan sudah diuji.

3e terakhir karena komentar dipakai mesin transisi (`note` disimpan sebagai komentar) tapi tidak
sebaliknya. `TicketStatusService` di 3d menulis baris `ticket_comments` langsung; 3e menambahkan
endpoint yang mengelolanya.

---

## Exit Criteria Fase 3 (gabungan)

Diambil dari ROADMAP:407-412, `STATUS-TRANSITION.md §10`, dan `PERMISSION-MATRIX.md §6`, dengan
penafsiran di atas diterapkan.

- [x] Golden path §38 PRD (create → assign → in progress → resolve → close) selesai penuh dalam
      satu test end-to-end, memakai empat akun demo dan berpindah aktor di tiap langkah
- [x] Keenam skenario `§31` PRD punya test yang lulus
- [x] Seluruh checklist `STATUS-TRANSITION.md §10` hijau, termasuk lima baris konkurensi v1.1
- [x] BR-001 sampai BR-015 masing-masing punya test negatif
- [x] Setiap ability di `TicketPolicy`, `TicketCommentPolicy`, dan `AssetPolicy` yang dipakai
      Fase 3 punya test positif **dan** negatif
- [x] Setiap kode di `PERMISSION-MATRIX.md §5` terverifikasi — 403 dan 404 tidak tertukar
- [x] Setiap route Fase 3 punya test tanpa token → 401
- [x] Tidak ada N+1 pada `GET /api/tickets` dan `GET /api/tickets/{id}`
- [x] Tidak ada satu pun endpoint yang menerima `status_id`, `technician_id`, `reporter_id`,
      `ticket_number`, atau field SLA dari body client
- [x] `php artisan test` seluruhnya hijau
- [x] `vendor/bin/pint --test` bersih
- [x] `php artisan migrate:fresh --seed` sukses terhadap MySQL, lalu `migrate:rollback` bersih
- [x] Setiap route Fase 3 punya barisnya di `PERMISSION-MATRIX.md §4`
- [x] Checkbox Fase 3 di `ROADMAP.md` tersinkronisasi dengan yang benar-benar dikerjakan
- [ ] Git tag `v0.3.0` (Semantic Versioning) ditambahkan dan didorong ke repository saat fase selesai

## Di Luar Cakupan Fase 3

- **Attachment ticket** (upload, download, disk privat, `AttachmentPolicy`) → Fase 5
- **Scheduler SLA** (`tickets:check-sla`, penulisan `sla_breached`) → Fase 4. Fase 3 hanya
  menyediakan `SlaService::markBreached()` dan perhitungan defensif saat baca
- **Endpoint notifikasi** (`GET /api/notifications`, unread-count, mark-as-read) → Fase 4.
  Fase 3 hanya **menulis** baris `notifications`
- **Endpoint audit log** (`GET /api/audit-logs`) → Fase 4. Fase 3 hanya **menulis** barisnya
- **Asset management penuh** (CRUD, assign/release, history) → Fase 5. Fase 3 hanya
  `GET /api/assets/assignable` dan bagian `AssetPolicy` yang menjaganya
- **CRUD master data** (`POST`/`PUT`/`DELETE` pada categories/priorities/departments) → Fase 5.
  Fase 3 hanya `GET`
- **Knowledge base, dashboard, administrasi user** → Fase 5, 6, 5
- **Apa pun di `apps/web`** → Fase 7 dan 8. Verifikasi Fase 3 lewat Pest dan HTTP client
- **Sinkronisasi `docs/schema.sql`** dan konfigurasi CORS → Fase 10
