# Fase 3a — Foundation: Enum, Policy, Service, Factory (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [x]`.

**Goal:** Membangun seluruh fondasi yang dibutuhkan sub-tahap 3b–3e: peta transisi sebagai data
terstruktur, tiga Policy (ticket, komentar, asset), tiga service penulis-baris (SLA, audit,
notifikasi), `ApiResponse::paginated()` sadar Resource, state factory, dan migration index.

**Spec:** Rencana utama `docs/tasks/phase-3/README.md` §Global Constraints, §Resolusi Konflik.

---

### Task 1: Perbaiki Exception Handler (404 dari Policy)

**Files:**
- Modify: `bootstrap/app.php` (baris handler `AuthorizationException`)

**Detail:**
Exception handler Fase 2 memetakan `AuthorizationException` ke 403 mentah, mengabaikan
`$e->status()`. `Response::denyAsNotFound()` menghasilkan status 404 di exception-nya, tapi
handler tidak pernah membacanya. Akibatnya aturan 404 di PERMISSION-MATRIX §5 tidak akan pernah
bekerja — semua kegagalan Policy akan keluar sebagai 403, termasuk untuk kasus yang seharusnya
menyembunyikan keberadaan resource.

- [x] **Step 1: Test — 404 dari Policy menghasilkan 404 di respons, dan bentuk 422 transisi**
  Buat route dummy di `beforeEach`:
  ```php
  Route::get('/api/_test/policy-404', function () {
      $this->authorize('view', Notification::factory()->create());
  })->middleware('auth:sanctum');

  Route::post('/api/_test/illegal-status', function () {
      throw new IllegalStatusTransitionException('Status tidak dapat diubah dari OPEN ke RESOLVED.');
  })->middleware('auth:sanctum');
  ```
  Login sebagai user biasa, akses route pertama. `NotificationPolicy@view` mengembalikan
  `Response::denyAsNotFound()`. Test: `assertStatus(404)` dan `assertJsonPath('message', 'Resource not found.')`.
  Akses route kedua. Test: `assertStatus(422)`, `assertJsonPath('message', 'The given data was invalid.')`,
  dan `assertJsonPath('errors.status_id', ['Status tidak dapat diubah dari OPEN ke RESOLVED.'])`.

- [x] **Step 2: Perbaiki handler — baca `$e->status()` dan bentuk `IllegalStatusTransitionException`**
  Ubah dua baris di blok `match`:
  ```php
  $e instanceof AuthorizationException, $e instanceof AccessDeniedHttpException => $e instanceof AuthorizationException && $e->hasStatus() && $e->status() === 404
      ? ApiResponse::error('Resource not found.', status: 404)
      : ApiResponse::error($e->getMessage() ?: 'Forbidden.', status: 403),
  $e instanceof IllegalStatusTransitionException => ApiResponse::error(
      'The given data was invalid.',
      errors: ['status_id' => [$e->getMessage()]],
      status: 422,
  ),
  ```
  `IllegalStatusTransitionException` ditulis ulang agar mematuhi **bentuk** `STATUS-TRANSITION.md §8`:
  `message` envelope Bahasa Inggris (`"The given data was invalid."`), pesan penjelas di
  `errors.status_id` Bahasa Indonesia (D-29) — service melempar exception dengan pesan
  "Status tidak dapat diubah dari OPEN ke RESOLVED…" dan handler menempatkannya di `errors.status_id`.
  Urutan `match` tetap; pastikan `$e instanceof AccessDeniedHttpException` tetap 403.

- [x] **Step 3: Verifikasi**
  Jalankan test dari Step 1. Pastikan hijau. Jalankan seluruh test suite — tidak ada auth test
  yang boleh berubah status-nya.

- [x] **Step 4: Commit.**
  ```bash
  git add bootstrap/app.php tests/Feature/AppLayer/
  git commit -m "fix(handler): respect AuthorizationException->status() for 404 denials"
  ```

---

### Task 2: TicketStatusName — Enum dengan Peta Transisi

**Files:**
- Modify: `app/Enums/TicketStatusName.php`
- Create: `app/Enums/TicketAction.php`
- Create: `app/Authorization/TicketTransitionMatrix.php`
- Create: `tests/Unit/TicketTransitionMatrixTest.php`

