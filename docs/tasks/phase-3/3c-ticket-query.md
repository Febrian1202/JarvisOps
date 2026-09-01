# Fase 3c — Ticket Query, Search, Filter, Referensi (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.

**Goal:** Membangun `GET /api/tickets` dengan scoping role, 11 filter, search LIKE, whitelist sort,
dan 4 endpoint referensi read-only. Tidak ada N+1.

**Spec:** `API-CONTRACT.md §4, §6`; `PERMISSION-MATRIX.md §3.2, §7`; `PRD.md §24–25`; `D-10`.

**Prasyarat:** 3b selesai (`TicketService::create`, `TicketResource`, `TicketListResource`).

---

### Task 1: IndexTicketRequest + Scoping

**Files:**
- Create: `app/Http/Requests/Ticket/IndexTicketRequest.php`
- Modify: `app/Services/Ticket/TicketService.php` (tambah `paginate`)
- Create: `tests/Feature/Ticket/ListTicketTest.php`

**Interfaces:**
- `IndexTicketRequest::rules()` — validasi semua filter opsional
- `TicketService::paginate(IndexTicketRequest $request, User $actor): LengthAwarePaginator` —
  kembalikan paginator dengan eager load penuh, scoping, filter, sort, search

- [ ] **Step 1: Test — Employee hanya melihat ticket miliknya (PERMISSION-MATRIX §7.2)**
  ```php
  test('employee sees only own tickets', function () {
      $employee = User::factory()->employee()->create();
      Ticket::factory()->open()->count(3)->create(['reporter_id' => $employee->id]);
      Ticket::factory()->open()->count(5)->create(); // milik orang lain
      Sanctum::actingAs($employee);
      $this->getJson('/api/tickets')->assertJsonPath('meta.total', 3);
  });
  ```

- [ ] **Step 2: Test — filter tidak memperluas cakupan (PERMISSION-MATRIX §7.3)**
  ```php
  test('employee filter by reporter_id is ignored', function () {
      $employee = User::factory()->employee()->create();
      $other = User::factory()->employee()->create();
      Ticket::factory()->open()->create(['reporter_id' => $other->id]);
      Sanctum::actingAs($employee);
      // ?reporter_id=other_id — tetap hanya ticket milik $employee
      $this->getJson('/api/tickets?reporter_id='.$other->id)->assertJsonPath('meta.total', 0);
  });
  ```

- [ ] **Step 3: Test — filter SLA status**
  ```php
  test('filter by sla_status breached', function () {
      Ticket::factory()->breached()->count(2)->create(['reporter_id' => $employee->id]);
      Ticket::factory()->open()->count(3)->create(['reporter_id' => $employee->id]);
      Sanctum::actingAs($employee);
      $this->getJson('/api/tickets?sla_status=breached')->assertJsonPath('meta.total', 2);
  });
  ```

- [ ] **Step 4: Test — search by ticket_number dan title (D-10)**
  ```php
  test('search matches ticket_number and title', function () {
      Ticket::factory()->open()->create(['ticket_number' => 'TCK-9999', 'reporter_id' => $employee->id]);
      Ticket::factory()->open()->create(['title' => 'Laptop rusak', 'reporter_id' => $employee->id]);
      Sanctum::actingAs($employee);
      $this->getJson('/api/tickets?search=9999')->assertJsonPath('meta.total', 1);
      $this->getJson('/api/tickets?search=Laptop')->assertJsonPath('meta.total', 1);
  });
  test('search sanitizes wildcards', function () {
      // search dengan % tidak boleh trigger LIKE tanpa filter
  });
  ```

- [ ] **Step 5: Test — sort_by whitelist**
  ```php
  test('invalid sort_by returns 422', function () {
      Sanctum::actingAs($employee);
      $this->getJson('/api/tickets?sort_by=password')->assertStatus(422);
  });
  ```

- [ ] **Step 6: Test — pagination metadata**
  ```php
  test('meta has exactly six keys and no links', function () {
      Sanctum::actingAs($employee);
      $response = $this->getJson('/api/tickets?per_page=5');
      $response->assertJsonStructure(['meta' => ['current_page', 'per_page', 'total', 'last_page', 'from', 'to']]);
      expect($response->json('meta'))->not->toHaveKey('links');
  });
  test('per_page is capped at 100', function () {
      Sanctum::actingAs($employee);
      $this->getJson('/api/tickets?per_page=500')->assertJsonPath('meta.per_page', 100);
  });
  ```

