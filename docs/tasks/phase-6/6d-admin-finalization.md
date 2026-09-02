# Fase 6d — Dashboard Admin & Finalisasi (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini adalah penutup Fase 6: endpoint admin (memperluas manager dengan counts sistem + aktivitas), verifikasi performa, sinkronisasi dokumentasi, dan tag `v0.6.0`.

**Goal:** Mengimplementasikan `GET /api/dashboard/admin` (seluruh metrik manager + `total_users/technicians/departments/assets`, `assets_by_status[]`, `recent_system_activity[]`), memverifikasi N+1/konsistensi angka, menyinkronkan checkbox ROADMAP & PERMISSION-MATRIX, dan menandai `v0.6.0`.

**Branch:** `feat/phase-6d-admin-finalization`
**Estimasi Waktu:** ~0.5 hari (4 task)
**Prasyarat:** 6c selesai (manager dashboard, `PendingDashboardException` untuk admin masih ada — dihapus di Task 1).

---

### Task 1: `AdminDashboardService`

**Files:**
- Create: `app/Services/Dashboard/AdminDashboardService.php`
- Modify: `app/Http/Controllers/Dashboard/DashboardController.php`
- Create: `tests/Feature/Dashboard/AdminDashboardTest.php`

**Interfaces:**
- `AdminDashboardService::get(User $actor, DashboardDateRange $range): array` — seluruh isi manager + tambahan:
  ```php
  [
      // ... semua field manager dari ManagerDashboardService::get() ...
      'total_users' => int,
      'total_technicians' => int,
      'total_departments' => int,
      'total_assets' => int,
      'assets_by_status' => [['status' => string, 'count' => int]],
      'recent_system_activity' => [], // ≤8, dari audit_logs
  ]
  ```

**Detail:**

```php
class AdminDashboardService
{
    public function __construct(
        protected ManagerDashboardService $managerService,
    ) {}

    public function get(User $actor, DashboardDateRange $range): array
    {
        $managerData = $this->managerService->get($actor, $range);

        return array_merge($managerData, [
            'total_users' => User::query()->count(),
            'total_technicians' => User::query()
                ->where('role_id', Role::where('name', RoleName::Technician->value)->value('id'))
                ->count(),
            'total_departments' => Department::query()->count(),
            'total_assets' => Asset::query()->count(),
            'assets_by_status' => Asset::query()
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->orderBy('status')
                ->get()
                ->map(fn ($row) => ['status' => $row->status, 'count' => (int) $row->count])
                ->toArray(),
            'recent_system_activity' => AuditLog::query()
                ->with('user:id,full_name')
                ->latest('created_at')
                ->limit(8)
                ->get()
                ->map(fn ($log) => [
                    'id' => $log->id,
                    'user' => $log->user ? ['id' => $log->user->id, 'full_name' => $log->user->full_name] : null,
                    'action' => $log->action,
                    'module' => $log->module,
                    'description' => $log->description,
                    'created_at' => $log->created_at,
                ])
                ->toArray(),
        ]);
    }
}
```

> **Jebakan:**
> - `AdminDashboardService` **mendelegasikan** `ManagerDashboardService::get()` — jangan menduplikasi logika manager. `array_merge` menggabungkan array manager dengan tambahan admin.
> - **`total_technicians` memakai pola `Role::where('name', RoleName::Technician->value)->value('id')`** — persis seperti `ReferenceController@technicians` (jangan hardcode `3`, dan `RoleName` tidak punya method `id()`). D-15 mem-pin role technician = 3, tapi lookup lewat seeder lebih tahan.
> - `assets_by_status` — `groupBy('status')` pada kolom enum `AssetStatus`. Di SQLite, `groupBy` langsung pada kolom string; di MySQL juga. Urut `orderBy('status')` untuk determinisme. **Semua status** (termasuk `available`, `assigned`, `maintenance`, `retired`, `lost`) muncul; status yang tidak memiliki asset akan tidak muncul — frontend Fase 9 yang mengisi nol. Atau beri nol eksplisit: kumpulkan semua case `AssetStatus` dan isi 0 untuk yang tidak ada. **Keputusan:** tidak perlu zero-fill frontend bisa menangani; sederhanakan.
> - `recent_system_activity` dari `audit_logs` — eager-load `user` (hanya `id` + `full_name`). Admin melihat semua modul (PERMISSION §3.8). Limit 8, urut `created_at DESC`.