**Interfaces:**
- `TicketStatusName::fromId(int $id): self` — konversi pinned ID ke enum case
- `TicketStatusName::id(): int` — pinned ID (1–5)
- `TicketStatusName::isClosed(): bool` — status `is_closed`
- `TicketStatusName::isFinal(): bool` — hanya CLOSED
- `TicketStatusName::label(): string` — nama untuk history/error (sama dengan `->value`)
- `TicketTransitionMatrix::allowedRoles(TicketStatusName $from, TicketStatusName $to): array` —
  daftar `TicketActor` yang diizinkan, atau `[]` bila ilegal
- `TicketTransitionMatrix::allows(TicketStatusName $from, TicketStatusName $to, TicketActor $actor): bool`
- `TicketActor` enum: `Reporter`, `Technician`, `Manager`, `Admin`, `AnyTechnician` (untuk T*)
- `TicketAction` enum: `Assign`, `Unassign`, `Start`, `Resolve`, `Close`, `Cancel`, `Reopen`,
  `ChangePriority`, `Comment`, `Attach`, `Edit`

- [x] **Step 1: Test — peta transisi lengkap (25 × 4 × 2)**
  ```php
  dataset('statusPairs', function () {
      $pairs = [];
      foreach (TicketStatusName::cases() as $from) {
          foreach (TicketStatusName::cases() as $to) {
              $pairs[] = [$from->value, $to->value];
          }
      }
      return $pairs;
  });
  ```
  Untuk setiap pasangan (dari, ke), test `allowedRoles()` mengembalikan array yang sama persis
  dengan sel matriks di `STATUS-TRANSITION.md §3`. Test khusus: `ASSIGNED → ASSIGNED` → `[]`
  (ilegal, K-06). Test `allows()` untuk setiap role yang diizinkan dan yang tidak diizinkan.
  Test `allows()` role `AnyTechnician` hanya pada `OPEN → IN_PROGRESS`.

- [x] **Step 2: Test — helper method enum**
  ```php
  test('TicketStatusName::fromId maps correctly', function () {
      expect(TicketStatusName::fromId(1))->toBe(TicketStatusName::Open);
      expect(TicketStatusName::fromId(5))->toBe(TicketStatusName::Closed);
  });
  test('invalid id throws', fn () => TicketStatusName::fromId(99))->throws(\ValueError::class);
  test('isClosed and isFinal flags', function () {
      expect(TicketStatusName::Open->isClosed())->toBeFalse();
      expect(TicketStatusName::Resolved->isClosed())->toBeTrue();
      expect(TicketStatusName::Closed->isFinal())->toBeTrue();
      expect(TicketStatusName::Resolved->isFinal())->toBeFalse();
  });
  ```

- [x] **Step 3: Implementasi `TicketActor` enum**
  ```php
  enum TicketActor: string
  {
      case Reporter = 'reporter';
      case Technician = 'technician';
      case Manager = 'manager';
      case Admin = 'admin';
      case AnyTechnician = 'any_technician';
  }
  ```

- [x] **Step 4: Implementasi `TicketAction` enum**
  ```php
  enum TicketAction: string
  {
      case Assign = 'assign';
      case Unassign = 'unassign';
      case Start = 'start';
      case Resolve = 'resolve';
      case Close = 'close';
      case Cancel = 'cancel';
      case Reopen = 'reopen';
      case ChangePriority = 'change_priority';
      case Comment = 'comment';
      case Attach = 'attach';
      case Edit = 'edit';
  }
  ```

- [x] **Step 5: Implementasi `TicketStatusName` — tambah method**
  ```php
  case Open = 'OPEN';
  case Assigned = 'ASSIGNED';
  case InProgress = 'IN_PROGRESS';
  case Resolved = 'RESOLVED';
  case Closed = 'CLOSED';

  public static function fromId(int $id): self
  {
      return match ($id) {
          1 => self::Open,
          2 => self::Assigned,
          3 => self::InProgress,
          4 => self::Resolved,
          5 => self::Closed,
          default => throw new \ValueError("Invalid status ID: {$id}"),
      };
  }

  public function id(): int
  {
      return match ($this) {
          self::Open => 1,
          self::Assigned => 2,
          self::InProgress => 3,
          self::Resolved => 4,
          self::Closed => 5,
      };
  }

  public function isClosed(): bool
  {
      return match ($this) {
          self::Resolved, self::Closed => true,
          default => false,
      };
  }

  public function isFinal(): bool
  {
      return $this === self::Closed;
  }

  public function label(): string
  {
      return $this->value;
  }
  ```

