# Laporan Security Audit & Hardening (Fase 10a)

**Tanggal:** September 2026  
**Status:** Selesai (Semua temuan ditutup dengan test otomatis)  
**Dokumen Referensi:** `docs/product/PERMISSION-MATRIX.md`, `docs/tasks/phase-10/10a-security-audit-hardening.md`, `docs/adr/DECISIONS.md` (D-16)

---

## 1. Ringkasan Eksekutif

Audit keamanan menyeluruh dilakukan terhadap seluruh endpoint API (61 rute), model Eloquent (18 model), konfigurasi CORS, rate limiting, penanganan error produksi, dan isolasi data lintas-pengguna (cross-user data leak protection).

Seluruh temuan telah diverifikasi dengan pengujian otomatis (*test-driven*) di bawah direktori `apps/api/tests/Feature/Security/` dan 699 pengujian backend berjalan 100% hijau.

---

## 2. Matriks Temuan & Status Remediasi

| ID | Area / Temuan | Tingkat Risiko | Status | Bukti Pengujian |
|---|---|---|---|---|
| SEC-01 | Rate limiter `search` (60 req/mnt) telah didefinisikan namun belum diterapkan pada rute list/search (`tickets`, `articles`, `assets`) | Sedang | **Fixed & Tested** | `RateLimitTest.php` (429 pada request ke-61) |
| SEC-02 | Rute `POST /api/tickets` belum memanggil eksplisit `$this->authorize('create', Ticket::class)` sesuai baris 249 PERMISSION-MATRIX | Rendah | **Fixed & Tested** | `RouteAuthorizationAuditTest.php` & `TicketController::store` |
| SEC-03 | File konfigurasi `config/cors.php` belum ada (menggunakan default framework tanpa batasan eksplisit origin) | Sedang | **Fixed & Tested** | `ProductionSecurityTest.php` & `config/cors.php` |
| SEC-04 | Audit mass-assignment: potensi manipulasi `reporter_id`, `status_id`, `role_id`, `author_id`, dan `view_count` via request input | Tinggi | **Verified Safe** | `MassAssignmentAuditTest.php` (request layer guardrail) |
| SEC-05 | Proteksi kebocoran data antar pengguna (cross-user data isolation: tiket, lampiran, aset, notifikasi, audit log) | Tinggi | **Verified Safe** | `CrossUserLeakTest.php` (terkonsolidasi 6 skenario) |
| SEC-06 | Respon error server (500) berpotensi membocorkan trace, file, atau baris saat debug aktif | Tinggi | **Verified Safe** | `ProductionSecurityTest.php` (`app.debug=false` menyembunyikan trace) |
| SEC-07 | Keberadaan file sensitif kredensial `.env` pada version control | Kritis | **Verified Safe** | `ProductionSecurityTest.php` (`git ls-files` bersih dari `.env`) |
| SEC-08 | Pengaturan cookie autentikasi pada client (BFF Next.js) | Tinggi | **Verified Safe** | `session.ts` (`httpOnly: true`, `secure: prod`, `sameSite: lax`) |

---

## 3. Detail Verifikasi & Bukti Uji

### 3.1 Rate Limiting (`RateLimitTest.php`)
- `GET /api/tickets?search=...` dibatasi 60 request per menit per user/IP. Request ke-61 menerima respon HTTP 429 Too Many Requests.
- `GET /api/articles?search=...` dan `GET /api/assets?search=...` terlindungi batas yang sama.

### 3.2 Otorisasi Rute (`RouteAuthorizationAuditTest.php`)
- Rute publik (`/api/health`) dapat diakses tanpa token.
- Rute terproteksi menolak request tanpa token dengan HTTP 401 Unauthenticated.
- Rute administratif (`/api/users`, `/api/roles`, `/api/technicians`, `/api/dashboard/admin`, dsb.) menolak role yang tidak berhak dengan HTTP 403 Forbidden.

### 3.3 Mass-Assignment Guard (`MassAssignmentAuditTest.php`)
- Tidak ada model yang mengekspos `created_at`, `updated_at`, atau `deleted_at` dalam array `$fillable`.
- Pembuatan tiket mengabaikan `reporter_id`, `status_id`, `ticket_number`, `sla_breached`, dan `sla_duration_minutes` yang disuntikkan pengguna.
- Pembaruan profil `/api/me` menolak eskalasi hak istimewa seperti `role_id`, `status`, atau perubahan `email`.
- Pembuatan artikel menetapkan `author_id` dari user login dan mengabaikan nilai `view_count`.

### 3.4 Cross-User Data Leak Protection (`CrossUserLeakTest.php`)
- Employee yang mencoba mengakses tiket, riwayat, komentar, atau status tiket milik employee lain menerima respon HTTP 404 (bukan 403, sesuai prinsip kerahasiaan keberadaan resource).
- Pengunduhan lampiran (`/api/attachments/{id}/download`) dibatasi ketat bagi partisipan tiket. Non-partisipan menerima HTTP 404.
- Notifikasi pengguna lain tidak dapat ditandai baca oleh siapa pun termasuk Administrator (pengecualian D-16 #3).
- Pengguna hanya melihat aset miliknya di `/api/my-assets` dan tidak dapat mengaitkan aset pengguna lain pada tiket.
- Manager hanya dapat melihat modul audit log operasional (`ticket`, `asset`, `article`). Akses ke modul admin menghasilkan HTTP 404.

### 3.5 Pengerasan Konfigurasi Produksi (`ProductionSecurityTest.php`)
- `config/cors.php` membatasi `allowed_origins` hanya pada URL frontend (`env('FRONTEND_URL')`), melarang wildcard `*` saat `supports_credentials: true`.
- Respon exception 500 mengembalikan pesan seragam `"Server error."` tanpa metadata debug internal (`file`, `line`, `trace`) saat `APP_DEBUG=false`.
- Repository bersih dari pelacakan file `.env`.

---

## 4. Known Risks & Rekomendasi Deployment (Fase 10c)

1. **Multi-Origin Frontend:** Konfigurasi CORS saat ini mendukung satu origin default (`http://localhost:3000`). Untuk staging/produksi dengan banyak domain, daftarkan seluruh origin di variabel `FRONTEND_URL` dipisahkan koma.
2. **Kredensial Akun Demo:** Empat akun bawaan seeder (`admin@jarvisops.test`, `manager@jarvisops.test`, `technician@jarvisops.test`, `employee@jarvisops.test`) wajib diubah password-nya saat deploy publik (Addendum §2.3) atau menggunakan `DEMO_PASSWORD` di environment produksi.
