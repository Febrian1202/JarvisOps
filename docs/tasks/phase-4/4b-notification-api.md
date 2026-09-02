# Fase 4b — Notification API: Endpoints, Polling, & Event Delivery (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Fokus pada optimasi performa polling (1 query COUNT) dan isolasi ketat data antar-pengguna (Admin tidak memiliki akses intip).

**Goal:** Membangun 4 endpoint API notifikasi untuk konsumsi frontend (`GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`), menegakkan isolasi kepemilikan data (404 jika mengakses notifikasi user lain), dan memverifikasi pengiriman 11 tipe notifikasi sistem dari seluruh aksi Fase 3 dan Fase 4.

**Branch:** `feat/phase-4b-notification-api`  
**Estimasi Waktu:** ~1.0 hari (6 task)  
**Prasyarat:** Fase 4a selesai (`NotificationType::TicketSlaBreached` sudah aktif).

---

### Task 1: `NotificationResource` & `IndexNotificationRequest`

**Files:**
- Create: `app/Http/Resources/Notification/NotificationResource.php`
- Create: `app/Http/Requests/Notification/IndexNotificationRequest.php`
- Create: `tests/Unit/NotificationResourceTest.php`

**Detail:**
1. `NotificationResource`: Memetakan model `Notification` ke bentuk payload JSON persis sesuai `API-CONTRACT.md §9`:
   - `id`: integer
   - `type`: string (enum value, misal `"TICKET_ASSIGNED"`)
   - `data`: object (JSON payload berisi `ticket_id`, `ticket_number`, `title`, `actor_name`, `message`, `url`)
   - `is_read`: boolean
   - `read_at`: string ISO 8601 UTC / null
   - `created_at`: string ISO 8601 UTC
2. `IndexNotificationRequest`: Memvalidasi parameter query filter:
   - `is_read`: boolean opsional (`true`/`false`/`1`/`0`)
   - `type`: string opsional, valid terhadap `NotificationType::cases()`
   - `page`: integer opsional, min: 1
   - `per_page`: integer opsional, min: 1, max: 100
   - `sort_by`: string opsional, whitelist: `['created_at', 'read_at', 'type']` (default: `created_at`)
   - `sort_dir`: string opsional, in: `['asc', 'desc']` (default: `desc`)

> **Jebakan:** Jangan izinkan kolom `user_id` atau `data` pada whitelist `sort_by` untuk mencegah query error dan kebocoran data.

- [x] **Step 1: Test — `NotificationResource` memformat field dan timestamp ISO 8601 UTC dengan benar**
  Buat `tests/Unit/NotificationResourceTest.php`:
  ```php
  <?php

  use App\Http\Resources\Notification\NotificationResource;
  use App\Models\Notification;
  use App\Models\User;

  test('NotificationResource formats data correctly matching API contract', function () {
      $user = User::factory()->employee()->create();
      $notif = Notification::factory()->create([
          'user_id' => $user->id,
          'type' => 'TICKET_ASSIGNED',
          'data' => [
              'ticket_id' => 12,
              'ticket_number' => 'TCK-0012',
              'title' => 'Laptop tidak menyala',
              'actor_name' => 'Manager Dewi',
              'message' => 'Ticket #TCK-0012 telah ditugaskan kepada Anda.',
              'url' => '/tickets/12',
          ],
          'is_read' => false,
          'read_at' => null,
      ]);

      $resource = (new NotificationResource($notif))->resolve();

      expect($resource['id'])->toBe($notif->id)
          ->and($resource['type'])->toBe('TICKET_ASSIGNED')
          ->and($resource['data']['ticket_number'])->toBe('TCK-0012')
          ->and($resource['is_read'])->toBeFalse()
          ->and($resource['read_at'])->toBeNull()
          ->and($resource['created_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/');
  });
  ```

