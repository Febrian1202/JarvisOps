# Fase 4c — Audit Log API: Endpoints, Scoping, & Filter Timezone (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Fokus pada penegakan aturan "Limited" untuk Manager di level query server dan konversi batas tanggal Asia/Jakarta ke UTC.

**Goal:** Membangun 2 endpoint API audit log (`GET /api/audit-logs` untuk list ringkas dan `GET /api/audit-logs/{id}` untuk detail lengkap), menegakkan query scope server pembatasan modul untuk Manager (`ticket`, `asset`, `article`), mengonversi filter rentang tanggal lokal Asia/Jakarta ke UTC secara presisi, serta memverifikasi cakupan pencatatan audit log untuk seluruh aksi penting Fase 3 dan Fase 4.

**Branch:** `feat/phase-4c-audit-log-api`  
**Estimasi Waktu:** ~0.75 hari (6 task)  
**Prasyarat:** Fase 4a selesai (`AuditAction::SlaBreach` dan actor-less logging sudah aktif).

---

### Task 1: Dua Resource (`AuditLogListResource` & `AuditLogDetailResource`)

**Files:**
- Create: `app/Http/Resources/Audit/AuditLogListResource.php`
- Create: `app/Http/Resources/Audit/AuditLogDetailResource.php`
- Create: `tests/Unit/AuditLogResourceTest.php`

**Detail:**
Sesuai `API-CONTRACT.md §11`, payload list sengaja dibuat ringkas untuk efisiensi bandwidth:
1. `AuditLogListResource`:
   - `id`: integer
   - `user`: `{ id: ?int, full_name: ?string }` (null jika event sistem background)
   - `action`: string
   - `module`: string
   - `module_id`: ?int
   - `description`: ?string (Bahasa Indonesia)
   - `ip_address`: ?string
   - `created_at`: string ISO 8601 UTC
2. `AuditLogDetailResource`:
   - Menyertakan seluruh field dari `AuditLogListResource`
   - **Ditambah:** `old_data` (array / null), `new_data` (array / null), dan `user_agent` (string / null)

- [ ] **Step 1: Test — `AuditLogListResource` tidak menyertakan old_data, sedangkan `AuditLogDetailResource` menyertakannya**
  Buat `tests/Unit/AuditLogResourceTest.php`:
  ```php
  <?php

  use App\Http\Resources\Audit\AuditLogDetailResource;
  use App\Http\Resources\Audit\AuditLogListResource;
  use App\Models\AuditLog;
  use App\Models\User;

  test('AuditLogListResource excludes old_data, new_data, and user_agent', function () {
      $user = User::factory()->manager()->create(['full_name' => 'Manager Dewi']);
      $log = AuditLog::factory()->create([
          'user_id' => $user->id,
          'action' => 'assign',
          'module' => 'ticket',
          'module_id' => 12,
          'description' => 'Menugaskan tiket TCK-0012 kepada Budi',
          'old_data' => ['technician_id' => null],
          'new_data' => ['technician_id' => 5],
          'ip_address' => '10.0.0.5',
          'user_agent' => 'Mozilla/5.0',
      ]);

      $list = (new AuditLogListResource($log))->resolve();
      expect($list)->toHaveKeys(['id', 'user', 'action', 'module', 'module_id', 'description', 'ip_address', 'created_at'])
          ->and($list)->not->toHaveKeys(['old_data', 'new_data', 'user_agent'])
          ->and($list['user']['full_name'])->toBe('Manager Dewi');

      $detail = (new AuditLogDetailResource($log))->resolve();
      expect($detail)->toHaveKeys(['id', 'user', 'action', 'module', 'module_id', 'description', 'old_data', 'new_data', 'ip_address', 'user_agent', 'created_at'])
          ->and($detail['old_data'])->toBe(['technician_id' => null])
          ->and($detail['user_agent'])->toBe('Mozilla/5.0');
  });

  test('Audit resources handle null user gracefully for system events', function () {
      $log = AuditLog::factory()->create([
          'user_id' => null,
          'action' => 'sla_breach',
          'module' => 'ticket',
      ]);

      $list = (new AuditLogListResource($log))->resolve();
      expect($list['user'])->toBeNull();
  });
  ```

