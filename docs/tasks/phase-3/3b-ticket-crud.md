# Fase 3b — Ticket CRUD (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.

**Goal:** Membangun create/show/update/delete ticket dengan seluruh server-set field, snapshot SLA,
dan validasi kepemilikan asset. Menghasilkan `GET /api/assets/assignable`.

**Spec:** Rencana utama `docs/tasks/phase-3/README.md`; `API-CONTRACT.md §6`; `PERMISSION-MATRIX.md §3.2`; `BACKEND-ARCHITECTURE.md §4–§6`.

**Prasyarat:** 3a selesai (Policy, `SlaService`, `AuditLogger`, `NotificationService`, `TicketFactory` states, `ApiResponse::paginated()`).

---

### Task 1: DTO dan FormRequest Create/Update

**Files:**
- Create: `app/DTOs/Ticket/CreateTicketData.php`
- Create: `app/DTOs/Ticket/UpdateTicketData.php`
- Create: `app/Http/Requests/Ticket/StoreTicketRequest.php`
- Create: `app/Http/Requests/Ticket/UpdateTicketRequest.php`
- Create: `app/Rules/Ticket/AssetAssignedToReporter.php`
- Create: `tests/Feature/Ticket/TicketRequestTest.php`

**Interfaces:**
- `CreateTicketData` — `title`, `description`, `categoryId`, `priorityId`, `?assetId`
- `UpdateTicketData` — `title`, `description`, `?categoryId`, `array $fields` (whitelist per role)
- `AssetAssignedToReporter::passes(string $attribute, mixed $value): bool` — BR-014

- [x] **Step 1: Test — StoreTicketRequest rules**
  ```php
  test('store requires title, description, category_id, priority_id', function () {
      // Submit kosong, expect 422
  });
  test('store rejects asset_id not assigned to reporter', function () {
      // create asset + asset_assignment ke user A, login sebagai user B → 422
  });
  test('store accepts asset_id assigned to reporter', function () {
      // create asset + assignment ke user A, login A → valid
  });
  ```

- [x] **Step 2: Implementasi `StoreTicketRequest`**
  ```php
  public function rules(): array
  {
      return [
          'title' => ['required', 'string', 'max:200'],
          'description' => ['required', 'string'],
          'category_id' => ['required', 'integer', 'exists:ticket_categories,id'],
          'priority_id' => ['required', 'integer', 'exists:ticket_priorities,id'],
          'asset_id' => ['nullable', 'integer', 'exists:assets,id', new AssetAssignedToReporter($this->user())],
      ];
  }

  public function messages(): array
  {
      return [
          'title.required' => 'Judul tiket wajib diisi.',
          'title.max' => 'Judul tiket tidak boleh lebih dari 200 karakter.',
          'description.required' => 'Deskripsi wajib diisi.',
          'category_id.required' => 'Kategori wajib dipilih.',
          'category_id.exists' => 'Kategori yang dipilih tidak valid.',
          'priority_id.required' => 'Prioritas wajib dipilih.',
          'priority_id.exists' => 'Prioritas yang dipilih tidak valid.',
          'asset_id.exists' => 'Asset yang dipilih tidak valid.',
      ];
  }
  ```

- [x] **Step 3: Implementasi `AssetAssignedToReporter`**
  ```php
  class AssetAssignedToReporter implements ValidationRule
  {
      public function __construct(private readonly ?User $user) {}

      public function validate(string $attribute, mixed $value, Closure $fail): void
      {
          if (! $value) {
              return;
          }
          $activeAssignment = AssetAssignment::query()
              ->where('asset_id', $value)
              ->where('user_id', $this->user?->id)
              ->whereNull('released_at')
              ->exists();

          $asset = Asset::whereKey($value)->first();

          if (! $activeAssignment || ! $asset || in_array($asset->status, [AssetStatus::Retired, AssetStatus::Lost], true)) {
              $fail('Asset yang dipilih tidak sedang ter-assign kepada Anda.');
          }
      }
  }
  ```

