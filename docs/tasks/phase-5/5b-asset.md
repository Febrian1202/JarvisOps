# Fase 5b — Asset Management (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini membangun CRUD asset, assign/release, riwayat kepemilikan, dan search/filter/pagination.

**Goal:** Membangun modul asset penuh: CRUD (T/M/A tanpa delete utk T), assign/release dengan invariant satu-assignment-aktif (D-09), riwayat kepemilikan gabungan (§17 PRD), `GET /api/my-assets`, dan list dengan search 3 field + filter + sort + pagination. Endpoint `GET /api/assets/assignable` dari Fase 3 dipertahankan tanpa perubahan.

**Branch:** `feat/phase-5b-asset`
**Estimasi Waktu:** ~1.5 hari (7 task)
**Prasyarat:** 5a selesai (`AssetPolicy` lengkap, `Asset.activeAssignment`, `AssetHistoryAction` enum, `AssetFactory` states, index `assets(status)`).

---

### Task 1: IndexAssetRequest + AssetQueryService

**Files:**
- Create: `app/Http/Requests/Asset/IndexAssetRequest.php`
- Create: `app/Services/Asset/AssetQueryService.php`
- Create: `tests/Feature/Asset/AssetListTest.php`

**Interfaces:**
- `IndexAssetRequest::rules()` — validasi semua filter opsional
- `AssetQueryService::paginate(Request $request): LengthAwarePaginator` — eager load + scoping + filter + search + sort

**Detail:**
API-CONTRACT §7.1 (baris 433–443):

| Parameter | Keterangan |
| --- | --- |
| `search` | `asset_tag`, `serial_number`, `name` |
| `status` | `available` \| `assigned` \| `maintenance` \| `retired` \| `lost` |
| `category` | |
| `assigned_user_id` | Pemegang aktif |
| `sort_by` | `asset_tag`, `name`, `status`, `purchase_date`, `created_at` |

Scoping: Employee tidak bisa mengakses `/api/assets` (PERMISSION §3.4 `viewAny` = T/M/A). Pemegang aktif didapat dari `activeAssignments` (relasi `released_at IS NULL`).

**`IndexAssetRequest`** — validasi di FormRequest, Indonesian `messages()`:
```php
public function rules(): array
{
    return [
        'search' => ['nullable', 'string', 'max:100'],
        'status' => ['nullable', 'string', Rule::enum(AssetStatus::class)],
        'category' => ['nullable', 'string', 'max:100'],
        'assigned_user_id' => ['nullable', 'integer'],
        'sort_by' => ['nullable', 'string', 'in:asset_tag,name,status,purchase_date,created_at'],
        'sort_dir' => ['nullable', 'string', 'in:asc,desc'],
        'per_page' => ['nullable', 'integer', 'min:1'],
    ];
}
```

**`AssetQueryService`**:
```php
public function paginate(Request $request): LengthAwarePaginator
{
    $query = Asset::query()
        ->with(['activeAssignment.user']);

    // Search (D-10, sanitasi wildcard)
    if ($search = $request->query('search')) {
        $term = str_replace(['%', '_'], ['\\%', '\\_'], $search);
        $query->where(function ($q) use ($term) {
            $q->where('asset_tag', 'LIKE', "%{$term}%")
                ->orWhere('serial_number', 'LIKE', "%{$term}%")
                ->orWhere('name', 'LIKE', "%{$term}%");
        });
    }

    // Filter
    if ($status = $request->query('status')) {
        $query->where('status', $status);
    }
    if ($category = $request->query('category')) {
        $query->where('category', $category);
    }
    if ($assignedUserId = $request->query('assigned_user_id')) {
        $query->whereHas('activeAssignment', fn ($q) => $q->where('user_id', $assignedUserId));
    }

    // Sort (whitelist — HandlerPagination::applySorting)
    return $this->applySorting($query, $request, [
        'asset_tag', 'name', 'status', 'purchase_date', 'created_at',
    ])->paginate($this->getPerPage($request));
}
```

> **Jebakan:** Jangan pakai `whereHas('assignments', fn ($q) => $q->whereNull('released_at')->where('user_id', $x))` — pakai relasi `activeAssignment` yang sudah dibatasi `released_at IS NULL` agar query-nya bersih.