- [ ] **Step 1: Test — payload admin, counts sistem, aktivitas audit.**
  ```php
  uses(RefreshDatabase::class);

  beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

  test('admin dashboard extends manager metrics with system counts', function () {
      $admin = User::factory()->admin()->create();

      // Pastikan ada data
      User::factory()->count(3)->technician()->create();
      Asset::factory()->count(2)->create();
      AuditLog::factory()->count(2)->create(['module' => 'ticket', 'action' => 'create']);

      Sanctum::actingAs($admin);
      $response = $this->getJson('/api/dashboard/admin');

      $response->assertStatus(200)
          ->assertJsonPath('success', true)
          ->assertJsonStructure([
              'data' => [
                  'total_users', 'total_technicians', 'total_departments', 'total_assets',
                  'assets_by_status', 'recent_system_activity',
                  // Manager fields
                  'total_tickets', 'open_tickets', 'sla', 'ticket_trend', 'technician_performance',
              ],
          ])
          // Seeder tidak membuat user; total = 1 admin + 3 teknisi = 4 user; total_technicians = 3
          ->assertJsonPath('data.total_users', 4)
          ->assertJsonPath('data.total_technicians', 3)
          ->assertJsonPath('data.total_assets', 2)
          ->assertJsonCount(2, 'data.recent_system_activity');
  });

  test('admin dashboard system activity shows all modules', function () {
      $admin = User::factory()->admin()->create();
      AuditLog::factory()->create(['module' => 'user', 'action' => 'create']);
      AuditLog::factory()->create(['module' => 'auth', 'action' => 'login']);

      Sanctum::actingAs($admin);
      $response = $this->getJson('/api/dashboard/admin');
      $activity = $response->json('data.recent_system_activity');
      expect($activity)->toHaveCount(2);
  });

  test('admin dashboard includes manager sla metrics', function () {
      $admin = User::factory()->admin()->create();
      Ticket::factory()->resolved()->create([
          'created_at' => '2026-06-01 08:00:00', 'resolved_at' => '2026-06-01 10:00:00',
          'sla_deadline' => '2026-06-01 12:00:00',
      ]);

      Sanctum::actingAs($admin);
      $response = $this->getJson('/api/dashboard/admin?date_from=2026-01-01&date_to=2026-12-31');
      $response->assertStatus(200)
          ->assertJsonPath('data.sla.compliance_percentage', 100.0);
  });
  ```

- [ ] **Step 2: Implementasi `AdminDashboardService`** — hapus `PendingDashboardException` untuk method admin di controller, injeksi service.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/AdminDashboardTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Dashboard/AdminDashboardService.php app/Http/Controllers/Dashboard/ tests/Feature/Dashboard/
  git commit -m "feat(dashboard): implement admin dashboard with system metrics"
  ```

---

### Task 2: Otorisasi Admin + Kebocoran Data

**Files:**
- Modify: `tests/Feature/Dashboard/DashboardAuthorizationTest.php`
- Create: `tests/Feature/Dashboard/DashboardDataIntegrityTest.php` (tambahkan)

**Detail:**
Verifikasi gate `dashboard.admin` (Admin only). Employee/Technician/Manager → 403. Pastikan Admin bisa melihat semua dashboard (gate `dashboard.admin` = Admin ✅; gate `dashboard.manager`/`technician`/`employee` juga ✅ untuk Admin).

- [ ] **Step 1: Test — gate admin, admin bisa akses semua dashboard.**
  ```php
  test('admin dashboard: admin only, others 403', function () {
      $admin = User::factory()->admin()->create();
      $manager = User::factory()->manager()->create();
      $technician = User::factory()->technician()->create();
      $employee = User::factory()->employee()->create();

      Sanctum::actingAs($admin);
      $this->getJson('/api/dashboard/admin')->assertStatus(200);

      foreach ([$manager, $technician, $employee] as $user) {
          Sanctum::actingAs($user);
          $this->getJson('/api/dashboard/admin')->assertStatus(403);
      }
  });

  test('admin can access all four dashboard endpoints', function () {
      $admin = User::factory()->admin()->create();
      Sanctum::actingAs($admin);

      $this->getJson('/api/dashboard/employee')->assertStatus(200);
      $this->getJson('/api/dashboard/technician')->assertStatus(200);
      $this->getJson('/api/dashboard/manager')->assertStatus(200);
      $this->getJson('/api/dashboard/admin')->assertStatus(200);
  });
  ```

- [ ] **Step 2: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/DashboardAuthorizationTest.php
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Dashboard/
  git commit -m "test(dashboard): verify admin gate matrix and cross-dashboard access"
  ```

