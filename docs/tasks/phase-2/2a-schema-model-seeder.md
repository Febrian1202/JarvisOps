# Fase 2a — Skema, Model, dan Seeder (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi rencana ini task demi task.
> Langkah-langkah memakai sintaks checkbox (`- [ ]`).

**Goal:** Membangun seluruh skema database (18 tabel) beserta relasi Eloquent dua arah, enum pendukung, factory, dan seeder referensi idempoten dengan ID ter-pin, sehingga infrastruktur data siap dipakai oleh lapisan auth dan fitur.

**Architecture:** Migration memuat 13 penyesuaian khusus (checklist D-14) dan index eksplisit. Model memakai atribut PHP 8 `#[Fillable]`, `#[Hidden]`, dan mematikan `updated_at` pada tabel append-only (`const UPDATED_AT = null;`). `EmployeeProfile` di-generate otomatis via observer.

**Spec:**
- Rencana Utama: `docs/tasks/phase-2/README.md`
- Dependency FK: `ROADMAP.md` (baris 228–242)
- Kolom Tabel: `schema.sql` (18 entitas utama, dengan modifikasi D-14)
- Keputusan Skema: `DECISIONS.md` Bagian A (D-01 sampai D-15)

## Global Constraints

- **TDD:** Tulis test yang membuktikan skema/relasi, pastikan gagal (merah), implementasi, pastikan hijau.
- **Pint:** Jalankan `vendor/bin/pint --dirty --format agent` di `apps/api` setelah edit file PHP.
- **Format Tanggal API:** Tanggal yang keluar dari array/JSON model **harus** berformat ISO 8601 UTC.
- **Urutan Migration:** File migration yang dibuat mengikuti namespace timestamp `2026_09_01_0001XX` agar berjalan secara deterministik setelah tabel default Laravel.

---

### Task 1: Fondasi Enum dan Trait Format Tanggal

**Files:**
- Create: `apps/api/app/Enums/RoleName.php`
- Create: `apps/api/app/Enums/UserStatus.php`
- Create: `apps/api/app/Enums/TicketStatusName.php`
- Create: `apps/api/app/Enums/AssetStatus.php`
- Create: `apps/api/app/Models/Concerns/SerializesDatesAsIso8601.php`
- Create: `apps/api/tests/Unit/EnumsTest.php`

**Detail:**
Task ini membuat kamus nilai yang dipakai di seluruh seeder dan logic aplikasi, serta trait agar tanggal yang dirender JSON selalu berformat `YYYY-MM-DDTHH:mm:ssZ`.

- [ ] **Step 1: Tulis Unit Test**
Buat test yang memastikan trait `SerializesDatesAsIso8601` mengembalikan string UTC berakhiran 'Z' dan enum `RoleName` memiliki nilai yang disepakati (contoh `RoleName::Admin->value === 'administrator'`). Enum ini mengikuti D-15.
- [ ] **Step 2: Jalankan test (gagal)** `make test` atau pest.
- [ ] **Step 3: Implementasi Enums**
  - `RoleName` (string): Admin = 'administrator', Manager = 'manager', Technician = 'technician', Employee = 'employee'.
  - `UserStatus` (string): Active = 'active', Inactive = 'inactive'.
  - `TicketStatusName` (string): Open = 'OPEN', Assigned = 'ASSIGNED', InProgress = 'IN_PROGRESS', Resolved = 'RESOLVED', Closed = 'CLOSED'.
  - `AssetStatus` (string): Available = 'available', Assigned = 'assigned', Maintenance = 'maintenance', Retired = 'retired', Lost = 'lost'.
- [ ] **Step 4: Implementasi Trait Serialisasi Tanggal**
  - Trait berisi method `serializeDate(DateTimeInterface $date)` yang me-return `$date->timezone('UTC')->format('Y-m-d\TH:i:s\Z');`
- [ ] **Step 5: Verifikasi (hijau) lalu Commit.**

---

### Task 2: Modifikasi Migration Bawaan (Users) & Tabel Referensi Awal

**Files:**
- Delete: `apps/api/database/migrations/0001_01_01_000000_create_users_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000100_create_roles_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000101_create_departments_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000102_create_users_table.php`

**Detail:**
Membersihkan `sessions` dan `password_reset_tokens` (D-11, REST API stateless) dan membangun ulang `users` beserta referensi `roles` dan `departments` sesuai schema.sql dan D-14.

