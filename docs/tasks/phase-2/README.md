# FASE 2 — Backend Fondasi & Walking Skeleton · Rencana Implementasi

> **Untuk agentic worker:** SUB-SKILL WAJIB — pakai `superpowers:subagent-driven-development`
> (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi rencana ini task demi task.
> Setiap langkah memakai sintaks checkbox (`- [ ]`) supaya progresnya bisa dilacak.

**Goal:** Membangun seluruh lapisan data, autentikasi, dan otorisasi JARVIS OPS, lalu membuktikan
alur auth berjalan dari browser sampai database sebelum fitur apa pun dibangun di atasnya.

**Architecture:** Laravel 13 sebagai API JSON beramplop tunggal di `apps/api`, Next.js 16 sebagai
BFF (Backend For Frontend) di `apps/web`. Token Sanctum tidak pernah menyentuh JavaScript browser —
ia disimpan di cookie `httpOnly` oleh Route Handler Next.js dan disisipkan server-side ke setiap
request lewat proxy. Otorisasi memakai Gate/Policy bawaan Laravel berbasis kolom `users.role_id`,
dengan matriks permission direifikasi menjadi satu struktur data PHP yang bisa diuji.

**Tech Stack:** PHP 8.5 · Laravel 13.29 · Sanctum 4 · Pest 5 (PHPUnit 13) · Pint · MySQL 8.4
(dev/prod) · SQLite in-memory (test) · Next.js 16.3 · React 19 · TypeScript 5 · Tailwind v4 ·
FrankenPHP classic mode · Docker Compose.

**Spec:** Fase ini tidak punya design doc terpisah. Spec-nya adalah dokumen `docs/` yang sudah
disetujui, dibaca dengan urutan otoritas di bawah:

| Dokumen | Perannya untuk Fase 2 |
| --- | --- |
| `docs/adr/DECISIONS.md` | D-01..D-24. **Otoritas tertinggi.** Bagian A (skema) dan B (otorisasi) adalah Fase 2. |
| `docs/product/PERMISSION-MATRIX.md` | Sumber `AbilityMatrix`, aturan 403-vs-404, checklist test otorisasi §6 |
| `docs/product/STATUS-TRANSITION.md` | Flag `is_closed`/`is_final` pada seeder status; matriks transisinya sendiri baru dipakai Fase 3 |
| `docs/api/API-CONTRACT.md` | Bentuk envelope (§2), status code (§3), query param (§4), endpoint auth (§5), server-set fields (§13), rate limit (§12) |
| `docs/architecture/ERD.md` · `docs/schema.sql` | Bentuk 18 tabel. **Migration adalah source of truth**; `schema.sql` lampiran laporan, disinkronkan Fase 10 |
| `docs/product/ROADMAP.md` | Task checklist & exit criteria Fase 2 (baris 216–316) |
| `docs/product/PRD.md` | §8 kategori, §9 priority, Addendum §2.3 akun demo, BR-016..BR-020 |

Urutan otoritas saat bertentangan (DECISIONS §2):
`DECISIONS.md` > `STATUS-TRANSITION.md` / `PERMISSION-MATRIX.md` > `API-CONTRACT.md` >
`ERD.md` / `schema.sql` > `ROADMAP.md` > `PRD.md`.

---

## Global Constraints

Berlaku untuk **setiap** task di seluruh sub-tahap. Nilai di bawah dikutip verbatim dari spec.

### Envelope & kontrak API

- Setiap respons — sukses maupun gagal — memakai satu envelope:
  sukses `{ success, message, data, meta? }`, gagal `{ success, message, errors }`.
- **Jangan pernah** mengembalikan Eloquent Resource telanjang atau body 422 mentah Laravel.
- `meta` berisi **tepat enam kunci**: `current_page`, `per_page`, `total`, `last_page`, `from`,
  `to`. **Tidak ada `links`** (API-CONTRACT §2.2).
- **`204` tidak pernah dipakai** — selalu kembalikan body beramplop (API-CONTRACT §3).
- Setiap pembuatan resource yang berhasil mengembalikan **`201`** (D-22).
- Header `Accept: application/json` diasumsikan; tanpa itu Laravel bisa mengembalikan redirect HTML.

### Format data

- Timestamp: **ISO 8601 UTC**, contoh `2026-08-31T10:00:00Z`. Server dan DB **UTC murni**
  (`APP_TIMEZONE=UTC`, sudah terpasang di `config/app.php:68`). Frontend mengonversi ke
  `Asia/Jakarta` (D-23).
- Tanggal saja: `YYYY-MM-DD`.
- Durasi: **selalu integer menit**.
- Penamaan field: `snake_case`. Penamaan route: `kebab-case`, resource plural.

### Bahasa (D-24)
- Envelope `message`: **Bahasa Inggris**.

- Pesan validasi (custom `messages()` di FormRequest): **Bahasa Indonesia** (D-24).

- Body notifikasi in-app + `audit_logs.description`: **Bahasa Indonesia**.
- Dokumen di `docs/` (termasuk berkas rencana ini): **Bahasa Indonesia**.
- Komentar kode, nama variabel, nama method: **Bahasa Inggris**.

### Database

- Charset `utf8mb4`, collation `utf8mb4_unicode_ci`, engine `InnoDB` (D-14 poin 13). Sudah default
  di `config/database.php:56-57`; `engine` biarkan `null` (InnoDB default MySQL 8).
- **Migration adalah source of truth skema.** `docs/schema.sql` tidak dieksekusi dan tidak
  disinkronkan di fase ini.
- Test berjalan terhadap **SQLite in-memory** (`phpunit.xml`), `apps/api/.env` mengarah ke
  **MySQL**. Verifikasi `migrate:fresh` + `migrate:rollback` **wajib dilakukan terhadap MySQL** —
  SQLite lebih permisif soal urutan drop foreign key.

### Otorisasi

- **Hanya Gate/Policy bawaan Laravel.** Satu role per user lewat `users.role_id`.
  **Jangan** pasang `spatie/laravel-permission`.
- Token Sanctum diterbitkan dengan ability `['*']`. Otorisasi **tidak pernah** dibaca dari token.
- `Gate::before` meloloskan Admin, dengan tiga pengecualian eksplisit (D-16).
- Policy/Gate **selalu dievaluasi sebelum** validasi state machine (D-17).
- Scoping dilakukan **di query**, bukan dengan memfilter hasil setelah diambil.
- Filter dari client diterapkan **setelah** scoping role — filter tidak boleh memperluas cakupan.

### Perkakas

- `vendor/bin/pint --dirty --format agent` **wajib** dijalankan setelah menyentuh berkas PHP apa pun.
- `laravel/pao` terpasang, jadi Pint dan test mengeluarkan **JSON satu baris**, bukan output
  TAP biasa. Itu perilaku yang benar, bukan misconfiguration.
- Branch: `feat/phase-2<x>-<topik>`, merge ke `main` lewat PR walau solo.
- Perintah backend dijalankan dari `apps/api`; perintah frontend dari `apps/web`.

---

## Resolusi Konflik Antar-Dokumen

Tujuh kontradiksi ditemukan saat membaca spec. Semuanya sudah diresolusi memakai urutan otoritas
DECISIONS §2. **Jangan buka ulang keputusan ini saat implementasi.**

| # | Konflik | Resolusi | Dasar |
| --- | --- | --- | --- |
| 1 | Nama & ID role: D-15 pin `1=administrator, 2=manager, 3=technician, 4=employee`; PERMISSION-MATRIX §1 menulis enum `Admin = 'admin'`; ROADMAP:254 menulis urutan `employee, technician, manager, admin`; API-CONTRACT:161 mencontohkan `employee` dengan `id: 1` | **D-15 menang.** Enum `case Admin = 'administrator'`. ID: 1=administrator, 2=manager, 3=technician, 4=employee | DECISIONS > PERMISSION-MATRIX > API-CONTRACT > ROADMAP |
| 2 | `ticket_number VARCHAR(30)` (`schema.sql:177`) vs `VARCHAR(50)` (D-05) | **`VARCHAR(50)`** | DECISIONS > schema.sql |
| 3 | ROADMAP:270 "Token ability diberikan sesuai role" vs PERMISSION-MATRIX §1 "Gate/Policy penjaga tunggal" | Token `['*']`; otorisasi murni Gate/Policy. `GET /api/me` mengembalikan `permissions` yang **dihitung dari role saat itu**, bukan dibaca dari token | PERMISSION-MATRIX > ROADMAP |
| 4 | `/api/health` disebut PERMISSION-MATRIX §4 dan ROADMAP:285, tapi yang ada `/up` (`bootstrap/app.php:13`) | Tambah `GET /api/health` beramplop. `/up` **tetap ada** untuk healthcheck container Docker | Keduanya dipertahankan, beda konsumen |
| 5 | `schema.sql` tidak punya `must_change_password`, `audit_logs.description`, `knowledge_articles.published_at`, `ticket_categories.parent_id` | Migration mengikuti **D-14**. `schema.sql` disinkronkan di Fase 10 (sudah jadi task di ROADMAP:844) | DECISIONS > schema.sql |
| 6 | PERMISSION-MATRIX §3.2 memberi Employee `changeStatus` "own terbatas", tapi §5 menyatakan non-reporter → 404 | Bukan konflik, tapi urutan evaluasinya wajib: Policy dulu (404/403), baru state machine (422) | D-17 |
| 7 | `schema.sql:313` memberi `notifications` kolom `updated_at`, tapi ROADMAP:247 menyiratkan ia append-only | `notifications` pakai `timestamps()` penuh. Append-only murni (`created_at` saja): `asset_histories`, `ticket_attachments`, `ticket_histories`, `audit_logs` | schema.sql + ERD §5 poin 5 |

### Penafsiran exit criteria yang butuh catatan

ROADMAP:315 berbunyi "Setiap ability di permission matrix punya minimal satu test negatif". Tapi
mayoritas ability di PERMISSION-MATRIX §3 (`TicketPolicy@*`, `AssetPolicy@*`, `ArticlePolicy@*`)
menjaga endpoint yang **baru lahir di Fase 3–6**. Menulis test HTTP untuknya sekarang berarti
membuat controller kosong hanya supaya ada yang bisa ditembak — itu menghasilkan kode mati.

**Penafsiran yang dipakai:**

1. Ability yang **murni bergantung role** (§3.1 auth/profil, §3.7 dashboard, §3.8 administrasi)
   didefinisikan **penuh** di Fase 2 dan diuji lewat `Gate::forUser()` — positif dan negatif,
   4 role × seluruh ability. Ini memenuhi "setiap ability punya test negatif" secara harfiah.
2. Ability berbasis **kepemilikan resource** (§3.2–3.6) terdaftar di `AbilityMatrix` dengan
   penanda `pending`, tapi Policy-nya ditulis di fase pemilik endpoint-nya. Test yang gagal
   kalau ada ability `pending` yang tidak punya Policy di akhir Fase 6 menjadi jaring pengaman.
3. Test HTTP di Fase 2 hanya menutup endpoint yang benar-benar ada: auth, profil, health.

---

## Dekomposisi Sub-Tahap

Empat sub-tahap berurutan. Masing-masing satu branch → PR → merge ke `main`.
**Jangan mulai sub-tahap berikutnya sebelum exit criteria sub-tahap sebelumnya terpenuhi.**

| Sub-tahap | Branch | Berkas rencana | Deliverable |
| --- | --- | --- | --- |
| 2a | `feat/phase-2a-schema` | [`2a-schema-model-seeder.md`](2a-schema-model-seeder.md) | 18 migration, 18 model, enum, factory, seeder idempoten |
| 2b | `feat/phase-2b-app-layer` | [`2b-application-layer.md`](2b-application-layer.md) | `ApiResponse`, exception handler, `HandlesPagination`, rate limiter, `GET /api/health` |
| 2c | `feat/phase-2c-auth-rbac` | [`2c-auth-rbac.md`](2c-auth-rbac.md) | `AbilityMatrix`, Gate, middleware, login/logout/me/profil/ganti-password |
| 2d | `feat/phase-2d-walking-skeleton` | [`2d-walking-skeleton.md`](2d-walking-skeleton.md) | BFF proxy Next.js, cookie httpOnly, halaman login + halaman terproteksi |

### Kenapa urutannya begitu

2a lebih dulu karena semua sub-tahap lain butuh `users.role_id` dan enum `RoleName` untuk ada.
2b sebelum 2c karena `AuthController` mengembalikan `ApiResponse` dan mengandalkan exception
handler untuk 401/403/422 — menulis auth dulu berarti menulis penanganan error dua kali. 2d
terakhir karena ia mengonsumsi endpoint yang lahir di 2c.

---

## Exit Criteria Fase 2 (gabungan)

Diambil dari ROADMAP:310-315, dengan penafsiran di atas diterapkan.

- [ ] `php artisan migrate:fresh --seed` sukses terhadap MySQL, 18 tabel domain terisi data referensi
- [ ] `php artisan migrate:fresh` lalu `php artisan migrate:rollback` bersih tanpa error FK (MySQL)
- [ ] Seeder dijalankan dua kali berturut-turut tanpa error (idempoten)
- [ ] Login dari browser berhasil, cookie `httpOnly` terpasang, halaman terproteksi menampilkan nama user
- [ ] Token **tidak** terlihat di `document.cookie` maupun di response body yang diterima browser
- [ ] Employee dengan `status = 'inactive'` tidak bisa login (BR-019)
- [ ] Seluruh test Pest hijau: `php artisan test`
- [ ] Setiap ability role-based di `AbilityMatrix` punya test positif **dan** negatif
- [ ] `vendor/bin/pint --test` bersih
- [ ] `npm run build` dan `npm run lint` di `apps/web` bersih
- [ ] Tidak ada route registrasi publik (BR-016)

## Di Luar Cakupan Fase 2

Dibuat **migration, model, factory, dan barisnya di `AbilityMatrix`** — tapi **tanpa controller,
tanpa route, tanpa Policy**:

- Ticket beserta comment/attachment/history dan seluruh workflow-nya → Fase 3
- SLA scheduler, notification service, audit logger → Fase 4
- Asset management, knowledge base, attachment, CRUD user Admin → Fase 5
- Endpoint dashboard → Fase 6

Juga tidak dikerjakan di Fase 2:

- Endpoint referensi read-only (`GET /api/roles`, `/departments`, `/ticket-categories`,
  `/ticket-priorities`, `/ticket-statuses`, `/knowledge-categories`) → menyusul bersama konsumennya
- shadcn/ui, TanStack Query, Recharts, react-hook-form, zod → Fase 7
- Proxy `multipart/form-data` dan streaming download → Fase 7 (ROADMAP:628)
- Konfigurasi CORS → Fase 10. Browser tidak pernah memanggil Laravel langsung; hanya Next.js
  server-side. Menambah CORS sekarang justru menyiratkan jalur akses yang ingin kita tutup.
- Sinkronisasi `docs/schema.sql` → Fase 10 (ROADMAP:844)
