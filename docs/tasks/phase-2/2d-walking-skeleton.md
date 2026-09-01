# Fase 2d — Walking Skeleton BFF (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi rencana ini task demi task.
> Langkah-langkah memakai sintaks checkbox (`- [ ]`).

**Goal:** Membangun lapisan BFF (Backend For Frontend) di Next.js yang meneruskan request ke Laravel, mengelola token Sanctum di cookie `httpOnly` dengan aman, dan membuat halaman otentikasi minimal tanpa styling kompleks (pure Tailwind v4, tanpa shadcn/ui). Membuktikan bahwa proxy architecture berfungsi end-to-end.

**Architecture:** Route Handler Next.js (`/api/auth/*` dan `/api/proxy/*`) adalah satu-satunya entitas yang tahu soal token Sanctum. Client Component tidak pernah melihat token. Cookie ditandai `httpOnly`, `secure` (jika tidak local), `sameSite=lax`.

**Spec:**
- Rencana Utama: `docs/tasks/phase-2/README.md`
- ROADMAP: Fase 2, Walking Skeleton Frontend.

---

### Task 1: Konfigurasi Utilities & API Client Next.js

**Files:**
- Create: `apps/web/src/lib/server/session.ts`
- Create: `apps/web/src/lib/server/api.ts`
- Create: `apps/web/src/types/api.ts`

**Detail:**
Modul yang berjalan **hanya di server** untuk mengelola cookie dan memanggil Laravel.

- [ ] **Step 1: Definisikan Tipe TypeScript**
Buat interface `ApiResponse<T>`, `ApiError`, `User`, `Role` di `types/api.ts` sesuai kontrak backend.
- [ ] **Step 2: Implementasi Session Helper**
Buat `src/lib/server/session.ts` yang mengekspor fungsi async: `setToken(token: string)`, `getToken()`, dan `deleteToken()` menggunakan `next/headers` `cookies()`. Konfigurasi cookie: `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`.
- [ ] **Step 3: Implementasi Base API Fetcher**
Buat `src/lib/server/api.ts` mengekspor fungsi `laravelFetch(endpoint: string, options?: RequestInit)`:
  - Base URL dari `process.env.API_BASE_URL` (default `http://api:8000/api` atau `http://localhost:8000/api`).
  - Ambil token lewat `getToken()`, sisipkan ke header `Authorization: Bearer`.
  - Sisipkan `Accept: application/json`.
  - Jangan tangani 401 otomatis di sini (didelegasikan ke middleware atau proxy).
- [ ] **Step 4: Commit.**

---

### Task 2: Route Handler Auth (Login & Logout)

**Files:**
- Create: `apps/web/src/app/api/auth/login/route.ts`
- Create: `apps/web/src/app/api/auth/logout/route.ts`

**Detail:**
BFF menangani pertukaran kredensial menjadi httpOnly cookie.

- [ ] **Step 1: Implementasi Login Handler**
Menerima `POST` berisi kredensial, teruskan (tanpa token) ke Laravel `/api/login`.
  - Jika gagal (401/422), kembalikan response apa adanya ke browser (tanpa modifikasi amplop).
  - Jika sukses, ekstrak `data.token`, panggil `setToken()`.
  - **PENTING:** Response ke browser **tidak boleh** menyertakan token. Buat response JSON baru yang hanya berisi data user (`data.user`) tanpa token.
- [ ] **Step 2: Implementasi Logout Handler**
Menerima `POST`. Ambil token, panggil `laravelFetch('/logout', { method: 'POST' })` untuk revoke di backend. Hapus cookie via `deleteToken()`. Return sukses.
- [ ] **Step 3: Commit.**

---

### Task 3: Catch-All BFF Proxy

**Files:**
- Create: `apps/web/src/app/api/proxy/[...path]/route.ts`

**Detail:**
Menyediakan jembatan agar Client Component bisa memanggil `fetch('/api/proxy/me')`.

- [ ] **Step 1: Implementasi Proxy Proxy**
  - Ekspor fungsi untuk semua method: `GET`, `POST`, `PUT`, `DELETE`.
  - Dalam tiap handler, ambil param `path` (INGAT: di Next 15+, `params` adalah Promise, lakukan `await params`).
  - Gabungkan query string asal.
  - Panggil `laravelFetch` ke `/${path.join('/')}`.
  - Jika backend return 401, tangkap, panggil `deleteToken()`, dan teruskan 401 ke browser agar client tahu harus redirect ke login.
  - Kembalikan response stream mentah (headers, body, status) dari Laravel ke browser.
- [ ] **Step 2: Commit.**

---

### Task 4: Next.js Middleware (Proteksi Rute)

**Files:**
- Create: `apps/web/src/middleware.ts`

**Detail:**
Mencegah akses ke halaman UI terproteksi jika tidak ada cookie.

- [ ] **Step 1: Implementasi Middleware**
  - Cek keberadaan cookie token.
  - Jika mencoba mengakses rute terproteksi (misal `/` atau `/dashboard`) tanpa cookie, redirect ke `/login`.
  - Jika mengakses `/login` tapi sudah punya cookie, redirect ke `/`.
- [ ] **Step 2: Konfigurasi Matcher**
Kecualikan `/_next/`, `/favicon.ico`, dan `/api/` dari aturan redirect UI ini.
- [ ] **Step 3: Commit.**

---

### Task 5: UI Minimal (Login & Halaman Terproteksi)

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/dashboard/page.tsx`

**Detail:**
Halaman fungsional untuk membuktikan alur berjalan, tanpa komponen UI kompleks.

- [ ] **Step 1: Login Page**
  - Form HTML standar (email, password).
  - Gunakan `fetch('/api/auth/login')`.
  - Tangani error (tampilkan pesan).
  - Jika sukses, `router.push('/dashboard')` (gunakan `useRouter` dari `next/navigation`).
- [ ] **Step 2: Dashboard Page (Terproteksi)**
  - Komponen Server (Server Component) mengambil data `/me` via `laravelFetch` langsung, render HTML berisi nama user dan tombol Logout.
  - Sediakan sebuah Client Component kecil (misal `<ProxyProbe />`) yang melakukan `fetch('/api/proxy/me')` dari browser dan menampilkan hasilnya (untuk membuktikan jalur proxy berfungsi).
  - Tombol Logout memanggil `/api/auth/logout`, lalu `router.push('/login')`.
- [ ] **Step 3: Update Home Page (`/`)**
Redirect ke `/dashboard` atau tampilkan sambutan singkat.
- [ ] **Step 4: Lakukan Verifikasi Manual**
  - Pastikan `npm run dev` jalan.
  - Pastikan login berjalan.
  - Buka DevTools: token hanya ada di Application > Cookies. Tidak ada di Local Storage, tidak ada di Response Payload login.
  - Pastikan proxy probe berhasil fetch data.
  - `npm run build` dan `npm run lint` harus bersih tanpa error tipe.
- [ ] **Step 5: Commit.**