- [x] **Step 4: Implementasi DTO**
  ```php
  class CreateTicketData
  {
      public function __construct(
          public readonly string $title,
          public readonly string $description,
          public readonly int $categoryId,
          public readonly int $priorityId,
          public readonly ?int $assetId = null,
      ) {}

      public static function fromArray(array $data): self
      {
          return new self(
              title: $data['title'],
              description: $data['description'],
              categoryId: (int) $data['category_id'],
              priorityId: (int) $data['priority_id'],
              assetId: isset($data['asset_id']) ? (int) $data['asset_id'] : null,
          );
      }
  }
  ```
  `UpdateTicketData` menyimpan `fields` (array nama field yang boleh diubah) + nilai, dibangun
  di controller dari whitelist yang dihitung per role.

- [x] **Step 5: Verifikasi & Commit.**

---

### Task 2: TicketService::create — Satu Transaksi Penuh

**Files:**
- Create: `app/Services/Ticket/TicketService.php`
- Create: `tests/Feature/Ticket/CreateTicketTest.php`

**Interfaces:**
- `TicketService::create(CreateTicketData $data, User $actor): Ticket`

- [x] **Step 1: Test — create happy path (BR-001..003, 006, 007)**
  ```php
  test('create sets OPEN status and snapshots SLA', function () {
      $employee = User::factory()->employee()->create();
      Sanctum::actingAs($employee);
      $priority = TicketPriority::find(2); // High, 240 menit

      $this->postJson('/api/tickets', [
          'title' => 'Laptop mati',
          'description' => 'Tidak bisa boot',
          'category_id' => TicketCategory::where('name', 'Laptop')->first()->id,
          'priority_id' => $priority->id,
      ])->assertStatus(201)
          ->assertJsonPath('data.status.name', 'OPEN')
          ->assertJsonPath('data.reporter.id', $employee->id)
          ->assertJsonPath('data.sla_duration_minutes', 240)
          ->assertJsonPath('data.sla_status', 'on_track');

      $ticket = Ticket::first();
      expect($ticket->status_id)->toBe(1);
      expect($ticket->technician_id)->toBeNull();
      expect($ticket->ticket_number)->toMatch('/^TCK-\d{4,}$/');
      expect($ticket->department_id)->toBe($employee->department_id);
      expect($ticket->sla_deadline)->not->toBeNull();
  });
  ```

- [x] **Step 2: Test — server-set fields diabaikan (BR-001/002, D-18)**
  ```php
  test('create ignores client-supplied reporter_id, status_id, sla fields', function () {
      $employee = User::factory()->employee()->create();
      $other = User::factory()->employee()->create();
      Sanctum::actingAs($employee);

      $this->postJson('/api/tickets', [
          'title' => 'Test',
          'description' => 'Test',
          'category_id' => TicketCategory::first()->id,
          'priority_id' => 1,
          'reporter_id' => $other->id,
          'status_id' => 5,
          'sla_duration_minutes' => 9999,
          'sla_deadline' => '2026-09-01T00:00:00Z',
          'department_id' => 999,
      ])->assertStatus(201);

      $ticket = Ticket::first();
      expect($ticket->reporter_id)->toBe($employee->id);
      expect($ticket->status_id)->toBe(1);
      expect($ticket->sla_duration_minutes)->toBe(120); // priority 1 = Critical
      expect($ticket->department_id)->toBe($employee->department_id);
  });
  ```

- [x] **Step 3: Test — ticket_number unik di bawah create paralel (D-05)**
  ```php
  test('concurrent create produces unique ticket numbers', function () {
      $employee = User::factory()->employee()->create();
      Sanctum::actingAs($employee);

      // 20 create berurutan dalam thread (simulasi)
      for ($i = 0; $i < 20; $i++) {
          $this->postJson('/api/tickets', [...valid data...])->assertStatus(201);
      }

      $numbers = Ticket::pluck('ticket_number');
      expect($numbers->unique()->count())->toBe(20);
  });
  ```
  Verifikasi nyata: `ticket_number` unik di DB (unique index), format `TCK-%04d` dari ID.

- [x] **Step 4: Test — asset ownership (BR-011, 012, 014)**
  ```php
  test('create with another users asset returns 422', function () {
      // asset assigned ke user B, create sebagai user A
      $this->postJson('/api/tickets', [..., 'asset_id' => $assetB->id])
           ->assertStatus(422)
           ->assertJsonPath('errors.asset_id', ['Asset yang dipilih tidak sedang ter-assign kepada Anda.']);
  });
  test('create with own asset succeeds', function () {
      $this->postJson('/api/tickets', [..., 'asset_id' => $assetA->id])->assertStatus(201);
  });
  ```