- [x] **Step 2: Implementasi `NotificationResource`**
  Buat `app/Http/Resources/Notification/NotificationResource.php`:
  ```php
  <?php

  namespace App\Http\Resources\Notification;

  use App\Models\Notification;
  use Illuminate\Http\Request;
  use Illuminate\Http\Resources\Json\JsonResource;

  /**
   * @mixin Notification
   */
  class NotificationResource extends JsonResource
  {
      public function toArray(Request $request): array
      {
          return [
              'id' => $this->id,
              'type' => $this->type,
              'data' => $this->data,
              'is_read' => (bool) $this->is_read,
              'read_at' => $this->read_at?->toISOString(),
              'created_at' => $this->created_at?->toISOString(),
          ];
      }
  }
  ```

- [x] **Step 3: Implementasi `IndexNotificationRequest`**
  Buat `app/Http/Requests/Notification/IndexNotificationRequest.php`:
  ```php
  <?php

  namespace App\Http\Requests\Notification;

  use App\Enums\NotificationType;
  use Illuminate\Foundation\Http\FormRequest;
  use Illuminate\Validation\Rule;

  class IndexNotificationRequest extends FormRequest
  {
      public function authorize(): bool
      {
          return true;
      }

      public function rules(): array
      {
          return [
              'is_read' => ['nullable', 'boolean'],
              'type' => ['nullable', 'string', Rule::enum(NotificationType::class)],
              'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
              'page' => ['nullable', 'integer', 'min:1'],
              'sort_by' => ['nullable', 'string', 'in:created_at,read_at,type'],
              'sort_dir' => ['nullable', 'string', 'in:asc,desc'],
          ];
      }

      public function messages(): array
      {
          return [
              'is_read.boolean' => 'Parameter is_read harus bernilai boolean (true/false).',
              'type.enum' => 'Tipe notifikasi tidak valid.',
              'sort_by.in' => 'Kolom sort_by tidak valid.',
              'sort_dir.in' => 'Arah pengurutan tidak valid.',
          ];
      }
  }
  ```

- [x] **Step 4: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Unit/NotificationResourceTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Resources/Notification/ app/Http/Requests/Notification/ tests/Unit/NotificationResourceTest.php
  git commit -m "feat(notification): add NotificationResource and IndexNotificationRequest"
  ```

---

### Task 2: `NotificationQueryService` (Filter & Operasi Status)

**Files:**
- Create: `app/Services/Notification/NotificationQueryService.php`
- Create: `tests/Unit/NotificationQueryServiceTest.php`

**Detail:**
Buat service untuk query pembacaan dan pembaruan status notifikasi:
1. `paginate(User $user, array $filters, int $perPage, string $sortBy, string $sortDir)`:
   - Scoping wajib: `where('user_id', $user->id)`.
   - Filter `is_read` jika ada.
   - Filter `type` jika ada.
   - Sorting via `HandlesPagination` (default `created_at desc`).
2. `getUnreadCount(User $user)`:
   - Menghitung jumlah unread via `Notification::where('user_id', $user->id)->where('is_read', false)->count()`.
   - Menggunakan index `idx_notifications_user_read (user_id, is_read)` yang sudah terpasang.
3. `markAsRead(Notification $notification)`:
   - Update `is_read = true`, `read_at = now()`.
4. `markAllAsRead(User $user)`:
   - `Notification::where('user_id', $user->id)->where('is_read', false)->update(['is_read' => true, 'read_at' => now()])`.

- [x] **Step 1: Test unit untuk `NotificationQueryService`**
  Buat `tests/Unit/NotificationQueryServiceTest.php`:
  ```php
  <?php

  use App\Models\Notification;
  use App\Models\User;
  use App\Services\Notification\NotificationQueryService;

  test('paginate scopes strictly to user and filters correctly', function () {
      $user = User::factory()->employee()->create();
      $other = User::factory()->employee()->create();

      Notification::factory()->count(3)->create(['user_id' => $user->id, 'is_read' => false]);
      Notification::factory()->count(2)->create(['user_id' => $user->id, 'is_read' => true]);
      Notification::factory()->count(4)->create(['user_id' => $other->id]);

      $service = new NotificationQueryService();
      $result = $service->paginate($user, ['is_read' => false], perPage: 10, sortBy: 'created_at', sortDir: 'desc');

      expect($result->total())->toBe(3);
  });

  test('getUnreadCount returns correct count for user', function () {
      $user = User::factory()->employee()->create();
      Notification::factory()->count(4)->create(['user_id' => $user->id, 'is_read' => false]);
      Notification::factory()->count(2)->create(['user_id' => $user->id, 'is_read' => true]);

      $service = new NotificationQueryService();
      expect($service->getUnreadCount($user))->toBe(4);
  });
  ```

- [x] **Step 2: Implementasi `NotificationQueryService`**
  Buat `app/Services/Notification/NotificationQueryService.php`:
  ```php
  <?php

  namespace App\Services\Notification;

  use App\Models\Notification;
  use App\Models\User;
  use Illuminate\Contracts\Pagination\LengthAwarePaginator;

  class NotificationQueryService
  {
      public function paginate(
          User $user,
          array $filters = [],
          int $perPage = 10,
          string $sortBy = 'created_at',
          string $sortDir = 'desc'
      ): LengthAwarePaginator {
          $query = Notification::query()
              ->where('user_id', $user->id);

          if (isset($filters['is_read'])) {
              $query->where('is_read', filter_var($filters['is_read'], FILTER_VALIDATE_BOOLEAN));
          }

          if (! empty($filters['type'])) {
              $query->where('type', $filters['type']);
          }

          return $query->orderBy($sortBy, $sortDir)->paginate($perPage);
      }

      public function getUnreadCount(User $user): int
      {
          return Notification::query()
              ->where('user_id', $user->id)
              ->where('is_read', false)
              ->count();
      }

      public function markAsRead(Notification $notification): void
      {
          if (! $notification->is_read) {
              $notification->update([
                  'is_read' => true,
                  'read_at' => now(),
              ]);
          }
      }

      public function markAllAsRead(User $user): int
      {
          return Notification::query()
              ->where('user_id', $user->id)
              ->where('is_read', false)
              ->update([
                  'is_read' => true,
                  'read_at' => now(),
                  'updated_at' => now(),
              ]);
      }
  }
  ```

- [x] **Step 3: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Unit/NotificationQueryServiceTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Notification/NotificationQueryService.php tests/Unit/NotificationQueryServiceTest.php
  git commit -m "feat(notification): implement NotificationQueryService"
  ```

