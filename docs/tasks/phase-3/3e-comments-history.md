# Fase 3e — Komentar, History, Golden Path (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.

**Goal:** Membangun komentar ticket (CRUD dengan jendela 15 menit), history timeline, dan menutup
fase dengan `GoldenPathTest` end-to-end serta sinkronisasi ROADMAP.

**Spec:** `API-CONTRACT.md §6`; `PERMISSION-MATRIX.md §3.2b`; `DECISIONS.md D-20, D-27`; `PRD.md §31, §38`.

**Prasyarat:** 3d selesai (semua transisi + `available_actions`). Catatan: `note` pada transisi sudah
ditulis sebagai komentar oleh `TicketStatusService` sejak 3d — endpoint di sini mengelola komentar
mandiri yang dibuat user langsung.

---

### Task 1: TicketCommentService + Endpoint

**Files:**
- Create: `app/DTOs/Ticket/CreateCommentData.php`
- Create: `app/DTOs/Ticket/UpdateCommentData.php`
- Create: `app/Http/Requests/Ticket/StoreCommentRequest.php`
- Create: `app/Http/Requests/Ticket/UpdateCommentRequest.php`
- Create: `app/Services/Ticket/TicketCommentService.php`
- Create: `app/Http/Controllers/Ticket/TicketCommentController.php`
- Create: `app/Http/Resources/Ticket/TicketCommentResource.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/Ticket/CommentTest.php`

**Interfaces:**
- `TicketCommentService::create(Ticket $ticket, CreateCommentData $data, User $actor): TicketComment`
- `TicketCommentService::update(TicketComment $comment, UpdateCommentData $data, User $actor): TicketComment`
- `TicketCommentService::delete(TicketComment $comment, User $actor): void` — soft delete
- `TicketCommentService::paginate(Ticket $ticket): LengthAwarePaginator` — urut `created_at` naik
- `TicketCommentResource::toArray()` — bentuk komentar

- [ ] **Step 1: Test — POST komentar**
  ```php
  test('participant can comment', function () {
      $reporter = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
      Sanctum::actingAs($reporter);
      $this->postJson("/api/tickets/{$ticket->id}/comments", ['body' => 'Sudah dicek.'])
           ->assertStatus(201)
           ->assertJsonPath('data.body', 'Sudah dicek.');
  });
  test('non-participant cannot comment', function () {
      // Employee lain → 404 (bukan ticket-nya)
      // Technician yang bukan pemegang → 403
  });
  test('comment on CLOSED ticket is rejected', function () {
      $ticket = Ticket::factory()->closed()->create(['reporter_id' => $reporter->id]);
      Sanctum::actingAs($reporter);
      $this->postJson("/api/tickets/{$ticket->id}/comments", ['body' => 'x'])
           ->assertStatus(403); // available_actions.comment = status bukan CLOSED
  });
  ```

- [ ] **Step 2: Test — komentar paginated urut naik**
  ```php
  test('comments are paginated in ascending order', function () {
      // create 15 komentar, GET ?per_page=10
      // meta.total = 15, data[0].created_at < data[9].created_at
  });
  ```

- [ ] **Step 3: Test — notifikasi komentar ke partisipan lain**
  ```php
  test('comment notifies other participants but not actor', function () {
      // reporter + technician assigned + manager
      // reporter comment → technician + manager dapat notif, reporter tidak
      // assertion: Notification::count() = 2, tidak ada notif untuk reporter
  });
  ```

- [ ] **Step 4: Test — update komentar**
  ```php
  test('author can update comment within 15 minutes', function () { ... });
  test('author cannot update after 15 minutes', function () {
      // manipulate created_at via DB to 16 minutes ago
  });
  test('admin can update any comment', function () { ... });
  test('non-author cannot update', function () {
      // employee lain → 403
  });
  ```