---

### Task 3: Verifikasi N+1 & Performa (<500 ms)

**Files:**
- Create: `tests/Feature/Dashboard/DashboardPerformanceTest.php`

**Detail:**
Uji seluruh 4 endpoint dengan `DB::enableQueryLog()` untuk memastikan jumlah query konstan walau volume data naik (guard N+1). Juga ukur waktu respons: expand seed data ke ~100 ticket, 5 teknisi, 10 asset, 20 audit log → setiap endpoint harus <500 ms.

> **Jebakan:** SQLite in-memory pada test sangat cepat. Pengukuran waktu di test bersifat indikatif — angka absolut di SQLite tidak mencerminkan performa MySQL. Prioritaskan guard query count (N+1) di atas deteksi waktu. Waktu absolut diverifikasi di development MySQL.

- [ ] **Step 1: Buat test helper data generator + verifikasi N+1 untuk keempat endpoint.**
  ```php
  uses(RefreshDatabase::class);

  beforeEach(function () {
      $this->seed(ReferenceDataSeeder::class);
      // Data seed representatif
      $technicians = User::factory()->count(3)->technician()->create();
      Ticket::factory()->count(60)->create();
      // Spread beberapa resolved
      Ticket::factory()->count(20)->resolved()->create(['technician_id' => $technicians[0]->id]);
      Ticket::factory()->count(10)->resolved()->create(['technician_id' => $technicians[1]->id]);
      Ticket::factory()->count(15)->open()->create(['technician_id' => $technicians[2]->id]);
      Asset::factory()->count(10)->create();
      AuditLog::factory()->count(15)->create();
  });

  test('all four dashboard endpoints have constant query count under data growth', function () {
      $admin = User::factory()->admin()->create();

      // Baseline — 10 ticket
      DB::enableQueryLog();
      Sanctum::actingAs($admin);
      $this->getJson('/api/dashboard/admin')->assertStatus(200);
      $base = count(DB::getQueryLog());
      DB::flushQueryLog();

      // Growth — 100 ticket tambahan
      Ticket::factory()->count(100)->create();
      DB::enableQueryLog();
      $this->getJson('/api/dashboard/admin')->assertStatus(200);
      $growth = count(DB::getQueryLog());

      // Query count tidak boleh bertambah
      expect($growth)->toBeLessThanOrEqual($base * 1.5); // toleransi 50% untuk cache query plan
  });

  test('admin dashboard response time under 500ms', function () {
      $admin = User::factory()->admin()->create();
      Sanctum::actingAs($admin);

      $start = microtime(true);
      $this->getJson('/api/dashboard/admin')->assertStatus(200);
      $duration = (microtime(true) - $start) * 1000;

      // Di SQLite, seed volume 100 ticket harus <500ms
      // Catatan: waktu SQLite sangat cepat, ini indikatif
      expect($duration)->toBeLessThan(500);
  });
  ```

- [ ] **Step 2: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/DashboardPerformanceTest.php
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Dashboard/DashboardPerformanceTest.php
  git commit -m "test(dashboard): verify N+1 guard and response time for all endpoints"
  ```

---

### Task 4: Sinkronisasi Dokumentasi + Tag `v0.6.0`

**Files:**
- Modify: `docs/product/ROADMAP.md` (centang checkbox)
- Modify: `docs/product/PERMISSION-MATRIX.md` (verifikasi baris route §4)
- Modify: `docs/api/API-CONTRACT.md` (verifikasi payload §10 final)
- Create: git tag `v0.6.0`

**Detail:**
Sinkronisasi dokumentasi setelah implementasi selesai.

**Checklist sinkronisasi:**

1. **ROADMAP.md — centang Fase 6:**
   - Buka `docs/product/ROADMAP.md`, cari baris 609–645 (Fase 6 checklist) dan **centang** setiap checkbox `- [ ]` menjadi `- [x]` yang sudah terpenuhi.
   - Centang juga exit criteria baris 637–645.
   - Periksa `### Exit criteria` di baris 635: centang "Git tag SemVer" dan "Backend MVP selesai — mulai sini fokus berpindah ke frontend" (baris 644–645).