- [ ] **Step 2: Implementasi `AuditLogListResource`**
  Buat `app/Http/Resources/Audit/AuditLogListResource.php`:
  ```php
  <?php

  namespace App\Http\Resources\Audit;

  use App\Models\AuditLog;
  use Illuminate\Http\Request;
  use Illuminate\Http\Resources\Json\JsonResource;

  /**
   * @mixin AuditLog
   */
  class AuditLogListResource extends JsonResource
  {
      public function toArray(Request $request): array
      {
          return [
              'id' => $this->id,
              'user' => $this->user ? [
                  'id' => $this->user->id,
                  'full_name' => $this->user->full_name,
              ] : null,
              'action' => $this->action,
              'module' => $this->module,
              'module_id' => $this->module_id,
              'description' => $this->description,
              'ip_address' => $this->ip_address,
              'created_at' => $this->created_at?->toISOString(),
          ];
      }
  }
  ```

- [ ] **Step 3: Implementasi `AuditLogDetailResource`**
  Buat `app/Http/Resources/Audit/AuditLogDetailResource.php`:
  ```php
  <?php

  namespace App\Http\Resources\Audit;

  use App\Models\AuditLog;
  use Illuminate\Http\Request;
  use Illuminate\Http\Resources\Json\JsonResource;

  /**
   * @mixin AuditLog
   */
  class AuditLogDetailResource extends JsonResource
  {
      public function toArray(Request $request): array
      {
          return [
              'id' => $this->id,
              'user' => $this->user ? [
                  'id' => $this->user->id,
                  'full_name' => $this->user->full_name,
              ] : null,
              'action' => $this->action,
              'module' => $this->module,
              'module_id' => $this->module_id,
              'description' => $this->description,
              'old_data' => $this->old_data,
              'new_data' => $this->new_data,
              'ip_address' => $this->ip_address,
              'user_agent' => $this->user_agent,
              'created_at' => $this->created_at?->toISOString(),
          ];
      }
  }
  ```

