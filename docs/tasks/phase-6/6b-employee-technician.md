# Fase 6b — Controller, Route, Dashboard Employee & Technician (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini merangkai controller + route + dua endpoint "data sendiri" (Employee & Technician) di atas kernel 6a.

**Goal:** Mendaftarkan empat route dashboard dan `DashboardController` (4 method), lalu mengimplementasikan `GET /api/dashboard/employee` dan `GET /api/dashboard/technician` dengan scoping ketat ke user login. Di akhir sub-tahap, matriks otorisasi gate teruji (role salah → 403), Employee hanya melihat data miliknya, dan Technician tidak bisa melihat data teknisi lain lewat parameter apa pun.

**Branch:** `feat/phase-6b-employee-technician`
**Estimasi Waktu:** ~1.0 hari (5 task)
**Prasyarat:** 6a selesai (`DashboardDateRange`, `IndexDashboardRequest`, `DashboardQueryService`, kalkulator).

---

### Task 1: `DashboardController` + 4 Route + Matriks Otorisasi

**Files:**
- Create: `app/Http/Controllers/Dashboard/DashboardController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/Dashboard/DashboardAuthorizationTest.php`

**Interfaces:**
- `DashboardController::employee(IndexDashboardRequest $request): JsonResponse`
- `DashboardController::technician(IndexDashboardRequest $request): JsonResponse`
- `DashboardController::manager(IndexDashboardRequest $request): JsonResponse`
- `DashboardController::admin(IndexDashboardRequest $request): JsonResponse`
- Route: `GET /api/dashboard/{employee|technician|manager|admin}` di dalam group `auth:sanctum` + `password.changed`.

**Detail — Controller skeleton (4 method, service 6c/6d belum ada → 6b hanya untuk employee & technician; manager & admin dibuat stub di 6c/6d):**

```php
class DashboardController extends Controller
{
    public function __construct(
        protected EmployeeDashboardService $employeeService,
        protected TechnicianDashboardService $technicianService,
    ) {}

    public function employee(IndexDashboardRequest $request): JsonResponse
    {
        $this->authorize('dashboard.employee');
        $data = $this->employeeService->get($request->user());

        return ApiResponse::success($data, 'Employee dashboard retrieved successfully.');
    }

    public function technician(IndexDashboardRequest $request): JsonResponse
    {
        $this->authorize('dashboard.technician');
        $data = $this->technicianService->get($request->user());

        return ApiResponse::success($data, 'Technician dashboard retrieved successfully.');
    }
}
```

> **Jebakan:** `manager` & `admin` method **belum** diimplementasikan di 6b — biarkan route-nya terdaftar namun method di-*stub* (mis. `throw new \RuntimeException('Implemented in 6c/6d')`) **atau** belum dideklarasikan method-nya. Pilihan terbaik: **jangan daftarkan route manager/admin di 6b**; daftarkan di 6c (manager) dan 6d (admin). Dengan begitu tidak ada endpoint setengah jadi yang lolos ke `main`. Tetapi matriks otorisasi butuh keempat route → daftarkan keempatnya di Task 1 dan beri test hanya untuk yang sudah punya service; manager/admin test otorisasinya dipindah ke 6c/6d. **Keputusan final:** daftarkan keempat route di 6b; controller method manager/admin melempar `PendingDashboardException` (custom, `app/Exceptions/PendingDashboardException.php`) sehingga bila diakses akan 500 — tidak akan lolos test karena test 6b hanya menyentuh employee/technician. Method manager/admin diimplementasikan di 6c/6d dan pengecualian ini dihapus.

**Route:**

```php
Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
    // ... route yang sudah ada ...

    Route::prefix('dashboard')->name('dashboard.')->group(function () {
        Route::get('/employee', [DashboardController::class, 'employee'])->name('employee');
        Route::get('/technician', [DashboardController::class, 'technician'])->name('technician');
        Route::get('/manager', [DashboardController::class, 'manager'])->name('manager');
        Route::get('/admin', [DashboardController::class, 'admin'])->name('admin');
    });
});
```

