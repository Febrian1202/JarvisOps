# Panduan Pengujian (Testing Guide) — JARVIS OPS

Dokumen ini menjelaskan strategi pengujian, konfigurasi lingkungan uji, cara eksekusi pengujian di semua tingkatan, serta pemetaan lengkap aturan bisnis (*business rules*) ke berkas pengujian otomatis di repositori JarvisOps.

---

## 1. Strategi & Tingkatan Pengujian

Repositori JarvisOps menerapkan pengujian berlapis (*testing pyramid*) untuk menjamin keandalan sistem secara menyeluruh:

1. **Backend Unit & Feature Tests (Pest 5 / PHPUnit 13.3)**:
   - Menguji isolasi logika domain (SLA calculation, transition matrix, permission gating, audit logging, dashboard queries).
   - Menguji interaksi HTTP API endpoint, form request validation, policy authorization, dan respon envelope JSON.
2. **Frontend Component & Logic Tests (Vitest + React Testing Library)**:
   - Menguji form validation schema (Zod), formatters (WIB date/time, greeting, rupiah, duration), pagination, query key management.
   - Menguji komponen antarmuka, dialog konfirmasi, interaksi filter, proteksi rute, dan rendering chart dashboard.
3. **End-to-End (E2E) Smoke & Workflow Tests (Playwright)**:
   - Menguji alur pengguna nyata (*golden path*) multi-role (Employee -> Manager -> Technician -> Admin) di browser riil.
   - Memvalidasi dashboard per role, empty states, dan kepatuhan aksesibilitas WCAG 2.2 AA (axe-core).

---

## 2. Lingkungan Pengujian (Test Environments)

