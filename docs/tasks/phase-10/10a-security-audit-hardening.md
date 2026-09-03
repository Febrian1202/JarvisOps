# Sub-tahap 10a — Security Audit & Hardening

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap audit. Prinsip K1: setiap perbaikan **didahului test yang gagal (RED)**. Tidak ada test → tidak ada perbaikan. Temuan yang butuh keputusan infra lebih besar (bukan bug) → catat di `docs/ops/DEPLOYMENT.md` sebagai known-risk (dibuat di 10c; untuk sementara tulis catatan di deskripsi task).

**Goal:** Menutup lubang keamanan yang tersisa sesuai checklist ROADMAP:843-855, dengan bukti test, tanpa refactor arsitektur.

**Branch:** `feat/phase-10a-security`
**Estimasi:** ~0,75 hari
**Prasyarat:** Fase 9 selesai. Tidak ada dependensi sub-tahap lain.

---

## Task 1: Audit route vs ability (PERMISSION-MATRIX) — verifikasi checklist

**Files:**
- (Konsultasi) `docs/product/PERMISSION-MATRIX.md`
- (Jika ada lubang) `routes/api.php` + controller terkait + test

**Detail:** Telusuri **setiap baris route** di `docs/product/PERMISSION-MATRIX.md` (65 route rows) terhadap route nyata di `routes/api.php` (61 `Route::`). Tandai route yang tidak punya penjaga ability di controller (`authorize()`/`$this->authorize`/middleware `auth:sanctum`). Daftar hal yang **sudah ter-cover** (jangan ulang): gate terdaftar dari `AbilityMatrix` (D-16), exception 403/404 terstandarisasi, `password.changed` untuk `/me`, `throttle` untuk login/upload/api.

> **Jebakan — route yang "hanya auth:sanctum":** Beberapa route memang sengaja tanpa ability spesifik (mis. `/me`, `/me/password`, `/logout`, `/notifications/{id}/read`, `/tickets/{id}/comments` yang dijaga policy per-aksi). Bukan berarti tidak di-audit — pastikan **ada** `authorize()` atau policy yang membatasi scope data (mis. `NotificationPolicy`, `TicketCommentPolicy`). Absen penjaga = temuan.

### Step 1 — Audit manual, isi tabel per modul:
| Route | Controller@action | Ability/policy | Status |
| --- | --- | --- | --- |
| `POST /api/login` | Auth@login | throttle:login (tanpa auth — wajar) | OK |
| `GET /api/tickets` | Ticket@index | `authorize('viewAny')` | OK / temuan? |
| … | | | |

### Step 2 — Buat test otomatis bila ada celah yang ditemukan (RED→GREEN), pola `AuthorizationException` → 403.
### Step 3 — Commit:
```bash
git add -A
git commit -m "fix(api): guard <route> with <ability> (security audit 10a)"
```

---

## Task 2: Audit `$fillable` di semua model

**Files:**
- Create: `apps/api/tests/Feature/Security/FillableAuditTest.php`
- (Bila ditemukan) model yang kelebihan `$fillable`

**Detail:** Untuk **setiap model** yang bisa diisi via request (User, Ticket, Asset, KnowledgeArticle, AssetAssignment, AssetHistory, TicketComment, TicketHistory, AuditLog, Notification, KnowledgeCategory, TicketCategory, TicketPriority, Department, dll), verifikasi:
- `$fillable` tidak memuat kolom yang seharusnya di-set server (mis. `created_at`, `updated_at`, `deleted_at`, `sla_breached`, `resolved_at`, `closed_at`, `view_count`, `published_at`, `author_id` — mana yang perlu).
- Kolom sensitif (role_id, status, is_super_admin bila ada) tidak bisa di-mass-assign lewat input user tanpa controller yang membatasi.

> **Jebakan — false positive:** Model yang hanya diisi via service/factory (mis. `AuditLog` yang dibuat `AuditLogger`) wajar punya `$fillable` luas. Audit fokus pada model yang menerima input **request user** lewat `CreateTicketRequest`, `StoreAssetRequest`, `UpdateUserRequest`, dll. Baca `fillable` vs request `validated()` di controller terkait.