- [ ] **Step 1: Test — Employee 403, search 3 field, filter status, filter assigned_user_id.**
  ```php
  test('employee cannot list assets', function () {
      $employee = User::factory()->employee()->create();
      Sanctum::actingAs($employee);
      $this->getJson('/api/assets')->assertStatus(403);
  });

  test('search matches asset_tag, serial_number, and name', function () {
      $manager = User::factory()->manager()->create();
      Asset::factory()->create(['asset_tag' => 'AST-X1-001', 'name' => 'ThinkPad', 'serial_number' => 'SN-X1']);
      Sanctum::actingAs($manager);
      $this->getJson('/api/assets?search=X1')->assertJsonCount(1, 'data');
  });

  test('filter by status maintenance', function () {
      $manager = User::factory()->manager()->create();
      Asset::factory()->maintenance()->create();
      Asset::factory()->available()->create();
      Sanctum::actingAs($manager);
      $this->getJson('/api/assets?status=maintenance')->assertJsonCount(1, 'data');
  });

  test('filter by assigned_user_id', function () {
      $manager = User::factory()->manager()->create();
      $user = User::factory()->employee()->create();
      $asset = Asset::factory()->create();
      AssetAssignment::factory()->create(['asset_id' => $asset->id, 'user_id' => $user->id, 'released_at' => null]);
      Sanctum::actingAs($manager);
      $this->getJson('/api/assets?assigned_user_id='.$user->id)->assertJsonCount(1, 'data');
  });
  ```

- [ ] **Step 2: Test — sort_by whitelist + pagination meta.**
  ```php
  test('invalid sort_by returns 422', function () {
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->getJson('/api/assets?sort_by=password')->assertStatus(422);
  });
  test('meta has six keys and no links', function () {
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->getJson('/api/assets?per_page=5')
          ->assertJsonStructure(['meta' => ['current_page', 'per_page', 'total', 'last_page', 'from', 'to']]);
  });
  ```

- [ ] **Step 3: Test — tidak ada N+1.**
  ```php
  test('asset list query count does not grow with volume', function () {
      DB::listen(fn ($q) => $queries[] = $q);
      Sanctum::actingAs(User::factory()->admin()->create());
      Asset::factory()->count(1)->create();
      $this->getJson('/api/assets');
      $c1 = count($queries);
      Asset::factory()->count(9)->create();
      $this->getJson('/api/assets');
      $c2 = count($queries);
      // Selisih hanya dari insert queries; asersi relatif
      expect($c2)->toBeLessThan($c1 + 5);
  });
  ```

- [ ] **Step 4: Implementasi** — buat `IndexAssetRequest`, `AssetQueryService`.

- [ ] **Step 5: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Asset/AssetListTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Requests/Asset/ app/Services/Asset/ tests/Feature/Asset/
  git commit -m "feat(asset): add list endpoint with search, filter, sort, pagination"
  ```

---

### Task 2: DTO + AssetService (Create / Update / Delete)

**Files:**
- Create: `app/DTOs/Asset/CreateAssetData.php`
- Create: `app/DTOs/Asset/UpdateAssetData.php`
- Create: `app/Services/Asset/AssetService.php`
- Create: `app/Http/Requests/Asset/StoreAssetRequest.php`
- Create: `app/Http/Requests/Asset/UpdateAssetRequest.php`
- Create: `tests/Feature/Asset/AssetCrudTest.php`

**Detail:**

**`StoreAssetRequest`** (API-CONTRACT §7.2):
```php
public function rules(): array
{
    return [
        'asset_tag' => ['required', 'string', 'max:50', Rule::unique('assets', 'asset_tag')],
        'name' => ['required', 'string', 'max:150'],
        'category' => ['required', 'string', 'max:100'],
        'brand' => ['required', 'string', 'max:100'],
        'model' => ['required', 'string', 'max:100'],
        'serial_number' => ['required', 'string', 'max:150', Rule::unique('assets', 'serial_number')],
        'purchase_date' => ['required', 'date', 'before_or_equal:today'],
        'status' => ['required', Rule::enum(AssetStatus::class)],
        'notes' => ['nullable', 'string'],
    ];
}
```
**Catatan:** `brand`, `model`, `serial_number`, `purchase_date` wajib (migration NOT NULL). Validasi `status` memakai `Rule::enum` → otomatis menolak nilai invalid dengan 422.

**`AssetService`**:
```php
public function create(CreateAssetData $data, User $actor): Asset
{
    return DB::transaction(function () use ($data, $actor): Asset {
        $asset = Asset::create($data->toArray());

        // Asset history + audit log
        $this->recordHistory($asset, AssetHistoryAction::Created, 'Aset dibuat.');
        $this->auditLogger->log($actor, AuditAction::Create, AuditModule::Asset, $asset->id,
            "Aset {$asset->asset_tag} dibuat.");

        return $asset;
    });
}

