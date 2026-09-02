# Fase 7b — Backend Amendment, API Client, & Type System (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Setiap task memiliki langkah `- [ ]` yang harus dieksekusi secara atomic dan diakhiri dengan commit.
> - **Untuk developer manusia:** Sub-tahap ini mencakup 1 perbaikan backend (memperluas `/me` dengan 37 policy abilities dan flag `must_change_password`) serta pembangunan lapisan API Client, BFF Catch-All Proxy upgrade, pemetaan error form 422, dan seluruh pustaka tipe TypeScript.

**Goal:** Memastikan frontend memiliki kontrak API yang utuh dan presisi dari `/me` (66 ability + flag `must_change_password`), menyempurnakan BFF proxy untuk mendukung seluruh method (GET, POST, PUT, PATCH, DELETE) beserta upload multipart dan streaming unduhan file, serta membangun pustaka tipe data entitas, mapper error 422 terjemahan, dan kamus label bahasa Indonesia terpusat.

**Branch:** `feat/phase-7b-api-layer`
**Estimasi Waktu:** ~1.0 hari (4 task)
**Prasyarat:** 7a selesai (`components/ui`, theme, Vitest setup).

---

### Task 1: Backend Amendment — Extend `/me` Ability & Must-Change-Password

**Files:**
- Modify: `apps/api/app/Services/Auth/ProfileService.php`
- Modify: `apps/api/app/Http/Resources/Auth/UserResource.php`
- Modify: `apps/api/tests/Feature/Auth/ProfileTest.php`

**Detail:**
1. **Ability Resolution:** `ProfileService::show()` saat ini hanya mengembalikan 29 *role abilities*. Tambahkan kemampuan kelas (`policy abilities`) yang dapat dievaluasi tanpa instans spesifik untuk role pengguna saat itu (`ticket.viewAny`, `ticket.create`, `asset.viewAny`, `asset.create`, `article.viewAny`, `article.create`, `notification.viewAny`, dll.) sehingga total ability yang dikembalikan mencakup 66 ability.
2. **Must Change Password:** Sertakan `'must_change_password' => (bool) $this->must_change_password` pada `UserResource` agar frontend dapat melakukan *forced redirect* ke halaman ganti password jika admin melakukan reset password (D-11).

- [ ] **Step 1: Tulis feature test di `apps/api/tests/Feature/Auth/ProfileTest.php` (TDD RED).**
  ```php
  test('profile payload returns all 66 role and policy abilities for admin', function () {
      $admin = User::factory()->admin()->create();
      Sanctum::actingAs($admin);

      $response = $this->getJson('/api/me')
          ->assertStatus(200)
          ->assertJsonStructure([
              'success',
              'data' => [
                  'id',
                  'email',
                  'full_name',
                  'must_change_password',
                  'role',
                  'permissions',
              ],
          ]);

      $permissions = $response->json('data.permissions');
      expect($permissions)->toContain('ticket.create', 'article.create', 'dashboard.admin', 'asset.viewAny');
  });

  test('profile payload includes must_change_password flag', function () {
      $user = User::factory()->employee()->create(['must_change_password' => true]);
      Sanctum::actingAs($user);

      $this->getJson('/api/me')
          ->assertStatus(200)
          ->assertJsonPath('data.must_change_password', true);
  });
  ```
- [ ] **Step 2: Jalankan test untuk melihat kegagalan (RED).**
  ```bash
  cd apps/api && vendor/bin/pest tests/Feature/Auth/ProfileTest.php
  ```
- [ ] **Step 3: Update `apps/api/app/Http/Resources/Auth/UserResource.php`.**
  ```php
  public function toArray(Request $request): array
  {
      return [
          'id' => $this->id,
          'email' => $this->email,
          'full_name' => $this->full_name,
          'status' => $this->status,
          'must_change_password' => (bool) $this->must_change_password,
          'role' => $this->whenLoaded('role', fn () => $this->role->only('id', 'name')),
          'department' => $this->whenLoaded('department', fn () => $this->department->only('id', 'name')),
          'profile' => $this->whenLoaded('employeeProfile', fn () => $this->employeeProfile->only('employee_code', 'position', 'phone')),
      ];
  }
  ```
