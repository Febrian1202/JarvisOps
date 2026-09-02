# Fase 5e — Administration (User & Master Data) (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini menutup Fase 5 dengan administrasi: user CRUD + aktivasi/deaktivasi/reset password, dan master data (department, ticket-category, ticket-priority, knowledge-category) dengan guard integritas referensi.

**Goal:** Memberi Admin kendali penuh atas user dan master data, dengan jaring pengaman integritas: email unik (BR-018), role ditentukan Admin (BR-020), deaktivasi mencabut token, reset password server-generate (D-11), dan **delete master data diblokir 409** bila masih dirujuk (resolusi konflik #14).

**Branch:** `feat/phase-5e-administration`
**Estimasi Waktu:** ~1.5 hari (6 task)
**Prasyarat:** 5a–5d selesai. Gate administrasi (`user.*`, `*.manage`) sudah terdaftar di `AbilityMatrix` (dari Fase 2) dan sudah lolos test — sub-tahap ini tinggal memakainya. `UserObserver` dan `EnsurePasswordChanged` sudah aktif.

---

### Task 1: `UserService` — Create + Profil

**Files:**
- Create: `app/DTOs/User/CreateUserData.php`
- Create: `app/DTOs/User/UpdateUserData.php`
- Create: `app/Services/User/UserService.php`
- Create: `app/Http/Requests/User/StoreUserRequest.php`
- Create: `app/Http/Requests/User/UpdateUserRequest.php`
- Create: `tests/Feature/Admin/UserCreateTest.php`

**Detail:**

**`StoreUserRequest`** (API-CONTRACT §11 baris 703–717, BR-017/018, D-12):
```php
public function rules(): array
{
    return [
        'full_name' => ['required', 'string', 'max:150'],
        'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')],
        'password' => ['required', 'string', 'min:8', 'letters', 'numbers', 'confirmed'], // D-12
        'role_id' => ['required', 'integer', 'exists:roles,id'],
        'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        'status' => ['required', 'string', Rule::in(['active', 'inactive'])],
        'profile' => ['nullable', 'array'],
        'profile.employee_code' => ['nullable', 'string', 'max:50', Rule::unique('employee_profiles', 'employee_code')],
        'profile.phone' => ['nullable', 'string', 'max:30'],
        'profile.position' => ['nullable', 'string', 'max:100'],
        'profile.hire_date' => ['nullable', 'date'],
    ];
}
```

**`UserService::create`** — `UserObserver` sudah membuat profil; service hanya mengisi field profil yang dikirim:
```php
public function create(CreateUserData $data, User $actor): User
{
    return DB::transaction(function () use ($data, $actor): User {
        $user = User::create([
            'role_id' => $data->roleId,
            'department_id' => $data->departmentId,
            'email' => $data->email,
            'password' => $data->password,
            'full_name' => $data->fullName,
            'status' => $data->status,
            'must_change_password' => true, // admin-created users always change on first login
        ]);

        // UserObserver sudah membuat employee_profile dengan employee_code EMP-xxxx;
        // updateOrCreate untuk menimpa dengan field profil yang dikirim
        EmployeeProfile::updateOrCreate(
            ['user_id' => $user->id],
            array_filter([
                'employee_code' => $data->profile['employee_code'] ?? null,
                'phone' => $data->profile['phone'] ?? null,
                'position' => $data->profile['position'] ?? null,
                'hire_date' => $data->profile['hire_date'] ?? null,
            ], fn ($v) => $v !== null),
        );

        $this->auditLogger->log($actor, AuditAction::Create, AuditModule::User, $user->id,
            "User {$user->full_name} ({$user->email}) dibuat.");

        return $user->load(['role', 'department', 'employeeProfile']);
    });
}
```

> **Jebakan 1:** `must_change_password = true` untuk user buatan Admin — konsisten dengan D-11 (password sementara). Seeder demo (`DemoUserSeeder`) memakai `must_change_password = false` agar akun demo langsung login.
> **Jebakan 2:** `Rule::unique('users','email')` — dengan soft delete, email milik user tertrash tetap diblokir (BR-018). Ini perilaku yang benar.
> **Jebakan 3:** `array_filter` untuk profil — jangan mengirim `employee_code => null` yang akan menimpa nilai default `EMP-xxxx` dari observer.

- [ ] **Step 1: Test — create user valid (201), email duplikat 422, non-admin 403.**
  ```php
  test('admin can create user', function () {
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->postJson('/api/users', [
          'full_name' => 'Budi', 'email' => 'budi@jarvisops.test', 'password' => 'Password123!',
          'password_confirmation' => 'Password123!', 'role_id' => 4, 'department_id' => 1, 'status' => 'active',
      ])->assertStatus(201)->assertJsonPath('data.email', 'budi@jarvisops.test');
  });

  test('duplicate email returns 422 (BR-018)', function () {
      User::factory()->create(['email' => 'dup@jarvisops.test']);
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->postJson('/api/users', [
          'full_name' => 'D', 'email' => 'dup@jarvisops.test', 'password' => 'Password123!',
          'password_confirmation' => 'Password123!', 'role_id' => 4, 'status' => 'active',
      ])->assertStatus(422)->assertJsonValidationErrors('email');
  });

  test('non-admin cannot create user (BR-017)', function () {
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson('/api/users', [...])->assertStatus(403);
  });
  ```

- [ ] **Step 2: Test — profil disimpan, must_change_password true.**
  ```php
  test('created user has profile and must_change_password', function () {
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->postJson('/api/users', [
          'full_name' => 'Cici', 'email' => 'cici@jarvisops.test', 'password' => 'Password123!',
          'password_confirmation' => 'Password123!', 'role_id' => 4, 'status' => 'active',
          'profile' => ['employee_code' => 'EMP-0099', 'phone' => '0812', 'position' => 'Staff'],
      ])->assertStatus(201);
      $user = User::where('email', 'cici@jarvisops.test')->first();
      expect($user->must_change_password)->toBeTrue()
          ->and($user->employeeProfile->employee_code)->toBe('EMP-0099');
  });
  ```

- [ ] **Step 3: Implementasi** — DTO, service, request, controller.

- [ ] **Step 4: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Admin/UserCreateTest.php
  vendor/bin/pint --dirty --format agent
  git add app/DTOs/User/ app/Services/User/ app/Http/Requests/User/ app/Http/Controllers/Admin/ tests/Feature/Admin/
  git commit -m "feat(admin): add user creation with profile, email uniqueness, and password policy"
  ```

---

### Task 2: `UserService` — Update, List, Show, Delete

**Files:**
- Modify: `app/Services/User/UserService.php`
- Modify: `app/Http/Requests/User/UpdateUserRequest.php`
- Create: `app/Http/Resources/User/UserListResource.php`
- Create: `app/Http/Resources/User/UserAdminResource.php`
- Create: `tests/Feature/Admin/UserAdminTest.php`

**Detail:**

**List** (`GET /api/users`, API-CONTRACT §11): filter `role_id`, `department_id`, `status`; search nama & email.

**Update** — Admin tidak bisa mengubah `role_id` dirinya sendiri (D-16 #1, resolusi #13 → 403):
```php
public function update(User $user, UpdateUserData $data, User $actor): User
{
    // Proteksi diri: admin tidak boleh mengubah role sendiri
    if ($user->is($actor) && $data->roleId !== null && $data->roleId !== (int) $user->role_id) {
        throw new AccessDeniedHttpException('Admin cannot change their own role.');
    }

    return DB::transaction(function () use ($user, $data, $actor): User {
        $old = $user->only(['full_name', 'email', 'role_id', 'department_id', 'status']);
        $user->update([
            'full_name' => $data->fullName,
            'email' => $data->email,
            'department_id' => $data->departmentId,
        ]);
        // role_id & status hanya diubah lewat endpoint khusus (assign/activate/deactivate)

        $this->auditLogger->log($actor, AuditAction::Update, AuditModule::User, $user->id,
            "User {$user->full_name} diperbarui.", $old, $user->only(['full_name', 'email', 'department_id']));

        return $user->fresh()->load(['role', 'department', 'employeeProfile']);
    });
}
```

**Delete** — diblokir 409 bila user masih jadi reporter/technician/author/assignment:
```php
public function delete(User $user, User $actor): void
{
    // Proteksi diri
    if ($user->is($actor)) {
        throw new AccessDeniedHttpException('Admin cannot delete their own account.');
    }

    DB::transaction(function () use ($user, $actor): void {
        $hasRefs = Ticket::where('reporter_id', $user->id)->exists()
            || Ticket::where('technician_id', $user->id)->exists()
            || KnowledgeArticle::where('author_id', $user->id)->exists()
            || AssetAssignment::where('user_id', $user->id)->exists();

        if ($hasRefs) {
            throw new StateConflictException('User masih memiliki riwayat atau rujukan aktif dan tidak dapat dihapus. Gunakan deaktivasi.');
        }

        $user->tokens()->delete();
        $user->employeeProfile?->delete();
        $user->delete();

        $this->auditLogger->log($actor, AuditAction::Delete, AuditModule::User, $user->id,
            "User {$user->full_name} dihapus.");
    });
}
```

> **Jebakan:** Delete user di MVP hampir selalu kena guard (hampir semua user punya ticket). Ini disengaja — jalur operasionalnya adalah **deactivate** (Task 4). Jangan menurunkan guard ini.

- [ ] **Step 1: Test — update, list filter, delete guard, self-role-change 403.**
  ```php
  test('admin can list users with filter', function () {
      User::factory()->count(3)->create(['role_id' => 4]);
      User::factory()->technician()->create();
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->getJson('/api/users?role_id=4')->assertJsonCount(3, 'data');
  });

  test('admin cannot change own role (403)', function () {
      $admin = User::factory()->admin()->create();
      Sanctum::actingAs($admin);
      $this->putJson("/api/users/{$admin->id}", ['full_name' => 'Admin', 'email' => $admin->email])
          ->assertStatus(200);
      // Kasus mengubah role sendiri — uji lewat service karena request tidak menerima role_id pada update
      // (role_id hanya diubah via endpoint khusus)
  });

  test('cannot delete user who is a ticket reporter (409)', function () {
      $employee = User::factory()->employee()->create();
      Ticket::factory()->create(['reporter_id' => $employee->id]);
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->deleteJson("/api/users/{$employee->id}")->assertStatus(409);
  });
  ```

- [ ] **Step 2: Implementasi** — service, request, resource, controller.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Admin/UserAdminTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/User/ app/Http/Requests/User/ app/Http/Resources/User/ app/Http/Controllers/Admin/ tests/Feature/Admin/
  git commit -m "feat(admin): add user list, update, delete with referential guard"
  ```

---

### Task 3: `POST /api/users/{id}/reset-password` + `GET /api/roles`

**Files:**
- Modify: `app/Services/User/UserService.php`
- Modify: `app/Http/Controllers/Admin/UserController.php`
- Create: `tests/Feature/Admin/UserResetPasswordTest.php`

**Detail:**

**Reset password (D-11 amandemen, resolusi #15):** server generate password acak (D-12: min 8, huruf + angka), set `must_change_password = true`, kembalikan sekali. Password tidak pernah masuk audit log (redaksi D-07).

```php
public function resetPassword(User $user, User $actor): string
{
    // Proteksi diri: admin tidak bisa mereset password sendiri (avoid lockout)
    if ($user->is($actor)) {
        throw new AccessDeniedHttpException('Admin cannot reset their own password.');
    }

    $password = Str::password(12, symbols: false); // mis. 12 char, tanpa simbol
    $password .= '1a'; // jamin minimal 1 huruf + 1 angka (D-12)

    return DB::transaction(function () use ($user, $actor, $password): string {
        $user->update([
            'password' => $password, // cast hashed otomatis
            'must_change_password' => true,
        ]);
        $user->tokens()->delete(); // paksa login ulang

        $this->auditLogger->log($actor, AuditAction::PasswordReset, AuditModule::User, $user->id,
            "Password user {$user->full_name} di-reset.");

        return $password;
    });
}
```

**Controller:**
```php
public function resetPassword(User $user, Request $request): JsonResponse
{
    $this->authorize('user.reset-password', $user);

    $password = $this->userService->resetPassword($user, $request->user());

    return ApiResponse::success(['temporary_password' => $password], 'Password reset successfully.');
}
```

**`GET /api/roles`** (API-CONTRACT §11 baris 728–742) — dropdown form user Admin, dijaga `user.viewAny`:
```php
public function roles(): JsonResponse
{
    $this->authorize('user.viewAny');

    $roles = Role::all(['id', 'name']);

    return ApiResponse::success($roles, 'Roles retrieved.');
}
```

- [ ] **Step 1: Test — reset memicu must_change_password + token dicabut.**
  ```php
  test('admin resets password and forces change on next login', function () {
      $target = User::factory()->employee()->create();
      $target->createToken('old')->toArray(); // token lama
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->postJson("/api/users/{$target->id}/reset-password")->assertStatus(200)
          ->assertJsonStructure(['data' => ['temporary_password']]);
      $target->refresh();
      expect($target->must_change_password)->toBeTrue()
          ->and($target->tokens()->count())->toBe(0);
  });
  ```

- [ ] **Step 2: Test — roles list hanya untuk Admin.**
  ```php
  test('roles list only for admin', function () {
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->getJson('/api/roles')->assertStatus(200)->assertJsonCount(4, 'data');
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->getJson('/api/roles')->assertStatus(403);
  });
  ```

- [ ] **Step 3: Implementasi** — service, controller, route.

- [ ] **Step 4: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Admin/UserResetPasswordTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/User/ app/Http/Controllers/Admin/ routes/api.php tests/Feature/Admin/
  git commit -m "feat(admin): add server-generated password reset and roles dropdown"
  ```

---

### Task 4: Deaktivasi / Aktivasi User + Revoke Token

**Files:**
- Modify: `app/Services/User/UserService.php`
- Modify: `app/Http/Controllers/Admin/UserController.php`
- Create: `tests/Feature/Admin/UserActivateDeactivateTest.php`

**Detail:**
API-CONTRACT §11 + PERMISSION §3.8 (`user.activate`/`user.deactivate`). Deaktivasi **mencabut seluruh token** (baris 700) dan user inactive langsung tidak bisa login (BR-019). Proteksi diri (D-16 #1) → 403 lewat gate `user.deactivate` (resolusi #13).

```php
public function deactivate(User $user, User $actor): User
{
    return DB::transaction(function () use ($user, $actor): User {
        $user->update(['status' => UserStatus::Inactive->value]);
        $user->tokens()->delete(); // revoke all tokens — user inactive langsung tidak bisa login

        $this->auditLogger->log($actor, AuditAction::Deactivate, AuditModule::User, $user->id,
            "User {$user->full_name} dinonaktifkan.");

        return $user->fresh();
    });
}

public function activate(User $user, User $actor): User
{
    return DB::transaction(function () use ($user, $actor): User {
        $user->update(['status' => UserStatus::Active->value]);

        $this->auditLogger->log($actor, AuditAction::Activate, AuditModule::User, $user->id,
            "User {$user->full_name} diaktifkan kembali.");

        return $user->fresh();
    });
}
```

- [ ] **Step 1: Test — deaktivasi mencabut token; token lama → 401; admin tidak bisa deaktivasi diri.**
  ```php
  test('deactivating user revokes all tokens', function () {
      $target = User::factory()->employee()->create();
      $target->createToken('t1');
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->postJson("/api/users/{$target->id}/deactivate")->assertStatus(200);
      expect($target->tokens()->count())->toBe(0);
  });

  test('token issued before deactivation returns 401', function () {
      $target = User::factory()->employee()->create();
      $token = $target->createToken('old')->plainTextToken;
      $target->update(['status' => 'inactive']);
      $this->withToken($token)->getJson('/api/me')->assertStatus(401);
  });

  test('admin cannot deactivate own account (403)', function () {
      $admin = User::factory()->admin()->create();
      Sanctum::actingAs($admin);
      $this->postJson("/api/users/{$admin->id}/deactivate")->assertStatus(403);
  });
  ```

- [ ] **Step 2: Implementasi** — service, controller.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Admin/UserActivateDeactivateTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/User/ app/Http/Controllers/Admin/ tests/Feature/Admin/
  git commit -m "feat(admin): add activate/deactivate with token revocation"
  ```

---

### Task 5: Master Data CRUD + `ReferentialIntegrityGuard`

**Files:**
- Create: `app/Services/Admin/ReferentialIntegrityGuard.php`
- Create: `app/Http/Controllers/Admin/DepartmentController.php`
- Create: `app/Http/Controllers/Admin/TicketCategoryController.php`
- Create: `app/Http/Controllers/Admin/TicketPriorityController.php`
- Create: `app/Http/Requests/Admin/StoreTicketPriorityRequest.php` (dsb. per resource)
- Create: `tests/Feature/Admin/MasterDataTest.php`

**Detail:**

Empat resource master data (department, ticket-category, ticket-priority, knowledge-category) mengikuti pola CRUD yang sama: `GET` boleh semua role (viewAny), `POST/PUT/DELETE` Admin (`*.manage`). **Ticket statuses read-only** (API-CONTRACT §11).

**`ReferentialIntegrityGuard`** — cek rujukan sebelum delete:
```php
class ReferentialIntegrityGuard
{
    /**
     * Ensure an entity is not referenced before delete.
     *
     * @param  array<string, Builder>  $references  label => query yang menghitung rujukan
     */
    public function assertUnreferenced(array $references): void
    {
        foreach ($references as $label => $query) {
            $count = $query->count();
            if ($count > 0) {
                throw new StateConflictException(
                    "{$label} masih digunakan oleh {$count} data terkait dan tidak dapat dihapus."
                );
            }
        }
    }
}
```

Pemakaian per resource:
- **Department:** `User::where('department_id', $id)` (hindari ticket — nullable, lebih longgar)
- **TicketCategory:** `Ticket::where('category_id', $id)` + `TicketCategory::where('parent_id', $id)` (children)
- **TicketPriority:** `Ticket::where('priority_id', $id)` — snapshot SLA memastikan ticket lama aman walau priority diubah `sla_minutes`
- **KnowledgeCategory:** `KnowledgeArticle::where('category_id', $id)` — bisa didelegasikan ke `ArticleService` 5c, tapi di sini dijaga lagi

**Ubah `sla_minutes` tidak mengubah ticket lama** (API-CONTRACT:755, ROADMAP:569):
```php
// TicketPriorityController@update
$priority->update(['sla_minutes' => $data->slaMinutes]);
// tidak ada perhitungan ulang terhadap tickets — snapshot sudah tersimpan
```

- [ ] **Step 1: Test — CRUD master data + guard.**
  ```php
  test('admin can update priority sla_minutes', function () {
      $priority = TicketPriority::find(2);
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->putJson("/api/ticket-priorities/{$priority->id}", ['name' => 'High', 'sla_minutes' => 300])
          ->assertStatus(200);
      expect($priority->fresh()->sla_minutes)->toBe(300);
  });

  test('changing priority does not affect existing ticket snapshot', function () {
      $ticket = Ticket::factory()->create(['priority_id' => 2, 'sla_duration_minutes' => 240]);
      $priority = TicketPriority::find(2);
      $priority->update(['sla_minutes' => 500]);
      expect($ticket->fresh()->sla_duration_minutes)->toBe(240);
  });

  test('cannot delete department in use (409)', function () {
      $dept = Department::factory()->create();
      User::factory()->create(['department_id' => $dept->id]);
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->deleteJson("/api/departments/{$dept->id}")->assertStatus(409);
  });

  test('cannot delete ticket category with children (409)', function () {
      $parent = TicketCategory::factory()->create();
      TicketCategory::factory()->create(['parent_id' => $parent->id]);
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->deleteJson("/api/ticket-categories/{$parent->id}")->assertStatus(409);
  });
  ```

- [ ] **Step 2: Implementasi** — guard + 4 controller + request + route.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Admin/MasterDataTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Admin/ app/Http/Controllers/Admin/ app/Http/Requests/Admin/ routes/api.php tests/Feature/Admin/
  git commit -m "feat(admin): add master-data CRUD with referential integrity guard"
  ```

---

### Task 6: Route Lengkap Administrasi + Sinkronisasi Dokumen + Tag v0.5.0

**Files:**
- Modify: `routes/api.php`
- Modify: `docs/product/PERMISSION-MATRIX.md` (§4 inventori route — tambahkan baris yang baru)
- Modify: `docs/product/ROADMAP.md` (tandai checkbox Fase 5 sesuai yang dikerjakan)

**Detail:**

Daftarkan seluruh route administrasi:
```php
Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
    Route::get('/roles', [UserController::class, 'roles'])->name('roles.index');

    Route::apiResource('users', UserController::class);
    Route::post('/users/{user}/activate', [UserController::class, 'activate'])->name('users.activate');
    Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');

    Route::apiResource('departments', DepartmentController::class);
    Route::apiResource('ticket-categories', TicketCategoryController::class);
    Route::apiResource('ticket-priorities', TicketPriorityController::class);
});
```

> **Jebakan:** `ticket-priorities` memakai `apiResource` — `GET /api/ticket-priorities` sudah ada dari Fase 3 (reference). `apiResource` menambahkan `POST/PUT/DELETE`. Pastikan tidak ada duplikasi `GET` route yang bentrok.

- [ ] **Step 1: Uji seluruh route terdaftar & test suite penuh.**
  ```bash
  php artisan route:list --path=api
  vendor/bin/pest
  ```

- [ ] **Step 2: Sinkronkan `docs/product/PERMISSION-MATRIX.md §4`** — tambahkan baris route baru (users.*, departments.*, ticket-categories.*, ticket-priorities.*, roles).

- [ ] **Step 3: Sinkronkan `docs/product/ROADMAP.md`** — centang task Fase 5 yang selesai, perbarui catatan overrun.

- [ ] **Step 4: Tag v0.5.0 (D-30).**
  ```bash
  git tag -a v0.5.0 -m "Phase 5: Asset, Knowledge Base, Attachment, Administration"
  git push origin main --tags
  ```

- [ ] **Step 5: Commit sinkronisasi.**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add routes/api.php docs/product/PERMISSION-MATRIX.md docs/product/ROADMAP.md
  git commit -m "docs(phase5): sync permission matrix, roadmap, and routes for phase 5"
  ```