### Backend: SQLite In-Memory vs MySQL Produksi
- **SQLite In-Memory (`:memory:`)**:
  - Dikonfigurasi dalam `apps/api/phpunit.xml` (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`).
  - Digunakan saat menjalankan `php artisan test` lokal dan di pipeline CI GitHub Actions.
  - Keuntungan: Eksekusi sangat cepat (< 15 detik untuk 690+ pengujian) dan terisolasi tanpa memerlukan instance MySQL aktif.
  - Karena seluruh skema database dikelola melalui 24 file Laravel Migration, schema SQLite yang dibangun via `RefreshDatabase` identik dengan struktur MySQL produksi.
- **MySQL Database**:
  - Dikonfigurasi dalam `apps/api/.env` dan `compose.yaml` / `compose.prod.yaml`.
  - Digunakan pada saat runtime development, container produksi, dan pengujian E2E Playwright.

---

## 3. Perintah Eksekusi Pengujian

### A. Backend Testing (`apps/api`)

Masuk ke direktori backend:
```bash
cd apps/api
```

1. **Menjalankan Seluruh Test Suite**:
   ```bash
   php artisan test --compact
   ```
2. **Menjalankan Test Spesifik Berdasarkan Nama / Filter**:
   ```bash
   php artisan test --filter=GoldenPathTest
   php artisan test --filter=TicketWorkflowTest
   ```
3. **Menjalankan Pengujian Secara Paralel**:
   ```bash
   php artisan test --parallel
   ```
4. **Memeriksa & Memperbaiki Format Kode (Laravel Pint)**:
   ```bash
   vendor/bin/pint --test      # Hanya memeriksa gaya penulisan
   vendor/bin/pint             # Memperbaiki gaya penulisan secara otomatis
   ```

### B. Frontend Testing (`apps/web`)

Masuk ke direktori frontend:
```bash
cd apps/web
```

1. **Menjalankan Seluruh Unit & Component Tests (Vitest)**:
   ```bash
   npm run test
   ```
2. **Menjalankan Vitest dalam Mode Watch**:
   ```bash
   npm run test:watch
   ```
3. **Pengecekan Tipe TypeScript (No Emit)**:
   ```bash
   npm run typecheck
   ```
4. **Pengecekan Linting (ESLint)**:
   ```bash
   npm run lint
   ```
5. **Uji Produksi Build Next.js**:
   ```bash
   npm run build
   ```

### C. End-to-End Testing (Playwright)

Pengujian E2E membutuhkan stack aplikasi dev yang sedang berjalan dan database yang terisi seed awal:
```bash
# 1. Pastikan docker stack dev aktif dan database fresh terisi
make fresh

# 2. Jalankan Playwright dari direktori apps/web
cd apps/web
npm run test:e2e

# Atau jalankan dengan antarmuka UI interaktif
npx playwright test --ui
```

---

## 4. Pemetaan Aturan Bisnis ke Berkas Pengujian (Traceability Matrix)

Berikut adalah pemetaan formal antara Business Rules (Lampiran A ROADMAP / PRD), Architectural Decisions (`DECISIONS.md`), dan berkas pengujian otomatis di repositori:

| Kode Rule | Deskripsi Aturan Bisnis | Berkas Pengujian Utama |
|---|---|---|
| **BR-001** | Tiket wajib memiliki reporter (ditentukan server dari token auth). | `tests/Feature/Ticket/CreateTicketTest.php`<br>`tests/Feature/Ticket/TicketRequestTest.php` |
| **BR-002** | Tiket baru selalu berstatus awal `OPEN`. | `tests/Feature/Ticket/CreateTicketTest.php`<br>`tests/Feature/Ticket/GoldenPathTest.php` |
| **BR-003** | Tiket baru tidak wajib langsung memiliki teknisi. | `tests/Feature/Ticket/CreateTicketTest.php` |
| **BR-004** | Hanya Manager atau Administrator yang berhak menugaskan (*assign*) teknisi. | `tests/Feature/Auth/TicketPolicyTest.php`<br>`tests/Feature/Ticket/StatusTransitionTest.php` |
| **BR-005** | Teknisi hanya dapat memproses tiket miliknya sendiri (atau self-assign tiket open). | `tests/Feature/Auth/TicketPolicyTest.php`<br>`tests/Feature/Ticket/StatusTransitionTest.php` |
| **BR-006** | Tiket wajib memiliki priority dan SLA durasi snapshot. | `tests/Feature/Ticket/CreateTicketTest.php`<br>`tests/Unit/SlaServiceTest.php` |
| **BR-007** | Tiket wajib memiliki category yang valid. | `tests/Feature/Ticket/CreateTicketTest.php`<br>`tests/Feature/Ticket/TicketRequestTest.php` |
| **BR-008** | Setiap perubahan status dicatat ke timeline `ticket_histories`. | `tests/Feature/Ticket/HistoryTest.php`<br>`tests/Feature/Ticket/StatusTransitionTest.php` |
| **BR-009** | Employee tidak dapat mengubah tiket yang sudah `CLOSED`. | `tests/Feature/Auth/TicketPolicyTest.php`<br>`tests/Feature/Ticket/StatusTransitionTest.php` |
| **BR-010** | Seluruh perubahan penting sistem dicatat ke `audit_logs` dengan deskripsi siap baca. | `tests/Feature/Audit/AuditTrailCoverageTest.php`<br>`tests/Feature/Audit/AuditLogApiTest.php` |
| **BR-011** | Pemilihan aset pada pembuatan tiket bersifat opsional. | `tests/Feature/Ticket/CreateTicketTest.php` |
| **BR-012** | Employee hanya dapat memilih aset yang sedang dialokasikan padanya. | `tests/Feature/Ticket/TicketAssetOwnershipTest.php`<br>`tests/Feature/Asset/AssetAssignmentTest.php` |
| **BR-013** | Aset yang dirujuk tiket harus berstatus aktif/valid. | `tests/Feature/Ticket/TicketAssetOwnershipTest.php` |
| **BR-014** | Validasi kepemilikan aset dilakukan ketat di server (backend). | `tests/Feature/Ticket/TicketAssetOwnershipTest.php`<br>`tests/Feature/Security/CrossUserLeakTest.php` |
| **BR-015** | Penghapusan aset tidak merusak riwayat tiket (soft delete / set null). | `tests/Feature/Asset/AssetCrudTest.php`<br>`tests/Feature/Schema/AssetDomainTest.php` |
| **BR-016** | Tidak ada fitur pendaftaran publik (*self-registration*). | `tests/Feature/Auth/LoginLogoutTest.php`<br>`tests/Feature/Security/RouteAuthorizationAuditTest.php` |
| **BR-017** | Hanya Administrator yang dapat membuat akun pengguna baru. | `tests/Feature/Admin/UserCreateTest.php`<br>`tests/Feature/Admin/UserAdminTest.php` |
| **BR-018** | Alamat email pengguna tidak boleh duplikat (unik). | `tests/Feature/Admin/UserCreateTest.php` |
| **BR-019** | Pengguna dengan status `inactive` ditolak saat proses login. | `tests/Feature/Auth/LoginLogoutTest.php`<br>`tests/Feature/Admin/UserActivateDeactivateTest.php` |
| **BR-020** | Peran (*role*) pengguna hanya ditentukan oleh Administrator. | `tests/Feature/Admin/UserAdminTest.php` |
| **D-01 & D-02** | SLA Snapshot, kalender 24/7, dan deteksi keterlambatan background. | `tests/Unit/SlaServiceTest.php`<br>`tests/Feature/Sla/SlaSchedulerTest.php`<br>`tests/Feature/Sla/SlaBreachDetectorTest.php` |
| **D-03** | Formula SLA Compliance: `resolved within SLA / total resolved * 100` (null jika 0). | `tests/Unit/SlaMetricsCalculatorTest.php`<br>`tests/Feature/Dashboard/TechnicianSlaComplianceTest.php`<br>`tests/Feature/Dashboard/ManagerDashboardTest.php` |
| **D-08** | Soft delete untuk aset, kategori, departemen, dan pengguna. | `tests/Feature/Phase5/FoundationTest.php`<br>`tests/Feature/Asset/AssetCrudTest.php` |
| **D-09** | Penugasan & pelepasan aset menggunakan row locking `lockForUpdate()`. | `tests/Feature/Asset/AssetAssignmentTest.php` |
| **D-11** | Disk privat `private` (`serve => false`) untuk lampiran tiket. | `tests/Feature/Attachment/AttachmentSecurityTest.php`<br>`tests/Feature/Attachment/AttachmentDownloadTest.php` |
| **D-16** | Admin `Gate::before` bypass dengan 2 proteksi keras (isolasi notifikasi & cegah self-lockout). | `tests/Feature/Auth/GateRegistrationTest.php`<br>`tests/Feature/Security/CrossUserLeakTest.php`<br>`tests/Feature/Notification/NotificationApiTest.php` |
| **D-21** | Concurrency guard: Optimistic locking status tiket via `expected_status_id` (409 Conflict). | `tests/Feature/Ticket/StatusTransitionTest.php` |
| **D-24** | Bahasa respon terpisah: API envelope Inggris, pesan validasi & deskripsi Indonesia. | `tests/Feature/AppLayer/ExceptionHandlerTest.php`<br>`tests/Feature/Ticket/TicketRequestTest.php` |
| **K9 (10f)** | Streamed CSV Export (BOM UTF-8, rate limiter, role scoping). | `tests/Feature/Export/CsvExportTest.php`<br>`apps/web/src/test/csv-export-button.test.tsx` |
| **Golden Path** | Alur lengkap siklus hidup tiket dari create, assign, comment, resolve, closed. | `tests/Feature/Ticket/GoldenPathTest.php`<br>`e2e/golden-path.spec.ts` |
| **PRD §12** | 11 Poin Definition of Technical Success (aset, registrasi, user admin, SLA, notification, KB, attachment, backend authorization). | `tests/Feature/Security/DefinitionOfTechnicalSuccessTest.php` |

---

## 5. Matriks Verifikasi Definition of Done (§37 PRD)

Setiap fitur dalam sistem JarvisOps dievaluasi terhadap 10 kriteria Definition of Done:

| # | Kriteria DoD (§37 PRD) | Status | Bukti & Implementasi |
|---|---|---|---|
| 1 | **Frontend terhubung dengan API** | **Terpenuhi** | 33 route aktif di `apps/web/src/app`, komunikasi API aman melalui BFF Proxy (`/api/proxy/[...path]`), teruji pada E2E Playwright. |
| 2 | **Backend validation tersedia** | **Terpenuhi** | Setiap mutasi divalidasi via dedicated FormRequest dengan envelope JSON 422 seragam dan pesan validasi bahasa Indonesia (`TicketRequestTest.php`, dll). |
| 3 | **Authorization telah diterapkan** | **Terpenuhi** | Otentikasi Sanctum token httpOnly cookie + Laravel Gate & Policy (`TicketPolicy`, `AssetPolicy`, `ArticlePolicy`, `AttachmentPolicy`, `NotificationPolicy`). Teruji di `RouteAuthorizationAuditTest.php` & `CrossUserLeakTest.php`. |
| 4 | **Happy path berhasil** | **Terpenuhi** | Skenario siklus hidup tiket penuh (Open → Assigned → In Progress → Resolved → Closed) berhasil 100% di `GoldenPathTest.php` dan `e2e/golden-path.spec.ts`. |
| 5 | **Error case ditangani** | **Terpenuhi** | Exception handler terpusat di `bootstrap/app.php` menangani 401, 403, 404 (ID masking), 405, 409 (concurrency guard), 422, 429 (rate limiting), dan 500 tanpa kebocoran stack trace. Frontend memiliki Alert, Error Boundary, & Empty State. |
| 6 | **Database transaction digunakan ketika diperlukan** | **Terpenuhi** | Operasi atomik multi-tabel dibungkus `DB::transaction()` dengan pessimistic locking `lockForUpdate()` (`AssetAssignmentService`, `TicketService`, `ExportService`). |
| 7 | **Responsive layout tersedia** | **Terpenuhi** | Antarmuka App Shell menggunakan Tailwind CSS v4 dengan sidebar responsif desktop dan drawer mobile, teruji pada breakpoint 375px, 768px, dan 1440px. |
| 8 | **Minimal automated test tersedia untuk business-critical logic** | **Terpenuhi** | 727 passing backend unit/feature tests (3300+ assertions) dan 352 passing frontend tests (Vitest) mencakup SLA, RBAC, state machine, dan data scoping. |
| 9 | **Tidak ada critical bug** | **Terpenuhi** | Seluruh audit keamanan (10a), Docker multi-stage (10b), Octane worker audit (10d), demo data seeder (10e), dan memory-safe CSV export (10f) telah diselesaikan tanpa bug kritis yang tertinggal. |
| 10 | **Dokumentasi penggunaan tersedia** | **Terpenuhi** | `README.md`, `docs/ops/DEPLOYMENT.md`, `docs/ops/TESTING.md`, `docs/ops/DEMO-RUNBOOK.md`, `docs/ops/REVIEWER-ANSWERS.md`, serta `docs/ops/ARCHITECTURE-NOTES.md`. |

---

## 6. Panduan Menulis Pengujian Baru

Ketika menambahkan fitur atau memperbaiki bug di JarvisOps, patuhi kaidah berikut:

### Konvensi Backend (Laravel / Pest)
1. Letakkan Feature Test di `apps/api/tests/Feature/<Modul>/<NamaFeature>Test.php`.
2. Gunakan `use Illuminate\Foundation\Testing\RefreshDatabase;` untuk memastikan isolasi data.
3. Buat model menggunakan factory bawaan (misal `Ticket::factory()->create(...)`).
4. Uji otorisasi menggunakan `actingAs($user, 'sanctum')`.
5. Pastikan selalu memvalidasi struktur respon envelope:
   ```php
   $response->assertStatus(200)
       ->assertJsonStructure([
           'success',
           'message',
           'data',
       ]);
   ```
6. Jalankan `vendor/bin/pint` setelah membuat atau mengedit berkas pengujian PHP.

### Konvensi Frontend (React / Vitest)
1. Letakkan unit/component test di `apps/web/src/test/<nama-komponen>.test.tsx`.
2. Gunakan wrapper `QueryClientProvider` bila komponen memanggil TanStack Query hooks.
3. Selalu sediakan `aria-label` atau gunakan role queries (`getByRole('button', { name: ... })`) untuk menjaga standar aksesibilitas WCAG 2.2.
4. Jalankan `npm run typecheck && npm run lint && npm run test` untuk memastikan kebersihan kode.