---

### Task 3: `NotificationController` & Registrasi Route

**Files:**
- Create: `app/Http/Controllers/Notification/NotificationController.php`
- Modify: `routes/api.php`

**Detail:**
Buat controller yang mengimplementasikan 4 action:
1. `index(IndexNotificationRequest $request)`: Mengembalikan paginated `NotificationResource` beramplop sukses.
2. `unreadCount()`: Mengembalikan `{"unread_count": N}` dengan status 200.
3. `read(Notification $notification)`:
   - Policy: `$this->authorize('markAsRead', $notification)`.
   - Update `is_read = true`.
   - Return `ApiResponse::success(data: null, message: 'Notification marked as read.', status: 200)`.
4. `readAll()`:
   - Policy: `$this->authorize('markAllAsRead', Notification::class)`.
   - Update all user unread.
   - Return `ApiResponse::success(data: null, message: 'All notifications marked as read.', status: 200)`.

> **Jebakan:** Jangan gunakan status HTTP `204 No Content`. Kontrak API JarvisOps (API-CONTRACT §3) melarang 204 dan mewajibkan status 200 dengan `data: null`.

- [x] **Step 1: Implementasi `NotificationController`**
  Buat `app/Http/Controllers/Notification/NotificationController.php`:
  ```php
  <?php

  namespace App\Http\Controllers\Notification;

  use App\Http\Controllers\Controller;
  use App\Http\Requests\Notification\IndexNotificationRequest;
  use App\Http\Resources\Notification\NotificationResource;
  use App\Models\Notification;
  use App\Services\Notification\NotificationQueryService;
  use App\Support\ApiResponse;
  use App\Support\HandlesPagination;
  use Illuminate\Http\JsonResponse;
  use Illuminate\Http\Request;

  class NotificationController extends Controller
  {
      use HandlesPagination;

      public function __construct(
          protected NotificationQueryService $queryService
      ) {}

      public function index(IndexNotificationRequest $request): JsonResponse
      {
          $this->authorize('viewAny', Notification::class);

          $perPage = $this->getPerPage($request);
          $sortBy = $request->query('sort_by', 'created_at');
          $sortDir = $request->query('sort_dir', 'desc');

          $paginator = $this->queryService->paginate(
              user: $request->user(),
              filters: $request->validated(),
              perPage: $perPage,
              sortBy: $sortBy,
              sortDir: $sortDir
          );

          return ApiResponse::paginated(
              paginator: $paginator,
              message: 'Notifications retrieved successfully.',
              resource: NotificationResource::class
          );
      }

      public function unreadCount(Request $request): JsonResponse
      {
          $this->authorize('viewAny', Notification::class);

          $count = $this->queryService->getUnreadCount($request->user());

          return ApiResponse::success(
              data: ['unread_count' => $count],
              message: 'Unread notification count retrieved successfully.'
          );
      }

      public function read(Request $request, Notification $notification): JsonResponse
      {
          // Jika notifikasi milik user lain, Policy markAsRead melempar 403,
          // tapi aturan PERMISSION-MATRIX §5 menuntut 404.
          if ($notification->user_id !== $request->user()->id) {
              abort(404, 'Resource not found.');
          }

          $this->authorize('markAsRead', $notification);

          $this->queryService->markAsRead($notification);

          return ApiResponse::success(
              data: null,
              message: 'Notification marked as read.'
          );
      }

      public function readAll(Request $request): JsonResponse
      {
          $this->authorize('markAllAsRead', Notification::class);

          $this->queryService->markAllAsRead($request->user());

          return ApiResponse::success(
              data: null,
              message: 'All notifications marked as read.'
          );
      }
  }
  ```