> **Jebakan:** Route dashboard berada **di dalam** group `auth:sanctum` + `password.changed` yang sudah ada (di bawah route notifications). Jangan membuat group terpisah di luar — seluruh endpoint dashboard butuh autentikasi.

- [x] **Step 1: Test — 401 tanpa token; 403 lintas-role untuk employee & technician; 200 untuk role benar.**
  ```php
  uses(RefreshDatabase::class);

  beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

  test('dashboard endpoints require authentication', function () {
      $this->getJson('/api/dashboard/employee')->assertStatus(401);
      $this->getJson('/api/dashboard/technician')->assertStatus(401);
  });

  test('employee dashboard returns 200 for employee, 403 for manager', function () {
      $employee = User::factory()->employee()->create();
      $manager = User::factory()->manager()->create();

      Sanctum::actingAs($employee);
      $this->getJson('/api/dashboard/employee')->assertStatus(200);

      Sanctum::actingAs($manager);
      $this->getJson('/api/dashboard/employee')->assertStatus(200); // gate: semua role
  });

  test('technician dashboard: technician ok, employee 403', function () {
      $technician = User::factory()->technician()->create();
      $employee = User::factory()->employee()->create();

      Sanctum::actingAs($technician);
      $this->getJson('/api/dashboard/technician')->assertStatus(200);

      Sanctum::actingAs($employee);
      $this->getJson('/api/dashboard/technician')->assertStatus(403);
  });
  ```

- [x] **Step 2: Buat `PendingDashboardException` + controller skeleton (employee & technician memakai service yang belum ada → TDD: service dibuat di Task 2).** Untuk membuat test Task 1 lulus, buat **stub sementara** `EmployeeDashboardService` & `TechnicianDashboardService` yang mengembalikan payload kosong (`[]`); diimplementasikan penuh di Task 2–4. Setelah Task 2–4, stub dihapus.

  ```bash
  php artisan make:exception PendingDashboardException
  ```

  Stub sementara (di Task 1, diganti penuh di Task 2+):
  ```php
  class EmployeeDashboardService
  {
      public function get(User $actor): array { return []; }
  }
  class TechnicianDashboardService
  {
      public function get(User $actor): array { return []; }
  }
  ```

- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/DashboardAuthorizationTest.php
  php artisan route:list --path=api
  vendor/bin/pint --dirty --format agent
  git add app/Http/Controllers/Dashboard/ app/Exceptions/ routes/api.php tests/Feature/Dashboard/
  git commit -m "feat(dashboard): register dashboard routes and authorization matrix"
  ```

---

### Task 2: `EmployeeDashboardService`

**Files:**
- Create: `app/Services/Dashboard/EmployeeDashboardService.php`
- Modify: `app/Http/Controllers/Dashboard/DashboardController.php` (hapus stub, injeksi service penuh)
- Create: `tests/Feature/Dashboard/EmployeeDashboardTest.php`

**Interfaces:**
- `EmployeeDashboardService::get(User $actor): array` — payload API-CONTRACT §10:
  ```php
  [
      'my_open_tickets' => int,
      'my_in_progress_tickets' => int,
      'my_resolved_tickets' => int,
      'recent_tickets' => [],   // ≤5, TicketListResource shape
      'my_assets' => [],        // ≤5, AssignableAssetResource shape
      'recent_articles' => [],  // ≤5, article resource shape
  ]
  ```

**Detail:**

```php
class EmployeeDashboardService
{
    public function __construct(
        protected DashboardCountsQuery $countsQuery,
    ) {}