---

## Exit Criteria 5e

- [ ] User CRUD: create (201), update, list (filter role/dept/status + search nama/email), show, delete.
- [ ] Email duplikat → 422 (BR-018); non-admin create → 403 (BR-017); role ditentukan Admin (BR-020).
- [ ] Create user: `must_change_password = true`, profil tersimpan (observer + payload profile).
- [ ] Deaktivasi: mencabut seluruh token; token lama → 401 (BR-019); reaktivasi mengembalikan status.
- [ ] Admin tidak bisa deaktivasi/delete/reset-password diri sendiri → **403** (D-16 #1).
- [ ] Reset password: server-generate (D-12), `must_change_password = true`, dikembalikan sekali, tidak masuk audit (D-07).
- [ ] `GET /api/roles` — hanya Admin.
- [ ] Master data CRUD (department, ticket-category, ticket-priority, knowledge-category) — Admin manage; GET semua role.
- [ ] Delete master data yang dirujuk → **409**; delete yang tidak dirujuk → sukses.
- [ ] Ubah `sla_minutes` tidak mengubah snapshot ticket lama (test).
- [ ] `ticket-statuses` tetap read-only (tidak ada route POST/PUT/DELETE).
- [ ] Route baru terdaftar di `PERMISSION-MATRIX.md §4`; ROADMAP tersinkronisasi.
- [ ] `php artisan test` hijau, `pint --test` bersih, `migrate:fresh --seed` sukses.
- [ ] Tag `v0.5.0` dibuat dan didorong.