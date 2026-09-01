# Fase 2c — Autentikasi & RBAC (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi rencana ini task demi task.
> Langkah-langkah memakai sintaks checkbox (`- [ ]`).

**Goal:** Membangun seluruh logika autentikasi stateless dan sistem Role-Based Access Control yang bertumpu pada satu matriks permission (`AbilityMatrix`) yang teruji penuh secara unit. Menghasilkan endpoint auth (`login`, `logout`, `me`, profil).

**Architecture:** Laravel Sanctum token dengan ability `['*']`. Hak akses **tidak** dibaca dari token, melainkan dievaluasi real-time oleh `Gate` berbasis array definisi di `AbilityMatrix`. Middleware menangani pemblokiran paksa (`must_change_password`).

**Spec:**
- Rencana Utama: `docs/tasks/phase-2/README.md`
- Matriks Otorisasi: `PERMISSION-MATRIX.md`
- Kontrak Auth: `API-CONTRACT.md` (§5)

---

### Task 1: Ability Matrix (The Single Source of Truth)

**Files:**
- Create: `apps/api/app/Authorization/AbilityMatrix.php`
- Create: `apps/api/tests/Unit/AbilityMatrixTest.php`

**Detail:**
Matriks kemampuan dalam bentuk array PHP, menerjemahkan dokumen PERMISSION-MATRIX secara persis.

- [ ] **Step 1: Test Matriks**
Tulis test ekstensif: setiap ability harus memiliki daftar role yang valid. Method filter `permissionsFor(RoleName $role)` harus mengembalikan array ability (string) yang benar untuk role tersebut.
- [ ] **Step 2: Implementasi AbilityMatrix**
  - Buat array konstanta yang memetakan ability (string, misal `auth.logout`) ke array role Enum (`[RoleName::Admin, RoleName::Manager]`).
  - Tambahkan array khusus untuk ability yang bergantung pada kepemilikan resource (statusnya `pending` Policy).
  - Buat method `getRoleAbilities()` dan `permissionsFor(RoleName)`.
- [ ] **Step 3: Commit.**

---

### Task 2: Registrasi Gate & Pengecualian Admin

**Files:**
- Modify: `apps/api/app/Providers/AppServiceProvider.php`
- Create: `apps/api/app/Policies/NotificationPolicy.php`
- Create: `apps/api/tests/Feature/Auth/GateRegistrationTest.php`

**Detail:**
Mendaftarkan Gate dari matriks, plus aturan khusus D-16.

- [ ] **Step 1: Test Registrasi Gate**
Gunakan data test user dari keempat role. Panggil `Gate::forUser($u)->allows(...)` untuk seluruh ability non-Policy, pastikan nilainya persis sama dengan definisi di matriks. Test khusus: Admin tetap ditolak jika mencoba hal di daftar pengecualian (seperti `user.deactivate` pada dirinya sendiri, meskipun itu baru relevan nanti, test kerangkanya).
- [ ] **Step 2: Registrasi Gate**
Di `AppServiceProvider::boot()`:
  - Iterasi `AbilityMatrix` untuk mendaftarkan Gate role-based murni.
  - Tambahkan `Gate::before()`: Jika `$user->isAdmin()`, kembalikan `true` **kecuali** untuk ability yang secara eksplisit masuk blacklist (misal: urusan notifikasi, menghapus diri).
- [ ] **Step 3: NotificationPolicy Minimal**
Karena notifikasi dikecualikan dari `Gate::before`, buat Policy dasar untuk Notification (hanya mengecek `$notification->user_id === $user->id`) agar test pengecualian Admin bisa jalan.
- [ ] **Step 4: Commit.**

---

### Task 3: Middleware Role & Password

**Files:**
- Create: `apps/api/app/Http/Middleware/CheckRole.php`
- Create: `apps/api/app/Http/Middleware/EnsurePasswordChanged.php`
- Modify: `apps/api/bootstrap/app.php` (daftarkan middleware alias)
- Create: `apps/api/tests/Feature/Auth/MiddlewareTest.php`

