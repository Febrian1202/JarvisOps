# JARVIS OPS — DECISION LOG

**Document Revision:** 1.2
**Status:** Approved — mengunci implementasi
**Basis:** Audit kesiapan seluruh `docs/` sebelum Fase 0, 31 Agustus 2026
**Perubahan v1.1 (awal Fase 3):** amandemen D-08 (lima action transisi ticket), tambahan D-26 (`expected_status_id`), D-27 (`notifications.type`), D-28 (field SLA turunan), D-29 (bahasa pesan business rule). Semuanya menutup lubang yang ditemukan saat menyiapkan rencana Fase 3 — lihat `docs/tasks/phase-3/README.md §Resolusi Konflik`.
**Perubahan v1.2:** Tambahan D-30 (Semantic Versioning) untuk menstandarkan penomoran versi dan tagging.

---

## 1. Kenapa Dokumen Ini Ada

PRD, ERD, API contract, matriks transisi, dan matriks permission sudah lengkap dan tidak mengandung satu pun `TBD`. Justru itu masalahnya: audit menemukan sekitar lima puluh keputusan yang **tidak pernah diajukan sebagai pertanyaan**, sehingga tidak tertulis di mana pun dan akan diputuskan secara diam-diam oleh siapa pun yang pertama menulis kodenya — berbeda-beda di tiap tempat.

Dokumen ini menutup keputusan itu. Setiap entri punya nomor yang bisa dikutip dari commit message, komentar kode, atau test.

Aturannya sama dengan `ROADMAP.md §2`: **yang tertulis di sini sudah final dan tidak diperdebatkan lagi saat implementasi.** Kalau sebuah keputusan ternyata salah, ubah entrinya lewat commit tersendiri beserta alasannya, jangan diam-diam menyimpang di kode.

### Status entri

| Tanda | Arti |
| --- | --- |
| **DECIDED** | Final. Implementasikan apa adanya. |
| **CONFIRM** | Keputusan produk yang butuh persetujuan pemilik. Sudah ada default agar pekerjaan tidak terhenti; kalau default diterima, ubah statusnya jadi DECIDED. |

### Urutan baca

Bagian A wajib dibaca sebelum menulis migration (Fase 2). Bagian B sebelum menulis Policy (Fase 2). Bagian C sebelum menulis controller (Fase 3). Bagian D adalah catatan bahwa hal tersebut sengaja tidak dikerjakan.

---

## 2. Prioritas Dokumen Saat Bertentangan

Audit menemukan beberapa tempat di mana dua dokumen memberi jawaban berbeda untuk hal yang sama. Untuk menghentikan kelas masalah ini secara permanen:

**Urutan otoritas, dari tertinggi:**

1. `docs/adr/DECISIONS.md` (dokumen ini)
2. `docs/product/STATUS-TRANSITION.md` dan `docs/product/PERMISSION-MATRIX.md` — untuk transisi dan otorisasi
3. `docs/api/API-CONTRACT.md` — untuk bentuk request/response
4. `docs/architecture/ERD.md` + `docs/schema.sql` — untuk struktur data
5. `docs/product/ROADMAP.md` — untuk urutan dan exit criteria
6. `docs/product/PRD.md` — untuk maksud dan ruang lingkup

> **Catatan:** `docs/architecture/BACKEND-ARCHITECTURE.md` adalah dokumen turunan yang mengkonsolidasikan pola service layer & request pipeline dari PRD/PERMISSION-MATRIX/ROADMAP. Ia **tidak** menambah keputusan baru, sehingga tidak masuk urutan otoritas di atas — rujuk langsung ke dokumen sumbernya saat ada pertentangan.

PRD berada di posisi terakhir bukan karena tidak penting, tapi karena ia ditulis paling awal dan dokumen di atasnya dibuat justru untuk mempertajamnya. Kalau PRD dan dokumen turunannya berbeda, dokumen turunan menang — dan penyimpangannya dicatat di sini.

**Untuk kode:** migration adalah source of truth skema. Test adalah bukti bahwa keputusan di dokumen ini benar-benar berlaku. `docs/schema.sql` adalah lampiran laporan, disinkronkan di Fase 10.

---

## Bagian A — Skema & Migration (Fase 2)

