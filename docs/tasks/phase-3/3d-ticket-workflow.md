# Fase 3d — Ticket Workflow: Status, Assign, Priority (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.

**Goal:** Membangun `TicketStatusService` — satu mesin transisi yang melayani status, assign,
unassign, self-assign, dan priority. Menghasilkan `available_actions` + `editable_fields` di respons
detail. Menangani konkurensi lewat `expected_status_id` → 409.

**Spec:** `STATUS-TRANSITION.md` v1.1; `API-CONTRACT.md §6`; `DECISIONS.md D-16, D-17, D-21, D-26, D-29`.

**Prasyarat:** 3c selesai (list, filter, sort, referensi).

## Keputusan yang sudah dikunci (revisi rencana awal)

1. **Routing scaffold dipindah ke Task 1.** Test FormRequest Task 1 memakai HTTP
   (`POST /api/tickets/{id}/status` dst.) sehingga route + method controller + stub
   `TicketStatusService` harus ada lebih dulu. Stub melempar `LogicException('Not implemented yet.')`
   — tidak pernah tercapai oleh test validasi (422 selalu terjadi di FormRequest sebelum body).
2. **`TicketActorResolver` dibagi** (`app/Authorization/TicketActorResolver.php`), dipakai oleh
   `TicketStatusService::transition` (legalitas matriks) dan `TicketActionResolver`
   (`available_actions`). Satu sumber kebenaran untuk resolve peran pelaku.
3. **Integrasi `available_actions`/`editable_fields` di `TicketResource::toArray`** langsung
   (resource sudah punya `$request->user()`), bukan lewat `TicketService::find`. Hapus
   hardcode `[]` di `TicketService::find`.
4. **`expected_status_id` hanya di `POST /status` dan `POST /assign`** (D-26). `unassign` dan
   `priority` tidak menerimanya.
5. **Otorisasi di `FormRequest::authorize()`** (memanggil policy) supaya urutan D-26 terpenuhi:
   403/404 mendahului 422 validasi field. Controller tetap memanggil `$this->authorize()` sebagai
   pertahanan kedua. **Pakai `Gate::authorize` (melempar, status 404 dari `denyAsNotFound`
   dipertahankan), bukan `Gate::allows`** — `Gate::allows` mengembalikan bool dan mengubah
   denyAsNotFound jadi 403.
6. **Technician menutup ticket RESOLVED miliknya → 422, bukan 403.** Matriks §3
   mengecualikan Technician dari `RESOLVED→CLOSED`; §8 mendefinisikan transisi ilegal = 422.
   Policy `changeStatus` tidak menerima status tujuan, jadi matriks-lah yang memutuskan.
   (Checklist §10 menyebut 403 — itu inkonsistensi internal STATUS-TRANSITION; matriks menang.)

---

### Task 1: DTO + FormRequest + Routes + Controller Scaffold

**Files:**
- Create: `app/DTOs/Ticket/StatusTransitionData.php`
- Create: `app/DTOs/Ticket/AssignTicketData.php`
- Create: `app/DTOs/Ticket/ChangePriorityData.php`
- Create: `app/Http/Requests/Ticket/StatusTransitionRequest.php`
- Create: `app/Http/Requests/Ticket/AssignTicketRequest.php`
- Create: `app/Http/Requests/Ticket/ChangePriorityRequest.php`
- Create: `app/Services/Ticket/TicketStatusService.php` (stub — method signature valid, body lempar `LogicException`)
- Modify: `app/Http/Controllers/Ticket/TicketController.php` (4 method baru + inject `TicketStatusService`)
- Modify: `routes/api.php` (4 route baru)
- Test: `tests/Feature/Ticket/StatusTransitionRequestTest.php`