**Detail:**
Penjagaan level rute kasar.

- [ ] **Step 1: Test Middleware**
Buat route dummy. Uji akses dengan role salah -> 403. Uji akses user dengan `must_change_password=1` ke route biasa -> 403 (pesan khusus). Uji user yang sama mengakses route password/logout -> tembus.
- [ ] **Step 2: Implementasi CheckRole**
Menerima argumen nama role (bisa multiple, koma). Mengecek `$user->hasRole()`.
- [ ] **Step 3: Implementasi EnsurePasswordChanged (D-11)**
Jika `$user->must_change_password`, tolak semua request KECUALI route bernama `me.password.update`, `me.show`, dan `auth.logout`.
- [ ] **Step 4: Registrasi Alias**
Di `app.php`, daftarkan alias `role` dan `password.changed`.
- [ ] **Step 5: Commit.**

---

### Task 4: Auth Controller (Login & Logout)

**Files:**
- Create: `apps/api/app/Http/Controllers/AuthController.php`
- Create: `apps/api/app/Http/Requests/LoginRequest.php`
- Modify: `apps/api/routes/api.php`
- Create: `apps/api/tests/Feature/Auth/LoginLogoutTest.php`

**Detail:**
Autentikasi token Sanctum stateless.

- [ ] **Step 1: Test Login & Logout**
- Kredensial benar -> 200, ada token, ada data user.
- Password salah / email tidak ada -> **pesan error identik**.
- User inactive -> error berbeda (BR-019).
- Logout mencabut token -> 200 kosong.
- [ ] **Step 2: Implementasi AuthController**
  - **Login:** Cari user, `Hash::check()`. Jika gagal -> generic error. Jika inactive -> inactive error. Buat token (`createToken('auth_token', ['*'])`). Update `last_login_at`. Response pakai `ApiResponse`. Load relasi `role`, `department` agar tidak N+1.
  - **Logout:** `$request->user()->currentAccessToken()->delete()`.
- [ ] **Step 3: Routing**
Pasang route `login` (throttle:login) dan `logout` (auth:sanctum). Hapus route bawaan `/user`.
- [ ] **Step 4: Commit.**

---

### Task 5: Endpoint Profil (`/me`) & Ganti Password

**Files:**
- Create: `apps/api/app/Http/Controllers/ProfileController.php`
- Create: `apps/api/app/Http/Requests/UpdateProfileRequest.php`
- Create: `apps/api/app/Http/Requests/ChangePasswordRequest.php`
- Create: `apps/api/tests/Feature/Auth/ProfileTest.php`

**Detail:**
Profil user dan pemenuhan D-11 (Ganti Password).

- [ ] **Step 1: Test Profil**
`GET /me` memuat profil dan array `permissions` dari `AbilityMatrix`. `PUT /me` menolak perubahan `role_id` atau `email`. `PUT /me/password` mengganti password, mengubah flag `must_change_password` ke false, dan mencabut semua token *kecuali* token saat ini.
- [ ] **Step 2: Implementasi ProfileController**
  - **show:** Return data user + `permissions` yang dihitung via `AbilityMatrix::permissionsFor($user->role->name)`.
  - **update:** Hanya terima `full_name` dan profil terkait (`phone`).
  - **updatePassword:** Validasi D-12 (`Password::min(8)->letters()->numbers()`), ubah password, set `must_change_password = false`, hapus token lain: `$user->tokens()->where('id', '!=', $request->user()->currentAccessToken()->id)->delete()`.
- [ ] **Step 3: Routing**
Pasang `GET /me`, `PUT /me` (auth:sanctum, password.changed), dan `PUT /me/password` (auth:sanctum).
- [ ] **Step 4: Verifikasi & Commit.**