- [x] **Step 5: Test — create menulis history + audit log (BR-008, BR-010)**
  ```php
  test('create records status history and audit log', function () {
      // setelah create:
      expect($ticket->histories()->count())->toBe(1);
      expect($ticket->histories()->first()->field_changed)->toBe('status_id');
      expect($ticket->histories()->first()->new_value)->toBe('OPEN');
      expect(AuditLog::where('module', 'ticket')->where('action', 'create')->count())->toBe(1);
  });
  ```

- [x] **Step 6: Implementasi `TicketService::create`**
  ```php
  public function create(CreateTicketData $data, User $actor): Ticket
  {
      return DB::transaction(function () use ($data, $actor): Ticket {
          $priority = TicketPriority::findOrFail($data->priorityId);
          $status = TicketStatus::find(TicketStatusName::Open->id());

          $ticket = Ticket::create([
              'ticket_number' => 'TMP-'.Str::ulid(), // placeholder, diisi di bawah (D-05)
              'title' => $data->title,
              'description' => $data->description,
              'category_id' => $data->categoryId,
              'priority_id' => $priority->id,
              'status_id' => $status->id,
              'reporter_id' => $actor->id,
              'department_id' => $actor->department_id,
              'asset_id' => $data->assetId,
          ]);

          // D-05: format dari ID auto-increment
          $ticket->forceFill(['ticket_number' => sprintf('TCK-%04d', $ticket->id)])->save();

          // snapshot SLA (D-01)
          $this->slaService->snapshot($ticket, $priority);
          $ticket->save();

          // history + audit
          TicketHistory::create([
              'ticket_id' => $ticket->id,
              'user_id' => $actor->id,
              'field_changed' => 'status_id',
              'old_value' => null,
              'new_value' => TicketStatusName::Open->label(),
          ]);

          $this->auditLogger->log($actor, AuditAction::Create, AuditModule::Ticket, $ticket->id,
              "Ticket #{$ticket->ticket_number} dibuat.");

          return $ticket->load(['status', 'priority', 'category', 'reporter', 'technician', 'department', 'asset']);
      });
  }
  ```

- [x] **Step 7: Verifikasi & Commit.**

---

### Task 3: TicketResource + Detail Show

**Files:**
- Create: `app/Http/Resources/Ticket/TicketResource.php`
- Create: `app/Http/Resources/Ticket/TicketListResource.php`
- Modify: `app/Services/Ticket/TicketService.php` (tambah method `find`)
- Create: `tests/Feature/Ticket/ShowTicketTest.php`

**Interfaces:**
- `TicketResource::toArray()` — bentuk detail API-CONTRACT §6
- `TicketListResource::toArray()` — bentuk list ringkas
- `TicketService::find(int $id): Ticket` — dengan eager load penuh

- [x] **Step 1: Test — GET /api/tickets/{id} shape**
  ```php
  test('show returns full ticket shape', function () {
      $employee = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);
      Sanctum::actingAs($employee);

      $this->getJson("/api/tickets/{$ticket->id}")
          ->assertStatus(200)
          ->assertJsonStructure([
              'success', 'message', 'data' => [
                  'id', 'ticket_number', 'title', 'description', 'status', 'priority',
                  'category', 'reporter', 'technician', 'department', 'asset',
                  'sla_duration_minutes', 'sla_deadline', 'sla_breached', 'sla_status',
                  'sla_remaining_minutes', 'resolved_at', 'closed_at',
                  'comments_count', 'attachments_count', 'available_actions', 'editable_fields',
                  'created_at', 'updated_at',
              ],
          ]);
  });
  ```

- [x] **Step 2: Test — Employee bukan reporter dapat 404 (PERMISSION-MATRIX §5)**
  ```php
  test('employee viewing anothers ticket gets 404', function () {
      $owner = User::factory()->employee()->create();
      $intruder = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $owner->id]);
      Sanctum::actingAs($intruder);
      $this->getJson("/api/tickets/{$ticket->id}")->assertStatus(404);
  });
  ```

