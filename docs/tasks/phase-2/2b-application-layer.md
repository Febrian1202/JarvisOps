# Fase 2b — Lapisan Aplikasi (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi rencana ini task demi task.
> Langkah-langkah memakai sintaks checkbox (`- [ ]`).

**Goal:** Membangun lapisan infrastruktur aplikasi: envelope respons, penanganan error, standardisasi pagination & sorting, pengaturan batasan permintaan (rate limiting), dan endpoint pengecekan sistem.

**Architecture:** Format envelope API yang kaku (sukses/error) diterapkan global lewat exception handler, mencegah bocornya format error bawaan Laravel. Rate limiter diterapkan di provider.

**Spec:**
- Rencana Utama: `docs/tasks/phase-2/README.md`
- Bentuk Envelope: `API-CONTRACT.md` (§2)
- Aturan Status HTTP: `API-CONTRACT.md` (§3)
- Rate Limiting: `API-CONTRACT.md` (§12)

---

### Task 1: Utility ApiResponse

**Files:**
- Create: `apps/api/app/Support/ApiResponse.php`
- Create: `apps/api/tests/Unit/ApiResponseTest.php`

**Detail:**
Satu class statis untuk menyeragamkan seluruh return controller.

- [ ] **Step 1: Test ApiResponse**
Uji bentuk array dari keempat method, pastikan format paginated tidak memiliki `links` dan punya tepat enam kunci meta (API-CONTRACT §2.2).
- [ ] **Step 2: Implementasi `ApiResponse`**
  - `success(mixed $data = null, string $message = 'Success', int $status = 200)`
  - `created(mixed $data, string $message = 'Created')` -> Memanggil success dengan 201.
  - `error(string $message, mixed $errors = null, int $status = 400)`
  - `paginated(LengthAwarePaginator $paginator, string $message = 'Success')`
- [ ] **Step 3: Commit.**

---

### Task 2: Exception Handler & Exception Kustom

**Files:**
- Modify: `apps/api/bootstrap/app.php`
- Create: `apps/api/app/Exceptions/IllegalStatusTransitionException.php`
- Create: `apps/api/app/Exceptions/StateConflictException.php`
- Create: `apps/api/tests/Feature/AppLayer/ExceptionHandlerTest.php`

**Detail:**
Mencegat semua exception Laravel dan mengubahnya jadi `ApiResponse::error`.

- [ ] **Step 1: Test Handler**
Simulasikan abort 404, validasi gagal, dan logic error (di route dummy test-only). Assert mengembalikan JSON envelope API.
- [ ] **Step 2: Buat Exception Domain**
Dua kelas exception kosong yang extends `Exception` (digunakan nanti di Fase 3).
- [ ] **Step 3: Modifikasi `app.php`**
Pada `withExceptions`, tambahkan blok yang mencegat:
  - `AuthenticationException` -> 401, 'Unauthenticated.'
  - `AuthorizationException` & `AccessDeniedHttpException` -> 403, pesan aslinya.
  - `NotFoundHttpException` & `ModelNotFoundException` -> 404, 'Resource not found.'
  - `ValidationException` -> 422, 'The given data was invalid.', errors diambil dari `$e->errors()`.
  - `ThrottleRequestsException` -> 429, 'Too many requests.', sertakan header `Retry-After`.
  - `IllegalStatusTransitionException` -> 422.
  - `StateConflictException` -> 409.
  - `Throwable` (default) -> 500, jika `app()->hasDebugModeEnabled()` tunjukkan error, jika tidak 'Server error.'
- [ ] **Step 4: Commit.**

---

### Task 3: Pagination & Sorting Trait

**Files:**
- Create: `apps/api/app/Support/HandlesPagination.php`
- Create: `apps/api/tests/Feature/AppLayer/PaginationTraitTest.php`

**Detail:**
Trait untuk dipakai di controller agar pembacaan query parameter seragam.

- [ ] **Step 1: Test Pagination & Sort**
Uji batas `per_page` (fallback ke 100 jika > 100). Uji menolak kolom `sort_by` yang tidak ada di whitelist.
- [ ] **Step 2: Implementasi Trait**
  - Method `getPerPage(Request $request): int` (default 10, max 100).
  - Method `applySorting(Builder $query, Request $request, array $allowedColumns): Builder`.
  - Jika `$request->sort_by` tidak ada di `$allowedColumns`, lempar `ValidationException` atau abaikan dengan default. (API-CONTRACT §4 menyarankan tolak tegas 422).
- [ ] **Step 3: Commit.**

---

### Task 4: Rate Limiting & Health Endpoint

**Files:**
- Modify: `apps/api/app/Providers/AppServiceProvider.php`
- Modify: `apps/api/bootstrap/app.php` (tambah middleware `throttle:api`)
- Modify: `apps/api/routes/api.php`
- Create: `apps/api/app/Http/Controllers/HealthController.php`
- Create: `apps/api/tests/Feature/AppLayer/HealthEndpointTest.php`

**Detail:**
Batasan jumlah request dan rute pengecekan.

- [ ] **Step 1: Konfigurasi Rate Limiter**
Di `AppServiceProvider::boot()`, gunakan `RateLimiter::for()`:
  - `login`: 5 per menit per IP.
  - `upload`: 20 per menit per ID user.
  - `search`: 60 per menit per ID user.
  - `api`: 120 per menit per ID user.
- [ ] **Step 2: Registrasi Throttle Middleware**
Pastikan `throttle:api` diterapkan di grup route `api` (lewat `withMiddleware` di `app.php` jika perlu).
- [ ] **Step 3: Test Health Endpoint**
Test `GET /api/health` mengembalikan envelope `{success: true, data: {status: 'ok', db: 'connected', timestamp: '...'}}`. Uji saat DB mati (mocking) -> 503.
- [ ] **Step 4: Implementasi HealthController**
Check koneksi DB secara sederhana (`DB::connection()->getPdo()`), tangkap exception. Gunakan `ApiResponse::success` atau `error`. Daftarkan di `routes/api.php`.
- [ ] **Step 5: Verifikasi & Commit.**