- [ ] **Step 1: Hapus Migration Lama**
Hapus `0001_01_01_000000_create_users_table.php`.
- [ ] **Step 2: Buat Roles Migration**
Kolom: `id`, `name` (unique), `description` (nullable), soft deletes, timestamps.
- [ ] **Step 3: Buat Departments Migration**
Kolom: `id`, `name` (unique), `description` (nullable), soft deletes, timestamps.
- [ ] **Step 4: Buat Users Migration Baru**
Kolom:
  - `id`, FK `role_id` (wajib), FK `department_id` (nullable, SET NULL)
  - `email` (unique), `password` (string)
  - `full_name` (string) -> Menggantikan `name` standar
  - `status` (string, default 'active', index) -> Gunakan index eksplisit D-14
  - `must_change_password` (boolean, default false) -> Dari D-11
  - `last_login_at` (timestamp, nullable)
  - timestamps, soft deletes
  - *Tidak ada* `email_verified_at` atau `remember_token`.
- [ ] **Step 5: Test migrate & rollback**
Jalankan `make migrate` ke database MySQL (bukan test SQLite) lalu `php artisan migrate:rollback --step=3`. Pastikan berhasil tanpa error foreign key.
- [ ] **Step 6: Commit.**

---

### Task 3: Model User, Role, Department & EmployeeProfile (Observer)

**Files:**
- Modify: `apps/api/app/Models/User.php`
- Create: `apps/api/app/Models/Role.php`
- Create: `apps/api/app/Models/Department.php`
- Create: `apps/api/app/Models/EmployeeProfile.php`
- Create: `apps/api/app/Observers/UserObserver.php`
- Create: `apps/api/database/migrations/2026_09_01_000103_create_employee_profiles_table.php`
- Create: `apps/api/tests/Feature/Schema/UserDomainTest.php`

**Detail:**
Menghubungkan tabel dari Task 2 dan membuat profil pegawai 1:1 otomatis via Observer (D-06).

- [ ] **Step 1: Tulis Test Relasi & Observer**
Buat feature test yang membuat User (menggunakan DB facade atau Model statis jika factory belum siap), dan asserts `EmployeeProfile` langsung terbuat secara otomatis dengan kode format `EMP-000X`.
- [ ] **Step 2: Migration EmployeeProfiles**
Kolom: `id`, FK `user_id` (unique, CASCADE), `employee_code` (unique), `phone` (nullable), `position` (nullable), `hire_date` (date, nullable), timestamps, soft deletes.
- [ ] **Step 3: Implementasi Model**
  - Terapkan `#[Fillable]` eksplisit pada seluruh model.
  - Gunakan trait `SerializesDatesAsIso8601`.
  - Hapus trait `Notifiable` dari `User`.
  - Definisikan relasi dua arah (`belongsTo`, `hasMany`, `hasOne`).
- [ ] **Step 4: Implementasi UserObserver**
Pada method `created`, panggil `EmployeeProfile::create` dengan relasi ke user tersebut dan `employee_code` bernilai `sprintf('EMP-%04d', $user->id)`. Daftarkan observer ini di `boot` method model User via atribut `#[ObservedBy(UserObserver::class)]`.
- [ ] **Step 5: Verifikasi test (hijau) & Commit.**

---

### Task 4: Modul Asset Management

**Files:**
- Create: `apps/api/database/migrations/2026_09_01_000104_create_assets_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000105_create_asset_assignments_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000106_create_asset_histories_table.php`
- Create: `apps/api/app/Models/Asset.php`
- Create: `apps/api/app/Models/AssetAssignment.php`
- Create: `apps/api/app/Models/AssetHistory.php`
- Create: `apps/api/tests/Feature/Schema/AssetDomainTest.php`

**Detail:**
Assets, assignments, dan histories. Perhatikan tabel history bersifat append-only.

- [ ] **Step 1: Test Skema Asset**
- [ ] **Step 2: Migrations**
  - **Assets:** `asset_tag` (unique), `name`, `category`, `brand`, `model`, `serial_number` (unique), `purchase_date` (date), `status` (default 'available'), notes. Soft deletes. (Index D-14: category, purchase_date).
  - **AssetAssignments:** FK `asset_id`, FK `user_id`, `assigned_at`, `released_at` (nullable), notes. Soft deletes. Composite index (asset_id, released_at) & (user_id, released_at) sesuai D-14.
  - **AssetHistories:** FK `asset_id`, `action`, `description`, `action_at`. **Hanya `created_at`** (tidak ada soft delete atau updated_at).