- [ ] **Step 1: Test — FormRequest validation (TDD, HTTP)**
  ```php
  uses()->group('ticket');

  beforeEach(function () {
      $this->ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
  });

  test('status transition requires valid status_id', function () {
      $this->postJson("/api/tickets/{$this->ticket->id}/status", ['status_id' => 99])
           ->assertStatus(422);
  });

  test('assign requires valid technician_id with role technician', function () {
      $this->postJson("/api/tickets/{$this->ticket->id}/assign", ['technician_id' => 999])
           ->assertStatus(422);
  });

  test('assign rejects non-technician user', function () {
      $employee = User::factory()->employee()->create();
      $this->postJson("/api/tickets/{$this->ticket->id}/assign", ['technician_id' => $employee->id])
           ->assertStatus(422)
           ->assertJsonPath('errors.technician_id.0', 'Teknisi yang dipilih tidak valid atau tidak aktif.');
  });

  test('priority change requires valid priority_id', function () {
      $this->postJson("/api/tickets/{$this->ticket->id}/priority", ['priority_id' => 99])
           ->assertStatus(422);
  });

  test('expected_status_id must be integer if provided', function () {
      $this->postJson("/api/tickets/{$this->ticket->id}/status", ['status_id' => 3, 'expected_status_id' => 'abc'])
           ->assertStatus(422);
  });
  ```

- [ ] **Step 2: Jalankan, pastikan gagal (404 — route belum ada).**

- [ ] **Step 3: Implementasi.** DTO mengikuti pola `CreateTicketData` (readonly + `fromArray`).
  ```php
  // StatusTransitionData
  public function __construct(
      public readonly int $statusId,
      public readonly ?string $note = null,
      public readonly ?int $expectedStatusId = null,
  ) {}
  ```
  `AssignTicketRequest`:
  ```php
  public function rules(): array
  {
      return [
          'technician_id' => ['required', 'integer',
              Rule::exists('users', 'id')->where(function ($q) {
                  $q->where('role_id', 3)->where('status', 'active');
              }),
          ],
          'note' => ['nullable', 'string', 'max:2000'],
          'expected_status_id' => ['nullable', 'integer', 'exists:ticket_statuses,id'],
      ];
  }

  public function messages(): array
  {
      return [
          'technician_id.required' => 'Teknisi wajib dipilih.',
          'technician_id.exists' => 'Teknisi yang dipilih tidak valid atau tidak aktif.',
          'note.string' => 'Catatan harus berupa teks.',
          'note.max' => 'Catatan tidak boleh lebih dari 2000 karakter.',
          'expected_status_id.integer' => 'Expected status harus berupa angka.',
          'expected_status_id.exists' => 'Expected status yang dipilih tidak valid.',
      ];
  }
  ```
  `StatusTransitionRequest`: `status_id` required+integer+`exists:ticket_statuses,id`; `note` nullable+string+max:2000; `expected_status_id` nullable+integer+`exists:ticket_statuses,id`. `authorize()` = `Gate::authorize('changeStatus', $this->route('ticket')); return true;` (melempar 403/404 bila tidak berhak, mempertahankan status denyAsNotFound).
  `AssignTicketRequest`: `authorize()` = `Gate::authorize('assign', $this->route('ticket')); return true;`
  `ChangePriorityRequest`: `authorize()` = `Gate::authorize('changePriority', $this->route('ticket')); return true;`

  Routes (`routes/api.php`, di dalam grup `auth:sanctum` + `password.changed`):
  ```php
  Route::post('/tickets/{ticket}/status', [TicketController::class, 'transition'])->name('tickets.status');
  Route::post('/tickets/{ticket}/assign', [TicketController::class, 'assign'])->name('tickets.assign');
  Route::post('/tickets/{ticket}/unassign', [TicketController::class, 'unassign'])->name('tickets.unassign');
  Route::post('/tickets/{ticket}/priority', [TicketController::class, 'changePriority'])->name('tickets.priority');
  ```

  Controller (tambahan method + inject `TicketStatusService`):
  ```php
  public function transition(StatusTransitionRequest $request, Ticket $ticket): JsonResponse
  {
      $this->authorize('changeStatus', $ticket);
      $ticket = $this->statusService->transition($ticket,
          StatusTransitionData::fromArray($request->validated()), $request->user());
      return ApiResponse::success(new TicketResource($ticket), 'Status updated successfully.');
  }

  public function assign(AssignTicketRequest $request, Ticket $ticket): JsonResponse
  {
      $this->authorize('assign', $ticket);
      $ticket = $this->statusService->assign($ticket,
          AssignTicketData::fromArray($request->validated()), $request->user());
      return ApiResponse::success(new TicketResource($ticket), 'Ticket assigned successfully.');
  }

  public function unassign(Request $request, Ticket $ticket): JsonResponse
  {
      $this->authorize('unassign', $ticket);
      $ticket = $this->statusService->unassign($ticket, $request->user());
      return ApiResponse::success(new TicketResource($ticket), 'Ticket unassigned successfully.');
  }

  public function changePriority(ChangePriorityRequest $request, Ticket $ticket): JsonResponse
  {
      $this->authorize('changePriority', $ticket);
      $ticket = $this->statusService->changePriority($ticket,
          ChangePriorityData::fromArray($request->validated()), $request->user());
      return ApiResponse::success(new TicketResource($ticket), 'Priority updated successfully.');
  }
  ```
  `TicketStatusService` stub (Task 2 mengisi body):
  ```php
  final class TicketStatusService
  {
      public function __construct(
          private readonly SlaService $slaService,
          private readonly AuditLogger $auditLogger,
          private readonly NotificationService $notificationService,
      ) {}

      public function transition(Ticket $ticket, StatusTransitionData $data, User $actor): Ticket
      {
          throw new \LogicException('Not implemented yet.');
      }
      // assign, unassign, changePriority — sama
  }
  ```
  (Jangan lupa `use` statement yang diperlukan; lakukan pint setelahnya.)