public function update(Asset $asset, UpdateAssetData $data, User $actor): Asset
{
    // Simpan status lama untuk dibandingkan
    $oldStatus = $asset->status?->value;

    return DB::transaction(function () use ($asset, $data, $actor, $oldStatus): Asset {
        $asset->update($data->toArray());

        // Catat perubahan status sebagai asset_histories
        $newStatus = $asset->status?->value;
        if ($oldStatus !== $newStatus) {
            $this->recordHistory($asset, AssetHistoryAction::StatusChanged,
                "Status diubah dari {$oldStatus} menjadi {$newStatus}.");
        }

        $this->auditLogger->log($actor, AuditAction::Update, AuditModule::Asset, $asset->id,
            "Aset {$asset->asset_tag} diperbarui.", $data->oldData(), $data->newData());

        return $asset->fresh();
    });
}

public function delete(Asset $asset, User $actor): void
{
    DB::transaction(function () use ($asset, $actor): void {
        // Guard: jangan hapus asset yang masih punya assignment aktif
        if ($asset->activeAssignment()->exists()) {
            throw new StateConflictException('Aset masih memiliki pemegang aktif dan tidak dapat dihapus.');
        }

        $asset->delete();
        $this->auditLogger->log($actor, AuditAction::Delete, AuditModule::Asset, $asset->id,
            "Aset {$asset->asset_tag} dihapus.");
    });
}
```

> **Jebakan:** `Asset::create($data->toArray())` — pastikan `CreateAssetData::toArray()` mengembalikan hanya field yang ada di `$fillable` model Asset. Jangan mengirim `id`, `created_at`, dll.

- [ ] **Step 1: Test — create valid + 201.**
  ```php
  test('manager can create asset', function () {
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson('/api/assets', [
          'asset_tag' => 'AST-NEW-001', 'name' => 'New Device', 'category' => 'Laptop',
          'brand' => 'Lenovo', 'model' => 'X1', 'serial_number' => 'SN-NEW-001',
          'purchase_date' => '2025-03-15', 'status' => 'available',
      ])->assertStatus(201)
        ->assertJsonPath('data.asset_tag', 'AST-NEW-001')
        ->assertJsonPath('data.status', 'available');
  });
  ```

- [ ] **Step 2: Test — duplicate asset_tag/serial_number → 422, technician cannot delete.**
  ```php
  test('duplicate asset_tag returns 422', function () {
      Asset::factory()->create(['asset_tag' => 'AST-DUP']);
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson('/api/assets', [...duplikat 'AST-DUP'...])->assertStatus(422)
          ->assertJsonValidationErrors('asset_tag');
  });

  test('technician cannot delete asset', function () {
      $asset = Asset::factory()->create();
      Sanctum::actingAs(User::factory()->technician()->create());
      $this->deleteJson("/api/assets/{$asset->id}")->assertStatus(403);
  });
  ```

- [ ] **Step 3: Test — delete blocked 409 saat masih di-assign.**
  ```php
  test('cannot delete asset with active assignment', function () {
      $asset = Asset::factory()->create(['status' => 'assigned']);
      AssetAssignment::factory()->create(['asset_id' => $asset->id, 'released_at' => null]);
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->deleteJson("/api/assets/{$asset->id}")->assertStatus(409);
  });
  ```

- [ ] **Step 4: Test — soft delete asset tidak menghapus ticket (BR-015).**
  ```php
  test('soft delete asset keeps ticket history intact', function () {
      $ticket = Ticket::factory()->create();
      $asset = Asset::factory()->create();
      $ticket->update(['asset_id' => $asset->id]);
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->deleteJson("/api/assets/{$asset->id}")->assertStatus(200);
      expect($ticket->fresh()->asset_id)->toBe($asset->id);
  });
  ```

- [ ] **Step 5: Implementasi** — DTO, service, request, controller method.

- [ ] **Step 6: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Asset/AssetCrudTest.php
  vendor/bin/pint --dirty --format agent
  git add app/DTOs/Asset/ app/Services/Asset/ app/Http/Requests/Asset/ app/Http/Controllers/Asset/ tests/Feature/Asset/
  git commit -m "feat(asset): add create, update, delete with history and audit"
  ```