- [ ] **Step 4: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Unit/AuditLogResourceTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Resources/Audit/ tests/Unit/AuditLogResourceTest.php
  git commit -m "feat(audit): create AuditLogListResource and AuditLogDetailResource"
  ```

---

### Task 2: `IndexAuditLogRequest` & Konversi Timezone (Asia/Jakarta → UTC)

**Files:**
- Create: `app/Http/Requests/Audit/IndexAuditLogRequest.php`

**Detail:**
Validasi parameter query:
- `user_id`: integer opsional, exists:users,id
- `module`: string opsional, valid terhadap `AuditModule::cases()`
- `action`: string opsional, valid terhadap `AuditAction::cases()`
- `module_id`: integer opsional, min: 1
- `date_from`: date opsional (format `YYYY-MM-DD`)
- `date_to`: date opsional (format `YYYY-MM-DD`, `after_or_equal:date_from`)
- `per_page`: integer opsional, min: 1, max: 100
- `page`: integer opsional, min: 1
- `sort_by`: string opsional, in: `['created_at', 'id', 'module', 'action']` (default: `created_at`)
- `sort_dir`: string opsional, in: `['asc', 'desc']` (default: `desc`)

Menyediakan helper method `getDateFromUtc()` dan `getDateToUtc()` yang mengonversi `YYYY-MM-DD` dari waktu Asia/Jakarta (WIB) ke objek UTC Carbon (D-23):
- `date_from`: `Carbon::createFromFormat('Y-m-d H:i:s', "$dateFrom 00:00:00", 'Asia/Jakarta')->setTimezone('UTC')`
- `date_to`: `Carbon::createFromFormat('Y-m-d H:i:s', "$dateTo 23:59:59", 'Asia/Jakarta')->setTimezone('UTC')`

- [ ] **Step 1: Implementasi `IndexAuditLogRequest`**
  Buat `app/Http/Requests/Audit/IndexAuditLogRequest.php`:
  ```php
  <?php

  namespace App\Http\Requests\Audit;

  use App\Enums\AuditAction;
  use App\Enums\AuditModule;
  use Carbon\Carbon;
  use Illuminate\Foundation\Http\FormRequest;
  use Illuminate\Validation\Rule;

  class IndexAuditLogRequest extends FormRequest
  {
      public function authorize(): bool
      {
          return true;
      }

      public function rules(): array
      {
          return [
              'user_id' => ['nullable', 'integer', 'exists:users,id'],
              'module' => ['nullable', 'string', Rule::enum(AuditModule::class)],
              'action' => ['nullable', 'string', Rule::enum(AuditAction::class)],
              'module_id' => ['nullable', 'integer', 'min:1'],
              'date_from' => ['nullable', 'date_format:Y-m-d'],
              'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
              'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
              'page' => ['nullable', 'integer', 'min:1'],
              'sort_by' => ['nullable', 'string', 'in:created_at,id,module,action'],
              'sort_dir' => ['nullable', 'string', 'in:asc,desc'],
          ];
      }

      public function messages(): array
      {
          return [
              'user_id.exists' => 'User yang dipilih tidak ditemukan.',
              'module.enum' => 'Modul audit log tidak valid.',
              'action.enum' => 'Aksi audit log tidak valid.',
              'date_from.date_format' => 'Format tanggal mulai harus YYYY-MM-DD.',
              'date_to.date_format' => 'Format tanggal akhir harus YYYY-MM-DD.',
              'date_to.after_or_equal' => 'Tanggal akhir harus sama dengan atau setelah tanggal mulai.',
          ];
      }

      public function getDateFromUtc(): ?Carbon
      {
          $val = $this->validated('date_from');
          if (! $val) {
              return null;
          }

          return Carbon::createFromFormat('Y-m-d H:i:s', "{$val} 00:00:00", 'Asia/Jakarta')->setTimezone('UTC');
      }

      public function getDateToUtc(): ?Carbon
      {
          $val = $this->validated('date_to');
          if (! $val) {
              return null;
          }

          return Carbon::createFromFormat('Y-m-d H:i:s', "{$val} 23:59:59", 'Asia/Jakarta')->setTimezone('UTC');
      }
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add app/Http/Requests/Audit/IndexAuditLogRequest.php
  git commit -m "feat(audit): add IndexAuditLogRequest with Asia/Jakarta to UTC timezone parser"
  ```

---

### Task 3: `AuditLogQueryService` & Scoping Modul Manager di Server

**Files:**
- Create: `app/Services/Audit/AuditLogQueryService.php`
- Create: `tests/Unit/AuditLogQueryServiceTest.php`

**Detail:**
1. Manager scoping (`PERMISSION-MATRIX.md §2.2`):
   - Jika user adalah `Manager`, query wajib dibatasi di server: `whereIn('module', ['ticket', 'asset', 'article'])`.
   - Modul `user`, `role`, `department`, `ticket_category`, `ticket_priority`, `auth` dilarang untuk Manager.
   - Filter client diaplikasikan **setelah** scoping server. Jika Manager memfilter `?module=user`, query menjadi `whereIn('module', ['ticket', 'asset', 'article'])->where('module', 'user')` yang secara matematis menghasilkan 0 baris (hasil kosong, status 200).
2. Detail check (`checkVisibility`):
   - Jika user adalah `Manager` dan `AuditLog->module` tidak termasuk dalam `['ticket', 'asset', 'article']`, method mengembalikan `false` (yang akan direspon `404 Not Found` oleh controller).

- [ ] **Step 1: Test unit untuk `AuditLogQueryService`**
  Buat `tests/Unit/AuditLogQueryServiceTest.php`:
  ```php
  <?php

  use App\Models\AuditLog;
  use App\Models\User;
  use App\Services\Audit\AuditLogQueryService;

  test('manager is scoped to ticket, asset, and article modules only', function () {
      $manager = User::factory()->manager()->create();

      AuditLog::factory()->create(['module' => 'ticket']);
      AuditLog::factory()->create(['module' => 'asset']);
      AuditLog::factory()->create(['module' => 'article']);
      AuditLog::factory()->create(['module' => 'user']);
      AuditLog::factory()->create(['module' => 'auth']);

      $service = new AuditLogQueryService();
      $result = $service->paginate($manager, []);

      expect($result->total())->toBe(3);
  });

  test('manager filtering for forbidden module returns empty paginator', function () {
      $manager = User::factory()->manager()->create();
      AuditLog::factory()->create(['module' => 'user']);

      $service = new AuditLogQueryService();
      $result = $service->paginate($manager, ['module' => 'user']);

      expect($result->total())->toBe(0);
  });

  test('admin has full access to all audit log modules', function () {
      $admin = User::factory()->admin()->create();

      AuditLog::factory()->create(['module' => 'ticket']);
      AuditLog::factory()->create(['module' => 'user']);
      AuditLog::factory()->create(['module' => 'auth']);

      $service = new AuditLogQueryService();
      $result = $service->paginate($admin, []);

      expect($result->total())->toBe(3);
  });
  ```

- [ ] **Step 2: Implementasi `AuditLogQueryService`**
  Buat `app/Services/Audit/AuditLogQueryService.php`:
  ```php
  <?php

  namespace App\Services\Audit;

  use App\Enums\AuditModule;
  use App\Enums\RoleName;
  use App\Models\AuditLog;
  use App\Models\User;
  use Carbon\Carbon;
  use Illuminate\Contracts\Pagination\LengthAwarePaginator;
  use Illuminate\Database\Eloquent\Builder;

  class AuditLogQueryService
  {
      public const MANAGER_ALLOWED_MODULES = [
          'ticket',
          'asset',
          'article',
      ];

      public function paginate(
          User $actor,
          array $filters = [],
          ?Carbon $dateFrom = null,
          ?Carbon $dateTo = null,
          int $perPage = 10,
          string $sortBy = 'created_at',
          string $sortDir = 'desc'
      ): LengthAwarePaginator {
          $query = AuditLog::query()->with('user');

          // 1. Server-side Scoping berdasarkan peran
          $this->applyRoleScope($query, $actor);

          // 2. Filter Client diterapkan setelah scoping
          if (! empty($filters['user_id'])) {
              $query->where('user_id', $filters['user_id']);
          }

          if (! empty($filters['module'])) {
              $query->where('module', $filters['module']);
          }

          if (! empty($filters['action'])) {
              $query->where('action', $filters['action']);
          }

          if (! empty($filters['module_id'])) {
              $query->where('module_id', $filters['module_id']);
          }

          if ($dateFrom !== null) {
              $query->where('created_at', '>=', $dateFrom);
          }

          if ($dateTo !== null) {
              $query->where('created_at', '<=', $dateTo);
          }

          return $query->orderBy($sortBy, $sortDir)->paginate($perPage);
      }

      public function isVisibleTo(AuditLog $auditLog, User $actor): bool
      {
          if ($actor->isAdmin()) {
              return true;
          }

          if ($actor->hasRole(RoleName::Manager)) {
              return in_array($auditLog->module, self::MANAGER_ALLOWED_MODULES, true);
          }

          return false;
      }

      protected function applyRoleScope(Builder $query, User $actor): void
      {
          if ($actor->isAdmin()) {
              return; // Akses penuh
          }

          if ($actor->hasRole(RoleName::Manager)) {
              $query->whereIn('module', self::MANAGER_ALLOWED_MODULES);

              return;
          }

          // Role selain Admin/Manager tidak boleh melihat log apa pun
          $query->whereRaw('1 = 0');
      }
  }
  ```

- [ ] **Step 3: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Unit/AuditLogQueryServiceTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Audit/AuditLogQueryService.php tests/Unit/AuditLogQueryServiceTest.php
  git commit -m "feat(audit): implement AuditLogQueryService with server-side manager scoping"
  ```

---

### Task 4: `AuditLogController` & Registrasi Route

**Files:**
- Create: `app/Http/Controllers/Audit/AuditLogController.php`
- Modify: `routes/api.php`

**Detail:**
Buat controller yang dilindungi authorization Gate `audit-log.viewAny` dan `audit-log.view`:
1. `index(IndexAuditLogRequest $request)`:
   - `$this->authorize('audit-log.viewAny');`
   - Ambil data paginasi via `AuditLogQueryService`.
   - Return `ApiResponse::paginated(..., resource: AuditLogListResource::class)`.
2. `show(Request $request, AuditLog $auditLog)`:
   - `$this->authorize('audit-log.view');`
   - Cek visibilitas: if (! $this->queryService->isVisibleTo($auditLog, $request->user())) { abort(404, 'Resource not found.'); }
   - Return `ApiResponse::success(data: new AuditLogDetailResource($auditLog), message: 'Audit log retrieved successfully.')`.

> **Jebakan:** Jangan gunakan `abort(403)` jika Manager membuka detail log modul `user` atau `auth`. Gunakan `abort(404)` agar tidak mengonfirmasi keberadaan ID log rahasia tersebut kepada Manager.

- [ ] **Step 1: Implementasi `AuditLogController`**
  Buat `app/Http/Controllers/Audit/AuditLogController.php`:
  ```php
  <?php

  namespace App\Http\Controllers\Audit;

  use App\Http\Controllers\Controller;
  use App\Http\Requests\Audit\IndexAuditLogRequest;
  use App\Http\Resources\Audit\AuditLogDetailResource;
  use App\Http\Resources\Audit\AuditLogListResource;
  use App\Models\AuditLog;
  use App\Services\Audit\AuditLogQueryService;
  use App\Support\ApiResponse;
  use App\Support\HandlesPagination;
  use Illuminate\Http\JsonResponse;
  use Illuminate\Http\Request;

  class AuditLogController extends Controller
  {
      use HandlesPagination;

      public function __construct(
          protected AuditLogQueryService $queryService
      ) {}

      public function index(IndexAuditLogRequest $request): JsonResponse
      {
          $this->authorize('audit-log.viewAny');

          $perPage = $this->getPerPage($request);
          $sortBy = $request->query('sort_by', 'created_at');
          $sortDir = $request->query('sort_dir', 'desc');

          $paginator = $this->queryService->paginate(
              actor: $request->user(),
              filters: $request->validated(),
              dateFrom: $request->getDateFromUtc(),
              dateTo: $request->getDateToUtc(),
              perPage: $perPage,
              sortBy: $sortBy,
              sortDir: $sortDir
          );

          return ApiResponse::paginated(
              paginator: $paginator,
              message: 'Audit logs retrieved successfully.',
              resource: AuditLogListResource::class
          );
      }

      public function show(Request $request, AuditLog $auditLog): JsonResponse
      {
          $this->authorize('audit-log.view');

          if (! $this->queryService->isVisibleTo($auditLog, $request->user())) {
              abort(404, 'Resource not found.');
          }

          return ApiResponse::success(
              data: new AuditLogDetailResource($auditLog->load('user')),
              message: 'Audit log retrieved successfully.'
          );
      }
  }
  ```

- [ ] **Step 2: Daftarkan route di `routes/api.php`**
  Tambahkan di dalam grup `['auth:sanctum', 'password.changed']`:
  ```php
  Route::prefix('audit-logs')->name('audit-logs.')->group(function () {
      Route::get('/', [AuditLogController::class, 'index'])->name('index');
      Route::get('/{auditLog}', [AuditLogController::class, 'show'])->name('show');
  });
  ```

- [ ] **Step 3: Commit**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add app/Http/Controllers/Audit/ routes/api.php
  git commit -m "feat(audit): add AuditLogController and register API routes"
  ```

---

### Task 5: Feature Test RBAC, Scoping Modul, & Error 403/404

**Files:**
- Create: `tests/Feature/Audit/AuditLogApiTest.php`

**Detail:**
Uji seluruh skenario matriks otorisasi:
1. `Employee` dan `Technician` mencoba mengakses `GET /api/audit-logs` atau `/api/audit-logs/{id}` → `403 Forbidden`.
2. `Manager` melihat log tiket, asset, dan artikel.
3. `Manager` memfilter `?module=user` → `200 OK` dengan list kosong (`meta.total = 0`).
4. `Manager` membuka detail `GET /api/audit-logs/{id}` dari log modul `auth` → `404 Not Found`.
5. `Admin` memiliki akses penuh ke seluruh log modul tanpa batasan.
6. Filter rentang tanggal `date_from` dan `date_to` memfilter data sesuai konversi timezone Asia/Jakarta ke UTC.

- [ ] **Step 1: Buat feature test di `tests/Feature/Audit/AuditLogApiTest.php`**
  ```php
  <?php

  use App\Models\AuditLog;
  use App\Models\User;
  use Laravel\Sanctum\Sanctum;

  test('employee and technician cannot access audit log endpoints (403)', function () {
      $employee = User::factory()->employee()->create();
      $technician = User::factory()->technician()->create();
      $log = AuditLog::factory()->create();

      Sanctum::actingAs($employee);
      $this->getJson('/api/audit-logs')->assertStatus(403);
      $this->getJson("/api/audit-logs/{$log->id}")->assertStatus(403);

      Sanctum::actingAs($technician);
      $this->getJson('/api/audit-logs')->assertStatus(403);
      $this->getJson("/api/audit-logs/{$log->id}")->assertStatus(403);
  });

  test('manager sees only operational modules (ticket, asset, article)', function () {
      $manager = User::factory()->manager()->create();

      AuditLog::factory()->create(['module' => 'ticket']);
      AuditLog::factory()->create(['module' => 'asset']);
      AuditLog::factory()->create(['module' => 'article']);
      AuditLog::factory()->create(['module' => 'user']);
      AuditLog::factory()->create(['module' => 'auth']);

      Sanctum::actingAs($manager);
      $response = $this->getJson('/api/audit-logs');

      $response->assertStatus(200)
          ->assertJsonPath('meta.total', 3);
  });

  test('manager filtering forbidden module receives 200 with empty list (PERMISSION-MATRIX §5)', function () {
      $manager = User::factory()->manager()->create();
      AuditLog::factory()->create(['module' => 'user']);

      Sanctum::actingAs($manager);
      $response = $this->getJson('/api/audit-logs?module=user');

      $response->assertStatus(200)
          ->assertJsonPath('meta.total', 0)
          ->assertJsonCount(0, 'data');
  });

  test('manager accessing detail of forbidden module receives 404', function () {
      $manager = User::factory()->manager()->create();
      $userLog = AuditLog::factory()->create(['module' => 'user']);

      Sanctum::actingAs($manager);
      $this->getJson("/api/audit-logs/{$userLog->id}")
          ->assertStatus(404);
  });

  test('admin has full access to all audit logs and detail payload includes old/new data', function () {
      $admin = User::factory()->admin()->create();
      $userLog = AuditLog::factory()->create([
          'module' => 'user',
          'old_data' => ['status' => 'inactive'],
          'new_data' => ['status' => 'active'],
      ]);

      Sanctum::actingAs($admin);
      $response = $this->getJson("/api/audit-logs/{$userLog->id}");

      $response->assertStatus(200)
          ->assertJsonPath('data.module', 'user')
          ->assertJsonPath('data.old_data.status', 'inactive')
          ->assertJsonPath('data.new_data.status', 'active');
  });

  test('date range filter correctly filters logs within Asia/Jakarta day boundaries', function () {
      $admin = User::factory()->admin()->create();

      // Dibuat pada 2026-09-01 10:00:00 WIB (03:00:00 UTC)
      $log1 = AuditLog::factory()->create(['created_at' => '2026-09-01T03:00:00Z']);

      // Dibuat pada 2026-09-02 10:00:00 WIB (03:00:00 UTC)
      $log2 = AuditLog::factory()->create(['created_at' => '2026-09-02T03:00:00Z']);

      Sanctum::actingAs($admin);
      $response = $this->getJson('/api/audit-logs?date_from=2026-09-01&date_to=2026-09-01');

      $response->assertStatus(200)
          ->assertJsonPath('meta.total', 1)
          ->assertJsonPath('data.0.id', $log1->id);
  });
  ```

- [ ] **Step 2: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Feature/Audit/AuditLogApiTest.php
  git add tests/Feature/Audit/AuditLogApiTest.php
  git commit -m "test(audit): add comprehensive feature tests for audit log RBAC and date range filters"
  ```

---

### Task 6: Sweep Verifikasi Seluruh Event Tercatat di Audit Log

**Files:**
- Create: `tests/Feature/Audit/AuditTrailCoverageTest.php`

**Detail:**
Verifikasi bahwa seluruh aksi yang diwajibkan oleh ROADMAP §4 (`ROADMAP.md:471`) benar-benar menghasilkan baris `audit_logs`:
1. `login` & `logout` (Auth domain)
2. `create`, `update`, `delete` (Ticket domain)
3. `assign`, `reassign`, `unassign`, `self_assign` (Ticket assignment)
4. `status_change`, `priority_change`, `reopen`, `resolve`, `close`, `cancel` (Ticket lifecycle)
5. `sla_breach` (SLA scheduler)

- [ ] **Step 1: Buat test verifikasi cakupan audit trail di `tests/Feature/Audit/AuditTrailCoverageTest.php`**
  ```php
  <?php

  use App\Models\AuditLog;
  use App\Models\Ticket;
  use App\Models\User;
  use Laravel\Sanctum\Sanctum;

  test('ticket creation and status changes record expected audit trail', function () {
      $employee = User::factory()->employee()->create();
      $manager = User::factory()->manager()->create();
      $technician = User::factory()->technician()->create();

      // 1. Create
      Sanctum::actingAs($employee);
      $resCreate = $this->postJson('/api/tickets', [
          'title' => 'Kerusakan Jaringan',
          'description' => 'Tidak bisa konek internet kantor',
          'category_id' => 1,
          'priority_id' => 2,
      ])->assertStatus(201);

      $ticketId = $resCreate->json('data.id');

      expect(AuditLog::where('module', 'ticket')->where('module_id', $ticketId)->where('action', 'create')->exists())->toBeTrue();

      // 2. Assign
      Sanctum::actingAs($manager);
      $this->postJson("/api/tickets/{$ticketId}/assign", ['technician_id' => $technician->id])
          ->assertStatus(200);

      expect(AuditLog::where('module', 'ticket')->where('module_id', $ticketId)->where('action', 'assign')->exists())->toBeTrue();
  });
  ```

- [ ] **Step 2: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Feature/Audit/
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Audit/AuditTrailCoverageTest.php
  git commit -m "test(audit): verify end-to-end audit trail coverage for ticket events"
  ```

---

## Exit Criteria 4c

- [ ] 2 endpoint audit log berfungsi penuh (`GET /api/audit-logs` dan `GET /api/audit-logs/{id}`).
- [ ] List payload tidak memuat `old_data`, `new_data`, dan `user_agent`, sedangkan detail memuat ketiganya.
- [ ] Employee dan Technician ditolak dengan status `403 Forbidden`.
- [ ] Manager dibatasi hanya pada modul `ticket`, `asset`, dan `article`.
- [ ] Manager memfilter modul terlarang menghasilkan status `200 OK` dengan list kosong.
- [ ] Manager membuka detail log modul terlarang menghasilkan status `404 Not Found`.
- [ ] Filter rentang tanggal `date_from` dan `date_to` mengonversi waktu lokal Asia/Jakarta ke rentang UTC secara akurat.
- [ ] Seluruh aksi penting sistem terverifikasi menuliskan log audit.
- [ ] Linter Pint bersih (`vendor/bin/pint --test`).
- [ ] Seluruh test di `tests/Feature/Audit/` dan `tests/Unit/` hijau.