- [ ] **Step 4: Update `apps/api/app/Services/Auth/ProfileService.php`.**
  Gabungkan *role abilities* dan *policy abilities* yang relevan untuk role pengguna berdasarkan `AbilityMatrix`:
  ```php
  public function show(User $user): array
  {
      $user->load(['role', 'department', 'employeeProfile']);

      $role = RoleName::tryFrom($user->role?->name ?? '');
      $permissions = [];

      if ($role) {
          $permissions = AbilityMatrix::permissionsFor($role);
          // Tambahkan policy abilities yang berlaku umum untuk role
          $policyAbilities = AbilityMatrix::getPolicyAbilities();
          foreach ($policyAbilities as $ability) {
              if (Gate::forUser($user)->allows($ability)) {
                  $permissions[] = $ability;
              }
          }
      }

      return [
          'user' => $user,
          'permissions' => array_values(array_unique($permissions)),
      ];
  }
  ```
- [ ] **Step 5: Jalankan test verifikasi (GREEN).**
  ```bash
  cd apps/api && vendor/bin/pest tests/Feature/Auth/ProfileTest.php && vendor/bin/pint --dirty --format agent
  ```
- [ ] **Step 6: Commit.**
  ```bash
  git add apps/api/app/Http/Resources/Auth/UserResource.php apps/api/app/Services/Auth/ProfileService.php apps/api/tests/Feature/Auth/ProfileTest.php
  git commit -m "feat(api): include policy abilities and must_change_password flag in profile endpoint"
  ```

---

### Task 2: Penyempurnaan Catch-All BFF Proxy di Next.js

**Files:**
- Modify: `apps/web/src/app/api/proxy/[...path]/route.ts`
- Create: `apps/web/src/test/proxy-handler.test.ts`

**Detail:**
Lengkapi BFF proxy (`/api/proxy/*`) agar:
1. Mengekspor seluruh method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
2. Meneruskan query parameters secara utuh (`request.nextUrl.search`).
3. Mendukung **Multipart Form Data** (upload attachment): Jangan panggil `request.text()` pada `multipart/form-data`, teruskan stream binary atau `await request.blob()` beserta `Content-Type` header asli yang memuat *boundary*.
4. Mendukung **Streaming Unduhan File**: Teruskan `Content-Disposition`, `Content-Type` dari response Laravel ke browser, serta bersihkan header `content-encoding` jika body sudah di-decode oleh node-fetch.
5. Menangani status 401: otomatis panggil `deleteToken()` untuk menghapus cookie sesi kadaluwarsa.

- [ ] **Step 1: Tulis unit test untuk fungsi helper proxy.**
  ```typescript
  import { describe, it, expect } from 'vitest';

  describe('Proxy Query String & Header Handler', () => {
    it('constructs backend path with query strings preserved', () => {
      const pathArray = ['tickets'];
      const search = '?status=OPEN&page=2';
      const backendUrl = `http://api:8000/api/${pathArray.join('/')}${search}`;
      expect(backendUrl).toBe('http://api:8000/api/tickets?status=OPEN&page=2');
    });
  });
  ```
- [ ] **Step 2: Update `apps/web/src/app/api/proxy/[...path]/route.ts`.**
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { getToken, deleteToken } from '@/lib/server/session';

  const API_BASE_URL = process.env.API_BASE_URL || 'http://api:8000/api';

  async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const token = await getToken();
    const search = request.nextUrl.search;
    const targetUrl = `${API_BASE_URL}/${path.join('/')}${search}`;

    const headers = new Headers();
    headers.set('Accept', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const contentType = request.headers.get('content-type');
    let body: any = undefined;

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      if (contentType?.includes('multipart/form-data')) {
        // Forward raw blob with original content-type boundary
        body = await request.blob();
        headers.set('Content-Type', contentType);
      } else if (contentType?.includes('application/json')) {
        body = await request.text();
        headers.set('Content-Type', 'application/json');
      } else {
        body = await request.blob();
      }
    }

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body,
        cache: 'no-store',
      });

      if (response.status === 401) {
        await deleteToken();
      }

      // Stream response headers & binary/json
      const responseHeaders = new Headers();
      response.headers.forEach((val, key) => {
        // Strip content-encoding to avoid duplicate decompression
        if (!['content-encoding', 'content-length'].includes(key.toLowerCase())) {
          responseHeaders.set(key, val);
        }
      });

      return new NextResponse(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Backend service unreachable.', errors: null },
        { status: 503 }
      );
    }
  }

  export const GET = handleProxy;
  export const POST = handleProxy;
  export const PUT = handleProxy;
  export const PATCH = handleProxy;
  export const DELETE = handleProxy;
  ```