- [x] **Step 6: Implementasi `TicketTransitionMatrix` — reifikasi matriks §3**
  ```php
  class TicketTransitionMatrix
  {
      private const TRANSITIONS = [
          'OPEN' => [
              'ASSIGNED' => [TicketActor::Manager, TicketActor::Admin],
              'IN_PROGRESS' => [TicketActor::AnyTechnician, TicketActor::Manager, TicketActor::Admin],
              'CLOSED' => [TicketActor::Manager, TicketActor::Admin],
          ],
          'ASSIGNED' => [
              'OPEN' => [TicketActor::Manager, TicketActor::Admin],
              'IN_PROGRESS' => [TicketActor::Technician, TicketActor::Manager, TicketActor::Admin],
              'CLOSED' => [TicketActor::Manager, TicketActor::Admin],
          ],
          'IN_PROGRESS' => [
              'ASSIGNED' => [TicketActor::Manager, TicketActor::Admin],
              'RESOLVED' => [TicketActor::Technician, TicketActor::Manager, TicketActor::Admin],
              'CLOSED' => [TicketActor::Manager, TicketActor::Admin],
          ],
          'RESOLVED' => [
              'IN_PROGRESS' => [TicketActor::Reporter, TicketActor::Technician, TicketActor::Manager, TicketActor::Admin],
              'CLOSED' => [TicketActor::Reporter, TicketActor::Manager, TicketActor::Admin],
          ],
          'CLOSED' => [],
      ];

      public static function allowedRoles(TicketStatusName $from, TicketStatusName $to): array
      {
          return self::TRANSITIONS[$from->value][$to->value] ?? [];
      }

      public static function allows(TicketStatusName $from, TicketStatusName $to, TicketActor $actor): bool
      {
          if ($from === $to) {
              return false;
          }
          return in_array($actor, self::allowedRoles($from, $to), true);
      }
  }
  ```

- [x] **Step 7: Verifikasi — test matriks persis sama dengan STATUS-TRANSITION.md**
  Jalankan test dari Step 1. Semua hijau.

- [x] **Step 8: Commit.**

---

### Task 3: AuditAction, AuditModule, NotificationType Enum

**Files:**
- Create: `app/Enums/AuditAction.php`
- Create: `app/Enums/AuditModule.php`
- Create: `app/Enums/NotificationType.php`
- Create: `tests/Unit/EnumsPhase3Test.php`

**Interfaces:**
- `AuditAction` — 16 case sesuai D-08 amandemen
- `AuditModule` — `Ticket`, `Asset`, `Article`, `User`, `Role`, `Department`, `TicketCategory`, `TicketPriority`, `Auth`
- `NotificationType` — 10 SCREAMING_SNAKE case sesuai D-27

- [x] **Step 1: Test — setiap enum punya case yang tepat dan nilai `->value` sesuai kosakata.**
  ```php
  test('AuditAction has all 16 cases', function () {
      $cases = array_map(fn ($c) => $c->value, AuditAction::cases());
      expect($cases)->toContain('create', 'update', 'delete', 'assign', 'reassign',
          'unassign', 'self_assign', 'status_change', 'priority_change',
          'reopen', 'resolve', 'close', 'cancel', 'login', 'logout', 'password_reset');
  });
  ```

- [x] **Step 2: Implementasi AuditAction, AuditModule, NotificationType.**

- [x] **Step 3: Verifikasi & Commit.**

---

### Task 4: SlaService

**Files:**
- Create: `app/Services/Sla/SlaService.php`
- Create: `tests/Unit/SlaServiceTest.php`

**Interfaces:**
- `SlaService::calculateDeadline(Carbon $createdAt, int $durationMinutes): Carbon`
- `SlaService::snapshot(Ticket $ticket, TicketPriority $priority): void` — isi `sla_duration_minutes`
  dan `sla_deadline` pada model (tidak menyimpan)
- `SlaService::recalculateFromCreation(Ticket $ticket, TicketPriority $priority): void` —
  hitung ulang `sla_deadline` dari `$ticket->created_at` dengan durasi baru
- `SlaService::markBreached(Ticket $ticket): void` — set `sla_breached = true`,
  `sla_breached_at = now()`