    public function get(User $actor): array
    {
        // Seluruh query di-scope ke reporter_id = actor
        $tickets = Ticket::query()->where('reporter_id', $actor->id);

        return [
            'my_open_tickets' => $this->countsQuery->countOpenTickets($tickets), // is_closed = false
            'my_in_progress_tickets' => $this->countsQuery->countOpenByStatus(clone $tickets, 3), // IN_PROGRESS
            'my_resolved_tickets' => (clone $tickets)->whereNotNull('resolved_at')->count(),
            'recent_tickets' => TicketListResource::collection(
                (clone $tickets)
                    ->with(['status', 'priority', 'category', 'reporter', 'technician'])
                    ->latest('created_at')
                    ->limit(5)
                    ->get()
            )->resolve(),
            'my_assets' => AssignableAssetResource::collection(
                Asset::whereHas('activeAssignment', fn ($q) => $q->where('user_id', $actor->id))
                    ->orderBy('asset_tag')
                    ->limit(5)
                    ->get()
            )->resolve(),
            'recent_articles' => ArticleResource::collection(
                KnowledgeArticle::query()
                    ->where('status', 'published')
                    ->whereNotNull('published_at')
                    ->latest('published_at')
                    ->limit(5)
                    ->get()
            )->resolve(),
        ];
    }
}
```

> **Jebakan:** `countOpenTickets` di `DashboardCountsQuery` (6a) menghitung ticket berstatus `is_closed = false` (OPEN/ASSIGNED/IN_PROGRESS) — inilah definisi "my open" (keputusan #1). `recent_tickets` wajib eager-load relasi (`status`, `priority`, `category`, `reporter`, `technician`) karena `TicketListResource` memakai `whenLoaded` — tanpanya N+1 di resource. `recent_articles` **wajib** filter `status = published` (PERMISSION §3.5 — jangan bocorkan draft). `activeAssignment` adalah relasi `hasOne` di model `Asset` yang dibatasi `whereNull('released_at')` — jika belum ada (Fase 5), buat di `Asset.php` atau ganti dengan `whereHas('assignments', fn ($q) => $q->whereNull('released_at'))`.

- [x] **Step 1: Test — payload Employee, scoping, limit 5, published-only article.**
  ```php
  uses(RefreshDatabase::class);

  beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

  test('employee dashboard contains only own data', function () {
      $employee = User::factory()->employee()->create();
      $other = User::factory()->employee()->create();

      Ticket::factory()->open()->create(['reporter_id' => $employee->id]);
      Ticket::factory()->inProgress()->create(['reporter_id' => $employee->id]);
      Ticket::factory()->resolved()->create(['reporter_id' => $employee->id]);
      // Data milik user lain — tidak boleh muncul
      Ticket::factory()->open()->create(['reporter_id' => $other->id]);
      Ticket::factory()->resolved()->create(['reporter_id' => $other->id]);

      Sanctum::actingAs($employee);
      $response = $this->getJson('/api/dashboard/employee');

      $response->assertStatus(200)
          ->assertJsonPath('success', true)
          ->assertJsonPath('data.my_open_tickets', 1)
          ->assertJsonPath('data.my_in_progress_tickets', 1)
          ->assertJsonPath('data.my_resolved_tickets', 1);
  });

  test('recent_tickets limited to 5 and includes ticket_number', function () {
      $employee = User::factory()->employee()->create();
      Ticket::factory()->count(7)->open()->create(['reporter_id' => $employee->id]);

      Sanctum::actingAs($employee);
      $response = $this->getJson('/api/dashboard/employee');
      $response->assertStatus(200)
          ->assertJsonCount(5, 'data.recent_tickets')
          ->assertJsonStructure(['data.recent_tickets' => [['ticket_number', 'title']]]);
  });

  test('recent_articles only published, never draft', function () {
      $employee = User::factory()->employee()->create();
      KnowledgeArticle::factory()->create(['status' => 'published', 'published_at' => now()->subDay()]);
      KnowledgeArticle::factory()->create(['status' => 'draft', 'published_at' => null]);

      Sanctum::actingAs($employee);
      $response = $this->getJson('/api/dashboard/employee');
      $response->assertStatus(200);
      $articles = $response->json('data.recent_articles');
      expect(count($articles))->toBe(1);
  });

  test('my_assets returns only active assignments', function () {
      $employee = User::factory()->employee()->create();
      $asset = Asset::factory()->create();
      AssetAssignment::factory()->create(['asset_id' => $asset->id, 'user_id' => $employee->id, 'released_at' => null]);
      AssetAssignment::factory()->create(['asset_id' => $asset->id, 'user_id' => $employee->id, 'released_at' => now()->subDay()]);

      Sanctum::actingAs($employee);
      $response = $this->getJson('/api/dashboard/employee');
      $response->assertStatus(200)
          ->assertJsonCount(1, 'data.my_assets');
  });
  ```

- [x] **Step 2: Implementasi `EmployeeDashboardService` penuh** — hapus stub di Task 1, injeksi service di controller. Pastikan `ArticleResource` ada (buat jika Fase 5 belum — shape minimal `{ id, title, slug, category, published_at }`).

- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/EmployeeDashboardTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Dashboard/EmployeeDashboardService.php app/Http/Controllers/Dashboard/ tests/Feature/Dashboard/
  git commit -m "feat(dashboard): implement employee dashboard scoped to reporter"
  ```