### D-01 · SLA dihitung 24/7 (kalender flat)
- **Status:** DECIDED
- **Keputusan:** `sla_deadline = created_at + sla_duration_minutes`. Tidak ada konsep jam kerja, hari libur, atau kalender bisnis di MVP. Ticket yang dibuat Jumat 17:00 dengan SLA 1440 menit (24 jam) akan breach pada Sabtu 17:00.
- **Alasan:** Menambahkan jam kerja membutuhkan tabel hari libur, konfigurasi shift, dan penanganan zona waktu lokal. Tidak ada di PRD maupun ERD. Untuk MVP ITSM internal fase 1, kalender 24/7 adalah baseline yang deterministik dan mudah diuji.
- **Konsekuensi:** `SlaService` cukup melakukan penambahan integer menit ke `created_at`.

### D-02 · Tidak ada status ON_HOLD / SLA pause di MVP
- **Status:** DECIDED
- **Keputusan:** Status ticket tepat 5: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`. Tidak ada `ON_HOLD` atau `PENDING`. Jam SLA berjalan terus sejak dibuat sampai status mencapai `RESOLVED` atau `CLOSED`.
- **Alasan:** Menambah status pause mengubah matriks transisi dari 5x5 menjadi 6x6, membutuhkan kolom `sla_paused_minutes` dan `sla_resumed_at`, serta mengubah logika query defensive breach. PRD §11 dan Addendum §3 secara eksplisit mengunci 5 status.
- **Konsekuensi:** Menunggu respon reporter atau pihak ketiga tetap memotong durasi SLA.

### D-03 · Rumus SLA Compliance & Perlakuan Ticket Cancel
- **Status:** DECIDED
- **Keputusan:**
  - Formula: `(Tickets Resolved Within SLA / Total Resolved Tickets) * 100`
  - `Total Resolved Tickets` = Semua ticket yang memiliki `resolved_at IS NOT NULL` (mencakup status `RESOLVED` dan `CLOSED` yang pernah di-resolve).
  - Ticket yang di-cancel (`OPEN/ASSIGNED/IN_PROGRESS -> CLOSED` langsung dengan `resolved_at = NULL`) **dikeluarkan dari pembilang dan penyebut** SLA Compliance.
  - "Within SLA" dinilai dari: `resolved_at <= sla_deadline`.
  - Jika penyebut = 0, compliance = `null` (bukan 0, bukan 100).
- **Alasan:** Sesuai `STATUS-TRANSITION.md §4.3`, pembatalan bukan penyelesaian teknis dan tidak boleh merusak rasio performa tim.

### D-04 · `ticket_categories` mendukung hirarki lewat self-reference `parent_id`
- **Status:** DECIDED
- **Keputusan:** Tambahkan kolom `parent_id BIGINT UNSIGNED NULL REFERENCES ticket_categories(id) ON DELETE RESTRICT` pada migration `ticket_categories`.
- **Alasan:** `PRD.md §8` mendefinisikan kategori induk (Hardware, Software, Network, Account, Other) beserta turunannya (Laptop, Printer, Wi-Fi, VPN), dan `ROADMAP.md:256` menginstruksikan seeder membuat turunan. Tanpa `parent_id`, sub-kategori tidak memiliki representasi relasional.
- **Konsekuensi:** Kategori induk memiliki `parent_id = NULL`. Dropdown di form UI menampilkan opsi grouped atau bertingkat.

### D-05 · Strategi Nomor Tiket (`ticket_number`)
- **Status:** DECIDED
- **Keputusan:** Format nomor ticket adalah `TCK-%04d` berbasis ID auto-increment database (contoh: `TCK-0001`, `TCK-0012`). Dibuat di dalam `DB::transaction` saat create: insert record -> format ID -> update `ticket_number`. Jika ID > 9999, string memanjang alami (`TCK-10000`).
- **Alasan:** Menghindari kebutuhan tabel counter terpisah (tabel ke-19) sekaligus menghilangkan race condition duplicate key tanpa locking rumit. Sifatnya unik deterministik.
- **Konsekuensi:** Kolom `ticket_number VARCHAR(50) NOT NULL UNIQUE`. `TCK-0001` (4 digit padding) menjadi format standar seragam di seluruh aplikasi.

### D-06 · `employee_code` dan Profil Pegawai
- **Status:** DECIDED
- **Keputusan:**
  - `employee_code` di-generate server saat user dibuat jika tidak diisi client: `EMP-%04d` berbasis `user_id`.
  - Tabel `employee_profiles` dibuat otomatis untuk semua user (termasuk Admin, Manager, Technician) via `UserCreated` event/observer atau service.
- **Alasan:** `employee_profiles.employee_code` adalah `NOT NULL UNIQUE`. Menyerahkan generasi ke server mencegah kegagalan validasi saat admin mendaftarkan teknisi baru.

### D-07 · Bentuk JSON `audit_logs` & Aturan Redaksi Keamanan
- **Status:** DECIDED
- **Keputusan:**
  - `old_data` dan `new_data` bertipe `JSON NULL`, menyimpan key-value array dari atribut yang berubah (bukan full dump kecuali saat create).
  - **Blacklist redaksi wajib:** Atribut `password`, `remember_token`, `token`, `secret`, `api_token` **selalu dibuang** dari payload sebelum ditulis ke `audit_logs`.
  - Tambahkan kolom `description VARCHAR(500) NULL` pada migration `audit_logs` sesuai `API-CONTRACT.md:715`.
- **Alasan:** Mencegah kebocoran hash password atau token otentikasi ke tabel log yang dapat dibaca Manager/Admin.

### D-08 · Kosakata Baku `audit_logs.module` dan `audit_logs.action`
- **Status:** DECIDED (diamandemen Fase 3 — lihat *Amandemen 1* di bawah)
- **Keputusan:**
  - `module` (singular snake_case): `ticket`, `asset`, `article`, `user`, `role`, `department`, `ticket_category`, `ticket_priority`, `auth`.
  - `action` (singular/past verb konsisten): `create`, `update`, `delete`, `assign`, `reassign`, `unassign`, `status_change`, `priority_change`, `login`, `logout`, `password_reset`.
- **Alasan:** Menghilangkan divergensi antara ERD (plural), status transition (mixed), dan permission matrix. `PERMISSION-MATRIX.md §2.2` mengandalkan nilai `module` untuk membatasi akses Manager.

#### Amandemen 1 (Fase 3) — lima action transisi ticket

- **Tambahan `action`:** `self_assign`, `reopen`, `resolve`, `close`, `cancel`.
- **Alasan:** `STATUS-TRANSITION.md §6` memetakan sembilan side-effect transisi ke audit action yang berbeda-beda, dan lima di antaranya tidak ada di daftar asli. Kalau daftar asli dipaksakan, kelimanya runtuh menjadi `status_change` dan distingsi yang §6 bangun secara sengaja hilang dari audit trail — padahal justru `resolve` versus `cancel` yang membedakan ticket selesai dari ticket dibatalkan, dan D-03 bergantung pada perbedaan itu untuk menghitung SLA compliance.
- **Kosakata `action` lengkap sesudah amandemen (16 nilai):** `create`, `update`, `delete`, `assign`, `reassign`, `unassign`, `self_assign`, `status_change`, `priority_change`, `reopen`, `resolve`, `close`, `cancel`, `login`, `logout`, `password_reset`.
- **Konsekuensi:** Kosakata direifikasi jadi enum `App\Enums\AuditAction` dan `App\Enums\AuditModule`; `AuditLogger` hanya menerima enum, bukan string bebas, sehingga daftar ini tidak bisa melar diam-diam.

#### Amandemen 2 (Fase 4) — action SLA breach oleh background scheduler

- **Tambahan `action`:** `sla_breach`.
- **Alasan:** Penandaan breach oleh scheduler mengubah state persisten ticket secara permanen (`sla_breached = true`, `sla_breached_at = now()`) dan memicu notifikasi penting. Perubahan ini wajib memiliki jejak audit trail yang jelas sesuai PRD BR-010 dan DFD 4.3.
- **Kosakata `action` lengkap sesudah amandemen 2 (17 nilai):** `create`, `update`, `delete`, `assign`, `reassign`, `unassign`, `self_assign`, `status_change`, `priority_change`, `reopen`, `resolve`, `close`, `cancel`, `login`, `logout`, `password_reset`, `sla_breach`.
- **Konsekuensi:** Tambahkan case `SlaBreach = 'sla_breach'` pada enum `App\Enums\AuditAction`.

#### Amandemen 3 (Fase 5) — action asset/article/user lifecycle & module knowledge_category

- **Tambahan `action`:** `release`, `publish`, `unpublish`, `activate`, `deactivate`.
- **Tambahan `module`:** `knowledge_category`.
- **Alasan:** Fase 5 menambahkan operasi siklus hidup asset (`release`), artikel KB (`publish`, `unpublish`), serta manajemen user (`activate`, `deactivate`). Modul `knowledge_category` berdiri sebagai entitas tersendiri di KB. Operasi file attachment dicatat sebagai module `ticket` + action `create`/`delete` (child entity ticket).
- **Kosakata `action` lengkap sesudah amandemen 3 (22 nilai):** `create`, `update`, `delete`, `assign`, `reassign`, `unassign`, `self_assign`, `status_change`, `priority_change`, `reopen`, `resolve`, `close`, `cancel`, `login`, `logout`, `password_reset`, `sla_breach`, `release`, `publish`, `unpublish`, `activate`, `deactivate`.
- **Kosakata `module` lengkap sesudah amandemen 3 (10 nilai / 11 terdaftar):** `ticket`, `asset`, `article`, `user`, `role`, `department`, `ticket_category`, `ticket_priority`, `auth`, `knowledge_category`.
- **Konsekuensi:** Tambahkan case pada `App\Enums\AuditAction` dan `App\Enums\AuditModule`.

### D-09 · Constraint Integritas `asset_assignments`
- **Status:** DECIDED
- **Keputusan:**
  - Invarian "1 aset hanya boleh memiliki 1 pemegang aktif (`released_at IS NULL`)" ditegakkan di level aplikasi menggunakan `DB::transaction` dan `lockForUpdate()` pada record aset saat assignment.
  - Tambahkan composite index: `idx_asset_assignments_active (asset_id, released_at)`.
- **Alasan:** MySQL 8 tidak mendukung partial unique index (`WHERE released_at IS NULL`). Penegakan di service layer dengan row locking adalah pola standar Laravel yang aman dari race condition.

### D-10 · Strategi Pencarian: LIKE untuk MVP
- **Status:** DECIDED
- **Keputusan:** Pencarian artikel, ticket, dan aset pada MVP menggunakan `LIKE %query%` dengan sanitasi wildcard. `FULLTEXT` ditunda ke Fase 10 karena SQLite in-memory test suite tidak kompatibel dengan sintaks `MATCH ... AGAINST`.
- **Konsekuensi:** Tambahkan index b-tree pada `tickets(title)`, `knowledge_articles(title)`, dan `assets(name)`.

### D-11 · First-Login & Password Reset Flow
- **Status:** DECIDED (diamandemen Fase 5)
- **Keputusan:** Tambahkan kolom `must_change_password BOOLEAN NOT NULL DEFAULT FALSE` pada migration `users`.
  - Ketika Admin melakukan `POST /api/users/{id}/reset-password`, server men-generate password sementara secara acak sesuai kebijakan D-12, meng-update password hash user, dan menyetel `must_change_password = TRUE`.
  - Password sementara dikembalikan **sekali** di payload response API (`data.temporary_password`), dan tidak pernah dicatat di audit logs (redaksi D-07).
  - Middleware `EnsurePasswordChanged` mencegat request jika `must_change_password === true`, hanya mengizinkan `PUT /api/me/password`, `GET /api/me` (me.show), dan `POST /api/logout`.
- **Alasan:** Menyelesaikan kontrak `PRD Addendum §2.2` dan `API-CONTRACT §11` secara deterministik dan aman tanpa bergantung pada mekanisme email eksternal. User perlu melihat profil (`/me`) untuk mengetahui identitasnya saat dipaksa mengganti password.

### D-12 · Password Policy
- **Status:** DECIDED
- **Keputusan:** Password minimum 8 karakter, minimal mengandung 1 huruf dan 1 angka (`Password::min(8)->letters()->numbers()`). Konfirmasi password wajib untuk pendaftaran user dan ganti password.
- **Alasan:** Standar keamanan NFR-002 yang konkret dan dapat diuji.

### D-13 · Penamaan & Retensi File Attachment
- **Status:** DECIDED
- **Keputusan:**
  - File disimpan di disk private: `tickets/{ticket_id}/{ulid}.{ext}`.
  - Nama asli, ukuran (bytes), dan MIME type divalidasi dan disimpan di tabel `ticket_attachments`.
  - Saat baris `ticket_attachments` di-hard-delete, listener/observer menghapus file fisik terkait dari disk storage.
  - Soft delete pada ticket tidak menghapus baris attachment maupun file fisik.

### D-14 · Missing Columns & Index Checklist untuk Migration
- **Status:** DECIDED
- **Keputusan:** Seluruh migration wajib menyertakan kolom dan index operasional berikut:
  1. `audit_logs.description VARCHAR(500) NULL`
  2. `knowledge_articles.published_at TIMESTAMP NULL`
  3. `users.must_change_password BOOLEAN NOT NULL DEFAULT FALSE`
  4. `ticket_categories.parent_id BIGINT UNSIGNED NULL`
  5. Index `tickets(created_at)`, `tickets(resolved_at)`
  6. Index `users(status)`
  7. Index `assets(category)`, `assets(purchase_date)`
  8. Index `knowledge_articles(category_id)`, `knowledge_articles(author_id)`, `knowledge_articles(view_count)`
  9. Index `notifications(type)`, `notifications(user_id, is_read)`
  10. Composite index `ticket_comments(ticket_id, created_at)`
  11. Composite index `ticket_histories(ticket_id, created_at)`
  12. Composite index `asset_assignments(asset_id, released_at)`, `asset_assignments(user_id, released_at)`
  13. Charset: `utf8mb4`, Collation: `utf8mb4_unicode_ci`, Engine: `InnoDB`.

### D-15 · Seeder Reference Data & Pinning ID
- **Status:** DECIDED
- **Keputusan:**
  - `ticket_statuses`: Wajib pin ID 1=`OPEN`, 2=`ASSIGNED`, 3=`IN_PROGRESS`, 4=`RESOLVED`, 5=`CLOSED`.
  - `ticket_priorities`: Wajib pin ID 1=`Critical` (120 min), 2=`High` (240 min), 3=`Medium` (480 min), 4=`Low` (1440 min).
  - `roles`: 1=`administrator`, 2=`manager`, 3=`technician`, 4=`employee`.
  - `departments`: `Information Technology`, `Finance & Accounting`, `Human Resources`, `Operations`, `Marketing & Sales`.
  - `knowledge_categories`: `Hardware Troubleshooting`, `Network & Connectivity`, `Software & OS`, `Access & Account`, `Office Facility`.
- **Alasan:** Mencegah drift antara logic backend yang mengacu ID/slug status dengan data seeder.

---

## Bagian B — Otorisasi & Policy (Fase 2)

### D-16 · `Gate::before` Admin dan Pengecualian Eksplisit
- **Status:** DECIDED
- **Keputusan:**
  - Admin memiliki hak akses penuh secara default lewat `Gate::before`.
  - **Pengecualian:** Admin tetap terikat aturan bisnis protektif:
    1. Admin tidak bisa menonaktifkan/menghapus akunnya sendiri (mencegah lockout sistem).
    2. Admin tidak bisa membuka ticket berstatus `CLOSED` (status final mutlak).
    3. Notifikasi tetap terisolasi per `user_id` (Admin tidak membaca inbox notifikasi user lain).
- **Alasan:** Menyelaraskan `PERMISSION-MATRIX.md §1` dengan aturan protektif BR-017.

### D-17 · Presedensi Error: Otorisasi (403/404) vs Transisi Status (422)
- **Status:** DECIDED
- **Keputusan:** Pemeriksaan Policy/Gate **selalu dieksekusi sebelum** validasi transisi state machine.
  - Jika Employee bukan reporter mencoba mengubah status ticket orang lain -> **404 Not Found**.
  - Jika Technician non-assigned mencoba mengubah status ticket -> **403 Forbidden**.
  - Jika Manager/Admin mencoba transisi ilegal (misal `OPEN -> RESOLVED`) -> **422 Unprocessable Entity**.
- **Alasan:** Mencegah kebocoran informasi keberadaan resource kepada user yang tidak berhak.

### D-18 · Server-Set Fields: Tambahan `technician_id` dan `status_id`
- **Status:** DECIDED
- **Keputusan:** `API-CONTRACT.md §13` diperluas:
  - `technician_id` tidak boleh diubah lewat `PUT /api/tickets/{id}` umum. Hanya bisa diubah melalui `POST /api/tickets/{id}/assign` atau transisi self-assign.
  - `status_id` tidak boleh diubah lewat `PUT /api/tickets/{id}`. Hanya bisa diubah melalui `POST /api/tickets/{id}/status`.
  - `slug` artikel di-generate server saat create dan immutable saat update title.

### D-19 · Hak Akses Technician terhadap Ticket: View All, Mutate Assigned Only
- **Status:** DECIDED
- **Keputusan:**
  - Technician boleh melihat (`view`, `viewAny`) seluruh ticket dalam sistem untuk visibilitas antrean tim.
  - Technician **hanya boleh berkomentar, mengunggah attachment, dan mengubah status** pada ticket di mana `technician_id === auth()->id()`.
  - Pengecualian: Technician boleh melakukan transisi self-assign (`OPEN -> IN_PROGRESS`) pada ticket yang belum memiliki teknisi.
- **Alasan:** Menyatukan ketentuan PRD §5 (visibilitas operasional) dengan BR-005 (integritas penanganan ticket).

### D-20 · Endpoint Pelengkap yang Wajib Ada
- **Status:** DECIDED
- **Keputusan:** Tambahkan definisi route dan controller untuk endpoint berikut:
  1. `PUT /api/me` — Update profil mandiri (telepon, nama, foto) tanpa bisa mengubah `role_id` atau `email`.
  2. `GET /api/roles` — Daftar role untuk dropdown form user Admin.
  3. `GET /api/assets/{id}` — Detail aset tunggal.
  4. `POST /api/tickets/{id}/unassign` — Alias eksplisit untuk transisi `ASSIGNED -> OPEN`.
  5. `DELETE /api/tickets/{id}/comments/{comment_id}` — Hapus komentar (hanya author dalam batas 15 menit atau Admin).

---

## Bagian C — Kontrak API & Client (Fase 3)

### D-21 · Optimistic Locking pada Transisi Status Ticket
- **Status:** DECIDED
- **Keputusan:** Request `POST /api/tickets/{id}/status` dan `POST /api/tickets/{id}/assign` menerima parameter opsional `expected_status_id`. Jika status saat ini di DB berbeda dengan `expected_status_id`, server mengembalikan `409 Conflict`.
- **Alasan:** Mencegah race condition ketika dua teknisi/manager membuka ticket yang sama dan melakukan aksi bertabrakan secara bersamaan.

### D-22 · Standar HTTP Status Code untuk Create
- **Status:** DECIDED
- **Keputusan:** Seluruh operasi pembuatan resource yang berhasil (`POST /api/tickets`, `POST /api/assets`, `POST /api/articles`, `POST /api/users`, `POST /api/tickets/{id}/comments`, `POST /api/tickets/{id}/attachments`) **selalu mengembalikan HTTP 201 Created**.
- **Konsekuensi:** `200 OK` hanya untuk `GET`, `PUT`/`PATCH`, dan `POST` aksi non-creation.

### D-23 · Zona Waktu & Format Tanggal
- **Status:** DECIDED
- **Keputusan:**
  - Server & Database: UTC murni (`APP_TIMEZONE=UTC`). Seluruh field timestamp dikirim dalam format ISO 8601 UTC (`2026-08-31T10:00:00Z`).
  - Frontend: Mengonversi tampilan ke waktu lokal user (default: `Asia/Jakarta`, WIB / UTC+7).
  - Filter `date_from` dan `date_to` dikirim dalam `YYYY-MM-DD` dan diinterpretasikan sebagai batas awal (00:00:00) dan akhir (23:59:59) hari pada waktu lokal aplikasi sebelum dikonversi ke query UTC.

### D-24 · Bahasa Pesan Validasi & Notifikasi
- **Status:** DECIDED
- **Keputusan:**
  - API envelope message: Bahasa Inggris (standar Laravel, `"Ticket created successfully."`) agar konsisten dengan `API-CONTRACT.md §2`.
  - Validation errors (custom `messages()` di FormRequest): **Bahasa Indonesia** (`"Judul tiket harus diisi."`) agar lebih mudah dipahami user perusahaan.
  - Body notifikasi in-app & log deskripsi: Bahasa Indonesia (`"Ticket #TCK-0012 telah ditugaskan kepada Anda."`).

### D-25 · Masa Hidup Token Sanctum & Cookie
- **Status:** DECIDED
- **Keputusan:**
  - Token Sanctum kedaluwarsa secara absolut dalam **12 jam** (`720` menit) sejak dibuat. Tidak ada *sliding window* (idle timeout).
  - HttpOnly cookie di Next.js diberi `maxAge` yang persis sama (12 jam).
  - Tabel `personal_access_tokens` dibersihkan dari token mati setiap hari oleh scheduler (`sanctum:prune-expired`).
- **Alasan:** Menutup NFR-002 (Security). Default Sanctum dan cookie sesi tanpa *maxAge* berarti akses bisa terus hidup selamanya jika user tidak eksplisit menekan tombol Logout, yang berbahaya bila laptop hilang atau token bocor dari log DB. 12 jam cukup longgar untuk shift kerja ITSM sehingga tidak mengganggu pengalaman pengguna. Waktu absolut dipilih agar tidak perlu kustomisasi ekstensif pada *last used time*.

### D-26 · Kontrak `expected_status_id` dan Urutan Evaluasi Error Transisi
- **Status:** DECIDED
- **Keputusan:**
  - `expected_status_id` diterima sebagai parameter **opsional** oleh `POST /api/tickets/{id}/status` dan `POST /api/tickets/{id}/assign` saja. `POST /api/tickets/{id}/unassign` dan `POST /api/tickets/{id}/priority` **tidak** menerimanya.
  - Bila dikirim dan `tickets.status_id` di DB berbeda, server mengembalikan `409` dengan envelope error standar: `message` = `"Ticket status has changed since it was loaded. Please refresh and try again."`, `errors` = `null`.
  - Bila tidak dikirim, tidak ada pemeriksaan konkurensi — perilakunya identik dengan sebelum D-21.
  - **Urutan evaluasi wajib** pada endpoint transisi, dari pertama:
    1. `auth:sanctum` → `401`
    2. Policy/Gate → `403` atau `404` (D-17)
    3. FormRequest (validasi field, mis. `status_id` ada di `ticket_statuses`) → `422`
    4. **Pemeriksaan `expected_status_id` → `409`**
    5. Legalitas transisi terhadap matriks `STATUS-TRANSITION.md §3` → `422`
    6. Prasyarat data `STATUS-TRANSITION.md §5` → `422`
- **Alasan:** D-21 mewajibkan parameternya tapi tidak menetapkan bentuknya, sehingga tiap endpoint berisiko menjawab beda. Soal 409 mendahului 422 legalitas: kalau view klien sudah basi, premis "dari status X" yang dipakai untuk menilai legalitas juga sudah salah — memberi tahu "transisi ilegal" akan menyesatkan, sedangkan `409` mengarahkan klien ke tindakan yang benar, yaitu refetch. Otorisasi tetap paling awal karena membocorkan keberadaan atau state resource kepada yang tidak berhak lebih buruk daripada pesan yang kurang presisi (D-17).
- **Konsekuensi:** Pemeriksaan konkurensi hidup di lapisan service (`TicketStatusService`), bukan di FormRequest — hanya service yang boleh melempar `409` (`BACKEND-ARCHITECTURE.md §2`). Pembacaan `tickets.status_id` untuk perbandingan dilakukan di dalam transaksi dengan `lockForUpdate()` agar pemeriksaannya tidak balapan dengan dirinya sendiri.

### D-27 · Kosakata Baku `notifications.type`
- **Status:** DECIDED
- **Keputusan:**
  - Casing: **SCREAMING_SNAKE_CASE**, mengikuti contoh `API-CONTRACT.md:573` (`TICKET_ASSIGNED`). Anotasi lowercase di `ERD.md:262` diperlakukan sebagai deskripsi, bukan nilai literal.
  - Daftar tertutup untuk domain ticket, memetakan side-effect transisi dan event penting: `TICKET_ASSIGNED`, `TICKET_REASSIGNED`, `TICKET_UNASSIGNED`, `TICKET_STATUS_CHANGED`, `TICKET_SELF_ASSIGNED`, `TICKET_REOPENED`, `TICKET_RESOLVED`, `TICKET_CLOSED`, `TICKET_CANCELLED`, `TICKET_COMMENTED`, `TICKET_SLA_BREACHED`.
  - `notifications.data` wajib memuat kunci: `ticket_id`, `ticket_number`, `title`, `actor_name`, `message`, `url`. `message` berbahasa Indonesia (D-24), `url` relatif (`/tickets/{id}`). Untuk event sistem (seperti SLA breach), `actor_name` bernilai `"Sistem"`.
- **Alasan:** Memastikan payload notifikasi seragam di seluruh aplikasi. Nilai `type` menjadi filter di `GET /api/notifications` sehingga merupakan bagian dari kontrak publik.
- **Konsekuensi:** Direifikasi jadi enum `App\Enums\NotificationType`; `NotificationService` hanya menerima enum.

### D-28 · Semantik Field SLA Turunan (`sla_status`, `sla_remaining_minutes`)
- **Status:** DECIDED
- **Keputusan:**
  - `sla_status` (dua nilai, `on_track` | `breached`, sesuai `API-CONTRACT.md:246`) dihitung **defensif saat request**: bernilai `breached` bila `sla_breached = true` **atau** (`ticket_statuses.is_closed = false` **dan** `now() > sla_deadline`); selain itu `on_track`.
  - Ticket yang berhenti tepat waktu (`RESOLVED`/`CLOSED` sebelum deadline) melaporkan `on_track` selamanya. Tidak ada nilai ketiga.
  - `sla_remaining_minutes` bernilai `null` begitu `resolved_at` **atau** `closed_at` terisi — jam SLA sudah berhenti (`STATUS-TRANSITION.md §7`), jadi hitungan mundur yang terus berjalan akan berbohong.
  - Selama jam masih berjalan, `sla_remaining_minutes` adalah **integer bertanda** hasil `now()->diffInMinutes(sla_deadline, false)` — boleh negatif untuk menyatakan seberapa jauh deadline terlewat. Frontend yang memformat tanda negatif jadi "terlambat N menit".
  - Filter `?sla_status=` memakai definisi yang sama persis dengan yang dikembalikan payload, sebagai satu scope Eloquent supaya tampilan dan filter tidak bisa berbeda.
- **Alasan:** `API-CONTRACT.md:313` menyertakan `sla_remaining_minutes` tanpa mendefinisikannya sama sekali. Clamp ke 0 akan membuang informasi "seberapa terlambat" yang justru dibutuhkan Manager, sedangkan meneruskan hitungan mundur setelah resolve akan menampilkan angka yang bertentangan dengan `resolved_at`. Perhitungan defensif diperlukan karena `sla_breached` ditulis scheduler yang bisa tertinggal (`Addendum §3.5`) — pembacaan harus benar meski scheduler mati.

### D-29 · Bahasa Pesan Error Business Rule dari Service Layer
- **Status:** DECIDED
- **Keputusan:** Pesan error yang mendarat di `errors.<field>` — baik berasal dari `messages()` FormRequest maupun dari `ValidationException` yang dilempar service layer — seluruhnya **Bahasa Indonesia**, memperluas D-24. `message` pada envelope tetap Bahasa Inggris. Contoh berbahasa Inggris di `STATUS-TRANSITION.md §8` dan `API-CONTRACT.md §2.2` diperlakukan sebagai ilustrasi **bentuk** JSON, bukan string literal yang harus disalin.
- **Alasan:** D-24 membagi bahasa berdasarkan *lapisan* (envelope vs validasi), tapi contoh di dua dokumen turunan membaginya berdasarkan *sumber* (FormRequest vs service), sehingga satu form bisa menampilkan dua bahasa untuk dua kegagalan yang bagi user tidak berbeda — validasi field dan pelanggaran business rule sama-sama muncul di bawah input yang sama. Pembagian per lapisan yang menang.
- **Konsekuensi:** Pesan transisi ilegal, prasyarat tidak terpenuhi, dan kepemilikan asset ditulis dalam Bahasa Indonesia dan tetap menyebut **nama** status, bukan ID (`STATUS-TRANSITION.md §8`). Pesan `sort_by`/`sort_dir` di `HandlesPagination` yang terlanjur Inggris di Fase 2 ikut diterjemahkan di Fase 3.

---

## Bagian D — Release & Deployment

### D-30 · Semantic Versioning (SemVer) dan Git Tagging
- **Status:** DECIDED
- **Keputusan:**
  - Penomoran versi menggunakan standar Semantic Versioning 2.0.0 (`vMAJOR.MINOR.PATCH`).
  - Proyek menggunakan satu tag global di repositori (contoh: `v1.0.0`), berlaku bersama untuk backend (API) dan frontend (Web).
  - Peningkatan versi:
    - **MAJOR:** Perubahan arsitektur besar, rilis fase-fase akhir (seperti selesainya Phase 10).
    - **MINOR:** Rilis fitur baru pada setiap selesainya sebuah fase Roadmap yang stabil (misal Phase 2 selesai menjadi v0.2.0, rilis penuh v1.0.0).
    - **PATCH:** Perbaikan bug kritis atau pembaruan keamanan.
  - Tag Git menjadi sumber kebenaran mutlak (SSOT) untuk versi. Nilai ini bisa diinjeksikan sebagai *build argument* atau *environment variable* (misalnya `APP_VERSION`) ke dalam sistem tanpa perlu melakukan hardcode pada source code.
  - Docker Image akan di-tag mengikuti Git tag (contoh: `jarvisops-api:v1.0.0` dan `jarvisops-web:v1.0.0`) selain tag `:latest`, untuk memudahkan rollback.
- **Alasan:** Monorepo deployment via Docker sangat rentan tanpa identifikasi versi yang eksplisit. Menggunakan SemVer mempermudah rollback yang stabil di production, memungkinkan automasi CI/CD berbasis Git Tag, dan memberikan kejelasan versi antara frontend dan backend.

### D-31 · Pencatatan Audit Log untuk Event Sistem Background (Actor-less)
- **Status:** DECIDED
- **Keputusan:**
  - Untuk aksi otomatis yang diinisiasi oleh sistem background (seperti `tickets:check-sla`), `AuditLogger::log()` menerima `$actor = null`.
  - Kolom `audit_logs.user_id`, `audit_logs.ip_address`, dan `audit_logs.user_agent` disimpan sebagai `null` di database.
- **Alasan:** Background command/scheduler dieksekusi di lingkungan CLI tanpa sesi user HTTP aktif. Skema `audit_logs.user_id` sudah bertipe `NULLABLE` di database.
- **Konsekuensi:** `AuditLogger::log(?User $actor, ...)` menggunakan null-safe operator `$actor?->id`.