---

### Task 3: Assign / Release Service (Invariant D-09)

**Files:**
- Create: `app/DTOs/Asset/AssignAssetData.php`
- Create: `app/Services/Asset/AssetAssignmentService.php`
- Create: `app/Http/Requests/Asset/AssignAssetRequest.php`
- Create: `app/Http/Requests/Asset/ReleaseAssetRequest.php`
- Create: `tests/Feature/Asset/AssetAssignmentTest.php`

**Detail:**
API-CONTRACT §7.3 (baris 496–510):

**Assign** — `POST /api/assets/{id}/assign`:
- Ditolak **422** jika status asset `maintenance`, `retired`, `lost` (Addendum §1.3 poin 2)
- Ditolak **409** jika asset masih punya assignment aktif (API-CONTRACT:502)
- Efek: buat `asset_assignments` (assigned_at = now, released_at null), status asset → `assigned`, catat `asset_histories` + audit
- Validasi `user_id` target: user harus ada dan berstatus `active`

**Release** — `POST /api/assets/{id}/release`:
- Ditolak **409** jika tidak ada assignment aktif
- Efek: isi `released_at`, status asset → `available`, catat history + audit

```php
public function assign(Asset $asset, AssignAssetData $data, User $actor): Asset
{
    return DB::transaction(function () use ($asset, $data, $actor): Asset {
        // Lock baris asset (D-09) untuk mencegah race condition
        /** @var Asset $locked */
        $locked = Asset::whereKey($asset->getKey())->lockForUpdate()->first();

        // 1. Status tidak layak → 422
        if (in_array($locked->status?->value, ['maintenance', 'retired', 'lost'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Aset berstatus '.$locked->status?->value.' tidak dapat ditugaskan.'],
            ]);
        }

        // 2. Sudah punya assignment aktif → 409
        if ($locked->activeAssignment()->exists()) {
            throw new StateConflictException('Aset masih memiliki pemegang aktif.');
        }

        // 3. Validasi target
        $user = User::where('id', $data->userId)->where('status', 'active')->first();
        if (! $user) {
            throw ValidationException::withMessages([
                'user_id' => ['Pegawai yang dipilih tidak valid atau tidak aktif.'],
            ]);
        }

        // 4. Buat assignment + update status + history + audit
        AssetAssignment::create([
            'asset_id' => $locked->id,
            'user_id' => $user->id,
            'assigned_at' => now(),
            'released_at' => null,
            'notes' => $data->notes,
        ]);

        $locked->update(['status' => AssetStatus::Assigned]);

        $this->recordHistory($locked, AssetHistoryAction::Assigned,
            "Aset ditugaskan kepada {$user->full_name}.");
        $this->auditLogger->log($actor, AuditAction::Assign, AuditModule::Asset, $locked->id,
            "Aset {$locked->asset_tag} ditugaskan kepada {$user->full_name}.");

        return $locked->fresh();
    });
}

public function release(Asset $asset, ReleaseAssetData $data, User $actor): Asset
{
    return DB::transaction(function () use ($asset, $data, $actor): Asset {
        $locked = Asset::whereKey($asset->getKey())->lockForUpdate()->first();

        $assignment = $locked->activeAssignment()->first();
        if (! $assignment) {
            throw new StateConflictException('Aset tidak memiliki pemegang aktif.');
        }

        $assignment->update(['released_at' => now()]);
        $locked->update(['status' => AssetStatus::Available]);

        $this->recordHistory($locked, AssetHistoryAction::Released,
            'Aset dilepaskan dari pemegang aktif.');
        $this->auditLogger->log($actor, AuditAction::Release, AuditModule::Asset, $locked->id,
            "Aset {$locked->asset_tag} dilepaskan.");

        return $locked->fresh();
    });
}
```