---

### Task 3: `TechnicianDashboardService`

**Files:**
- Create: `app/Services/Dashboard/TechnicianDashboardService.php`
- Modify: `app/Http/Controllers/Dashboard/DashboardController.php`
- Create: `tests/Feature/Dashboard/TechnicianDashboardTest.php`

**Interfaces:**
- `TechnicianDashboardService::get(User $actor): array` — payload API-CONTRACT §10:
  ```php
  [
      'assigned_tickets' => int,
      'open_tickets' => int,
      'in_progress_tickets' => int,
      'sla_breached' => int,
      'avg_resolution_minutes' => ?int,
      'recent_activity' => [], // ≤5, TicketHistoryResource shape + ticket info
  ]
  ```

**Detail:**

```php
class TechnicianDashboardService
{
    public function __construct(
        protected DashboardQueryService $queryService,
        protected SlaService $slaService,
    ) {}

    public function get(User $actor): array
    {
        // SELALU technician_id = self (keputusan #8). Parameter apa pun diabaikan.
        $assigned = Ticket::query()->where('technician_id', $actor->id);

        // Hanya ticket yang di-assign ke teknisi & berstatus is_closed = false
        $openForTech = (clone $assigned)->whereHas('status', fn ($q) => $q->where('is_closed', false));

        return [
            'assigned_tickets' => (clone $openForTech)->count(),
            'open_tickets' => (clone $assigned)->where('status_id', 1)->count(), // antrean OPEN (D-19, lihat Jebakan)
            'in_progress_tickets' => (clone $assigned)->where('status_id', 3)->count(),
            'sla_breached' => (clone $openForTech)
                ->where(function ($q) {
                    $q->where('sla_breached', true)
                        ->orWhere(function ($sub) {
                            $sub->whereNotNull('sla_deadline')
                                ->where('sla_deadline', '<', now());
                        });
                })
                ->count(),
            'avg_resolution_minutes' => $this->queryService->avgResolutionMinutes(
                (clone $assigned)->whereNotNull('resolved_at')
            ),
            'recent_activity' => TicketHistoryResource::collection(
                TicketHistory::query()
                    ->whereIn('ticket_id', (clone $assigned)->pluck('id'))
                    ->with(['user', 'ticket'])
                    ->latest('created_at')
                    ->limit(5)
                    ->get()
            )->resolve(),
        ];
    }
}
```

