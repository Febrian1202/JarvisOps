# Fase 3d — Ticket Workflow: Status, Assign, Priority (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.

**Goal:** Membangun `TicketStatusService` — satu mesin transisi yang melayani status, assign,
unassign, self-assign, dan priority. Menghasilkan `available_actions` + `editable_fields` di respons
detail. Menangani konkurensi lewat `expected_status_id` → 409.

**Spec:** `STATUS-TRANSITION.md` v1.1; `API-CONTRACT.md §6`; `DECISIONS.md D-16, D-17, D-21, D-26`.

**Prasyarat:** 3c selesai (list, filter, sort, referensi).

---

### Task 1: DTO + FormRequest Transisi

**Files:**
- Create: `app/DTOs/Ticket/StatusTransitionData.php`
- Create: `app/DTOs/Ticket/AssignTicketData.php`
- Create: `app/DTOs/Ticket/ChangePriorityData.php`
- Create: `app/Http/Requests/Ticket/StatusTransitionRequest.php`
- Create: `app/Http/Requests/Ticket/AssignTicketRequest.php`
- Create: `app/Http/Requests/Ticket/ChangePriorityRequest.php`

- [ ] **Step 1: Test — FormRequest validation**
  ```php
  test('status transition requires valid status_id', function () {
      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 99])
           ->assertStatus(422);
  });
  test('assign requires valid technician_id with role technician', function () {
      $this->postJson("/api/tickets/{$ticket->id}/assign", ['technician_id' => 999])
           ->assertStatus(422);
  });
  test('assign rejects non-technician user', function () {
      // technician_id = user_id yang role-nya employee
      $this->postJson("/api/tickets/{$ticket->id}/assign", ['technician_id' => $employee->id])
           ->assertStatus(422);
  });
  test('priority change requires valid priority_id', function () {
      $this->postJson("/api/tickets/{$ticket->id}/priority", ['priority_id' => 99])
           ->assertStatus(422);
  });
  test('expected_status_id must be integer if provided', function () {
      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 3, 'expected_status_id' => 'abc'])
           ->assertStatus(422);
  });
  ```

