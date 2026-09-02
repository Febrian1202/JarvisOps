# FASE 5 — Asset Management, Knowledge Base, File Attachment, Administrasi · Rencana Implementasi

> **Panduan Eksekusi Dua Jalur:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi rencana ini task demi task. Setiap langkah memakai sintaks checkbox (`- [ ]`) agar progres terlacak.
> - **Untuk developer manusia:** Ikuti alur TDD di [§Alur Kerja Per Task](#alur-kerja-per-task) dan lihat panduan lingkungan di [§Onboarding Developer](#onboarding-developer). Setiap task dilengkapi estimasi waktu, berkas target, snippet test/implementasi, dan blok *Jebakan* untuk menghindari kesalahan umum.

**Goal:** Melengkapi dua modul pendukung (Asset & Knowledge Base) dan menyelesaikan penanganan file (Attachment) serta administrasi (User & master data) sehingga seluruh API MVP selesai. Di akhir fase, asset bisa dikelola, di-assign, dan ber-riwayat; artikel bisa dibuat, dipublikasikan, dan dicari; attachment hanya bisa diunduh lewat otorisasi ticket; dan Admin bisa mengelola user serta master data tanpa merusak integritas referensi.

**Architecture:**
1. **Asset Management:** Controller tipis → FormRequest → DTO → service → API Resource. Invariant *"satu asset hanya boleh punya satu assignment aktif"* (D-09) ditegakkan di service dengan `DB::transaction` + `lockForUpdate()`, bukan partial unique index (MySQL 8 tidak mendukung). Riwayat kepemilikan (§17 PRD) direkonstruksi dari `asset_assignments`; aksi non-assignment dicatat di `asset_histories`.
2. **Knowledge Base:** `ArticleService` menangani slug (immutable, D-18), publish/unpublish, increment `view_count` atomik, dan related articles. `ArticlePolicy` menegakkan keputusan "Limited" (§2.1 PERMISSION): Technician boleh edit/unpublish artikel siapa pun, tapi hanya hapus miliknya sendiri. Employee hanya melihat `published` → draft = **404**.
3. **File Attachment:** Disk `private` terdedikasi (`serve => false`), validasi multi-lapis (MIME + ekstensi + ukuran), nama file di-generate (ULID), metadata lengkap disimpan. Download **selalu** lewat controller setelah `TicketPolicy` lulus — tidak ada jalur akses kedua. Penghapusan record juga menghapus file fisik (D-13).
4. **Administration:** `UserService` + service master data. **Delete master data diblokir 409** bila masih dirujuk (meniru maksud FK RESTRICT yang dipilih di migration, karena soft delete melewati FK). Deaktivasi user mencabut seluruh token-nya. Reset password di-generate server, dikembalikan sekali, dan memaksa `must_change_password`.
5. **Otorisasi & Keamanan:** Seluruh penjagaan via Laravel Gate/Policy (`#[UsePolicy]`). Gate administrasi (`user.*`, `*.manage`) sudah terdaftar di `AbilityMatrix` dan sudah lolos test — Fase 5 hanya memakainya. Rate limiter `upload` (20/mnt) yang sudah didefinisikan diaktifkan.

**Tech Stack:** PHP 8.5 · Laravel 13.29 · Sanctum 4 · Pest 5 (PHPUnit 13) · Pint · MySQL 8.4 (dev/prod) · SQLite in-memory (test). **Tanpa paket baru** — tidak ada `spatie/laravel-permission`, tidak ada library gambar/PDF, tidak ada library slug khusus (pakai `Str::slug` bawaan).

**Spec:** Dokumen `docs/` yang sudah disetujui, dibaca dengan urutan otoritas:

| Dokumen | Perannya untuk Fase 5 |
| --- | --- |
| `docs/adr/DECISIONS.md` | D-07 (redaksi audit), D-08 (kosakata audit — **diamandemen di 5a**), D-09 (lock asset assignment), D-10 (search LIKE), D-11 (reset password — **diamandemen di 5a**), D-12 (password policy), D-13 (attachment storage), D-14 (index), D-15 (pinned seeder), D-16 (admin exceptions), D-18 (server-set fields), D-22 (201 untuk create), D-24/D-29 (bahasa). **Otoritas tertinggi.** |
| `docs/product/PERMISSION-MATRIX.md` | §3.3 `AttachmentPolicy`, §3.4 `AssetPolicy`, §3.5 `ArticlePolicy`, §3.8 Administrasi, §4 inventori route, §5 aturan 403-vs-404, §6 checklist test (dikoreksi butir self-protection → 403). |
| `docs/api/API-CONTRACT.md` | §2 envelope, §4 query parameter, §7 asset, §8 knowledge base, §11 administration, §12 rate limiting, §13 server-set fields. |
| `docs/architecture/BACKEND-ARCHITECTURE.md` | v1.4. Pipeline request, controller tipis, DTO, service, FormRequest, API Resource, struktur folder domain. |
| `docs/architecture/ERD.md` | Relasi asset–assignment–history, knowledge base, attachment, admin. Semantik index §6 (tiga index hilang — ditambah di 5a). |
| `docs/product/ROADMAP.md` | Task checklist & exit criteria Fase 5 (baris 519–597). |
| `docs/product/PRD.md` | §8 kategori, §9 priority, §15–17 asset, §18–19 KB, §24–25 search/pagination; Addendum §1 (asset–ticket), §5 (KB moderation), §6 (attachment), §12 (Definition of Technical Success). |

Urutan otoritas saat bertentangan (DECISIONS §2):
`DECISIONS.md` > `STATUS-TRANSITION.md` / `PERMISSION-MATRIX.md` > `API-CONTRACT.md` > `ERD.md` / `schema.sql` > `ROADMAP.md` > `PRD.md`.

---

## Global Constraints

Berlaku untuk **setiap** task di seluruh sub-tahap Fase 5:

### Envelope & Kontrak API
- Setiap respons API memakai satu format amplop:
  - Sukses berdata: `{ success: true, message: "...", data: {...}, meta?: {...} }`
  - Sukses tanpa data: `{ success: true, message: "...", data: null }`
  - Error: `{ success: false, message: "...", errors: {...} | null }`
- `meta` pada pagination berisi **tepat 6 kunci**: `current_page`, `per_page`, `total`, `last_page`, `from`, `to`. **Tanpa `links`** (API-CONTRACT §2.2).
- **`204 No Content` dilarang** — selalu status `200` beramplop.
- Setiap pembuatan resource yang berhasil mengembalikan **`201`** (D-22). `POST` aksi non-creation (assign/release/publish/unpublish/activate/deactivate) mengembalikan **`200`**.
- **Satu pengecualian envelope:** `GET /api/attachments/{id}/download` mengembalikan **stream file** (bukan JSON). Error-nya tetap JSON lewat exception handler.

### Format Data & Waktu
- Timestamp selalu **ISO 8601 UTC** (`YYYY-MM-DDTHH:mm:ssZ`). Server & DB berjalan dalam **UTC murni** (D-23).
- Tanggal saja: `YYYY-MM-DD`. Filter rentang tanggal ditafsirkan sebagai `00:00:00`/`23:59:59` **waktu Asia/Jakarta (WIB/UTC+7)**, lalu dikonversi ke UTC sebelum query (D-23).
- Durasi selalu integer **menit**. Ukuran file dalam **byte** (`file_size`).
- Penamaan field `snake_case`; route `kebab-case` plural.

### Bahasa (D-24, D-29)
- Envelope `message`: **Bahasa Inggris** (`"Asset created successfully."`, `"Article published successfully."`).
- Seluruh isi `errors.<field>`: **Bahasa Indonesia** — dari `messages()` FormRequest maupun `ValidationException` service (D-29). Contoh: `"Status aset tidak valid."`, `"Nama kategori sudah digunakan."`.
- `audit_logs.description`: **Bahasa Indonesia** (`"Budi menugaskan aset AST-0002 kepada Andi."`).
- `asset_histories.description`: **Bahasa Indonesia** (berisi nama aktor, karena tabel tidak punya kolom `user_id`).
- Dokumen `docs/` (termasuk berkas rencana ini): **Bahasa Indonesia**.
- Kode program (nama class, method, variabel, komentar kode): **Bahasa Inggris**.

### Otorisasi & Akses Data
- Otorisasi murni Laravel Policy dan Gate. Admin lolos `Gate::before` dengan pengecualian D-16.
- **Scoping di Server:** scoping role (mis. Employee hanya artikel `published`, hanya `reporter_id` sendiri) diaplikasikan **sebelum** filter client. Filter tidak pernah bisa memperluas cakupan.
- **403 vs 404 (PERMISSION §5):** kalau keberadaan resource itu rahasia bagi pemanggil → **404**. Employee membuka artikel draft → **404** (`denyAsNotFound`). Technician mengubah artikel orang lain → **403** (keberadaan artikel bukan rahasia baginya). Employee mengunduh attachment dari ticket orang lain → **404**.
- **Proteksi diri Admin (D-16 #1):** Admin tidak bisa menonaktifkan/menghapus akun sendiri → **403** (gate `user.deactivate`/`user.delete`). Admin tidak bisa mengubah `role_id` sendiri → juga **403** (service), bukan 422 — lihat resolusi konflik #13.
- **Delete master data:** diblokir **409** bila masih dirujuk (service guard, pesan Indonesia).

### Kebersihan & Mutu Kode
- Jalankan `vendor/bin/pint --dirty --format agent` setelah memodifikasi berkas PHP apa pun.
- Seluruh feature test berjalan terhadap **SQLite in-memory** (`phpunit.xml`); `apps/api/.env` mengarah ke MySQL.
- Setiap perubahan migration diverifikasi `php artisan migrate:fresh --seed` dan `migrate:rollback` terhadap **MySQL dev container**.
- Branch: `feat/phase-5<x>-<topik>`, merge ke `main` lewat PR walau solo. Semua perintah dijalankan dari `apps/api`.

---

## Titik Awal: Apa Yang Sudah Ada

Dibaca dari kode, bukan dari dokumen. **Jangan membangun ulang hal-hal ini.**

| Sudah ada | Lokasi | Catatan untuk Fase 5 |
| --- | --- | --- |
| 11 tabel sasaran (assets, asset_assignments, asset_histories, knowledge_categories, knowledge_articles, ticket_attachments, users, employee_profiles, departments, ticket_categories, ticket_priorities) + 18 model + 18 factory | `database/migrations/`, `app/Models/`, `database/factories/` | Skema sudah 100% sesuai D-14. `Asset` pakai `#[UsePolicy(AssetPolicy::class)]` — pola yang ditiru `KnowledgeArticle` dan `TicketAttachment` |
| `AssetStatus` enum (lowercase: `available`, `assigned`, `maintenance`, `retired`, `lost`) | `app/Enums/AssetStatus.php` | Kunci resolusi konflik casing #3 |
| `AssetPolicy` (baru 4 ability: view, viewAny, viewAssignable, viewOwn) | `app/Policies/AssetPolicy.php` | 5a melengkapi: create, update, delete, assign, release, viewHistory |
| `TicketPolicy@attach` + `isParticipant()` | `app/Policies/Ticket/TicketPolicy.php` | Jangkar otorisasi attachment sudah siap |
| Gate administrasi: `user.*` (7), `*.manage` (4 resource), `technician.list`, `ticket-status.viewAny` | `app/Authorization/AbilityMatrix.php` + `AppServiceProvider` | Sudah terdaftar & sudah lolos `GateRegistrationTest` |
| `ApiResponse` (success/created/error/paginated) + `HandlesPagination` (getPerPage, applySorting whitelist) | `app/Support/` | Dipakai semua list endpoint baru |
| Exception handler JSON (401/403/404/409/422/429) | `bootstrap/app.php` | `denyAsNotFound` → 404 sudah bekerja |
| `AuditLogger` (redaksi D-07, actor nullable) + `NotificationService` + `SlaService` | `app/Services/Audit|Notification|Sla/` | Dipanggil eksplisit dari service Fase 5 |
| `UserObserver` — auto-buat `employee_profile` + `employee_code` `EMP-%04d` | `app/Observers/UserObserver.php` | Berdampak pada `POST /api/users` (lihat 5e) |
| `EnsurePasswordChanged` middleware (D-11) | `app/Http/Middleware/EnsurePasswordChanged.php` | Sudah terpasang di route; `reset-password` memicu flag-nya |
| Rate limiter `upload` (20/mnt), `search` (60/mnt) — **didefinisikan tapi belum dipakai** | `AppServiceProvider::configureRateLimiters()` | 5d mengaktifkan `throttle:upload`; `search` ditunda ke Fase 10 |
| `ReferenceDataSeeder` pinned (role 1–4, status 1–5, priority 1–4, kategori) | `database/seeders/ReferenceDataSeeder.php` | `TestCase::$seeder` → otomatis jalan di tiap feature test |
| Factory dengan role state: `UserFactory::admin/manager/technician/employee/inactive` | `database/factories/UserFactory.php` | `AssetFactory`/`KnowledgeArticleFactory` **belum** punya state — ditambah di 5a |

Yang **belum ada sama sekali**: controller/request/resource/service/DTO untuk asset (selain `assignable`), article, attachment, dan administrasi; `ArticlePolicy` & `AttachmentPolicy`; disk `private`; migrasi index `knowledge_articles(title)`, `knowledge_articles(status)`, `assets(status)`; enum `ArticleStatus` & `AssetHistoryAction`; state factory asset/article; guard integritas master data.

### Asumsi prasyarat (sesuai arahan proyek)

> **Asumsi:** Seluruh task dan exit criteria **Fase 3 (Ticket Core & Workflow)** dan **Fase 4 (SLA, Notification, Audit Log)** dianggap **selesai**. Rencana ini tidak bergantung pada kode Fase 3/4 yang belum diinspeksi di sini, kecuali yang tertera pada tabel di atas (semuanya sudah diverifikasi ada di `main`). Bila pada saat 5a dieksekusi ada yang belum selesai (mis. endpoint referensi `GET /api/ticket-categories`), kerjakan dulu prasyarat tersebut — daftar dependensinya ada di masing-masing sub-berkas.

---

## Resolusi Konflik & Keputusan Desain (18 Poin)

Pembacaan ulang spec menemukan konflik & lubang. Seluruhnya sudah diresolusi di bawah. **Jangan buka ulang keputusan ini saat implementasi.**

| # | Topik | Masalah / Konflik Antar-Dokumen | Keputusan Final & Resolusi | Dasar Otoritas |
| --- | --- | --- | --- | --- |
| **1** | Disk untuk attachment | `config/filesystems.php` disk `local` memakai `serve => true` → Laravel mendaftarkan route `GET /storage/{path}` (terverifikasi lewat `route:list`). Jalur ini tidak melewati `TicketPolicy` | **Matikan `serve` pada disk `local`** dan tambah disk **`private`** (root `storage_path('app/private')`, `serve => false`, visibility `private`, `throw => true`). Kedua disk berbagi root yang sama, jadi mematikan `serve` di `local` wajib agar tidak ada jalur `/storage/*` yang bisa mengakses file. Hanya ada satu code path akses file. | Addendum §6.5, PRODUCT.md ("attachment tidak punya URL publik sama sekali") |
| **2** | Technician delete asset | ROADMAP:531 memberi Technician "CRUD asset" penuh; PERMISSION §3.4 melarang `delete` (T = ❌) | Technician **tidak** boleh `delete` asset. `AssetPolicy@delete` = Manager/Admin. | PERMISSION §3.4 > ROADMAP |
| **3** | Casing nilai status asset | ROADMAP/PRD §16 menulis uppercase (`AVAILABLE`…); API-CONTRACT §7, enum `AssetStatus`, dan default migration memakai lowercase (`available`…) | Seluruh wire format **lowercase**. `AssetStatus` enum sudah benar; jangan diubah. Keterangan ROADMAP dikoreksi. | API-CONTRACT > ROADMAP/PRD |
| **4** | Kode error assign asset | ROADMAP:574 menuntut 422 untuk "asset sudah ter-assign di-assign lagi"; API-CONTRACT:502 menuntut 409 untuk assignment aktif, 422 untuk status tidak layak | **Dua kode berbeda:** status `maintenance`/`retired`/`lost` → **422**; sudah punya assignment aktif (`released_at IS NULL`) → **409**. Checkbox ROADMAP dikoreksi. | API-CONTRACT §7 > ROADMAP |
| **5** | Field search asset | ROADMAP:540 menulis `asset_tag`, `serial_number`; API-CONTRACT:439 menulis `asset_tag`, `serial_number`, `name` | Tiga field: `asset_tag`, `serial_number`, `name` (LIKE, sanitasi wildcard D-10). | API-CONTRACT > ROADMAP |
| **6** | Employee buka artikel draft | ROADMAP:577 menulis 403/404; PERMISSION §5 menetapkan **404** | `ArticlePolicy@view` → `Response::denyAsNotFound()` untuk Employee pada `status != published`. | PERMISSION §5 > ROADMAP |
| **7** | Routing article | `GET /api/articles/{slug}` vs `PUT/DELETE /api/articles/{id}` (campur slug & id) | Jangan set `getRouteKeyName()` global. Route binding eksplisit: `articles/{article:slug}` untuk show, `articles/{article}` untuk mutasi. | PERMISSION §4 |
| **8** | Semantik `published_at` | Kolom ada (D-14 #2) tapi tidak ada aturan isi | Diisi saat **publish pertama**; **tidak** dikosongkan saat unpublish. Ini mempertahankan fakta "artikel pernah tampil" dan dipakai sortir `recent_articles` Fase 6. | D-14, kebutuhan Fase 6 |
| **9** | `view_count` | API-CONTRACT §8 "menambah view_count" tanpa detail | `increment()` atomik hanya pada `GET /articles/{slug}` saat `status = published`. Tidak ada audit log untuk read. | API-CONTRACT §8 |
| **10** | Index hilang | D-10 & ERD §6 meminta `knowledge_articles(title)`, `knowledge_articles(status)`, `assets(status)`; tidak ada di migration (terverifikasi dari grep) | Satu migration baru di 5a menambahkan ketiganya. | D-10, ERD §6 |
| **11** | Aktor di asset history | `asset_histories` tidak punya `user_id` (migration & schema.sql sepakat); ROADMAP mewajibkan history tiap aksi; PRD §17 butuh nama pemegang | **Pertahankan skema.** Nama aktor di-embed ke `description` (Indonesia). Nama pemegang dari `asset_assignments.user_id`. Jejak ter-query di `audit_logs` (module `asset`). | Keputusan pemilik proyek (6 April) |
| **12** | Kosakata audit | D-08 tidak punya `release`, `publish`, `unpublish`, `activate`, `deactivate`; `AuditModule` tidak punya `knowledge_category` | **D-08 Amandemen 3:** +5 action, +1 module (`knowledge_category`). Attachment dicatat sebagai module `ticket` + action `create`/`delete` (child ticket; tetap terlihat Manager §2.2). | D-08, PERMISSION §2.2 |
| **13** | Proteksi diri Admin | PERMISSION §6 menuntut 422 untuk "Admin mengubah role/deaktivasi diri"; gate `user.deactivate`/`user.delete` (D-16 #1) sudah menolak → 403 dan sudah lolos test | **403** lewat gate (deactivate/delete) dan lewat service (`role_id` sendiri). Checklist PERMISSION §6 dikoreksi jadi 403. Tidak ada kode lama dirombak. | D-16 #1, D-17, kode yang sudah dites |
| **14** | Delete master data | Soft delete melewati FK RESTRICT → kategori/priority/department tertrash meninggalkan relasi null yang memecahkan `TicketResource` | **Tolak 409** bila masih dirujuk (guard `count` di service). Berlaku department, ticket-category (+children), ticket-priority, knowledge-category, dan user yang masih reporter/technician/author/assignment aktif. | Keputusan pemilik proyek; meniru maksud FK RESTRICT |
| **15** | Reset password | D-11 hanya menetapkan efek (`must_change_password = true`); API-CONTRACT:701 "set password sementara" tanpa mekanisme | **Server generate** password acak (D-12), `must_change_password = true`, password dikembalikan **sekali** di respons (tidak pernah di log — redaksi D-07). | D-11 (diamandemen), D-12, D-07 |
| **16** | Create user + observer | `UserObserver` auto-buat `employee_profile`; payload `profile` (API-CONTRACT:711) | Service `updateOrCreate` profil **setelah** observer: field yang dikirim menimpa default; `employee_code` client divalidasi unik. | D-06, API-CONTRACT §11 |
| **17** | Slug artikel | `Str::slug`, immutable (D-18), kolisi tidak dispesifikasikan | Base slug; kolisi diberi suffix `-2`, `-3`, dst (deterministik). Client tidak boleh mengirim slug. | D-18, API-CONTRACT §8 |
| **18** | Jadwal & estimasi | ROADMAP mengalokasikan ~4 hari (Minggu 4 hari 4 – Minggu 5 hari 2) untuk ~40 endpoint + file handling | Estimasi jujur **6,5–7 hari** (5 sub-tahap). Dinyatakan sebagai **overrun sadar**, diserap buffer Minggu 8; ROADMAP tidak diubah angkanya, hanya dicatat di sini. | ROADMAP Lampiran C |

> **Catatan penafsiran exit criteria ROADMAP:594** ("Riwayat kepemilikan asset bisa ditampilkan seperti contoh §17"): `GET /api/assets/{id}/history` mengembalikan **satu array terurut waktu** yang menggabungkan `asset_assignments` (rel `assignment`) dan `asset_histories` (rel `history`), masing-masing ber-penanda `type`, non-paginated (volume riwayat asset di MVP kecil). Bentuk alternatif (dipisah dua array) sengaja tidak dipakai agar sesuai kalimat "gabungan … urut waktu" API-CONTRACT:514.

---

## Dekomposisi Sub-Tahap

Fase 5 dibagi menjadi **lima sub-tahap berurutan**. Setiap sub-tahap dikerjakan dalam satu branch terisolasi, diuji penuh, dan digabungkan melalui Pull Request ke `main`. **Jangan mulai sub-tahap berikutnya sebelum exit criteria sub-tahap sebelumnya terpenuhi.**

```
Fase 5: Asset, Knowledge Base, Attachment, Administrasi
│
├── 5a: Foundation, Spec, Policy           (feat/phase-5a-foundation-spec-policy)   ~1.0 hari
│   ├── Amandemen spec (D-08 Amd 3, D-11, PERMISSION, ROADMAP)
│   ├── Enum: ArticleStatus, AssetHistoryAction, AuditAction/Module (+)
│   ├── Policy: ArticlePolicy, AttachmentPolicy, lengkap AssetPolicy + #[UsePolicy]
│   ├── Model: relasi (activeAssignment, dll), cast status enum, route-key article
│   ├── Migrasi 3 index + disk `private` di config
│   └── Factory state (AssetStatus, ArticleStatus) + rewrite AssetPolicy ke subfolder
│
├── 5b: Asset Management                    (feat/phase-5b-asset)                 ~1.5 hari
│   ├── IndexAssetRequest + AssetQueryService (scoping, search, filter, sort)
│   ├── DTO + AssetService (create/update/delete + history + audit)
│   ├── Assign/Release service (lockForUpdate, 422/409, asset_histories)
│   ├── Resource List/Detail + GET /assets/{id}/history + GET /my-assets
│   └── 10 route asset
│
├── 5c: Knowledge Base                      (feat/phase-5c-knowledge-base)        ~1.5 hari
│   ├── ArticleService (slug, publish/unpublish, view_count, related, delete)
│   ├── IndexArticleRequest + scoping Employee (published-only)
│   ├── ArticleResource (List + Detail) + route (slug/id binding)
│   └── KnowledgeCategoryService CRUD + GET /knowledge-categories
│
├── 5d: File Attachment                     (feat/phase-5d-attachment)            ~1.5 hari
│   ├── StoreAttachmentRequest (validasi multi-lapis MIME+ekstensi+ukuran)
│   ├── AttachmentService::store (ULID, disk private, metadata)
│   ├── AttachmentController (index, download stream, destroy) + AttachmentPolicy
│   ├── TicketAttachmentObserver (hapus file setelah commit, D-13)
│   └── Route + throttle:upload + test validasi (6MB, .exe, mismatch MIME)
│
└── 5e: Administration                      (feat/phase-5e-administration)        ~1.5 hari
    ├── UserService (create+profile, update, delete+guard, deactivate revoke token, reset-password)
    ├── ReferentialIntegrityGuard + service 4 master data
    ├── Controller user + 4 master data + GET /api/roles
    ├── Test 422 email duplikat, 403 non-admin, snapshot SLA tak berubah
    └── Sinkronisasi ROADMAP/PERMISSION + tag v0.5.0
```

### Kenapa urutannya begitu

5a lebih dulu karena seluruh sub-tahap lain bergantung pada Policy, enum, model relation, index, dan disk yang dibuat di sana. 5b sebelum 5c/5d untuk menutup cerita asset–ticket dari Fase 3 dan memberi seeder demo assignment yang realistis. 5c & 5d independen satu sama lain; urutannya menjaga ukuran PR. 5e terakhir karena master data adalah **data referensi paling awal yang dirujuk modul lain** — menulis guard delete setelah seluruh konsumen (ticket, article, user) terbukti adalah cara paling aman, dan `GET /api/roles` hanya dikonsumsi form user Admin.

---

## Onboarding Developer

Bagian ini disiapkan khusus untuk mempermudah developer manusia dalam memahami dan mengoperasikan lingkungan kerja Fase 5.

### 1. Menjalankan Lingkungan Lokal
```bash
# Menyalakan seluruh service (API, Scheduler, MySQL, Web)
make up

# Masuk ke shell container API
docker compose exec api bash
```

Jika menjalankan di host langsung (tanpa Docker):
```bash
cd apps/api
php artisan serve --port=8000
```

### 2. Perintah Testing & Diagnostik Cepat
```bash
cd apps/api

# Menjalankan seluruh test suite Pest
vendor/bin/pest

# Menjalankan satu file test spesifik
vendor/bin/pest tests/Feature/Asset/AssetTest.php
vendor/bin/pest tests/Feature/Knowledge/ArticleTest.php
vendor/bin/pest tests/Feature/Attachment/AttachmentTest.php
vendor/bin/pest tests/Feature/Admin/UserAdminTest.php

# Memeriksa daftar route yang baru terdaftar
php artisan route:list --path=api

# Migrasi terhadap MySQL dev
php artisan migrate:fresh --seed
php artisan migrate:rollback --step=1

# Linter / Code Formatter (wajib sebelum commit)
vendor/bin/pint --dirty --format agent
```

### 3. Alur Uji Manual Cepat (tanpa menunggu frontend)
Autentikasi lalu eksekusi alur di bawah dengan curl/Postman:

```bash
# 1. Login sebagai Manager
TOKEN=$(curl -s -X POST http://localhost:8000/api/login \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"email":"manager@jarvisops.test","password":"Password123!"}' \
  | jq -r .data.token)

# 2. Buat asset baru
curl -s -X POST http://localhost:8000/api/assets \
  -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"asset_tag":"AST-X1-001","name":"ThinkPad X1","category":"Laptop","brand":"Lenovo","model":"X1 Carbon","serial_number":"SN-X1-001","purchase_date":"2025-03-15","status":"available"}'

# 3. Assign ke employee
curl -s -X POST http://localhost:8000/api/assets/1/assign \
  -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"user_id":4,"notes":"Unit baru"}'   # user_id 4 = employee demo

# 4. Release
curl -s -X POST http://localhost:8000/api/assets/1/release \
  -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"notes":"Dikembalikan"}'

# 5. Buat artikel lalu publish
curl -s -X POST http://localhost:8000/api/articles \
  -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"title":"Wi-Fi Tidak Terhubung","category_id":1,"content":"Langkah 1...","status":"draft"}'
curl -s -X POST http://localhost:8000/api/articles/1/publish \
  -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json'
```

### 4. Cara Menguji Upload Attachment Secara Manual
```bash
# Login sebagai Technician (partisipan ticket)
TOKEN=$(curl -s -X POST http://localhost:8000/api/login -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"email":"technician@jarvisops.test","password":"Password123!"}' | jq -r .data.token)

# Buat file uji
printf 'dummy pdf' > /tmp/test.pdf

# Upload ke ticket 1
curl -s -X POST http://localhost:8000/api/tickets/1/attachments \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.pdf;type=application/pdf"

# Unduh
curl -s -OJ http://localhost:8000/api/attachments/1/download \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Glosarium Konsep Kunci
1. **Server-set field (D-18):** field seperti `slug`, `view_count`, `author_id`, `uploaded_by`, `stored_filename`, `storage_path`, `assigned_at`, `released_at` selalu ditentukan server; input client diabaikan atau ditolak.
2. **Soft delete vs FK RESTRICT:** soft delete tidak menembak constraint FK. Karena itu guard rujukan di service menggantikan FK RESTRICT agar tidak ada relasi tertrash yang "terlihat hilang".
3. **Partial unique index:** MySQL 8 tidak mendukung `WHERE released_at IS NULL` pada unique index; invariant satu-assignment-aktif ditegakkan di aplikasi dengan row lock (`lockForUpdate`).
4. **Disk privat + serve=false:** satu-satunya jalan akses file adalah controller terautentikasi; tidak ada route `/storage/*` yang bisa menjadi jalur samping.
5. **Validasi multi-lapis file:** `mimes` + `mimetypes` + `extensions` + `max` — menolak `.exe`/`.sh`/`.bat` dan file yang MIME-nya tidak cocok dengan ekstensinya.
6. **denyAsNotFound:** `Response::denyAsNotFound()` dari Policy → exception handler memetakannya ke 404, menyembunyikan keberadaan resource.
7. **Referential integrity guard:** pemeriksaan `count` rujukan sebelum delete master data → 409 bila masih dipakai.

---

## Alur Kerja Per Task

Setiap task di sub-berkas 5a–5e dirancang untuk dieksekusi dengan disiplin **Test-Driven Development (TDD)**:

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
│      Controller, Policy, Enum, atau Migration.         │
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
│    - Atomic commit sesuai konvensi Conventional        │
│      Commits (feat:, fix:, test:, chore:, docs:).      │
└────────────────────────────────────────────────────────┘
```

### Checklist Sebelum Membuka Pull Request (PR)
- [ ] Seluruh test unit & feature sub-tahap lulus (`vendor/bin/pest`).
- [ ] Tidak ada pelanggaran formatting (`vendor/bin/pint --test`).
- [ ] `php artisan migrate:fresh --seed` berhasil dijalankan pada database MySQL.
- [ ] Endpoint yang baru dibuat terdaftar di `docs/product/PERMISSION-MATRIX.md §4` (baris yang belum ada).
- [ ] Setiap route baru punya test tanpa token → 401.
- [ ] Checkbox task terkait di sub-berkas telah dicentang.
- [ ] Deskripsi audit log (Indonesia) dan `AuditAction`/`AuditModule` yang dipakai konsisten dengan D-08 Amandemen 3.

---

## Exit Criteria Fase 5 (Gabungan)

Fase 5 dinyatakan selesai jika seluruh kondisi berikut terpenuhi:

- [ ] **Asset:** CRUD (T/M/A, tanpa `delete` utk T), assign/release (422 utk status tak layak, 409 utk assignment aktif), `GET /api/my-assets` (Employee), `GET /api/assets/{id}/history` (timeline gabungan §17 PRD), search (3 field) + filter (status/category/assigned_user_id) + pagination.
- [ ] **Knowledge Base:** artikel CRUD + publish/unpublish (T boleh langsung publish), slug otomatis-unik-immutable, `view_count` atomik, related articles (≤5, published), Employee hanya melihat `published` (draft → 404), search judul+isi + filter kategori, kategori CRUD (Admin).
- [ ] **Attachment:** upload hanya partisipan; validasi MIME+ekstensi+5 MB; tolak `.exe`/`.sh`/`.bat` dan mismatch MIME; disk `private` tanpa route `/storage/*`; download lewat `TicketPolicy` (Employee non-partisipan → 404); delete (uploader/M/A) menghapus record + file fisik; `throttle:upload` aktif.
- [ ] **Administrasi:** user CRUD (Admin), email unik (BR-018), deaktivasi mencabut token, reset-password server-generate memicu `must_change_password`, delete user/mater data yang dirujuk → 409, `sla_minutes` diubah tidak mengubah ticket lama (snapshot).
- [ ] **Otorisasi:** setiap ability baru punya test positif & negatif; 401 tanpa token; 403 vs 404 sesuai PERMISSION §5; Admin tidak bisa deaktivasi/ubah role diri (403).
- [ ] **N+1:** jumlah query pada list endpoint tidak bertambah saat volume data naik (DB::listen).
- [ ] **Definisi Technical Success Addendum §12** butir 1, 3, 9, 10, 11 terverifikasi dengan test.
- [ ] `php artisan test` seluruhnya hijau (suite gabungan Fase 1–5).
- [ ] `vendor/bin/pint --test` bersih.
- [ ] `php artisan migrate:fresh --seed` sukses terhadap MySQL, lalu `migrate:rollback` bersih.
- [ ] Checkbox Fase 5 di `docs/product/ROADMAP.md` tersinkronisasi (termasuk koreksi baris 531, 574, 577 sesuai tabel resolusi konflik).
- [ ] `docs/product/PERMISSION-MATRIX.md §4` memuat seluruh route baru; §2.2 modul Manager mencakup `knowledge_category`; §6 butir self-protection dikoreksi jadi 403.
- [ ] Git tag `v0.5.0` (Semantic Versioning, D-30) ditambahkan dan didorong saat fase selesai.

---

## Di Luar Cakupan Fase 5

Untuk menjaga fokus dan mencegah *scope creep*, item berikut **secara sadar tidak dikerjakan di Fase 5**:

- **Apa pun di `apps/web`** (halaman asset, KB, attachment, admin, notification bell) → **Fase 7 & 8**. Verifikasi Fase 5 lewat Pest dan HTTP client.
- **Endpoint agregasi dashboard** (`/api/dashboard/*`, compliance SLA, performa technician) → **Fase 6**. Fase 5 hanya menyediakan data mentah.
- **Tipe notifikasi baru** (mis. `ASSET_ASSIGNED`, `ARTICLE_PUBLISHED`). D-27 menutup daftar ke domain ticket; asset/article/attachment cukup menulis audit log. Jika dibutuhkan di masa depan, itu keputusan baru.
- **CRUD `roles`** (hanya `GET /api/roles`). Ability matrix berbasis enum membuat role baru non-fungsional; manajemen role dinamis di luar MVP (US-016).
- **Advanced search / FULLTEXT** → Fase 10 (D-10).
- **Rate limiter `search` (60/mnt)** → diaktifkan di Fase 10 bersama audit endpoint search menyeluruh; Fase 5 hanya mengaktifkan `upload`.
- **Export report, dark mode, saved filters** → buffer Minggu 8 / Fase 10.
- **Sinkronisasi `docs/schema.sql`** dengan migration (bertambah divergensi: index baru, kolom tidak berubah) → **Fase 10**.
- **`users.status` di-cast ke enum `UserStatus`** di model → ditunda; validasi tetap lewat `Rule::enum`/string. Bukan keputusan fungsional.
- **Penambahan `user_id` ke `asset_histories`** → keputusan #11: skema dipertahankan.