### Step 1 — RED: test yang mengumpulkan `$model->getFillable()` untuk model yang menerima request user, dan assert tidak memuat daftar hitam (kolom server-set).
### Step 2 — GREEN: perbaiki model yang bermasalah (persempit `$fillable` atau tambah guard).
### Step 3 — verifikasi:
```bash
vendor/bin/pest tests/Feature/Security/FillableAuditTest.php
vendor/bin/pest tests/Feature
vendor/bin/pint --dirty --format agent
```
### Step 4 — Commit:
```bash
git commit -m "fix(api): narrow mass-assignment for user-input models (security audit 10a)"
```

---

## Task 3: Rate limit — terapkan `throttle:search`

**Files:**
- Modify: `apps/api/routes/api.php`
- Create: `tests/Feature/Security/RateLimitTest.php`

**Detail (temuan nyata):** `RateLimiter::for('search', ...)` **sudah didefinisikan** di `AppServiceProvider` tetapi **tidak diterapkan** ke endpoint search mana pun. Terapkan ke route yang menerima parameter search/filter (paling relevan: `GET /api/tickets` — IndexTicketRequest dengan `search`; boleh juga `GET /api/assets`, `GET /api/articles`, `GET /api/users`). Pilih: tambahkan `middleware('throttle:search')` ke route-route tersebut (daftar route grup bisa dipakai).

> **Jebakan — double throttle:** Route yang sudah punya `throttle:api` (group api) tetap bisa ditimpa/ditumpuk dengan `throttle:search`. Laravel menerapkan keduanya (yang lebih ketat menang). Pastikan test memverifikasi **429** muncul setelah melewati batas **search**, bukan batas api (120/menit jauh lebih besar dari 60).

### Step 1 — RED:
```php
// tests/Feature/Security/RateLimitTest.php
test('ticket list hits search throttle limit', function () {
    $user = User::factory()->employee()->create();
    Sanctum::actingAs($user);

    for ($i = 0; $i < 60; $i++) {
        $this->getJson('/api/tickets?search=abc')->assertStatus(200);
    }
    $this->getJson('/api/tickets?search=abc')->assertStatus(429);
});
```
> Sesuaikan angka batas dengan `Limit::perMinute(60)` — bila 60 request sudah melewati, gunakan 61. Perhatikan juga `throttle:api` 120/menit: request ke-61 search akan 429 dari search throttle (lebih ketat).

### Step 2 — GREEN: terapkan middleware `throttle:search` ke route search.
### Step 3 — verifikasi: `vendor/bin/pest tests/Feature/Security/RateLimitTest.php` + seluruh suite.
### Step 4 — Commit:
```bash
git commit -m "fix(api): apply search rate limiter to ticket list and filter endpoints (security audit 10a)"
```

---

## Task 4: Cross-user data leak test

**Files:**
- Create: `apps/api/tests/Feature/Security/CrossUserLeakTest.php`

**Detail:** Test otomatis terpusat yang membuktikan **resource milik user A tidak bisa diakses user B** lewat manipulasi ID, untuk tiap modul yang punya owner:
- **Ticket:** Employee tidak bisa `GET /api/tickets/{id}` tiket milik employee lain (404 — PERMISSION-MATRIX §1), tidak bisa komen/attachment ke tiket bukan miliknya.
- **Asset:** `GET /api/my-assets` hanya milik sendiri; `assign`/`release` dijaga policy.
- **Notification:** `GET /api/notifications/{id}` hanya notifikasi milik sendiri (test `NotificationApiTest` mungkin sudah meng-cover — verifikasi & gabung).
- **Attachment:** `GET /api/attachments/{id}/download` hanya bila punya akses ke parent ticket (test `AttachmentSecurityTest` sudah ada — verifikasi).
- **Audit log:** `GET /api/audit-logs` dijaga `audit.viewAny` (M/A); bukan milik per-user.

> **Jebakan — duplikasi coverage:** Banyak test ini sudah tersebar (TicketPolicyTest, AssetPolicyTest, NotificationApiTest, AttachmentSecurityTest). **Tujuan task ini adalah satu file konsolidasi** yang bisa dipakai reviewer membuktikan klaim keamanan lintas-user dalam sekali lari. Bila test sudah ada, cukup re-referensikan (jangan duplikasi logika — tambahkan `uses`/komentar mengarah ke file asli bila perlu, atau buat test tambahan yang belum di-cover).

### Step 1 — RED: tulis skenario yang **belum** ter-cover (identifikasi gap dari test yang ada).
### Step 2 — GREEN: perbaiki bug bila ada (policy/query scope).
### Step 3 — verifikasi: `vendor/bin/pest tests/Feature/Security/CrossUserLeakTest.php`.
### Step 4 — Commit:
```bash
git commit -m "test(api): consolidate cross-user data leak protection coverage (security audit 10a)"
```