- [ ] **Step 5: Test — delete komentar**
  ```php
  test('author can delete comment within 15 minutes', function () { ... });
  test('admin can delete any comment', function () { ... });
  test('comment is soft-deleted', function () {
      // DELETE → TicketComment::withTrashed()->find(id) masih ada, deleted_at terisi
  });
  ```

- [ ] **Step 6: Implementasi `TicketCommentService`**
  ```php
  public function create(Ticket $ticket, CreateCommentData $data, User $actor): TicketComment
  {
      return DB::transaction(function () use ($ticket, $data, $actor): TicketComment {
          $comment = TicketComment::create([
              'ticket_id' => $ticket->id,
              'user_id' => $actor->id,
              'body' => $data->body,
          ]);

          $this->auditLogger->log($actor, AuditAction::Create, AuditModule::Ticket,
              $ticket->id, "Komentar ditambahkan pada Ticket #{$ticket->ticket_number}.");

          // Notifikasi ke partisipan lain (D-27: TICKET_COMMENTED)
          $participants = collect([$ticket->reporter_id, $ticket->technician_id])
              ->filter()->unique()->reject(fn ($id) => $id === $actor->id);
          $this->notificationService->notifyMany(User::whereIn('id', $participants)->get(),
              NotificationType::TicketCommented, $this->notificationData($ticket, $actor, 'menambahkan komentar'));

          return $comment;
      });
  }
  ```

- [ ] **Step 7: Implementasi `TicketCommentController`**
  ```php
  public function index(Request $request, Ticket $ticket): JsonResponse
  {
      $this->authorize('view', $ticket);
      $paginator = $this->commentService->paginate($ticket);
      return ApiResponse::paginated($paginator, 'Comments retrieved successfully.', TicketCommentResource::class);
  }

  public function store(StoreCommentRequest $request, Ticket $ticket): JsonResponse
  {
      $this->authorize('comment', $ticket);
      $comment = $this->commentService->create($ticket, CreateCommentData::fromArray($request->validated()), $request->user());
      return ApiResponse::success(new TicketCommentResource($comment), 'Comment created successfully.', 201);
  }

  public function update(UpdateCommentRequest $request, Ticket $ticket, TicketComment $comment): JsonResponse
  {
      $this->authorize('update', $comment);
      $comment = $this->commentService->update($comment, UpdateCommentData::fromArray($request->validated()), $request->user());
      return ApiResponse::success(new TicketCommentResource($comment), 'Comment updated successfully.');
  }

  public function destroy(Ticket $ticket, TicketComment $comment): JsonResponse
  {
      $this->authorize('delete', $comment);
      $this->commentService->delete($comment, $request->user());
      return ApiResponse::success(null, 'Comment deleted successfully.');
  }
  ```
  Route binding scoping: pastikan `$comment->ticket_id === $ticket->id` (kalau tidak, 404).
  Tambahkan di controller atau gunakan `->where()` di route + validasi manual.

- [ ] **Step 8: Routes**
  ```php
  Route::get('/tickets/{ticket}/comments', [TicketCommentController::class, 'index'])->name('tickets.comments.index');
  Route::post('/tickets/{ticket}/comments', [TicketCommentController::class, 'store'])->name('tickets.comments.store');
  Route::put('/tickets/{ticket}/comments/{comment}', [TicketCommentController::class, 'update'])->name('tickets.comments.update');
  Route::delete('/tickets/{ticket}/comments/{comment}', [TicketCommentController::class, 'destroy'])->name('tickets.comments.destroy');
  ```

- [ ] **Step 9: Verifikasi & Commit.**

---

### Task 2: History Timeline Endpoint

**Files:**
- Create: `app/Http/Controllers/Ticket/TicketHistoryController.php`
- Create: `app/Http/Resources/Ticket/TicketHistoryResource.php`
- Modify: `app/Services/Ticket/TicketService.php` (tambah `histories`)
- Modify: `routes/api.php`
- Create: `tests/Feature/Ticket/HistoryTest.php`