- [x] **Step 2: Daftarkan route di `routes/api.php`**
  Tambahkan di dalam grup middleware `['auth:sanctum', 'password.changed']`:
  ```php
  Route::prefix('notifications')->name('notifications.')->group(function () {
      Route::get('/', [NotificationController::class, 'index'])->name('index');
      Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('unread-count');
      Route::post('/{notification}/read', [NotificationController::class, 'read'])->name('read');
      Route::post('/read-all', [NotificationController::class, 'readAll'])->name('read-all');
  });
  ```

- [x] **Step 3: Commit**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add app/Http/Controllers/Notification/ routes/api.php
  git commit -m "feat(notification): add NotificationController and register API routes"
  ```

---

### Task 4: Feature Test Otorisasi & Pencegahan Kebocoran Data (404)

**Files:**
- Create: `tests/Feature/Notification/NotificationApiTest.php`

**Detail:**
Uji seluruh kontrak keamanan dan perilaku HTTP:
1. Akses tanpa token Sanctum → `401 Unauthorized`.
2. List notifikasi hanya mengembalikan milik user login (scoping ketat).
3. Admin mencoba membuka notifikasi user lain via `POST /notifications/{id}/read` → `404 Not Found` (D-16 #3, Admin tidak punya bypass).
4. `GET /notifications/unread-count` menghasilkan payload integer yang akurat dan hanya menjalankan tepat 1 query COUNT (menggunakan `DB::listen` / `DB::getQueryLog()`).
5. `POST /notifications/read-all` hanya mengubah notifikasi user yang sedang login.

- [x] **Step 1: Buat feature test di `tests/Feature/Notification/NotificationApiTest.php`**
  ```php
  <?php

  use App\Models\Notification;
  use App\Models\User;
  use Illuminate\Support\Facades\DB;
  use Laravel\Sanctum\Sanctum;

  test('unauthenticated request to notification endpoints returns 401', function () {
      $this->getJson('/api/notifications')->assertStatus(401);
      $this->getJson('/api/notifications/unread-count')->assertStatus(401);
      $this->postJson('/api/notifications/1/read')->assertStatus(401);
      $this->postJson('/api/notifications/read-all')->assertStatus(401);
  });

  test('user sees only own notifications in paginated envelope', function () {
      $user = User::factory()->employee()->create();
      $other = User::factory()->employee()->create();

      Notification::factory()->count(3)->create(['user_id' => $user->id]);
      Notification::factory()->count(5)->create(['user_id' => $other->id]);

      Sanctum::actingAs($user);

      $response = $this->getJson('/api/notifications');

      $response->assertStatus(200)
          ->assertJsonPath('success', true)
          ->assertJsonPath('meta.total', 3)
          ->assertJsonCount(3, 'data');
  });

  test('user marking other user notification as read receives 404', function () {
      $user = User::factory()->employee()->create();
      $other = User::factory()->employee()->create();

      $notif = Notification::factory()->create(['user_id' => $other->id, 'is_read' => false]);

      Sanctum::actingAs($user);

      $this->postJson("/api/notifications/{$notif->id}/read")
          ->assertStatus(404);

      expect($notif->refresh()->is_read)->toBeFalse();
  });

  test('admin marking other user notification as read also receives 404 (D-16 exception 3)', function () {
      $admin = User::factory()->admin()->create();
      $user = User::factory()->employee()->create();

      $notif = Notification::factory()->create(['user_id' => $user->id, 'is_read' => false]);

      Sanctum::actingAs($admin);

      $this->postJson("/api/notifications/{$notif->id}/read")
          ->assertStatus(404);
  });

  test('unread-count executes efficient single count query', function () {
      $user = User::factory()->employee()->create();
      Notification::factory()->count(3)->create(['user_id' => $user->id, 'is_read' => false]);

      Sanctum::actingAs($user);

      DB::enableQueryLog();
      $response = $this->getJson('/api/notifications/unread-count');
      $queries = DB::getQueryLog();

      $response->assertStatus(200)
          ->assertJsonPath('data.unread_count', 3);

      // Verifikasi query count ringan (hanya auth user + 1 count query)
      expect(count($queries))->toBeLessThanOrEqual(2);
  });

  test('read-all marks only current user notifications as read', function () {
      $user = User::factory()->employee()->create();
      $other = User::factory()->employee()->create();

      $n1 = Notification::factory()->create(['user_id' => $user->id, 'is_read' => false]);
      $n2 = Notification::factory()->create(['user_id' => $other->id, 'is_read' => false]);

      Sanctum::actingAs($user);

      $this->postJson('/api/notifications/read-all')
          ->assertStatus(200)
          ->assertJsonPath('data', null)
          ->assertJsonPath('message', 'All notifications marked as read.');

      expect($n1->refresh()->is_read)->toBeTrue()
          ->and($n2->refresh()->is_read)->toBeFalse();
  });
  ```

- [x] **Step 2: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Feature/Notification/NotificationApiTest.php
  git add tests/Feature/Notification/NotificationApiTest.php
  git commit -m "test(notification): add feature tests for notification api and 404 security rules"
  ```