- [ ] **Step 3: Verifikasi test proxy dan compile.**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [ ] **Step 4: Commit.**
  ```bash
  git add apps/web/src/app/api/proxy/[...path]/route.ts apps/web/src/test/proxy-handler.test.ts
  git commit -m "feat(bff): enhance catch-all proxy to support PATCH, multipart upload, and binary streaming"
  ```

---

### Task 3: TypeScript Type Definitions Lengkap & Indonesian Label Maps

**Files:**
- Create: `apps/web/src/types/auth.ts`
- Create: `apps/web/src/types/tickets.ts`
- Create: `apps/web/src/types/assets.ts`
- Create: `apps/web/src/types/articles.ts`
- Create: `apps/web/src/types/notifications.ts`
- Create: `apps/web/src/types/audit.ts`
- Modify: `apps/web/src/types/api.ts`
- Create: `apps/web/src/lib/labels.ts`
- Create: `apps/web/src/test/labels.test.ts`

**Detail:**
Definisikan tipe data statis TypeScript untuk seluruh entitas API dan enums yang mencerminkan skema backend.
1. `RoleName`: `'administrator' | 'manager' | 'technician' | 'employee'`
2. `TicketStatusName`: `'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'`
3. `TicketAction`: `'assign' | 'unassign' | 'start' | 'resolve' | 'close' | 'cancel' | 'reopen' | 'change_priority' | 'comment' | 'attach' | 'edit'`
4. `SlaStatus`: `'on_track' | 'breached'`
5. `labels.ts`: Fungsi penerjemah kamus bahasa Indonesia untuk seluruh status, prioritas, tipe notifikasi, aksi audit, dan role.

- [ ] **Step 1: Tulis test untuk `src/lib/labels.ts` (TDD RED).**
  ```typescript
  import { describe, it, expect } from 'vitest';
  import {
    getTicketStatusLabel,
    getPriorityLabel,
    getRoleLabel,
    getSlaStatusLabel,
    getNotificationTypeLabel,
  } from '@/lib/labels';

  describe('Indonesian Label Dictionary', () => {
    it('translates ticket statuses correctly', () => {
      expect(getTicketStatusLabel('OPEN')).toBe('Menunggu');
      expect(getTicketStatusLabel('IN_PROGRESS')).toBe('Sedang Dikerjakan');
      expect(getTicketStatusLabel('RESOLVED')).toBe('Selesai');
      expect(getTicketStatusLabel('CLOSED')).toBe('Ditutup');
    });

    it('translates priority correctly', () => {
      expect(getPriorityLabel('Critical')).toBe('Kritis');
      expect(getPriorityLabel('High')).toBe('Tinggi');
      expect(getPriorityLabel('Medium')).toBe('Sedang');
      expect(getPriorityLabel('Low')).toBe('Rendah');
    });

    it('translates role names correctly', () => {
      expect(getRoleLabel('administrator')).toBe('Administrator');
      expect(getRoleLabel('technician')).toBe('Teknisi');
      expect(getRoleLabel('employee')).toBe('Karyawan');
    });
  });
  ```
- [ ] **Step 2: Jalankan test (RED).**
  ```bash
  cd apps/web && npm run test -- src/test/labels.test.ts
  ```
- [ ] **Step 3: Implementasikan tipe di `apps/web/src/types/` dan kamus `apps/web/src/lib/labels.ts`.**
  Buat berkas types `auth.ts`, `tickets.ts`, `assets.ts`, `articles.ts`, `notifications.ts`, `audit.ts`, serta fungsi kamus lengkap di `labels.ts`.