- [ ] **Step 3: Model & Relasi**
  - Gunakan `const UPDATED_AT = null;` pada `AssetHistory`.
  - Relasi `hasMany` dan `belongsTo`.
- [ ] **Step 4: Verifikasi & Commit.**

---

### Task 5: Master Data Tiket

**Files:**
- Create: `apps/api/database/migrations/2026_09_01_000107_create_ticket_categories_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000108_create_ticket_priorities_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000109_create_ticket_statuses_table.php`
- Create: Model untuk ketiganya (`TicketCategory`, `TicketPriority`, `TicketStatus`).
- Create: `apps/api/tests/Feature/Schema/TicketMasterTest.php`

**Detail:**
Tabel referensi dasar untuk tiket.

- [ ] **Step 1: Test Relasi Kategori Bertingkat**
- [ ] **Step 2: Migrations**
  - **Categories:** `name` (unique), `description`, `parent_id` (nullable FK ke ticket_categories, ON DELETE RESTRICT) sesuai D-04. Soft deletes.
  - **Priorities:** `name` (unique), `sla_minutes` (int unsigned), `description`. Soft deletes.
  - **Statuses:** `name` (unique), `description`, `is_closed` (boolean, false), `is_final` (boolean, false). Soft deletes.
- [ ] **Step 3: Model**
  - `TicketCategory` punya relasi `parent()` dan `children()`.
- [ ] **Step 4: Verifikasi & Commit.**

---

### Task 6: Tabel Core Tickets

**Files:**
- Create: `apps/api/database/migrations/2026_09_01_000110_create_tickets_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000111_create_ticket_comments_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000112_create_ticket_attachments_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000113_create_ticket_histories_table.php`
- Create: Model untuk keempatnya.
- Create: `apps/api/tests/Feature/Schema/TicketCoreTest.php`

**Detail:**
Tabel tiket memiliki 7 foreign key (kategori, prioritas, status, reporter, technician, department, asset).

- [ ] **Step 1: Test Relasi Tiket**
- [ ] **Step 2: Migrations**
  - **Tickets:** `ticket_number` (VARCHAR(50), unique, sesuai D-05), 7 FK sesuai schema.sql. `title`, `description`. `sla_duration_minutes`, `sla_deadline`, `resolved_at`, `closed_at`, `sla_breached` (boolean, false), `sla_breached_at`. Soft deletes. (Index D-14: created_at, resolved_at).
  - **Comments:** FK `ticket_id` (CASCADE), FK `user_id`, `body`. Soft deletes. (Composite index D-14: ticket_id, created_at).
  - **Attachments:** FK `ticket_id` (CASCADE), FK `uploaded_by` (users), `original_filename`, `stored_filename`, `mime_type`, `file_size`, `storage_path`. **Append-only** (`created_at` saja).
  - **Histories:** FK `ticket_id` (CASCADE), FK `user_id`, `field_changed`, `old_value`, `new_value`. **Append-only**. (Composite index D-14: ticket_id, created_at).
- [ ] **Step 3: Model & Relasi**
  - Matikan `UPDATED_AT` di Attachment & History.
- [ ] **Step 4: Verifikasi (migrate MySQL, test) & Commit.**

---

### Task 7: Knowledge Base, Notifikasi, & Audit Log

**Files:**
- Create: `apps/api/database/migrations/2026_09_01_000114_create_knowledge_categories_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000115_create_knowledge_articles_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000116_create_notifications_table.php`
- Create: `apps/api/database/migrations/2026_09_01_000117_create_audit_logs_table.php`
- Create: Model untuk keempatnya (`KnowledgeCategory`, `KnowledgeArticle`, `Notification`, `AuditLog`).

**Detail:**
Menutup seluruh 18 tabel.