- [ ] **Step 4: Jalankan test — 5/5 hijau (422).**

- [ ] **Step 5: `vendor/bin/pint --dirty --format agent`; Commit.**

---

### Task 2: TicketActorResolver + TicketStatusService — The Engine

**Files:**
- Create: `app/Authorization/TicketActorResolver.php`
- Create: `app/Services/Ticket/TicketStatusService.php` (isi penuh, ganti stub)
- Create: `tests/Unit/TicketStatusServiceTest.php`

**Interfaces:**
- `TicketActorResolver::resolve(Ticket $ticket, User $user): array` — `list<TicketActor>`
- `TicketStatusService::transition(Ticket $ticket, StatusTransitionData $data, User $actor): Ticket`
- `TicketStatusService::assign(Ticket $ticket, AssignTicketData $data, User $actor): Ticket`
- `TicketStatusService::unassign(Ticket $ticket, User $actor): Ticket`
- `TicketStatusService::changePriority(Ticket $ticket, ChangePriorityData $data, User $actor): Ticket`

- [ ] **Step 1: Test — `TicketActorResolver` (unit)**
  ```php
  test('manager resolves to Manager role', function () {
      $user = User::factory()->manager()->create();
      $ticket = Ticket::factory()->open()->create();
      expect(app(TicketActorResolver::class)->resolve($ticket, $user))->toEqual([TicketActor::Manager]);
  });
  // admin → [Admin]; technician pemegang → [Technician, AnyTechnician];
  // technician non-pemegang → [AnyTechnician]; employee reporter → [Reporter];
  // employee non-reporter → []
  ```

- [ ] **Step 2: Test — golden path §31 (service-level)**
  ```php
  test('golden path: create → assign → in_progress → resolve → close', function () {
      $service = app(TicketStatusService::class);
      $employee = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);

      $manager = User::factory()->manager()->create();
      $technician = User::factory()->technician()->create();

      // Manager assign
      $ticket = $service->assign($ticket, AssignTicketData::fromArray([
          'technician_id' => $technician->id,
      ]), $manager);
      expect($ticket->status->name)->toBe('ASSIGNED');
      expect($ticket->technician_id)->toBe($technician->id);

      // Technician start
      $ticket = $service->transition($ticket, StatusTransitionData::fromArray([
          'status_id' => 3,
      ]), $technician);
      expect($ticket->status->name)->toBe('IN_PROGRESS');

      // Technician resolve
      $ticket = $service->transition($ticket, StatusTransitionData::fromArray([
          'status_id' => 4,
      ]), $technician);
      expect($ticket->status->name)->toBe('RESOLVED');
      expect($ticket->resolved_at)->not->toBeNull();

      // Reporter close
      $ticket = $service->transition($ticket, StatusTransitionData::fromArray([
          'status_id' => 5,
      ]), $employee);
      expect($ticket->status->name)->toBe('CLOSED');
      expect($ticket->closed_at)->not->toBeNull();
  });
  ```