> **Jebakan 1:** Jangan lupa `lockForUpdate()` — tanpa itu dua request assign bersamaan bisa membuat dua assignment aktif (invariant D-09 rusak).
> **Jebakan 2:** 409 vs 422: `StateConflictException` → 409, `ValidationException` → 422. Jangan tertukar.

- [ ] **Step 1: Test — assign maintenance → 422, assign already-assigned → 409.**
  ```php
  test('cannot assign maintenance asset', function () {
      $asset = Asset::factory()->maintenance()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/assets/{$asset->id}/assign", ['user_id' => 1])->assertStatus(422);
  });

  test('cannot assign asset with active assignment', function () {
      $asset = Asset::factory()->assigned()->create();
      AssetAssignment::factory()->create(['asset_id' => $asset->id, 'released_at' => null]);
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/assets/{$asset->id}/assign", ['user_id' => 2])->assertStatus(409);
  });
  ```

- [ ] **Step 2: Test — assign success mengubah status + membuat history.**
  ```php
  test('assign marks asset assigned and records history', function () {
      $manager = User::factory()->manager()->create();
      $employee = User::factory()->employee()->create();
      $asset = Asset::factory()->available()->create();
      Sanctum::actingAs($manager);
      $this->postJson("/api/assets/{$asset->id}/assign", ['user_id' => $employee->id])
          ->assertStatus(200)
          ->assertJsonPath('data.status', 'assigned');
      expect(AssetHistory::where('asset_id', $asset->id)->where('action', 'assigned')->count())->toBe(1);
      expect(AssetAssignment::where('asset_id', $asset->id)->whereNull('released_at')->count())->toBe(1);
  });
  ```

- [ ] **Step 3: Test — release mengubah status kembali + release tanpa assignment → 409.**
  ```php
  test('release returns asset to available', function () {
      $asset = Asset::factory()->assigned()->create();
      AssetAssignment::factory()->create(['asset_id' => $asset->id, 'released_at' => null]);
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/assets/{$asset->id}/release", ['notes' => 'Dikembalikan'])
          ->assertStatus(200)
          ->assertJsonPath('data.status', 'available');
  });

  test('release without active assignment returns 409', function () {
      $asset = Asset::factory()->available()->create();
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/assets/{$asset->id}/release", [])->assertStatus(409);
  });
  ```

- [ ] **Step 4: Implementasi** — DTO, service, request, controller.

- [ ] **Step 5: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Asset/AssetAssignmentTest.php
  vendor/bin/pint --dirty --format agent
  git add app/DTOs/Asset/ app/Services/Asset/ app/Http/Requests/Asset/ app/Http/Controllers/Asset/ tests/Feature/Asset/
  git commit -m "feat(asset): add assign and release with row locking and integrity rules"
  ```

---

### Task 4: Resource & Detail Asset

**Files:**
- Create: `app/Http/Resources/Asset/AssetListResource.php`
- Create: `app/Http/Resources/Asset/AssetResource.php`
- Modify: `app/Http/Controllers/Asset/AssetController.php` (tambah `index`, `store`, `show`, `update`, `destroy`)
- Create: `tests/Feature/Asset/AssetShowTest.php`

**Detail:**
**`AssetListResource`** — item ringkas:
```php
return [
    'id' => $this->id,
    'asset_tag' => $this->asset_tag,
    'name' => $this->name,
    'category' => $this->category,
    'status' => $this->status?->value,
    'purchase_date' => $this->purchase_date?->format('Y-m-d'),
    'current_assignment' => $this->whenLoaded('activeAssignment.user', fn () => [
        'user_id' => $this->activeAssignment->user->id,
        'full_name' => $this->activeAssignment->user->full_name,
    ]),
    'created_at' => $this->created_at,
];
```

**`AssetResource`** (detail, API-CONTRACT §7.2 baris 451–468) — menambahkan `brand`, `model`, `serial_number`, `notes`, dan `current_assignment` lengkap.

- [ ] **Step 1: Test — show asset detail.**
  ```php
  test('manager can view asset detail', function () {
      $asset = Asset::factory()->create();
      $employee = User::factory()->employee()->create();
      AssetAssignment::factory()->create(['asset_id' => $asset->id, 'user_id' => $employee->id, 'released_at' => null]);
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->getJson("/api/assets/{$asset->id}")
          ->assertStatus(200)
          ->assertJsonPath('data.asset_tag', $asset->asset_tag)
          ->assertJsonStructure(['data' => ['current_assignment' => ['user_id', 'full_name']]]);
  });
  ```

- [ ] **Step 2: Implementasi** — resource + controller.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Asset/AssetShowTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Resources/Asset/ app/Http/Controllers/Asset/ tests/Feature/Asset/
  git commit -m "feat(asset): add list and detail resources with current assignment"
  ```