---

### Task 5: Sweep Verifikasi 10 Tipe Notifikasi Transisi (Fase 3 Events)

**Files:**
- Create: `tests/Feature/Notification/NotificationEventDeliveryTest.php`

**Detail:**
Tulis feature test yang memverifikasi bahwa 10 event transisi tiket dari Fase 3 dan 1 event scheduler Fase 4 benar-benar sampai ke penerima yang tepat, dan aktor aksi dikecualikan dari penerima notifikasi (`STATUS-TRANSITION.md §6` & `PRD Addendum §4.4`):
1. `TICKET_ASSIGNED` → Teknisi baru
2. `TICKET_REASSIGNED` → Teknisi baru + Teknisi lama
3. `TICKET_UNASSIGNED` → Teknisi lama
4. `TICKET_STATUS_CHANGED` (Start IN_PROGRESS) → Reporter
5. `TICKET_SELF_ASSIGNED` → Reporter
6. `TICKET_REOPENED` → Teknisi + Seluruh Manager
7. `TICKET_RESOLVED` → Reporter
8. `TICKET_CLOSED` → Teknisi
9. `TICKET_CANCELLED` → Reporter + Teknisi
10. `TICKET_COMMENTED` → Partisipan tiket lainnya (bukan penulis komentar)
11. `TICKET_SLA_BREACHED` → Teknisi + Seluruh Manager