- `SlaService::isBreached(Ticket $ticket): bool` — perhitungan defensif
- `SlaService::remainingMinutes(Ticket $ticket): ?int` — null jika resolved/closed, signed integer
- `SlaService::scopeBreached(Builder $query): Builder` — untuk filter `sla_status=breached`
- `SlaService::scopeOnTrack(Builder $query): Builder`

- [x] **Step 1: Test — `calculateDeadline` 24/7 flat (D-01)**
  ```php
  test('deadline is created_at + duration minutes', function () {
      $created = Carbon::parse('2026-08-31T10:00:00Z');
      $deadline = (new SlaService)->calculateDeadline($created, 240);
      expect($deadline)->toEqual(Carbon::parse('2026-08-31T14:00:00Z'));
  });
  test('deadline over midnight', function () {
      $created = Carbon::parse('2026-08-31T23:00:00Z');
      $deadline = (new SlaService)->calculateDeadline($created, 120);
      expect($deadline)->toEqual(Carbon::parse('2026-09-01T01:00:00Z'));
  });
  ```

- [x] **Step 2: Test — `remainingMinutes`**
  ```php
  test('remainingMinutes returns null when resolved', function () {
      $ticket = Ticket::factory()->resolved()->make();
      expect((new SlaService)->remainingMinutes($ticket))->toBeNull();
  });
  test('remainingMinutes returns signed integer when unresolved', function () {
      $ticket = Ticket::factory()->make(['sla_deadline' => now()->addMinutes(30)]);
      $remaining = (new SlaService)->remainingMinutes($ticket);
      expect($remaining)->toBeInt()->toBeGreaterThan(0);
  });
  test('remainingMinutes goes negative past deadline', function () {
      $ticket = Ticket::factory()->make(['sla_deadline' => now()->subMinutes(10)]);
      $remaining = (new SlaService)->remainingMinutes($ticket);
      expect($remaining)->toBeLessThan(0);
  });
  ```

- [x] **Step 3: Test — `isBreached` defensif**
  ```php
  test('isBreached returns true when sla_breached is true regardless of deadline', function () {
      $ticket = Ticket::factory()->make(['sla_breached' => true, 'sla_deadline' => now()->addHour()]);
      expect((new SlaService)->isBreached($ticket))->toBeTrue();
  });
  test('isBreached returns true when past deadline and not closed', function () {
      $ticket = Ticket::factory()->make([
          'sla_breached' => false,
          'sla_deadline' => now()->subMinute(),
          'status_id' => 1, // OPEN — is_closed = false
      ]);
      // Need to set up status relation. Use mock or partial.
  });
  ```

- [x] **Step 4: Implementasi SlaService.**
  Gunakan `Carbon::addMinutes()` untuk penambahan, `Carbon::diffInMinutes($deadline, false)` untuk
  sisa waktu (false = absolut, `signed` param tidak ada di Laravel — gunakan `Carbon::now()->diffInMinutes($ticket->sla_deadline)` lalu kalikan -1 bila perlu). Alternatif:
  `$ticket->sla_deadline->diffInMinutes(now(), false)` menghasilkan negatif bila deadline lewat.

- [x] **Step 5: Verifikasi & Commit.**

---

### Task 5: AuditLogger (Write-Only)

**Files:**
- Create: `app/Services/Audit/AuditLogger.php`
- Create: `tests/Unit/AuditLoggerTest.php`

**Interfaces:**
- `AuditLogger::log(User $actor, AuditAction $action, AuditModule $module, ?int $moduleId = null, ?string $description = null, ?array $oldData = null, ?array $newData = null, ?Request $request = null): AuditLog`
- Constructor menerima `Request $request` (dari container) — opsional, untuk `ip_address` dan `user_agent`

- [x] **Step 1: Test — menulis baris audit log**
  ```php
  test('log writes a row with all fields', function () {
      $user = User::factory()->admin()->create();
      $log = app(AuditLogger::class)->log($user, AuditAction::Create, AuditModule::Ticket, 1, 'Ticket #TCK-0001 dibuat.');
      expect($log->user_id)->toBe($user->id);
      expect($log->action)->toBe('create');
      expect($log->module)->toBe('ticket');
      expect($log->module_id)->toBe(1);
      expect($log->description)->toBe('Ticket #TCK-0001 dibuat.');
  });
  ```