- [ ] **Step 3: Test — self-assign technician (service-level)**
  ```php
  test('technician self-assigns from OPEN', function () {
      $service = app(TicketStatusService::class);
      $employee = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);
      $technician = User::factory()->technician()->create();

      $ticket = $service->transition($ticket, StatusTransitionData::fromArray([
          'status_id' => 3,
      ]), $technician);

      expect($ticket->status->name)->toBe('IN_PROGRESS');
      expect($ticket->technician_id)->toBe($technician->id);
      expect($ticket->histories()->count())->toBe(2); // status_id + technician_id
  });
  ```

- [ ] **Step 4: Test — transisi ilegal (STATUS-TRANSITION §10, K-13)**
  ```php
  test('OPEN to RESOLVED throws IllegalStatusTransitionException', function () {
      $service = app(TicketStatusService::class);
      $ticket = Ticket::factory()->open()->create();
      $manager = User::factory()->manager()->create();

      $service->transition($ticket, StatusTransitionData::fromArray(['status_id' => 4]), $manager);
  })->throws(IllegalStatusTransitionException::class, 'Status tidak dapat diubah dari OPEN ke RESOLVED');

  // ASSIGNED → RESOLVED; same status; CLOSED → IN_PROGRESS; RESOLVED → OPEN; IN_PROGRESS → OPEN
  // mengikuti pola yang sama — pesan menyebut kedua nama status (D-29).
  ```

- [ ] **Step 5: Test — 409 konkurensi (D-26, service-level)**
  ```php
  test('stale expected_status_id throws StateConflictException', function () {
      $service = app(TicketStatusService::class);
      $ticket = Ticket::factory()->open()->create();
      $manager = User::factory()->manager()->create();

      // status di DB = OPEN (1), expected = IN_PROGRESS (3)
      $service->transition($ticket, StatusTransitionData::fromArray([
          'status_id' => 3, 'expected_status_id' => 3,
      ]), $manager);
  })->throws(StateConflictException::class);

  test('stale expected_status_id with illegal transition still throws 409', function () {
      // status OPEN, expected ASSIGNED(2) — transisi OPEN→ASSIGNED legal di matriks,
      // tapi 409 dievaluasi lebih dulu (D-26)
      // status_id=2, expected_status_id=2 → StateConflictException
  });

  test('matching expected_status_id proceeds', function () {
      // status OPEN, expected_status_id=1, status_id=3 (self-assign techn) → jalan normal
  });
  ```

- [ ] **Step 6: Test — side effects per transisi (service-level)**
  ```php
  test('every transition writes history rows', function () { /* BR-008 */ });
  test('every transition writes audit log', function () { /* BR-010, AuditModule::Ticket */ });
  test('actor does not receive notification for own action', function () {
      // assign → Notification untuk technician (bukan manager pelaku)
      // expect(Notification::where('user_id', $manager->id)->count())->toBe(0)
  });
  test('note is stored as comment', function () {
      // transisi dengan note → TicketComment::where('ticket_id', ...)->where('user_id', actor)->exists()
  });
  test('transaction rollback on failure leaves no partial state', function () {
      // mock NotificationService untuk throw; assert tidak ada history/audit/ticket change
  });
  test('reopen clears resolved_at but not sla_breached', function () {
      // RESOLVED + breached → reopen ke IN_PROGRESS → resolved_at null, sla_breached tetap true
  });
  test('reopen does not change sla_deadline', function () {
      // simpan sla_deadline, reopen, bandingkan
  });
  test('priority change recalculates sla_deadline from created_at', function () {
      // changePriority → sla_deadline = created_at + sla_minutes baru (SlaService::recalculateFromCreation)
  });
  ```

- [ ] **Step 7: Implementasi `TicketActorResolver`**
  ```php
  namespace App\Authorization;

  use App\Enums\RoleName;
  use App\Enums\TicketActor;
  use App\Models\Ticket;
  use App\Models\User;

  final class TicketActorResolver
  {
      /** @return list<TicketActor> */
      public function resolve(Ticket $ticket, User $user): array
      {
          $roles = [];
          if ($user->isAdmin()) {
              $roles[] = TicketActor::Admin;
          }
          if ($user->hasRole(RoleName::Manager)) {
              $roles[] = TicketActor::Manager;
          }
          if ($user->hasRole(RoleName::Technician) && $ticket->technician_id === $user->id) {
              $roles[] = TicketActor::Technician;
          }
          if ($user->hasRole(RoleName::Technician)) {
              $roles[] = TicketActor::AnyTechnician;
          }
          if ($ticket->reporter_id === $user->id
              && ! $user->isAdmin()
              && ! $user->hasRole(RoleName::Manager, RoleName::Technician)) {
              $roles[] = TicketActor::Reporter;
          }
          return $roles;
      }
  }
  ```