- [ ] **Step 1: Test — histories timeline**
  ```php
  test('history shows readable values and ascending order', function () {
      // create ticket, then transition through statuses
      // GET /api/tickets/{id}/histories
      // → data[0].field_changed = 'status_id', new_value = 'OPEN'
      // → urut created_at naik
      // → shape: id, field_changed, old_value, new_value, user{id, full_name}, created_at
  });
  test('history values are names not ids', function () {
      // old_value/new_value = 'OPEN'/'ASSIGNED' (bukan 1/2)
  });
  test('non-participant cannot view history', function () {
      // employee asing → 404
  });
  ```

- [ ] **Step 2: Implementasi `TicketHistoryController`**
  ```php
  public function index(Request $request, Ticket $ticket): JsonResponse
  {
      $this->authorize('viewHistory', $ticket);
      $histories = $ticket->histories()
          ->with('user:id,full_name')
          ->orderBy('created_at', 'asc')
          ->get();
      return ApiResponse::success(TicketHistoryResource::collection($histories), 'Histories retrieved successfully.');
  }
  ```

- [ ] **Step 3: Routes**
  ```php
  Route::get('/tickets/{ticket}/histories', [TicketHistoryController::class, 'index'])->name('tickets.histories');
  ```

- [ ] **Step 4: Verifikasi & Commit.**

---

### Task 3: GoldenPathTest End-to-End

**Files:**
- Create: `tests/Feature/Ticket/GoldenPathTest.php`

- [ ] **Step 1: Test — golden path §38 PRD penuh lewat HTTP**
  ```php
  test('golden path completes end to end over HTTP', function () {
      // 1. Login Employee → buat ticket → 201, status OPEN
      // 2. Login Manager → assign technician → 200, status ASSIGNED
      // 3. Login Technician → start → 200, status IN_PROGRESS
      // 4. Technician tambah komentar → 201
      // 5. Technician resolve → 200, status RESOLVED, resolved_at terisi
      // 6. Login Employee → close → 200, status CLOSED, closed_at terisi
  });
  ```

- [ ] **Step 2: Verifikasi — jalankan seluruh test suite Fase 3, `php artisan test` hijau.**

- [ ] **Step 3: Commit.**

---

### Task 4: Sinkronisasi Dokumen

**Files:**
- Modify: `docs/product/ROADMAP.md` (centang checkbox Fase 3)
- Modify: `docs/product/PERMISSION-MATRIX.md` (verifikasi §4 sudah lengkap)
- Modify: `docs/product/STATUS-TRANSITION.md` (verifikasi checklist §10)
- Create: `docs/tasks/phase-3/CLOSED.md` (ringkasan apa yang dikerjakan, penyimpangan, catatan)

- [ ] **Step 1: Centang checkbox yang sudah selesai di ROADMAP Fase 3, tandai yang berubah.**

- [ ] **Step 2: Pastikan PERMISSION-MATRIX §4 memuat semua route Fase 3.**

- [ ] **Step 3: Tulis `CLOSED.md` — ringkasan, keputusan yang diambil, hal yang diserahkan ke Fase 4/5.**

- [ ] **Step 4: Verifikasi seluruh exit criteria Fase 3 dari README, pastikan tercatat.**

- [ ] **Step 5: Commit.**

---

## Exit Criteria 3e (dan penutup Fase 3)

- [ ] Komentar: create/update/delete, jendela 15 menit, Admin kapan saja, partisipan saja
- [ ] Komentar paginated urut naik, notifikasi ke partisipan lain (bukan aktor)
- [ ] History: readable values, urut naik, append-only
- [ ] `GoldenPathTest` end-to-end lulus
- [ ] Seluruh checklist `STATUS-TRANSITION.md §10` + konkurensi hijau
- [ ] Seluruh BR-001..015 punya test
- [ ] Tidak ada N+1 pada list & detail
- [ ] `php artisan test` seluruhnya hijau, `pint --test` bersih
- [ ] `migrate:fresh --seed` + `rollback` bersih terhadap MySQL
- [ ] ROADMAP Fase 3 tersinkronisasi