- [x] **Step 2: Test — redaksi blacklist (D-07)**
  ```php
  test('redaction strips sensitive keys from old_data and new_data', function () {
      $user = User::factory()->admin()->create();
      $log = app(AuditLogger::class)->log($user, AuditAction::Update, AuditModule::User, $user->id,
          oldData: ['password' => 'secret123', 'email' => 'test@test.com'],
          newData: ['password' => 'newsecret', 'email' => 'new@test.com']);
      expect($log->old_data)->not->toHaveKey('password');
      expect($log->old_data)->toHaveKey('email');
      expect($log->new_data)->not->toHaveKey('password');
  });
  ```

- [x] **Step 3: Implementasi AuditLogger.**
  Blacklist: `password`, `remember_token`, `token`, `secret`, `api_token`. Filter `array_diff_key`
  atau loop manual atas `AuditLogger::REDACTED_KEYS`.

- [x] **Step 4: Verifikasi & Commit.**

---

### Task 6: NotificationService (Write-Only)

**Files:**
- Create: `app/Services/Notification/NotificationService.php`
- Create: `tests/Unit/NotificationServiceTest.php`

**Interfaces:**
- `NotificationService::notify(User $recipient, NotificationType $type, array $data): Notification`
- `NotificationService::notifyMany(Collection $recipients, NotificationType $type, array $data, ?User $actor = null): void`
  — melewati `$actor` jika ada di koleksi, dedup berdasarkan `user_id`
- `data` selalu memuat: `ticket_id`, `ticket_number`, `title`, `actor_name`, `message`, `url`
  (D-27). `message` dalam Bahasa Indonesia.

- [x] **Step 1: Test — notify menulis baris notifikasi**
  ```php
  test('notify creates a notification row', function () {
      $user = User::factory()->create();
      $notif = app(NotificationService::class)->notify($user, NotificationType::TicketAssigned, [
          'ticket_id' => 1, 'ticket_number' => 'TCK-0001', 'title' => 'Test',
          'actor_name' => 'Manager', 'message' => 'Test.', 'url' => '/tickets/1',
      ]);
      expect($notif->user_id)->toBe($user->id);
      expect($notif->type)->toBe('TICKET_ASSIGNED');
      expect($notif->is_read)->toBeFalse();
  });
  ```

- [x] **Step 2: Test — notifyMany melewati actor**
  ```php
  test('notifyMany skips the actor', function () {
      $actor = User::factory()->create();
      $others = User::factory()->count(3)->create();
      app(NotificationService::class)->notifyMany($others->push($actor), NotificationType::TicketAssigned, [...], $actor);
      expect(Notification::count())->toBe(3);
      expect(Notification::where('user_id', $actor->id)->count())->toBe(0);
  });
  ```

- [x] **Step 3: Implementasi NotificationService.**
  Gunakan `Notification::create()` langsung. Tidak perlu Broadcasting, event, atau apa pun.

- [x] **Step 4: Verifikasi & Commit.**

---

### Task 7: TicketPolicy, TicketCommentPolicy, AssetPolicy

**Files:**
- Create: `app/Policies/Ticket/TicketPolicy.php`
- Create: `app/Policies/TicketCommentPolicy.php` (flat — bukan subfolder)
- Create: `app/Policies/AssetPolicy.php`
- Modify: `app/Models/Ticket.php` (tambah `#[UsePolicy(TicketPolicy::class)]`)
- Modify: `app/Models/TicketComment.php` (tambah `#[UsePolicy(TicketCommentPolicy::class)]`)
- Modify: `app/Models/Asset.php` (tambah `#[UsePolicy(AssetPolicy::class)]`)
- Modify: `tests/Feature/Auth/GateRegistrationTest.php` (tambah test ability baru)
- Create: `tests/Feature/Auth/TicketPolicyTest.php`
- Create: `tests/Feature/Auth/AssetPolicyTest.php`

**Interfaces:**
- `TicketPolicy` — 13 method: `viewAny`, `view`, `create`, `update`, `delete`, `assign`,
  `unassign`, `changeStatus`, `selfAssign`, `changePriority`, `comment`, `viewHistory`, `attach`

- [x] **Step 1: Test — `viewAny`**
  - Employee: hanya ticket miliknya → true (scoping di query, not policy)
  - Technician/Manager/Admin: semua → true

- [x] **Step 2: Test — `view`**
  - Employee pada ticket miliknya → true
  - Employee pada ticket orang lain → `Response::denyAsNotFound()`
  - Technician pada ticket mana pun → true
  - Manager/Admin pada ticket mana pun → true