- [ ] **Step 8: Implementasi `TicketStatusService`** — kerangka `transition`:
  ```php
  public function transition(Ticket $ticket, StatusTransitionData $data, User $actor): Ticket
  {
      return DB::transaction(function () use ($ticket, $data, $actor): Ticket {
          $ticket = Ticket::query()->lockForUpdate()->findOrFail($ticket->id);

          $from = TicketStatusName::fromId($ticket->status_id);
          $to = TicketStatusName::fromId($data->statusId);

          if ($data->expectedStatusId !== null && $ticket->status_id !== $data->expectedStatusId) {
              throw new StateConflictException('Ticket status has changed since it was loaded. Please refresh and try again.');
          }

          $roles = app(TicketActorResolver::class)->resolve($ticket, $actor);
          $legal = false;
          $isSelfAssign = false;
          foreach ($roles as $role) {
              if (TicketTransitionMatrix::allows($from, $to, $role)) {
                  $legal = true;
                  $isSelfAssign = $role === TicketActor::AnyTechnician;
                  break;
              }
          }

          if (! $legal) {
              throw new IllegalStatusTransitionException(
                  "Status tidak dapat diubah dari {$from->label()} ke {$to->label()}."
              );
          }

          // Prasyarat §5: IN_PROGRESS butuh technician (self-assign mengisi),
          // CLOSED dari non-RESOLVED wajib note.
          // ...

          // Apply field (tabel side-effect §6), history, audit, notifikasi.
          $ticket->save();

          return $ticket->fresh()->load(['status', 'priority', 'category', 'reporter', 'technician', 'department', 'asset']);
      });
  }
  ```

- [ ] **Step 9: Side-effect map (bagian inti — isi sesuai tabel ini)**

  | from → to | field diubah | audit action | notifikasi (pelaku dikecualikan) |
  | --- | --- | --- | --- |
  | ASSIGNED→OPEN (unassign) | `technician_id → null` | `Unassign` | technician lama |
  | OPEN→IN_PROGRESS (self-assign) | `technician_id = actor` | `SelfAssign` | reporter |
  | ASSIGNED→IN_PROGRESS (start) | — | `StatusChange` | reporter |
  | RESOLVED→IN_PROGRESS (reopen) | `resolved_at → null` | `Reopen` | technician + manager |
  | IN_PROGRESS→RESOLVED | `resolved_at = now()` | `Resolve` | reporter |
  | RESOLVED→CLOSED | `closed_at = now()` | `Close` | technician |
  | OPEN/ASSIGNED/IN_PROGRESS→CLOSED | `closed_at = now()` | `Cancel` | reporter + technician |

  Aturan umum:
  - History satu baris per field berubah; `old_value`/`new_value` = **label** (nama status / `full_name` teknisi / ISO timestamp), bukan ID (§6).
  - `note` disimpan sebagai `TicketComment` oleh pelaku; **tidak** memicu notifikasi komentar.
  - Notifikasi via `NotificationService::notifyMany(Collection $recipients, NotificationType $type, array $data, $actor)` — sudah mengecualikan pelaku. `$data` memuat kunci D-27: `ticket_id`, `ticket_number`, `title`, `actor_name`, `message`, `url` (`/tickets/{id}`).
  - Audit description Bahasa Indonesia (D-24), contoh: `"Status ticket #TCK-0001 diubah dari ASSIGNED ke IN_PROGRESS."`
  - Manager collection: `User::where('status', 'active')->whereHas('role', fn ($q) => $q->where('name', RoleName::Manager->value))->get()`.