- [x] **Step 3: Test — asset soft-deleted tetap tampil dengan deleted:true (BR-015)**
  ```php
  test('show includes soft-deleted asset with deleted flag', function () {
      $asset = Asset::factory()->create();
      $employee = User::factory()->employee()->create();
      $ticket = Ticket::factory()->create(['reporter_id' => $employee->id, 'asset_id' => $asset->id]);
      $asset->delete();
      Sanctum::actingAs($employee);
      $this->getJson("/api/tickets/{$ticket->id}")
          ->assertJsonPath('data.asset.deleted', true);
  });
  ```

- [x] **Step 4: Implementasi `TicketResource`**
  ```php
  public function toArray(Request $request): array
  {
      $sla = app(SlaService::class);

      $asset = $this->whenLoaded('asset', function () {
          $data = [
              'id' => $this->asset->id,
              'asset_tag' => $this->asset->asset_tag,
              'name' => $this->asset->name,
          ];
          if ($this->asset->trashed()) {
              $data['deleted'] = true;
          }
          return $data;
      });

      return [
          'id' => $this->id,
          'ticket_number' => $this->ticket_number,
          'title' => $this->title,
          'description' => $this->description,
          'status' => $this->whenLoaded('status', fn () => $this->status->only('id', 'name')),
          'priority' => $this->whenLoaded('priority', fn () => $this->priority->only('id', 'name', 'sla_minutes')),
          'category' => $this->whenLoaded('category', fn () => $this->category->only('id', 'name')),
          'reporter' => $this->whenLoaded('reporter', fn () => $this->reporter->only('id', 'full_name', 'department')),
          'technician' => $this->whenLoaded('technician', fn () => $this->technician->only('id', 'full_name')),
          'department' => $this->whenLoaded('department', fn () => $this->department->only('id', 'name')),
          'asset' => $asset,
          'sla_duration_minutes' => $this->sla_duration_minutes,
          'sla_deadline' => $this->sla_deadline,
          'sla_breached' => $this->sla_breached,
          'sla_status' => $sla->isBreached($this) ? 'breached' : 'on_track',
          'sla_remaining_minutes' => $sla->remainingMinutes($this),
          'resolved_at' => $this->resolved_at,
          'closed_at' => $this->closed_at,
          'comments_count' => $this->whenLoaded('comments', fn () => $this->comments->count()),
          'attachments_count' => $this->whenLoaded('attachments', fn () => $this->attachments->count()),
          'available_actions' => $this->available_actions ?? [],
          'editable_fields' => $this->editable_fields ?? [],
          'created_at' => $this->created_at,
          'updated_at' => $this->updated_at,
      ];
  }
  ```
  Catatan: `available_actions` dan `editable_fields` dihitung penuh oleh `TicketActionResolver`
  (Task 3d). Di 3b, `TicketService::find` mengisi dua atribut ini dengan resolver sementara agar
  kunci **selalu hadir** di respons (assertion `assertJsonStructure` di Step 1 butuh itu):
  ```php
  // di TicketService::find, sebelum return:
  $ticket->setAttribute('available_actions', $this->resolver->availableActions($ticket, $request->user()));
  $ticket->setAttribute('editable_fields', $this->resolver->editableFields($ticket, $request->user()));
  ```
  `available_actions` dan `editable_fields` diakses lewat `$this->available_actions`/
  `$this->editable_fields` di Resource, bukan `whenLoaded` — keduanya selalu diisi service.
  Di 3d resolver sementara diganti implementasi penuh sesuai matriks §9.

- [x] **Step 5: Implementasi `TicketListResource`**
  ```php
  public function toArray(Request $request): array
  {
      $sla = app(SlaService::class);
      return [
          'id' => $this->id,
          'ticket_number' => $this->ticket_number,
          'title' => $this->title,
          'status' => $this->whenLoaded('status', fn () => $this->status->only('id', 'name')),
          'priority' => $this->whenLoaded('priority', fn () => $this->priority->only('id', 'name', 'sla_minutes')),
          'category' => $this->whenLoaded('category', fn () => $this->category->only('id', 'name')),
          'reporter' => $this->whenLoaded('reporter', fn () => $this->reporter->only('id', 'full_name')),
          'technician' => $this->whenLoaded('technician', fn () => $this->technician->only('id', 'full_name')),
          'sla_deadline' => $this->sla_deadline,
          'sla_breached' => $this->sla_breached,
          'sla_status' => $sla->isBreached($this) ? 'breached' : 'on_track',
          'created_at' => $this->created_at,
      ];
  }
  ```