- [x] **Step 3: Test — `update`**
  - Employee pada ticket miliknya, bukan CLOSED → true
  - Employee pada ticket miliknya, CLOSED → false
  - Employee pada ticket orang lain → `denyAsNotFound()`
  - Technician pada ticket bukan CLOSED → true
  - Technician pada ticket CLOSED → false
  - Manager/Admin pada ticket bukan CLOSED → true
  - Manager/Admin pada ticket CLOSED → false (D-16 exception #2 enforced di service, not policy —
    tapi policy tetap mengembalikan false agar `Gate::before` tidak bisa meloloskan Admin)

- [x] **Step 4: Test — `assign`, `unassign`**
  ```php
  test('assign returns true for manager and admin', function () {
      $ticket = Ticket::factory()->create(['status_id' => 1]);
      expect(Gate::forUser(User::factory()->manager()->create())->allows('assign', $ticket))->toBeTrue();
      expect(Gate::forUser(User::factory()->admin()->create())->allows('assign', $ticket))->toBeTrue();
  });
  test('assign returns false for employee and technician', function () {
      $ticket = Ticket::factory()->create(['status_id' => 1]);
      expect(Gate::forUser(User::factory()->employee()->create())->allows('assign', $ticket))->toBeFalse();
      expect(Gate::forUser(User::factory()->technician()->create())->allows('assign', $ticket))->toBeFalse();
  });
  ```

- [x] **Step 5: Test — `changeStatus`**
  - Employee pada ticket miliknya → true (validasi legalitas di service)
  - Employee pada ticket orang lain → `denyAsNotFound()`
  - Technician pada ticket yang di-assign kepadanya → true
  - Technician pada ticket orang lain → false (403)
  - Manager/Admin → true

- [x] **Step 6: Test — `selfAssign`**
  - Technician pada ticket `OPEN` → true
  - Employee/Manager/Admin → false
  - Technician pada ticket yang sudah punya teknisi → (tidak perlu di policy — akan ditolak matriks)

- [x] **Step 7: Test — `changePriority`**
  - Employee → false
  - Technician pada ticket yang di-assign kepadanya → true (D-19)
  - Technician pada ticket orang lain → false
  - Manager/Admin → true

- [x] **Step 8: Test — `comment`, `viewHistory`, `attach`**
  - Employee pada ticket miliknya → true
  - Employee pada ticket orang lain → `denyAsNotFound()`
  - Technician pada ticket yang di-assign → true
  - Technician pada ticket orang lain → false
  - Manager/Admin → true

- [x] **Step 9: Test — `delete`**
  - Admin → true
  - Employee/Technician/Manager → false

- [x] **Step 10: Implementasi TicketPolicy (13 method).**
  Gunakan `Response::denyAsNotFound()` untuk kasus sesuai PERMISSION-MATRIX §5.
  Konstruktor: `protected SlaService $slaService` — tidak dipakai di policy, tapi disediakan
  untuk method `view` yang mungkin butuh `isClosed()` nanti. Sebenarnya cukup `$ticket->status`:
  ```php
  public function update(User $user, Ticket $ticket): bool|\Illuminate\Auth\Access\Response
  {
      if ($ticket->status->is_closed) {
          return false;
      }
      if ($user->isAdmin() || $user->hasRole(RoleName::Manager) || $user->hasRole(RoleName::Technician)) {
          return true;
      }
      return $ticket->reporter_id === $user->id;
  }
  ```

- [x] **Step 11: Implementasi TicketCommentPolicy (2 method).**
  ```php
  public function update(User $user, TicketComment $comment): bool|\Illuminate\Auth\Access\Response
  {
      if ($user->isAdmin()) return true;
      return $comment->user_id === $user->id && $comment->created_at->diffInMinutes(now()) <= 15;
  }
  // delete: sama
  ```

- [x] **Step 12: Implementasi AssetPolicy (method yang dipakai Fase 3 saja).**
  `viewAssignable`, `viewOwn`, `view`, `viewAny` — sisanya `false` (akan diimplementasi Fase 5).
  ```php
  public function viewAssignable(User $user): bool { return true; } // selalu scoped di query
  public function viewOwn(User $user): bool { return true; }
  public function view(User $user, Asset $asset): bool { return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician); }
  public function viewAny(User $user): bool { return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician); }
  ```