---

### Task 5: `GET /api/assets/{id}/history` — Timeline Gabungan

**Files:**
- Create: `app/Http/Controllers/Asset/AssetHistoryController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/Asset/AssetHistoryTest.php`

**Detail:**
API-CONTRACT §7.4 (baris 512–514): gabungan `asset_assignments` + `asset_histories`, urut waktu, untuk merender riwayat kepemilikan (§17 PRD).

Kembalikan **satu array** item terurut waktu (`type` = `assignment` | `history`):

```php
public function __invoke(Asset $asset, Request $request): JsonResponse
{
    $this->authorize('viewHistory', $asset);

    $assignments = $asset->assignments()->with('user')->get()
        ->map(fn ($a) => [
            'type' => 'assignment',
            'action' => $a->released_at ? 'released' : 'assigned',
            'user' => $a->user ? ['id' => $a->user->id, 'full_name' => $a->user->full_name] : null,
            'notes' => $a->notes,
            'occurred_at' => $a->released_at ?? $a->assigned_at,
        ]);

    $histories = $asset->histories()->get()->map(fn ($h) => [
        'type' => 'history',
        'action' => $h->action,
        'description' => $h->description,
        'user' => null,
        'occurred_at' => $h->action_at ?? $h->created_at,
    ]);

    $timeline = $assignments->concat($histories)
        ->sortBy('occurred_at')
        ->values();

    return ApiResponse::success($timeline, 'Asset history retrieved.');
}
```

- [ ] **Step 1: Test — history menggabungkan assignment & history.**
  ```php
  test('asset history merges assignments and history', function () {
      $asset = Asset::factory()->create();
      AssetAssignment::factory()->create(['asset_id' => $asset->id, 'released_at' => null]);
      AssetHistory::factory()->create(['asset_id' => $asset->id, 'action' => 'created']);
      Sanctum::actingAs(User::factory()->manager()->create());
      $response = $this->getJson("/api/assets/{$asset->id}/history")->assertStatus(200);
      expect(collect($response->json('data'))->pluck('type')->values()->all())
          ->toContain('assignment', 'history');
  });
  ```