- [ ] **Step 7: Test — tidak ada N+1**
  ```php
  test('list query count does not increase with more tickets', function () {
      DB::listen(fn ($q) => $queries[] = $q);
      Sanctum::actingAs(User::factory()->admin()->create());

      // 1 ticket
      Ticket::factory()->open()->create();
      $this->getJson('/api/tickets');
      $count1 = count($queries);

      // 10 tickets
      Ticket::factory()->open()->count(9)->create();
      $this->getJson('/api/tickets');
      $count2 = count($queries);

      // Perbedaan hanya karena insert queries, bukan karena N+1 reads
      // Gunakan pendekatan: assert bahwa jumlah query pada endpoint list tidak bertambah
      // secara signifikan antara 1 vs 10 ticket
  });
  ```
  Alternatif: buat test yang menegaskan total query list tidak melebihi batas absolut
  (misal 4 + n_eager_loads). Pakai `DB::enableQueryLog()` dan `assertLessThan(10, count($queries))`.

- [ ] **Step 8: Implementasi `TicketService::paginate`**
  ```php
  public function paginate(IndexTicketRequest $request, User $actor): LengthAwarePaginator
  {
      $query = Ticket::with(['status', 'priority', 'category', 'reporter', 'technician']);

      // Scoping: Employee hanya ticket miliknya (PERMISSION-MATRIX §7.2)
      if (! $actor->isAdmin() && ! $actor->hasRole(RoleName::Manager, RoleName::Technician)) {
          $query->where('reporter_id', $actor->id);
      }

      // Filter diterapkan SETELAH scoping (PERMISSION-MATRIX §7.3)
      if ($search = $request->validated('search')) {
          $sanitized = str_replace(['%', '_'], ['\\%', '\\_'], $search);
          $query->where(function ($q) use ($sanitized) {
              $q->where('ticket_number', 'LIKE', "%{$sanitized}%")
                ->orWhere('title', 'LIKE', "%{$sanitized}%");
          });
      }

      // Filter status_id, priority_id, category_id, technician_id, reporter_id, department_id, asset_id
      // Filter sla_status, created_from, created_to
      // (Detail implementasi di task)

      return $query->paginate($this->getPerPage($request));
  }
  ```

- [ ] **Step 9: Verifikasi & Commit.**

---

### Task 2: Endpoint Referensi

**Files:**
- Create: `app/Http/Controllers/ReferenceController.php` (atau controller per entitas)
- Modify: `routes/api.php`

- [ ] **Step 1: Test — setiap endpoint referensi mengembalikan data yang benar**
  ```php
  test('ticket categories list returns all 22 categories', function () {
      Sanctum::actingAs($employee);
      $this->getJson('/api/ticket-categories')
          ->assertStatus(200)
          ->assertJsonCount(22, 'data');
  });
  test('technicians list returns only active technicians', function () {
      // manager login, GET /api/technicians → hanya user dengan role technician, active
  });
  test('ticket statuses list is GET-only', function () {
      // POST /api/ticket-statuses → 404 atau 405 — tapi pastikan tidak ada route
  });
  ```

- [ ] **Step 2: Implementasi**
  ```php
  Route::middleware(['auth:sanctum'])->group(function () {
      Route::get('/ticket-categories', [ReferenceController::class, 'categories'])->name('ticket-categories.index');
      Route::get('/ticket-priorities', [ReferenceController::class, 'priorities'])->name('ticket-priorities.index');
      Route::get('/ticket-statuses', [ReferenceController::class, 'statuses'])->name('ticket-statuses.index');
      Route::get('/technicians', [ReferenceController::class, 'technicians'])->name('technicians.index');
  });
  ```
  `ReferenceController::technicians`:
  ```php
  public function technicians(): JsonResponse
  {
      $this->authorize('technician.list');
      $users = User::where('role_id', RoleName::Technician->id())
          ->where('status', UserStatus::Active->value)
          ->get(['id', 'full_name']);
      return ApiResponse::success($users, 'Technicians retrieved.');
  }
  ```
  Gunakan `RoleName::Technician->id()` — method id() enum perlu ditambahkan untuk RoleName.
  Atau: `Role::where('name', RoleName::Technician->value)->first()->id`.

- [ ] **Step 3: Verifikasi & Commit.**

---

## Exit Criteria 3c

- [ ] `GET /api/tickets` — Employee hanya ticket sendiri, Manager/Technician/Admin semua
- [ ] 11 filter berfungsi, filter tidak memperluas cakupan
- [ ] `search` mencocokkan `ticket_number` dan `title`, wildcard disanitasi
- [ ] `sort_by` whitelist 6 kolom, invalid → 422
- [ ] `sla_status` filter `breached`/`on_track` (defensif)
- [ ] 4 endpoint referensi — data benar, Technician hanya menampilkan yang active
- [ ] Tidak ada N+1 pada list
- [ ] `php artisan test` hijau, `pint --test` bersih