- [x] **Step 13: Tambah `#[UsePolicy]` pada model.**
  ```php
  #[UsePolicy(TicketPolicy::class)]
  class Ticket extends Model
  ```

- [x] **Step 14: Tambah test di GateRegistrationTest — ability baru tidak boleh pending tanpa Policy.**
  Loop `AbilityMatrix::getPolicyAbilities()`, pastikan Policy-nya sudah terdaftar dan bisa
  dipanggil tanpa error.

- [x] **Step 15: Verifikasi & Commit.**

---

### Task 8: ApiResponse::paginated() Sadar Resource + HandlesPagination Terjemahan

**Files:**
- Modify: `app/Support/ApiResponse.php`
- Modify: `app/Support/HandlesPagination.php`
- Modify: `tests/Feature/AppLayer/PaginationTraitTest.php`

- [x] **Step 1: Test — paginated dengan Resource class**
  ```php
  test('paginated applies resource collection', function () {
      Ticket::factory()->count(3)->create();
      $paginator = Ticket::paginate(2);
      $response = ApiResponse::paginated($paginator, 'Success', TicketResource::class);
      // Assert data items are wrapped by TicketResource
  });
  ```

- [x] **Step 2: Ubah `ApiResponse::paginated()` — terima parameter `?string $resource = null`.**
  ```php
  public static function paginated(LengthAwarePaginator $paginator, string $message = 'Success', ?string $resource = null): JsonResponse
  {
      $data = $resource
          ? $resource::collection($paginator->items())->resolve()
          : $paginator->items();
      // ...
  }
  ```
  `TicketResource` belum ada di task ini. Gunakan `UserResource` untuk test — yang penting
  signature-nya berubah tanpa merusak pemanggil yang tidak mengirim `$resource`.

- [x] **Step 3: Terjemahkan pesan di `HandlesPagination` ke Bahasa Indonesia (D-29).**
  ```php
  'sort_by' => ['Kolom sort_by tidak valid.'],
  'sort_dir' => ['Arah pengurutan tidak valid.'],
  ```

- [x] **Step 4: Update PaginationTraitTest — ubah assertion `->throws(ValidationException::class, 'selected sort_by is invalid')`**
  menjadi `->throws(ValidationException::class, 'Kolom sort_by tidak valid')`. Juga untuk `sort_dir`.

- [x] **Step 5: Verifikasi & Commit.**

---

### Task 9: Factory States + Migration Index + Demo Data Ticket

**Files:**
- Modify: `database/factories/TicketFactory.php`
- Modify: `database/factories/AssetAssignmentFactory.php`
- Create: `database/migrations/2026_09_01_000118_add_ticket_indexes.php`
- Modify: `database/seeders/DemoDataSeeder.php`

**Detail:**
- [x] **Step 1: Test — factory states memakai ID pinned**
  ```php
  test('ticket factory open state creates ticket with status_id 1', function () {
      $ticket = Ticket::factory()->open()->create();
      expect($ticket->status_id)->toBe(1);
  });
  test('ticket factory resolved state sets resolved_at', function () {
      $ticket = Ticket::factory()->resolved()->create();
      expect($ticket->status_id)->toBe(4);
      expect($ticket->resolved_at)->not->toBeNull();
  });
  ```

- [x] **Step 2: Tambah state ke `TicketFactory`.**
  ```php
  public function open(): static
  {
      return $this->state(fn (array $attrs) => [
          'status_id' => 1,
          'technician_id' => null,
          'resolved_at' => null,
          'closed_at' => null,
      ]);
  }

  public function assigned(): static
  {
      return $this->state(fn (array $attrs) => [
          'status_id' => 2,
          'technician_id' => User::factory()->technician(),
      ]);
  }

  public function inProgress(): static
  {
      return $this->state(fn (array $attrs) => [
          'status_id' => 3,
          'technician_id' => User::factory()->technician(),
      ]);
  }

  public function resolved(): static
  {
      return $this->state(fn (array $attrs) => [
          'status_id' => 4,
          'resolved_at' => now(),
      ]);
  }

  public function closed(): static
  {
      return $this->state(fn (array $attrs) => [
          'status_id' => 5,
          'closed_at' => now(),
      ]);
  }

  public function breached(): static
  {
      return $this->state(fn (array $attrs) => [
          'sla_breached' => true,
          'sla_breached_at' => now(),
          'sla_deadline' => now()->subHour(),
      ]);
  }

  public function withTechnician(): static
  {
      return $this->state(fn (array $attrs) => [
          'technician_id' => User::factory()->technician(),
      ]);
  }
  ```
  Gunakan `TicketStatus::find(1)` untuk `open()`? Tidak — ID pinned langsung di-hardcode,
  karena `ReferenceDataSeeder` sudah jalan dan status 1 = OPEN adalah kontrak yang dikunci D-15.
  Kalau berubah, factory dan seeder harus diubah bersamaan — lebih baik pecah keras daripada
  lolos tanpa ketahuan. Pastikan `definition()` juga memakai `'status_id' => 1` daripada
  `TicketStatus::factory()`.