- [ ] **Step 10: Implementasi `assign`, `unassign`, `changePriority`**
  - `assign`: hanya dari `OPEN`/`ASSIGNED`/`IN_PROGRESS` (selain itu `IllegalStatusTransitionException`). Normalisasi `status_id = 2`. `$isReassign = $ticket->technician_id !== null`; audit `Reassign` bila ya (notif teknisi lama + baru), `Assign` bila tidak (notif teknisi baru). `expected_status_id` guard sama. History `status_id` (bila berubah) + `technician_id`.
  - `unassign`: alias `ASSIGNED→OPEN`; boleh dari `ASSIGNED` saja (status lain → `IllegalStatusTransitionException`). `technician_id = null`, `status_id = 1`, audit `Unassign`, notif teknisi lama.
  - `changePriority`: blok bila `$ticket->status->is_closed` (→ `IllegalStatusTransitionException`, "Prioritas tidak dapat diubah pada ticket yang sudah ditutup/diresolusi."). Set `priority_id`, panggil `SlaService::recalculateFromCreation($ticket, $priority)` (dari `created_at`, §7), save, history `priority_id` (nama), audit `PriorityChange`. Tanpa notifikasi (§6).

- [ ] **Step 11: Jalankan test; `vendor/bin/pint --dirty --format agent`; Commit.**

---

### Task 3: TicketActionResolver + available_actions / editable_fields

**Files:**
- Create: `app/Services/Ticket/TicketActionResolver.php`
- Create: `tests/Unit/TicketActionResolverTest.php`
- Modify: `app/Http/Resources/Ticket/TicketResource.php` (hitung via resolver)
- Modify: `app/Services/Ticket/TicketService.php` (hapus hardcode `[]` di `find`)

**Interfaces:**
- `TicketActionResolver::availableActions(Ticket $ticket, User $user): array` — `list<string>` (nilai `TicketAction`)
- `TicketActionResolver::editableFields(Ticket $ticket, User $user): array`

- [ ] **Step 1: Test — matriks status × role (25 kombinasi)**
  ```php
  dataset('availableActionMatrix', function () {
      // [status_factory_state, role_setup, expected_actions]
      // role_setup = ['role' => ..., 'as_technician' => bool, 'as_reporter' => bool]
      return [
          ['open', ['employee', reporter: true], ['comment', 'attach', 'edit']],
          ['open', ['technician', owner: false], ['start']],
          ['open', ['manager'], ['assign', 'cancel', 'change_priority', 'comment', 'attach', 'edit']],
          ['open', ['admin'], ['assign', 'cancel', 'change_priority', 'comment', 'attach', 'edit']],
          // ... 21 kombinasi lainnya (lihat §9 + tabel di bawah)
      ];
  });

  test('available_actions matches STATUS-TRANSITION §9 matrix', function ($statusState, $roleSetup, $expected) {
      $user = User::factory()->{$roleSetup['role']}()->create();
      $ticket = Ticket::factory()->{$statusState}()->create(['reporter_id' => $user->id]);
      if (($roleSetup['as_technician'] ?? false)) {
          $ticket->technician_id = $user->id;
          $ticket->save();
      }
      $resolver = app(TicketActionResolver::class);
      expect($resolver->availableActions($ticket, $user))->toEqual($expected);
  })->with('availableActionMatrix');

  test('editable_fields differ per role and empty on CLOSED', function () {
      // CLOSED → []; employee reporter → ['title','description'];
      // technician/manager/admin → ['title','description','category_id']
  });
  ```

- [ ] **Step 2: Matriks lengkap (STATUS-TRANSITION §9 + D-19)**

  | Status | Admin/Manager | Technician (pemegang) | Technician (bukan pemegang) | Reporter (employee) |
  | --- | --- | --- | --- | --- |
  | OPEN | assign, cancel, change_priority, comment, attach, edit | — | start | comment, attach, edit |
  | ASSIGNED | assign, unassign, cancel, change_priority, comment, attach, edit | start, change_priority, comment, attach, edit | — | comment, attach, edit |
  | IN_PROGRESS | assign, cancel, change_priority, comment, attach, edit | resolve, change_priority, comment, attach, edit | — | comment, attach, edit |
  | RESOLVED | close, reopen, comment, attach, edit | reopen, comment, attach, edit | — | close, reopen, comment, attach, edit |
  | CLOSED | — | — | — | — |

  Implementasi `availableActions`: resolve roles via `TicketActorResolver`, lalu bangun daftar action dari tabel di atas. `editableFields`: `[]` bila `status->is_closed`; employee reporter → `['title','description']`; T/M/A → `['title','description','category_id']`.