- [x] **Step 1: Buat suite test di `tests/Feature/Notification/NotificationEventDeliveryTest.php`**
  ```php
  <?php

  use App\Enums\NotificationType;
  use App\Models\Notification;
  use App\Models\Ticket;
  use App\Models\User;
  use Laravel\Sanctum\Sanctum;

  test('ticket assignment notifies technician and excludes assigning manager', function () {
      $manager = User::factory()->manager()->create();
      $technician = User::factory()->technician()->create();
      $reporter = User::factory()->employee()->create();

      $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);

      Sanctum::actingAs($manager);
      $this->postJson("/api/tickets/{$ticket->id}/assign", ['technician_id' => $technician->id])
          ->assertStatus(200);

      expect(Notification::where('user_id', $technician->id)->where('type', NotificationType::TicketAssigned->value)->exists())->toBeTrue()
          ->and(Notification::where('user_id', $manager->id)->exists())->toBeFalse();
  });

  test('ticket comment notifies other participants and excludes author', function () {
      $reporter = User::factory()->employee()->create();
      $technician = User::factory()->technician()->create();
      $ticket = Ticket::factory()->assigned($technician)->create(['reporter_id' => $reporter->id]);

      Sanctum::actingAs($reporter);
      $this->postJson("/api/tickets/{$ticket->id}/comments", ['content' => 'Ada update baru?'])
          ->assertStatus(201);

      expect(Notification::where('user_id', $technician->id)->where('type', NotificationType::TicketCommented->value)->exists())->toBeTrue()
          ->and(Notification::where('user_id', $reporter->id)->exists())->toBeFalse();
  });
  ```

- [x] **Step 2: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Feature/Notification/NotificationEventDeliveryTest.php
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Notification/NotificationEventDeliveryTest.php
  git commit -m "test(notification): verify event delivery and actor exclusion for all notification types"
  ```

---

### Task 6: Verifikasi Silang Integrasi dengan SLA Breach Scheduler (Fase 4a)

**Files:**
- Modify: `tests/Feature/Notification/NotificationApiTest.php`

**Detail:**
Pastikan notifikasi breach yang di-generate oleh command `tickets:check-sla` dapat diambil via `GET /api/notifications` dan `unread-count` oleh teknisi serta manager terkait.

- [x] **Step 1: Tambahkan test integrasi cross-module**
  ```php
  test('SLA breach generated by scheduler is readable via notification API by technician and manager', function () {
      $manager = User::factory()->manager()->create();
      $technician = User::factory()->technician()->create();

      $ticket = Ticket::factory()->assigned($technician)->create([
          'sla_deadline' => now()->subMinutes(10),
          'sla_breached' => false,
      ]);

      // Jalankan scheduler
      \Illuminate\Support\Facades\Artisan::call('tickets:check-sla');

      // 1. Cek dari sisi Teknisi
      Sanctum::actingAs($technician);
      $resTech = $this->getJson('/api/notifications?type=TICKET_SLA_BREACHED');
      $resTech->assertStatus(200)
          ->assertJsonPath('meta.total', 1)
          ->assertJsonPath('data.0.data.actor_name', 'Sistem');

      // 2. Cek dari sisi Manager
      Sanctum::actingAs($manager);
      $resMgr = $this->getJson('/api/notifications/unread-count');
      $resMgr->assertStatus(200)
          ->assertJsonPath('data.unread_count', 1);
  });
  ```

- [x] **Step 2: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Feature/Notification/
  git add tests/Feature/Notification/NotificationApiTest.php
  git commit -m "test(notification): verify cross-integration between SLA breach scheduler and notification API"
  ```

---

## Exit Criteria 4b

- [x] 4 endpoint notifikasi berfungsi penuh dan terdaftar di `routes/api.php`.
- [x] List notifikasi selalu tersekat ke user login (`meta.total` hanya menghitung milik sendiri).
- [x] Percobaan membaca atau menandai notifikasi milik user lain menghasilkan `404 Not Found`.
- [x] Admin terbukti tidak dapat mengintip notifikasi user lain (D-16 #3).
- [x] `unread-count` berjalan cepat dengan 1 query `COUNT`.
- [x] Seluruh 11 tipe notifikasi terbukti sampai ke recipient yang berhak dan aktor tidak pernah menerima notifikasi dirinya sendiri.
- [x] Linter Pint bersih (`vendor/bin/pint --test`).
- [x] Seluruh test di `tests/Feature/Notification/` dan `tests/Unit/` hijau.