- [x] **Step 6: Verifikasi & Commit.**

---

### Task 4: TicketService::update + delete

**Files:**
- Modify: `app/Services/Ticket/TicketService.php`
- Create: `tests/Feature/Ticket/UpdateDeleteTicketTest.php`

**Interfaces:**
- `TicketService::update(Ticket $ticket, UpdateTicketData $data): Ticket`
- `TicketService::delete(Ticket $ticket): void` — soft delete, Admin hanya

- [x] **Step 1: Test — update field whitelist per role**
  ```php
  test('employee updates title and description only', function () {
      // create ticket milik employee, PUT dengan category_id baru → category tidak berubah
  });
  test('technician/manager/admin can update category_id', function () {
      // PUT dengan category_id baru → berubah
  });
  ```

- [x] **Step 2: Test — CLOSED tidak bisa diubah oleh siapa pun (BR-009, K-09)**
  ```php
  test('nobody can edit a CLOSED ticket', function () {
      $ticket = Ticket::factory()->closed()->create(['reporter_id' => $employee->id]);
      // employee, technician, manager, admin → semua 403
  });
  ```

- [x] **Step 3: Test — server-set field ditolak di PUT**
  ```php
  test('update rejects status_id and technician_id in payload', function () {
      $this->putJson("/api/tickets/{$ticket->id}", ['status_id' => 3, 'technician_id' => 999])
           ->assertStatus(422)
           ->assertJsonPath('errors.status_id', ['Status tiket tidak dapat diubah lewat update umum.']);
  });
  ```

- [x] **Step 4: Test — delete soft delete**
  ```php
  test('delete soft-deletes ticket', function () {
      $this->deleteJson("/api/tickets/{$ticket->id}")->assertStatus(200);
      expect(Ticket::withTrashed()->find($ticket->id))->not->toBeNull();
  });
  test('non-admin cannot delete', function () {
      // employee/technician/manager → 403
  });
  ```

- [x] **Step 5: Implementasi `update`**
  ```php
  public function update(Ticket $ticket, UpdateTicketData $data): Ticket
  {
      return DB::transaction(function () use ($ticket, $data): Ticket {
          $old = $ticket->only($data->fields);

          foreach ($data->fields as $field) {
              if ($field === 'category_id') {
                  $ticket->category_id = $data->categoryId;
              } elseif ($field === 'title') {
                  $ticket->title = $data->title;
              } elseif ($field === 'description') {
                  $ticket->description = $data->description;
              }
          }
          $ticket->save();

          foreach ($data->fields as $field) {
              $newValue = $ticket->getAttribute($field);
              if ((string) ($old[$field] ?? '') !== (string) ($newValue ?? '')) {
                  TicketHistory::create([
                      'ticket_id' => $ticket->id,
                      'user_id' => auth()->id(),
                      'field_changed' => $field,
                      'old_value' => $this->displayValue($field, $old[$field] ?? null),
                      'new_value' => $this->displayValue($field, $newValue),
                  ]);
              }
          }

          $this->auditLogger->log(auth()->user(), AuditAction::Update, AuditModule::Ticket,
              $ticket->id, "Ticket #{$ticket->ticket_number} diperbarui.", $old, $ticket->only($data->fields));

          return $ticket->fresh()->load(['status', 'priority', 'category', 'reporter', 'technician', 'department', 'asset']);
      });
  }

  private function displayValue(string $field, mixed $value): ?string
  {
      return match ($field) {
          'category_id' => TicketCategory::find($value)?->name,
          default => $value,
      };
  }
  ```

- [x] **Step 6: Verifikasi & Commit.**

---

### Task 5: Controller, Routes, GET /assets/assignable

**Files:**
- Create: `app/Http/Controllers/Ticket/TicketController.php`
- Create: `app/Http/Controllers/Asset/AssetController.php` (method `assignable`)
- Create: `app/Http/Resources/Asset/AssignableAssetResource.php`
- Modify: `routes/api.php`

**Interfaces:**
- `TicketController::store/show/update/destroy`
- `AssetController::assignable`