- [ ] **Step 2: Implementasi FormRequest + DTO.**
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
      ];
  }
  ```

- [ ] **Step 3: Verifikasi & Commit.**

---

### Task 2: TicketStatusService — The Engine

**Files:**
- Create: `app/Services/Ticket/TicketStatusService.php`
- Create: `tests/Feature/Ticket/StatusTransitionTest.php`

**Interfaces:**
- `TicketStatusService::transition(Ticket $ticket, StatusTransitionData $data, User $actor): Ticket`
- `TicketStatusService::assign(Ticket $ticket, AssignTicketData $data, User $actor): Ticket`
- `TicketStatusService::unassign(Ticket $ticket, User $actor): Ticket`
- `TicketStatusService::changePriority(Ticket $ticket, ChangePriorityData $data, User $actor): Ticket`

- [ ] **Step 1: Test — 6 skenario §31 (golden path)**
  ```php
  test('golden path: create → assign → in_progress → resolve → close', function () {
      // 1. Employee create → OPEN
      // 2. Manager assign → ASSIGNED
      // 3. Technician start → IN_PROGRESS
      // 4. Technician resolve → RESOLVED, resolved_at terisi
      // 5. Reporter close → CLOSED, closed_at terisi
  });
  ```
  Test ini adalah versi awal dari `GoldenPathTest` di 3e. Di sini fokus ke service langsung,
  bukan HTTP — supaya isolasi kegagalan lebih jelas.

- [ ] **Step 2: Test — self-assign technician**
  ```php
  test('technician self-assigns from OPEN', function () {
      // technician_id kosong, status OPEN
      // POST /api/tickets/{id}/status dengan status_id=3 (IN_PROGRESS)
      // → technician_id = actor, status = IN_PROGRESS, 2 baris history
  });
  ```

- [ ] **Step 3: Test — transisi ilegal (STATUS-TRANSITION §10, K-13)**
  ```php
  test('OPEN to RESOLVED returns 422', function () {
      $ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 4])
          ->assertStatus(422)
          ->assertJsonPath('errors.status_id.0', fn (string $m) => str_contains($m, 'OPEN') && str_contains($m, 'RESOLVED'));
  });

  test('ASSIGNED to RESOLVED returns 422', function () {
      $ticket = Ticket::factory()->assigned()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 4])->assertStatus(422);
  });

  test('same status transition returns 422', function () {
      $ticket = Ticket::factory()->open()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 1])->assertStatus(422);
  });

  // Sisanya (CLOSED → IN_PROGRESS/RESOLVED, RESOLVED → OPEN/ASSIGNED, IN_PROGRESS → OPEN,
  // ASSIGNED → ASSIGNED) mengikuti pola yang sama — status di DB vs status_id tujuan.
  ```

- [ ] **Step 4: Test — 409 konkurensi (D-26)**
  ```php
  test('stale expected_status_id returns 409', function () {
      // ticket status OPEN, expected_status_id=3 (IN_PROGRESS)
      // tapi status di DB masih 1 (OPEN)
      // → 409
  });
  test('stale expected_status_id and illegal transition returns 409 not 422', function () {
      // ticket status OPEN, expected_status_id=2 (ASSIGNED)
      // tapi status di DB = 1, dan transisi OPEN→ASSIGNED legal
      // → tetap 409 karena state basi didahulukan
  });
  test('unauthorized user with stale expected_status_id returns 403/404 not 409', function () {
      // otorisasi tetap paling awal (D-17)
  });
  ```

- [ ] **Step 5: Test — side effects per transisi**
  ```php
  test('every transition writes history rows (BR-008)', function () { ... });
  test('every transition writes audit log (BR-010)', function () { ... });
  test('actor does not receive notification for own action', function () { ... });
  test('note is stored as comment', function () { ... });
  test('transaction rollback on failure leaves no partial state', function () {
      // mock NotificationService to throw, assert no changes persisted
  });
  test('reopen clears resolved_at but not sla_breached', function () { ... });
  test('reopen does not change sla_deadline', function () { ... });
  test('priority change recalculates sla_deadline from created_at', function () { ... });
  ```

- [ ] **Step 6: Test — admin tidak bisa membuka CLOSED (D-16 exception #2)**
  ```php
  test('admin cannot reopen CLOSED ticket', function () {
      Sanctum::actingAs(User::factory()->admin()->create());
      // POST /status dengan status_id=3 pada ticket CLOSED → 422
      // (dicegah matriks, bukan policy)
  });
  ```

- [ ] **Step 7: Implementasi `TicketStatusService::transition`**
  ```php
  public function transition(Ticket $ticket, StatusTransitionData $data, User $actor): Ticket
  {
      return DB::transaction(function () use ($ticket, $data, $actor): Ticket {
          // 1. Lock baris untuk konkurensi
          $ticket = Ticket::lockForUpdate()->findOrFail($ticket->id);

          $fromStatus = TicketStatusName::fromId($ticket->status_id);
          $toStatus = TicketStatusName::fromId($data->statusId);

          // 2. expected_status_id guard (D-26)
          if ($data->expectedStatusId !== null && $ticket->status_id !== $data->expectedStatusId) {
              throw new StateConflictException('Ticket status has changed since it was loaded.');
          }

          // 3. Resolve actor roles
          $actorRoles = $this->resolveActorRoles($ticket, $actor);

          // 4. Legalitas matriks (STATUS-TRANSITION §3)
          $legal = false;
          $isSelfAssign = false;
          foreach ($actorRoles as $role) {
              if (TicketTransitionMatrix::allows($fromStatus, $toStatus, $role)) {
                  $legal = true;
                  $isSelfAssign = $role === TicketActor::AnyTechnician;
                  break;
              }
          }

          if (! $legal) {
              // Pesan diteruskan ke errors.status_id oleh exception handler (3a Task 1),
              // bentuk persis STATUS-TRANSITION.md §8 + Bahasa Indonesia (D-29).
              throw new IllegalStatusTransitionException(
                  "Status tidak dapat diubah dari {$fromStatus->label()} ke {$toStatus->label()}."
              );
          }

          // 5. Prasyarat data (STATUS-TRANSITION §5)
          // ...

          // 6. Apply
          $ticket->status_id = $data->statusId;
          // ... teknik field updates, history, audit, notifikasi
          $ticket->save();

          return $ticket->fresh()->load([...]);
      });
  }
  ```

- [ ] **Step 8: Implementasi `resolveActorRoles`**
  ```php
  private function resolveActorRoles(Ticket $ticket, User $actor): array
  {
      $roles = [];
      if ($actor->isAdmin()) { $roles[] = TicketActor::Admin; }
      if ($actor->hasRole(RoleName::Manager)) { $roles[] = TicketActor::Manager; }
      if ($actor->hasRole(RoleName::Technician) && $ticket->technician_id === $actor->id) {
          $roles[] = TicketActor::Technician;
      }
      if ($actor->hasRole(RoleName::Technician)) {
          $roles[] = TicketActor::AnyTechnician; // T* — untuk self-assign
      }
      if ($ticket->reporter_id === $actor->id && ! $actor->isAdmin() && ! $actor->hasRole(RoleName::Manager, RoleName::Technician)) {
          $roles[] = TicketActor::Reporter; // Employee murni
      }
      // Manager/Admin juga bisa jadi reporter — tapi mereka sudah punya M/A role
      return $roles;
  }
  ```

- [ ] **Step 9: Verifikasi & Commit.**

---

### Task 3: TicketActionResolver + available_actions

**Files:**
- Create: `app/Services/Ticket/TicketActionResolver.php`
- Create: `tests/Unit/TicketActionResolverTest.php`

**Interfaces:**
- `TicketActionResolver::availableActions(Ticket $ticket, User $user): array` — daftar string
- `TicketActionResolver::editableFields(Ticket $ticket, User $user): array` — daftar field

- [ ] **Step 1: Test — setiap kombinasi status × role**
  ```php
  dataset('statusRoleMatrix', function () {
      // 5 status × 5 role = 25 kombinasi
      // Expected format: [status_id, role_factory_state, expected_actions]
  });
  test('available_actions matches matrix', function ($statusId, $roleState, $expectedActions) {
      $user = User::factory()->{$roleState}()->create();
      $ticket = Ticket::factory()->{$this->statusToFactoryMethod($statusId)}()->create();
      // self-assign case: technician_id = actor
      $resolver = app(TicketActionResolver::class);
      expect($resolver->availableActions($ticket, $user))->toEqual($expectedActions);
  });
  ```

- [ ] **Step 2: Implementasi `TicketActionResolver`**
  ```php
  class TicketActionResolver
  {
      public function availableActions(Ticket $ticket, User $user): array
      {
          $actions = [];
          $status = TicketStatusName::fromId($ticket->status_id);
          $actorRoles = $this->resolveActorRoles($ticket, $user);

          // Matriks available_actions dari STATUS-TRANSITION §9
          if ($status !== TicketStatusName::Closed) {
              if (in_array(TicketActor::Admin, $actorRoles) || in_array(TicketActor::Manager, $actorRoles)) {
                  if (in_array($status, [TicketStatusName::Open, TicketStatusName::Assigned, TicketStatusName::InProgress])) {
                      $actions[] = 'assign';
                  }
                  if ($status === TicketStatusName::Assigned) {
                      $actions[] = 'unassign';
                  }
                  if (in_array($status, [TicketStatusName::Open, TicketStatusName::Assigned, TicketStatusName::InProgress])) {
                      $actions[] = 'cancel';
                  }
              }
              // ... semua action dari tabel §9
          }

          return $actions;
      }

      public function editableFields(Ticket $ticket, User $user): array
      {
          if ($ticket->status->is_closed) {
              return [];
          }
          // Employee: title, description
          // T/M/A: title, description, category_id
          if ($user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician)) {
              return ['title', 'description', 'category_id'];
          }
          if ($ticket->reporter_id === $user->id) {
              return ['title', 'description'];
          }
          return [];
      }
  }
  ```

- [ ] **Step 3: Integrasi ke `TicketResource` — panggil resolver saat `whenLoaded`**
  `TicketService::find` dan `paginate` memanggil resolver untuk mengisi virtual field.
  Atau: resolver dipanggil di Resource `toArray` langsung.

- [ ] **Step 4: Verifikasi & Commit.**

---

### Task 4: Controller + Routes Transisi

**Files:**
- Modify: `app/Http/Controllers/Ticket/TicketController.php`
- Modify: `routes/api.php`

- [ ] **Step 1: Tambah method di controller**
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

- [ ] **Step 2: Tambah routes**
  ```php
  Route::post('/tickets/{ticket}/status', [TicketController::class, 'transition'])->name('tickets.status');
  Route::post('/tickets/{ticket}/assign', [TicketController::class, 'assign'])->name('tickets.assign');
  Route::post('/tickets/{ticket}/unassign', [TicketController::class, 'unassign'])->name('tickets.unassign');
  Route::post('/tickets/{ticket}/priority', [TicketController::class, 'changePriority'])->name('tickets.priority');
  ```

- [ ] **Step 3: Test — HTTP endpoint transisi penuh**
  Jalankan ulang test dari Task 2 sebagai HTTP test. Pastikan semua 6 skenario §31, semua
  transisi ilegal, dan semua test konkurensi lulus lewat HTTP.

- [ ] **Step 4: Verifikasi & Commit.**

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