- [x] **Step 3: Migration index baru.**
  ```php
  Schema::table('tickets', function (Blueprint $table) {
      $table->index('title');                // D-10: search LIKE
      $table->index('sla_deadline');         // D-14: filter SLA + scheduler Fase 4
      $table->index(['status_id', 'technician_id']); // D-14: query list + scoping
  });
  Schema::table('assets', function (Blueprint $table) {
      $table->index('name');                 // D-10: search LIKE
  });
  ```
  SQLite tidak mendukung `ALTER TABLE ADD INDEX` dalam transaksi — gunakan `Schema::table()`
  tanpa `DB::statement` dan pastikan migration tidak dibungkus transaksi (default migrasi
  Laravel membungkus dalam transaksi untuk SQLite, jadi index `ALTER TABLE` akan gagal).
  Solusi: buat tabel baru, atau gunakan `Schema::table()` dengan `DB::statement` di luar
  transaksi, atau yang paling sederhana: jangan uji migration ini terhadap SQLite — cukup
  verifikasi terhadap MySQL. Tandai test bahwa migration ini MySQL-only.

  Alternatif: tulis migration dalam satu file dengan `$connection = 'mysql'` override.
  Atau lebih bersih: buat migration `add_ticket_indexes` biasa, pastikan ia berjalan di
  MySQL dan tidak mengganggu SQLite. Karena SQLite in-memory dibuat ulang tiap test,
  index yang tidak ada di SQLite tidak masalah — migration hanya dijalankan oleh `php artisan
  migrate` di lingkungan MySQL.

- [x] **Step 4: Tambah demo data ticket di `DemoDataSeeder`.**
  ```php
  // 10 ticket untuk employee@jarvisops.test
  $employee = User::where('email', 'employee@jarvisops.test')->first();
  $technician = User::where('email', 'technician@jarvisops.test')->first();

  Ticket::factory()->open()->count(3)->create([
      'reporter_id' => $employee->id,
      'department_id' => $employee->department_id,
  ]);
  Ticket::factory()->assigned()->count(2)->create([
      'reporter_id' => $employee->id,
      'department_id' => $employee->department_id,
  ]);
  Ticket::factory()->resolved()->count(2)->create([
      'reporter_id' => $employee->id,
      'department_id' => $employee->department_id,
  ]);
  Ticket::factory()->closed()->count(2)->create([
      'reporter_id' => $employee->id,
      'department_id' => $employee->department_id,
  ]);
  Ticket::factory()->breached()->count(1)->create([
      'reporter_id' => $employee->id,
      'department_id' => $employee->department_id,
  ]);
  ```

- [x] **Step 5: Verifikasi — `php artisan migrate:fresh --seed` sukses terhadap MySQL,**
  `DemoDataSeeder` menghasilkan 10 ticket dengan status variasi.

- [x] **Step 6: Commit.**

---

## Exit Criteria 3a

- [x] Seluruh test Task 1–9 hijau (`php artisan test`)
- [x] `vendor/bin/pint --test` bersih
- [x] `php artisan migrate:fresh --seed` sukses terhadap MySQL, ticket demo terlihat
- [x] `php artisan migrate:rollback` bersih (MySQL)
- [x] `Gate::forUser` mampu mengevaluasi 13 ability `TicketPolicy` + 2 `TicketCommentPolicy` +
      4 `AssetPolicy` — positif dan negatif
- [x] `TicketTransitionMatrix` menjawab persis matriks §3 STATUS-TRANSITION
- [x] `SlaService::isBreached()` mengembalikan true bila `sla_breached` true **atau** melewati
      deadline pada status belum `is_closed`
- [x] `ApiResponse::paginated()` menerima parameter `$resource` tanpa merusak pemanggil lama