2. **PERMISSION-MATRIX.md — verifikasi §4 route dashboard:**
   - Buka `docs/product/PERMISSION-MATRIX.md`, cari baris 286–289. Pastikan berisi:
     ```
     | GET | `/api/dashboard/employee` | `dashboard.employee` |
     | GET | `/api/dashboard/technician` | `dashboard.technician` |
     | GET | `/api/dashboard/manager` | `dashboard.manager` |
     | GET | `/api/dashboard/admin` | `dashboard.admin` |
     ```
   - Jika belum ada (dokumen v1.1 belum memuatnya), tambahkan baris tersebut.
   - Verifikasi PERMISSION §6 checklist butir "Technician memakai `?technician_id=X` pada dashboard technician → tetap datanya sendiri" sudah dicentang.

3. **API-CONTRACT.md — verifikasi payload §10:**
   - Buka `docs/api/API-CONTRACT.md` baris 604–684. Pastikan semua field dan tipe yang diimplementasikan cocok dengan kontrak.
   - Jika ada penyimpangan (mis. field tambahan), koreksi kontrak atau implementasi — mana yang lebih murah. **Prioritaskan kesesuaian dengan kontrak.**

4. **Git tag `v0.6.0`:**
   ```bash
   git tag -a v0.6.0 -m "Phase 6: Dashboard & Analytics API — 4 endpoints, SLA metrics, technician performance"
   git push origin v0.6.0
   ```

- [ ] **Step 1: Centang ROADMAP Fase 6.**
  ```bash
  # Edit docs/product/ROADMAP.md, ubah setiap - [ ] menjadi - [x] di blok Fase 6 (baris 609–645)
  # Verifikasi hasil
  git diff docs/product/ROADMAP.md
  ```

- [ ] **Step 2: Verifikasi PERMISSION-MATRIX §4 route dashboard.**
  ```bash
  # Buka docs/product/PERMISSION-MATRIX.md, periksa baris 286–289
  # Jika belum ada, tambahkan.
  ```

- [ ] **Step 3: Verifikasi payload API-CONTRACT §10 match implementasi.**
  ```bash
  # Jalankan tes integrasi manual untuk memverifikasi setiap field
  vendor/bin/pest tests/Feature/Dashboard/
  # Buka docs/api/API-CONTRACT.md, bandingkan dengan payload nyata
  ```

- [ ] **Step 4: Commit sinkronisasi dokumentasi + tag.**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add docs/product/ROADMAP.md docs/product/PERMISSION-MATRIX.md docs/api/API-CONTRACT.md
  git commit -m "docs: sync phase 6 roadmap, permission matrix, and api contract"
  git tag -a v0.6.0 -m "Phase 6: Dashboard & Analytics API"
  git push origin main --tags
  ```

---

## Exit Criteria 6d

- [ ] `GET /api/dashboard/admin` — 401 tanpa token; 200 Admin only; payload extends manager + `total_users/technicians/departments/assets`, `assets_by_status[]`, `recent_system_activity[]` (≤8, semua modul audit).
- [ ] Admin bisa mengakses keempat dashboard (employee/technician/manager/admin) — 200.
- [ ] Tidak ada N+1: query count konstan saat volume data naik pada keempat endpoint.
- [ ] Setiap endpoint <500 ms pada data seed representatif (100+ ticket, 5 teknisi, 10+ asset).
- [ ] `docs/product/ROADMAP.md` Fase 6 seluruh checkbox tercentang; exit criteria `Backend MVP selesai` tercentang.
- [ ] `docs/product/PERMISSION-MATRIX.md` §4 memuat keempat route dashboard; §6 butir test `?technician_id` tercentang.
- [ ] `docs/api/API-CONTRACT.md §10` cocok dengan implementasi (tidak ada penyimpangan).
- [ ] `PendingDashboardException` untuk method admin sudah dihapus.
- [ ] Git tag `v0.6.0` ditambahkan dan didorong.
- [ ] `php artisan test` seluruhnya hijau (suite gabungan Fase 1–6).
- [ ] `vendor/bin/pint --test` bersih.
- [ ] **Backend MVP selesai** — mulai sini fokus berpindah ke frontend (Fase 7+).