---

## Task 5: Error produksi, CORS, cookie, `.env`, password demo

**Files:**
- Create: `apps/api/config/cors.php`
- Modify: `apps/api/.env.example` (opsional — tambahkan komentar prod)
- Create: `tests/Feature/Security/ProductionSecurityTest.php` (sejauh bisa diuji)
- (10c) Catat di `docs/ops/DEPLOYMENT.md`

**Detail per item (ROADMAP:851-855):**
1. **Error produksi tidak bocor stack trace:** Exception handler sudah menjalankan `app()->hasDebugModeEnabled() ? $e->getMessage() : 'Server error.'`. **Verifikasi** dengan test: set `APP_DEBUG=false` (override config saat test), trigger exception, assert response body tidak memuat `file`/`line`/`trace`. Test `ExceptionHandlerTest` mungkin sudah — perluas bila belum meng-cover mode produksi.
2. **CORS dibatasi ke origin frontend:** Buat `config/cors.php` — `allowed_origins` = env `FRONTEND_URL` (default `http://localhost:3000`), `allowed_methods` API penuh, `supports_credentials: true` (cookie). Catatan: BFF membuat CORS browser hampir tak terpakai, tapi least-privilege tetap diminta ROADMAP. Jangan aktifkan `allow_any_origin` di produksi.
3. **Cookie:** `httpOnly` sudah di `apps/web/src/lib/server/session.ts`. Pastikan `secure` di-toggle lewat env (`NODE_ENV === 'production'`) — sudah. `sameSite: 'lax'` — sudah. Verifikasi & dokumentasikan domain produksi di 10c.
4. **`.env` tidak pernah masuk git:** `.gitignore` sudah memuat `.env`. Verifikasi `git ls-files | grep '\.env$'` kosong (test shell / manual).
5. **Password demo diganti untuk deploy publik (Addendum §2.3):** Jangan hardcode password produksi. Di `docs/ops/DEPLOYMENT.md` (10c) sediakan langkah wajib: ganti password 4 akun demo sebelum publik, atau seed dengan env `DEMO_PASSWORD`. Jangan ubah `DemoUserSeeder` untuk dev.

### Step 1 — RED: test untuk error produksi + CORS (bila bisa).
### Step 2 — GREEN: `config/cors.php` + perbaikan.
### Step 3 — verifikasi: `vendor/bin/pest tests/Feature/Security/ProductionSecurityTest.php` + seluruh suite.
### Step 4 — Commit:
```bash
git commit -m "fix(api): restrict CORS to frontend origin and verify production error responses (security audit 10a)"
```

---

## Task 6: Laporan audit & known-risk

**Files:**
- Create: `apps/api/../docs/ops/SECURITY-AUDIT.md` (atau tempel ke 10c `docs/ops/DEPLOYMENT.md`; pilih: buat file audit terpisah agar jejak laporan rapi)
- (10c) Referensikan dari `docs/ops/DEPLOYMENT.md`

**Detail:** Ringkas seluruh temuan 10a ke tabel: temuan → severity → status (fixed/tested / known-risk) → test yang membuktikan. Known-risk hanya untuk hal yang butuh keputusan infra (mis. rate limit global vs per-user, apakah `FRONTEND_URL` perlu whitelist multi-origin).

### Step 1 — Tulis `docs/ops/SECURITY-AUDIT.md`.
### Step 2 — Commit:
```bash
git commit -m "docs(ops): add security audit report (phase 10a)"
```

---

## Exit Criteria 10a

- [ ] Tidak ada route tanpa penjaga (verifikasi checklist PERMISSION-MATRIX vs route nyata).
- [ ] `$fillable` semua model user-input tidak memuat kolom server-set (test otomatis).
- [ ] `throttle:search` diterapkan & 429 teruji.
- [ ] Cross-user leak protection terkonsolidasi dalam satu test suite.
- [ ] Error produksi tidak memuat stack trace; CORS terbatas origin frontend; cookie httpOnly/secure/sameSite terverifikasi; `.env` tidak ter-track; password demo produksi terdokumentasi.
- [ ] `docs/ops/SECURITY-AUDIT.md` ada; known-risk tercatat.
- [ ] `vendor/bin/pest`, `vendor/bin/pint --dirty --format agent` hijau.