- [ ] **Step 1: Migrations**
  - **KB Categories:** `name` (unique), `description`, soft deletes.
  - **KB Articles:** FK `category_id`, FK `author_id`, `title`, `slug` (unique), `content` (longtext), `status` (default 'draft'), `view_count` (int, default 0), `published_at` (timestamp, nullable - D-14). Soft deletes. (Index D-14: category_id, author_id, view_count).
  - **Notifications:** FK `user_id` (CASCADE), `type`, `data` (JSON), `is_read` (boolean, false), `read_at` (nullable). Timestamps penuh, tanpa soft delete. (Index D-14: type, (user_id, is_read)).
  - **AuditLogs:** FK `user_id` (nullable, SET NULL), `action`, `module`, `module_id` (nullable), `description` (VARCHAR(500), nullable - D-14), `old_data` (JSON, nullable), `new_data` (JSON, nullable), `ip_address`, `user_agent`. **Append-only** (`created_at` saja). (Composite index D-14: module, module_id).
- [ ] **Step 2: Model**
  - Cast `data`, `old_data`, `new_data` ke `array` (ROADMAP:249).
- [ ] **Step 3: Verifikasi akhir (migrate:fresh MySQL) & Commit.**

---

### Task 8: Factory dan Factory States

**Files:**
- Modify: `apps/api/database/factories/UserFactory.php`
- Create: Factory untuk 17 model lainnya.

**Detail:**
Tiap entitas mendapat factory yang valid secara skema.

- [ ] **Step 1: Refactor UserFactory**
  - Hapus pembuatan field lama (`name`, `remember_token`, `email_verified_at`).
  - Tambahkan state: `admin()`, `manager()`, `technician()`, `employee()` yang melakukan fetch dinamis ke role berdasarkan nama dari Enum `RoleName` atau membuat Role baru jika belum ada.
  - Dokumentasikan: `$user->profile` otomatis ada (via observer), tidak butuh `EmployeeProfileFactory` yang ditempel ke User.
- [ ] **Step 2: Buat Factory Lainnya**
  - Gunakan `TicketCategory::factory()`, dll untuk mengisi FK.
- [ ] **Step 3: Commit.**

---

### Task 9: Seeder Referensi Idempoten & Demo User

**Files:**
- Create: `apps/api/database/seeders/ReferenceDataSeeder.php`
- Create: `apps/api/database/seeders/DemoUserSeeder.php`
- Modify: `apps/api/database/seeders/DatabaseSeeder.php`

**Detail:**
Menyediakan data referensi dengan **ID yang dipin (D-15)** via `updateOrCreate`.

- [ ] **Step 1: ReferenceDataSeeder**
  - Roles: 1=`administrator`, 2=`manager`, 3=`technician`, 4=`employee`.
  - TicketStatus: 1=`OPEN`, 2=`ASSIGNED`, 3=`IN_PROGRESS`, 4=`RESOLVED` (is_closed=1), 5=`CLOSED` (is_closed=1, is_final=1).
  - TicketPriority: 1=`Critical` (120), 2=`High` (240), 3=`Medium` (480), 4=`Low` (1440).
  - Departments: 5 department standar.
  - TicketCategory: 5 parent (Hardware, Software, Network, Account, Other) + 17 child ber-`parent_id`.
  - KnowledgeCategory: 5 kategori sejalan.
- [ ] **Step 2: DemoUserSeeder**
  - Buat 4 akun `@jarvisops.test` (admin, manager, technician, employee) (Addendum §2.3).
  - Pastikan password valid D-12 (misal `Password123!`).
- [ ] **Step 3: DatabaseSeeder**
  - Hapus trait `WithoutModelEvents` agar UserObserver berjalan (menghasilkan profil employee demo user).
  - Panggil `ReferenceDataSeeder::class`, lalu `DemoUserSeeder::class`.
- [ ] **Step 4: Test Idempotensi Seeder**
  - Jalankan `make fresh` lalu `make seed` (berarti seeder jalan dua kali) dan pastikan bersih (tidak ada constraint violation duplicate).
- [ ] **Step 5: Konfigurasi `TestCase`**
  - Set `protected $seed = true;` dan `protected $seeder = ReferenceDataSeeder::class;` di `tests/TestCase.php`.
- [ ] **Step 6: Commit.**

---

### Task 10: DemoDataSeeder (Opsional, untuk test UI awal)

**Files:**
- Create: `apps/api/database/seeders/DemoDataSeeder.php`

**Detail:**
Hanya seeding aset dan artikel (ticket butuh logic SLA di Fase 3). Dijalankan terpisah lewat `--class=DemoDataSeeder`.

- [ ] **Step 1: Buat seeder aset & artikel**
  - 10 asset (berbagai status).
  - 10 artikel pengetahuan.
- [ ] **Step 2: Commit.**