- [ ] **Step 3: Integrasi ke `TicketResource::toArray`**
  ```php
  $viewer = $request->user();
  $actions = app(TicketActionResolver::class);
  // ...
  'available_actions' => $actions->availableActions($this->resource, $viewer),
  'editable_fields' => $actions->editableFields($this->resource, $viewer),
  ```
  Hapus `setAttribute('available_actions', [])` / `setAttribute('editable_fields', [])` dari `TicketService::find`.

- [ ] **Step 4: Jalankan test; `vendor/bin/pint --dirty --format agent`; Commit.**

---

### Task 4: Controller Wiring + Feature Tests (HTTP)

**Files:**
- Modify: `app/Http/Controllers/Ticket/TicketController.php` (sudah di Task 1 — verifikasi wiring penuh)
- Create: `tests/Feature/Ticket/StatusTransitionTest.php`

- [ ] **Step 1: Test — golden path penuh lewat HTTP (§31 skenario 1-5)**
  ```php
  test('full lifecycle over HTTP', function () {
      $employee = User::factory()->employee()->create();
      $manager = User::factory()->manager()->create();
      $technician = User::factory()->technician()->create();

      Sanctum::actingAs($employee);
      $ticket = $this->postJson('/api/tickets', [
          'title' => 'Laptop mati', 'description' => 'Tidak boot',
          'category_id' => TicketCategory::where('name', 'Laptop')->first()->id, 'priority_id' => 1,
      ])->assertStatus(201)->json('data');
      $id = $ticket['id'];

      Sanctum::actingAs($manager);
      $this->postJson("/api/tickets/{$id}/assign", ['technician_id' => $technician->id])
          ->assertStatus(200)->assertJsonPath('data.status.name', 'ASSIGNED');

      Sanctum::actingAs($technician);
      $this->postJson("/api/tickets/{$id}/status", ['status_id' => 3])
          ->assertStatus(200)->assertJsonPath('data.status.name', 'IN_PROGRESS');
      $this->postJson("/api/tickets/{$id}/status", ['status_id' => 4])
          ->assertStatus(200)->assertJsonPath('data.resolved_at', fn ($v) => $v !== null);

      Sanctum::actingAs($employee);
      $this->postJson("/api/tickets/{$id}/status", ['status_id' => 5])
          ->assertStatus(200)->assertJsonPath('data.status.name', 'CLOSED');
  });
  ```

- [ ] **Step 2: Test — transisi ilegal via HTTP (422 + pesan Indonesia menyebut nama status)**
  ```php
  test('OPEN to RESOLVED returns 422 with Indonesian message', function () {
      $ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 4])
          ->assertStatus(422)
          ->assertJsonPath('errors.status_id.0', 'Status tidak dapat diubah dari OPEN ke RESOLVED.');
  });
  // ASSIGNED→RESOLVED, same-status, CLOSED→IN_PROGRESS, RESOLVED→OPEN, IN_PROGRESS→OPEN — pola sama
  ```

- [ ] **Step 3: Test — 409 vs 422 vs 403/404 (D-26)**
  ```php
  test('stale expected_status_id returns 409', function () {
      $ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/tickets/{$ticket->id}/status",
          ['status_id' => 3, 'expected_status_id' => 3])
          ->assertStatus(409)
          ->assertJsonPath('message', 'Ticket status has changed since it was loaded. Please refresh and try again.');
  });
  test('stale expected_status_id with illegal transition returns 409 not 422', function () {
      $ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/tickets/{$ticket->id}/status",
          ['status_id' => 2, 'expected_status_id' => 2])
          ->assertStatus(409);
  });
  test('unauthorized user with stale expected_status_id returns 403/404 not 409', function () {
      $ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs(User::factory()->employee()->create()); // bukan reporter
      $this->postJson("/api/tickets/{$ticket->id}/status",
          ['status_id' => 3, 'expected_status_id' => 3])
          ->assertStatus(404); // policy view/changeStatus denyAsNotFound (D-17)
  });
  ```