- [ ] **Step 4: Jalankan test (GREEN).**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [ ] **Step 5: Commit.**
  ```bash
  git add apps/web/src/types/ apps/web/src/lib/labels.ts apps/web/src/test/labels.test.ts
  git commit -m "feat(types): add complete TypeScript entity models and Indonesian label dictionary"
  ```

---

### Task 4: Client API Fetcher, 422 Error Mapper, & TanStack Query Keys

**Files:**
- Create: `apps/web/src/lib/client/api.ts`
- Create: `apps/web/src/lib/client/error-mapper.ts`
- Create: `apps/web/src/lib/query-keys.ts`
- Create: `apps/web/src/test/error-mapper.test.ts`
- Create: `apps/web/src/test/query-keys.test.ts`

**Detail:**
1. `apiFetch<T>(endpoint, options)`: Wrapper client-side `fetch` ke `/api/proxy/*`. Meng-unwrap amplop `{ success, message, data, meta }`. Melempar `ApiError` jika response gagal.
2. `mapApiErrorsToForm(error, setError)`: Memetakan `errors: Record<string, string[]>` dari respons 422 Laravel langsung ke field form `react-hook-form` `setError(field, { message })`. Menerjemahkan fallback `validation.*` yang belum terlokalisasi di backend.
3. `query-keys.ts`: Query key factory terpusat per domain (`ticketKeys`, `assetKeys`, `articleKeys`, `notificationKeys`, `dashboardKeys`, `authKeys`).

- [ ] **Step 1: Tulis unit test untuk error mapper & query keys (TDD RED).**
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { mapApiErrorMessages } from '@/lib/client/error-mapper';
  import { ticketKeys } from '@/lib/query-keys';

  describe('Error Mapper & Query Keys', () => {
    it('translates fallback validation keys into polite Indonesian', () => {
      const rawErrors = {
        title: ['validation.required'],
        per_page: ['validation.max.numeric'],
      };
      const mapped = mapApiErrorMessages(rawErrors);
      expect(mapped.title).toBe('Kolom ini wajib diisi.');
      expect(mapped.per_page).toBe('Nilai melebihi batas maksimal.');
    });

    it('generates structured query key arrays', () => {
      expect(ticketKeys.all).toEqual(['tickets']);
      expect(ticketKeys.list({ status: 'OPEN' })).toEqual(['tickets', 'list', { status: 'OPEN' }]);
      expect(ticketKeys.detail(12)).toEqual(['tickets', 'detail', 12]);
    });
  });
  ```
- [ ] **Step 2: Jalankan test (RED).**
  ```bash
  cd apps/web && npm run test -- src/test/error-mapper.test.ts
  ```
- [ ] **Step 3: Implementasikan `error-mapper.ts`, `api.ts`, dan `query-keys.ts`.**
- [ ] **Step 4: Jalankan test (GREEN) & typecheck.**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [ ] **Step 5: Commit.**
  ```bash
  git add apps/web/src/lib/client/ apps/web/src/lib/query-keys.ts apps/web/src/test/error-mapper.test.ts apps/web/src/test/query-keys.test.ts
  git commit -m "feat(api-client): implement apiFetch client wrapper, 422 form error mapper, and query key factories"
  ```

---

## Exit Criteria 7b

- [ ] Backend `/api/me` mengembalikan 66 permissions (role + policy) dan field `must_change_password`.
- [ ] BFF Proxy `/api/proxy/*` mendukung GET, POST, PUT, PATCH, DELETE, multipart binary stream, dan auto-clear cookie saat 401.
- [ ] Tipe TypeScript seluruh entitas API (Ticket, Asset, Article, Notification, AuditLog, User) lengkap tanpa `any`.
- [ ] `src/lib/labels.ts` menerjemahkan seluruh enum ke Bahasa Indonesia.
- [ ] `mapApiErrorsToForm` berhasil memetakan error 422 backend ke field form RHF.
- [ ] Seluruh unit test lulus 100% dan `npm run typecheck` bebas error.
