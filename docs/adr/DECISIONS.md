# JARVIS OPS — DECISION LOG

**Version:** 1.0
**Status:** Approved — mengunci implementasi
**Basis:** Audit kesiapan seluruh `docs/` sebelum Fase 0, 31 Agustus 2026

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

PRD berada di posisi terakhir bukan karena tidak penting, tapi karena ia ditulis paling awal dan dokumen di atasnya dibuat justru untuk mempertajamnya. Kalau PRD dan dokumen turunannya berbeda, dokumen turunan menang — dan penyimpangannya dicatat di sini.

**Untuk kode:** migration adalah source of truth skema. Test adalah bukti bahwa keputusan di dokumen ini benar-benar berlaku. `docs/schema.sql` adalah lampiran laporan, disinkronkan di Fase 10.

---

## Bagian A — Skema & Migration (Fase 2)

### D-01 · SLA dihitung 24/7 (kalender flat)
- **Status:** CONFIRM (default: 24/7)
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
- **Status:** DECIDED
- **Keputusan:**
  - `module` (singular snake_case): `ticket`, `asset`, `article`, `user`, `role`, `department`, `ticket_category`, `ticket_priority`, `auth`.
  - `action` (singular/past verb konsisten): `create`, `update`, `delete`, `assign`, `reassign`, `unassign`, `status_change`, `priority_change`, `login`, `logout`, `password_reset`.
- **Alasan:** Menghilangkan divergensi antara ERD (plural), status transition (mixed), dan permission matrix. `PERMISSION-MATRIX.md §2.2` mengandalkan nilai `module` untuk membatasi akses Manager.

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
- **Status:** DECIDED
- **Keputusan:** Tambahkan kolom `must_change_password BOOLEAN NOT NULL DEFAULT FALSE` pada migration `users`.
  - Ketika Admin melakukan `POST /api/users/{id}/reset-password`, flag ini diset `TRUE`.
  - Middleware `EnsurePasswordChanged` mencegat request jika `must_change_password === true`, hanya mengizinkan `PUT /api/me/password` dan `POST /api/logout`.
- **Alasan:** Menyelesaikan kontrak `PRD Addendum §2.2` tanpa menambah kompleksitas token reset email eksternal.

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
- **Status:** CONFIRM (default: Bahasa Indonesia untuk notifikasi, Inggris untuk API envelope)
- **Keputusan:**
  - API envelope message & validation errors: Bahasa Inggris standar Laravel (`"The title field is required."`) agar konsisten dengan `API-CONTRACT.md §2`.
  - Body notifikasi in-app & log deskripsi: Bahasa Indonesia (`"Ticket #TCK-0012 telah ditugaskan kepada Anda."`) sesuai kebutuhan user perusahaan.