- [ ] **Step 4: Test — self-assign, reopen, priority, cancel via HTTP**
  ```php
  test('technician self-assigns via HTTP with two history rows', function () {
      $employee = User::factory()->employee()->create();
      $technician = User::factory()->technician()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);
      Sanctum::actingAs($technician);

      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 3])
          ->assertStatus(200)
          ->assertJsonPath('data.status.name', 'IN_PROGRESS')
          ->assertJsonPath('data.technician.id', $technician->id);
      expect($ticket->fresh()->histories()->count())->toBe(2);
  });

  test('reopen preserves sla_deadline and sla_breached', function () {
      $employee = User::factory()->employee()->create();
      $ticket = Ticket::factory()->resolved()->breached()->create(['reporter_id' => $employee->id]);
      $deadline = $ticket->sla_deadline;
      Sanctum::actingAs($employee);

      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 3])
          ->assertStatus(200);
      $t = $ticket->fresh();
      expect($t->resolved_at)->toBeNull();
      expect($t->sla_deadline->equalTo($deadline))->toBeTrue();
      expect($t->sla_breached)->toBeTrue();
  });

  test('cancel from IN_PROGRESS without note returns 422', function () {
      $ticket = Ticket::factory()->inProgress()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 5])
          ->assertStatus(422);
  });

  test('priority change recalculates sla_deadline from created_at', function () {
      $ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $newPriority = TicketPriority::find(1); // 120 menit
      $this->postJson("/api/tickets/{$ticket->id}/priority", ['priority_id' => 1])
          ->assertStatus(200);
      $t = $ticket->fresh();
      expect($t->sla_deadline->equalTo($t->created_at->copy()->addMinutes($newPriority->sla_minutes)))->toBeTrue();
  });
  ```

- [ ] **Step 5: Test — otorisasi & D-16**
  ```php
  test('admin cannot reopen CLOSED ticket', function () {
      $ticket = Ticket::factory()->closed()->create();
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 3])
          ->assertStatus(422);
  });
  test('technician cannot close own RESOLVED ticket', function () {
      $technician = User::factory()->technician()->create();
      $ticket = Ticket::factory()->resolved()->create(['technician_id' => $technician->id]);
      Sanctum::actingAs($technician);
      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 5])
          ->assertStatus(422);
  });
  test('employee non-reporter changing status gets 404', function () {
      $ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs(User::factory()->employee()->create());
      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 3])
          ->assertStatus(404);
  });
  test('manager assigning non-technician gets 422', function () {
      $employee = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/tickets/{$ticket->id}/assign", ['technician_id' => $employee->id])
          ->assertStatus(422);
  });
  ```

- [ ] **Step 6: Test — detail mengembalikan available_actions yang benar**
  ```php
  test('show returns available_actions for manager on OPEN ticket', function () {
      $manager = User::factory()->manager()->create();
      $ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs($manager);
      $this->getJson("/api/tickets/{$ticket->id}")
          ->assertOk()
          ->assertJsonPath('data.available_actions', ['assign', 'cancel', 'change_priority', 'comment', 'attach', 'edit'])
          ->assertJsonPath('data.editable_fields', ['title', 'description', 'category_id']);
  });
  ```

- [ ] **Step 7: Jalankan seluruh suite (`php artisan test`); `vendor/bin/pint --dirty --format agent`; Commit.**

---

## Exit Criteria 3d

- [ ] 6 skenario §31 PRD dapat diselesaikan penuh lewat HTTP
- [ ] 12 transisi legal berfungsi, semua transisi ilegal → 422 dengan pesan Indonesia
- [ ] `expected_status_id` basi → 409, urutan 409 vs 422 vs 403/404 sesuai D-26
- [ ] Self-assign Technician: `OPEN → IN_PROGRESS` mengisi `technician_id` + 2 baris history
- [ ] Reopen: `resolved_at` null, `sla_deadline` dan `sla_breached` tidak berubah
- [ ] Priority change: `sla_deadline` dihitung ulang dari `created_at`, diblokir pada `is_closed`
- [ ] Admin tidak bisa membuka/tutup ticket CLOSED (D-16 #2)
- [ ] `available_actions` sesuai matriks §9 untuk 25 kombinasi status × role
- [ ] `editable_fields` ada di respons detail, berbeda per role, kosong pada CLOSED
- [ ] Setiap transisi menulis history + audit + notifikasi, pelaku tidak dinotifikasi
- [ ] `php artisan test` hijau, `pint --test` bersih