- [ ] **Step 2: Implementasi** — controller + route (`GET /api/assets/{asset}/history`).

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Asset/AssetHistoryTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Controllers/Asset/ routes/api.php tests/Feature/Asset/
  git commit -m "feat(asset): add merged assignment and history timeline endpoint"
  ```

---

### Task 6: `GET /api/my-assets`

**Files:**
- Modify: `app/Http/Controllers/Asset/AssetController.php` (tambah `myAssets`)
- Modify: `routes/api.php`
- Create: `tests/Feature/Asset/MyAssetsTest.php`

**Detail:**
API-CONTRACT §7.2 (baris 474–476): asset yang sedang dipegang user login (US-004), untuk Employee. Scoping **selalu** ke user login (PERMISSION §3.4 `viewOwn`).

```php
public function myAssets(Request $request): JsonResponse
{
    $this->authorize('viewOwn', Asset::class);

    $paginator = Asset::query()
        ->with(['activeAssignment'])
        ->whereHas('activeAssignment', fn ($q) => $q->where('user_id', $request->user()->id))
        ->paginate($this->getPerPage($request));

    return ApiResponse::paginated($paginator, 'My assets retrieved.', AssetListResource::class);
}
```

> **Jebakan:** `viewOwn` dibatasi ke asset milik pemanggil — tidak ada parameter yang bisa mengubah cakupan ini. Jangan tambahkan query param `user_id`.

- [ ] **Step 1: Test — employee hanya melihat asset miliknya.**
  ```php
  test('employee sees only own assets', function () {
      $employee = User::factory()->employee()->create();
      $other = User::factory()->employee()->create();
      AssetAssignment::factory()->create(['user_id' => $employee->id, 'released_at' => null]);
      AssetAssignment::factory()->create(['user_id' => $other->id, 'released_at' => null]);
      Sanctum::actingAs($employee);
      $this->getJson('/api/my-assets')->assertStatus(200)->assertJsonCount(1, 'data');
  });
  ```

- [ ] **Step 2: Implementasi** — controller + route (`GET /api/my-assets`).

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Asset/MyAssetsTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Controllers/Asset/ routes/api.php tests/Feature/Asset/
  git commit -m "feat(asset): add my-assets endpoint scoped to the current user"
  ```

---

### Task 7: Route Lengkap Asset + Verifikasi

**Files:**
- Modify: `routes/api.php`

**Detail:**
Daftarkan seluruh route asset. **Urutan penting:** route literal (`assignable`, `my-assets`) harus dideklarasikan **sebelum** `apiResource` (`/{id}`), atau `{id}` akan menangkap `assignable`/`my-assets`.

```php
Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
    Route::get('/assets/assignable', [AssetController::class, 'assignable'])->name('asset.assignable');
    Route::get('/my-assets', [AssetController::class, 'myAssets'])->name('asset.my-assets');
    Route::get('/assets/{asset}/history', AssetHistoryController::class)->name('asset.history');

    Route::apiResource('assets', AssetController::class);
});
```

> **Jebakan:** `Route::apiResource` otomatis menghasilkan `GET /assets/{asset}`, `POST /assets`, `PUT /assets/{asset}`, `DELETE /assets/{asset}`. Jangan daftar ulang route `GET /assets/assignable` **setelah** apiResource.

- [ ] **Step 1: Uji seluruh route terdaftar & otorisasi.**
  ```bash
  php artisan route:list --path=api
  vendor/bin/pest tests/Feature/Asset/
  ```

- [ ] **Step 2: Verifikasi N+1 pada list & detail.**
  ```bash
  # Mengandalkan test DB::listen yang ditulis di Task 1
  vendor/bin/pest tests/Feature/Asset/AssetListTest.php
  ```

- [ ] **Step 3: Formatting & commit.**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add routes/api.php
  git commit -m "feat(asset): register full asset route set"
  ```

---

## Exit Criteria 5b

- [ ] `GET /api/assets` — T/M/A; search 3 field; filter status/category/assigned_user_id; sort whitelist; pagination 6-key.
- [ ] `POST /api/assets` (201), `GET /api/assets/{id}`, `PUT /api/assets/{id}`, `DELETE /api/assets/{id}` (soft delete).
- [ ] Technician tidak bisa `delete` (403); Manager/Admin bisa.
- [ ] Assign: 422 utk maintenance/retired/lost; 409 utk assignment aktif; 200 + status `assigned` + history + audit.
- [ ] Release: 409 tanpa assignment aktif; 200 + status `available` + history + audit.
- [ ] Invariant satu-assignment-aktif terjaga dengan `lockForUpdate()` (D-09).
- [ ] `GET /api/assets/{id}/history` — timeline gabungan assignment + history.
- [ ] `GET /api/my-assets` — hanya asset milik user login.
- [ ] Soft delete asset → ticket lama tetap utuh (BR-015).
- [ ] Tidak ada N+1 pada list & detail.
- [ ] Route literal (`assignable`, `my-assets`) terdaftar sebelum `{id}`.
- [ ] `php artisan test` hijau, `pint --test` bersih.
- [ ] Route baru terdaftar di `docs/product/PERMISSION-MATRIX.md §4` (baris `GET /api/assets/{id}/history`, `GET /api/my-assets` jika belum ada).