- [x] **Step 1: Implementasi `TicketController`**
  ```php
  class TicketController extends Controller
  {
      public function __construct(
          protected TicketService $ticketService,
          protected SlaService $slaService,
      ) {}

      public function store(StoreTicketRequest $request): JsonResponse
      {
          $ticket = $this->ticketService->create(CreateTicketData::fromArray($request->validated()), $request->user());
          return ApiResponse::success(new TicketResource($ticket), 'Ticket created successfully.', 201);
      }

      public function show(Ticket $ticket): JsonResponse
      {
          $this->authorize('view', $ticket);
          $ticket->load([...]); // eager load penuh
          return ApiResponse::success(new TicketResource($ticket), 'Ticket retrieved successfully.');
      }

      public function update(UpdateTicketRequest $request, Ticket $ticket): JsonResponse
      {
          $this->authorize('update', $ticket);
          // hitung whitelist field berdasarkan role
          $ticket = $this->ticketService->update($ticket, UpdateTicketData::fromArray($request->validated(), $fields));
          return ApiResponse::success(new TicketResource($ticket), 'Ticket updated successfully.');
      }

      public function destroy(Ticket $ticket): JsonResponse
      {
          $this->authorize('delete', $ticket);
          $this->ticketService->delete($ticket);
          return ApiResponse::success(null, 'Ticket deleted successfully.');
      }
  }
  ```
  Route model binding `Ticket` menggunakan id. Tambahkan binding jika perlu:
  `Route::model('ticket', Ticket::class)` default sudah ada.

- [x] **Step 2: Implementasi `assignable`**
  ```php
  public function assignable(Request $request): JsonResponse
  {
      $this->authorize('viewAssignable', Asset::class);

      $assets = Asset::whereIn('id', AssetAssignment::where('user_id', $request->user()->id)
              ->whereNull('released_at')
              ->pluck('asset_id'))
          ->whereIn('status', [AssetStatus::Available, AssetStatus::Assigned])
          ->get();

      return ApiResponse::success(AssignableAssetResource::collection($assets), 'Assignable assets retrieved.');
  }
  ```
  Catatan: `status` asset di BR/Addendum §1.3 harus "sesuai untuk digunakan, bukan retired/lost".
  `available` dan `assigned` dianggap layak; `maintenance`/`retired`/`lost` tidak. Fase 5 yang
  menentukan aturan persis assignment; di sini cukup dua status itu.

- [x] **Step 3: Tambah routes**
  ```php
  Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
      Route::get('/assets/assignable', [AssetController::class, 'assignable'])->name('asset.assignable');
      Route::apiResource('tickets', TicketController::class)->except(['index']);
  });
  ```
  Catatan: `index` ditambahkan 3c. `GET /api/assets/assignable` **harus didaftarkan sebelum**
  `GET /api/assets/{id}` (kalau route asset `{id}` sudah ada) — di Fase 3 route asset `{id}`
  belum dibuat, tapi jaga urutannya untuk Fase 5. Gunakan route di atas tanpa `{id}`.

- [x] **Step 4: Test — route index belum ada (hanya 5 route ticket)**
  ```php
  test('ticket index route not yet registered', function () {
      $this->getJson('/api/tickets')->assertStatus(404);
  });
  ```
  (Akan diubah di 3c.)

- [x] **Step 5: Verifikasi — jalankan test CreateTicketTest, ShowTicketTest, UpdateDeleteTicketTest. Commit.**

---

## Exit Criteria 3b

- [x] `POST /api/tickets` → 201 dengan `ticket_number`, SLA ter-snapshot, status OPEN, reporter dari token
- [x] `GET /api/tickets/{id}` → bentuk lengkap, Employee asing → 404, asset soft-deleted tampil `deleted:true`
- [x] `PUT /api/tickets/{id}` → whitelist per role, CLOSED tak bisa diubah siapa pun, server-set field → 422
- [x] `DELETE /api/tickets/{id}` → soft delete, Admin hanya
- [x] `GET /api/assets/assignable` → hanya asset milik user login yang layak pakai
- [x] BR-001..015 ter-cover (negatif + positif)
- [x] Tidak ada N+1 pada detail (satu eager load, `DB::listen` tidak meledak saat cacah komentar naik)
- [x] `php artisan test` hijau, `pint --test` bersih