> **Jebakan:**
> - **`open_tickets` (teknisi) = antrean OPEN global** (status 1) — bukan hanya milik teknisi. PRD §20.2 untuk teknisi memakai "Open Tickets" sebagai antrean yang bisa di-self-assign (D-19); ticket yang sudah di-assign ke teknisi lain tetap OPEN dihitung sebagai antrean tim. Ini **satu-satunya** metrik teknisi yang tidak di-scope ke `technician_id = self` — selaras PERMISSION §3.7 `dashboard.technician` (✅ own) karena OPEN tanpa pemegang bukan "data teknisi lain". **Jangan scope `open_tickets` ke `technician_id = self`** — hasilnya akan selalu 0 (ticket OPEN belum di-assign).
> - `sla_breached` memakai **defensive** `sla_deadline < now()` + status `is_closed = false` (D-28), bukan hanya kolom `sla_breached` (scheduler bisa tertinggal).
> - `recent_activity` dari `ticket_histories` — `TicketHistoryResource` mengharapkan `user` & `ticket` relasi; eager-load keduanya. Pastikan resource menampilkan `ticket_number`/`title` (tambahkan field `ticket` ke resource atau gunakan array manual).
> - `avg_resolution_minutes` dihitung dari ticket yang di-assign ke teknisi & resolved — `created_at`→`resolved_at` (keputusan #5).

- [x] **Step 1: Test — payload technician, `?technician_id` diabaikan, open antrean global.**
  ```php
  uses(RefreshDatabase::class);

  beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

  test('technician dashboard returns own metrics and ignores technician_id param', function () {
      $tech = User::factory()->technician()->create();
      $other = User::factory()->technician()->create();

      Ticket::factory()->inProgress()->create(['technician_id' => $tech->id]);
      Ticket::factory()->inProgress()->create(['technician_id' => $tech->id]);
      Ticket::factory()->resolved()->create(['technician_id' => $tech->id]);
      // Data milik teknisi lain
      Ticket::factory()->inProgress()->create(['technician_id' => $other->id]);

      Sanctum::actingAs($tech);
      $response = $this->getJson('/api/dashboard/technician?technician_id='.$other->id);

      $response->assertStatus(200)
          ->assertJsonPath('data.in_progress_tickets', 2) // bukan 3 — data teknisi lain tidak masuk
          ->assertJsonPath('data.assigned_tickets', 3);
  });

  test('open_tickets counts global OPEN queue', function () {
      $tech = User::factory()->technician()->create();
      Ticket::factory()->open()->create(); // antrean OPEN, belum di-assign
      Ticket::factory()->open()->create(['technician_id' => $tech->id]);

      Sanctum::actingAs($tech);
      $response = $this->getJson('/api/dashboard/technician');
      $response->assertStatus(200)
          ->assertJsonPath('data.open_tickets', 2);
  });

  test('sla_breached counts defensive breach on own open tickets', function () {
      $tech = User::factory()->technician()->create();
      // Breach: deadline lewat, masih is_closed = false
      Ticket::factory()->create([
          'technician_id' => $tech->id, 'status_id' => 3,
          'sla_deadline' => now()->subHour(), 'sla_breached' => false,
      ]);
      // Resolved on time — tidak breach
      Ticket::factory()->resolved()->create([
          'technician_id' => $tech->id, 'resolved_at' => now()->subMinutes(30),
      ]);

      Sanctum::actingAs($tech);
      $response = $this->getJson('/api/dashboard/technician');
      $response->assertStatus(200)
          ->assertJsonPath('data.sla_breached', 1);
  });

  test('avg_resolution_minutes null when technician has no resolved tickets', function () {
      $tech = User::factory()->technician()->create();
      Ticket::factory()->inProgress()->create(['technician_id' => $tech->id]);

      Sanctum::actingAs($tech);
      $response = $this->getJson('/api/dashboard/technician');
      $response->assertStatus(200)
          ->assertJsonPath('data.avg_resolution_minutes', null);
  });
  ```

- [x] **Step 2: Implementasi `TechnicianDashboardService` penuh** — hapus stub, injeksi di controller.

- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/TechnicianDashboardTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Dashboard/TechnicianDashboardService.php app/Http/Controllers/Dashboard/ tests/Feature/Dashboard/
  git commit -m "feat(dashboard): implement technician dashboard with self-scoping"
  ```

---

### Task 4: N+1 & Query Count Verifikasi (Employee & Technician)

**Files:**
- Modify: `tests/Feature/Dashboard/EmployeeDashboardTest.php`
- Modify: `tests/Feature/Dashboard/TechnicianDashboardTest.php`

**Detail:**
Tambahkan test yang memastikan jumlah query konstan walau volume data naik (guard N+1). Pakai `DB::enableQueryLog()`.

- [x] **Step 1: Test — query count stabil pada volume besar.**
  ```php
  test('employee dashboard query count is constant under data growth', function () {
      $employee = User::factory()->employee()->create();
      Ticket::factory()->count(50)->open()->create(['reporter_id' => $employee->id]);

      DB::enableQueryLog();
      Sanctum::actingAs($employee);
      $this->getJson('/api/dashboard/employee')->assertStatus(200);
      $countBaseline = count(DB::getQueryLog());
      DB::flushQueryLog();

      Ticket::factory()->count(50)->open()->create(['reporter_id' => $employee->id]);
      DB::enableQueryLog();
      $this->getJson('/api/dashboard/employee')->assertStatus(200);
      $countGrowth = count(DB::getQueryLog());

      // query count tidak boleh bertambah seiring volume data
      expect($countGrowth)->toBeLessThanOrEqual($countBaseline);
  });
  ```

- [x] **Step 2: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/EmployeeDashboardTest.php tests/Feature/Dashboard/TechnicianDashboardTest.php
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Dashboard/
  git commit -m "test(dashboard): assert constant query count for employee and technician dashboards"
  ```

---

### Task 5: `?technician_id` Diabaikan (Regression Guard) + Route Verifikasi

**Files:**
- Create: `tests/Feature/Dashboard/TechnicianDashboardTest.php` (tambahkan test)
- Modify: `routes/api.php`

**Detail:**
Kunci perilaku keputusan #8 dengan test eksplisit (sudah ditulis di Task 3, tapi pertegas): teknisi mengirim `?technician_id=X` untuk teknisi lain → data tetap miliknya. Juga pastikan route literal tidak bentrok (tidak ada `{id}` di route dashboard, jadi aman).

- [x] **Step 1: Test — technician_id dari user lain diabaikan (sudah ada di Task 3 Step 1; tambahkan kasus 999).**
  ```php
  test('technician_id=999 does not leak other technician data', function () {
      $tech = User::factory()->technician()->create();
      $other = User::factory()->technician()->create();
      Ticket::factory()->inProgress()->create(['technician_id' => $other->id]);

      Sanctum::actingAs($tech);
      $response = $this->getJson('/api/dashboard/technician?technician_id=999');
      $response->assertStatus(200)
          ->assertJsonPath('data.in_progress_tickets', 0);
  });
  ```

- [x] **Step 2: Verifikasi route lengkap & commit.**
  ```bash
  php artisan route:list --path=api
  vendor/bin/pest tests/Feature/Dashboard/
  vendor/bin/pint --dirty --format agent
  git add routes/api.php tests/Feature/Dashboard/
  git commit -m "test(dashboard): guard technician_id parameter being ignored"
  ```

---

## Exit Criteria 6b

- [x] `GET /api/dashboard/employee` — 401 tanpa token; 200 untuk semua role (gate `dashboard.employee`); hanya data milik pemanggil; `recent_tickets`/`my_assets`/`recent_articles` ≤5; artikel hanya `published`.
- [x] `GET /api/dashboard/technician` — 401 tanpa token; 403 untuk Employee; `?technician_id` (nilai apa pun) diabaikan; `open_tickets` = antrean OPEN global; `sla_breached` defensif; `avg_resolution_minutes` null bila tak ada resolved.
- [x] Keempat route dashboard terdaftar di dalam group `auth:sanctum` + `password.changed`.
- [x] Method `manager`/`admin` di controller melempar `PendingDashboardException` (belum diimplementasikan; dihapus di 6c/6d).
- [x] Query count stabil saat volume data naik (guard N+1) untuk kedua endpoint.
- [x] `php artisan test` hijau; `vendor/bin/pint --test` bersih.
- [x] Payload employee & technician persis mengikuti `API-CONTRACT.md §10`.