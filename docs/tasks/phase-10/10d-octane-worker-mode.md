# Sub-tahap 10d — Octane Worker Mode

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Keputusan user: Octane worker mode **wajib dikerjakan** sebagai sub-tahap terpisah. Namun prinsip K5 dan ROADMAP:886-887 tetap berlaku — worker mode adalah **opsi performa**, bukan tujuan; aplikasi ITSM yang benar (tanpa kebocoran state antar-user) adalah tujuannya. Jika ada keraguan sekecil apa pun, dokumentasikan keputusan untuk tetap di classic mode di `docs/ops/DEPLOYMENT.md`.

**Goal:** Pasang & verifikasi Octane worker mode (FrankenPHP server) dengan seluruh test suite hijau terhadap mode worker; **atau** keputusan terdokumentasi untuk tetap classic mode beserta alasan teknis.

**Branch:** `feat/phase-10d-octane`
**Estimasi:** ~0,75 hari
**Prasyarat:** CI hijau (10c) — test suite lengkap sebagai jaring pengaman; Docker produksi (10b).

---

## Task 1: Pasang Octane (versi dikunci)

**Files:**
- Modify: `apps/api/composer.json`, `apps/api/composer.lock`

**Detail (ROADMAP:881):** `laravel/octane:^2.19` (Octane 3 belum tersedia). Jalankan:
```bash
cd apps/api
composer require laravel/octane:^2.19
php artisan octane:install --server=frankenphp
```
`octane:install` menerbitkan `config/octane.php`. Verifikasi server yang dipilih = `frankenphp` (bukan RoadRunner/Swoole) — konsisten dengan runtime produksi (K2).

> **Jebakan — FrankenPHP + worker mode membutuhkan worker count:** `config/octane.php` berisi `server` & `workers`. Untuk dev, 1 worker cukup. Pastikan konfigurasi tidak bentrok dengan container FrankenPHP classic (lihat Task 4 — ini dipakai di compose prod sebagai *opsi*, image dasar sama).

### Step 1 — Install & publish config.
### Step 2 — Verifikasi:
```bash
php artisan octane:status   # menunjukkan tidak berjalan (fresh)
```
### Step 3 — Commit:
```bash
git add apps/api/composer.json apps/api/composer.lock apps/api/config/octane.php
git commit -m "feat(api): install laravel/octane with frankenphp server"
```

---

## Task 2: Audit state bocor (code review sistematis)

**Files:**
- (Baca saja) `apps/api/app/**`, `apps/api/config/**`
- Create: `docs/ops/OCTANE-AUDIT.md` (temuan)

**Detail (ROADMAP:883):** Audit pola yang membocorkan state antar-request pada worker mode:
- **Singleton yang menyimpan data per-request** — scan `app/` untuk `singleton` bindings di `AppServiceProvider` & service yang menyimpan state di property instance. Repo memakai service per-request (instantiated baru via container per request) — verifikasi tidak ada yang meng-cache data user di property.
- **`static` property** — grep `static $` / `private static` di `app/`. `ApiResponse` (helper) harus stateless. `SlaService`, `AbilityMatrix`, dsb. diverifikasi tidak menyimpan per-user.
- **Konfigurasi yang dimutasi saat runtime** — config repo dibaca (tidak di-set) — verifikasi tidak ada `config([...]) = ` di runtime.
- **Facade/query cache** — `Cache::`, DB query log (jangan aktifkan `DB::enableQueryLog` di produksi), rate limiter (state Redis/DB, aman antar-worker).

> **Jebakan — false positive:** Service yang di-inject Laravel container **per-request** (default) aman. Yang berbahaya adalah singleton yang property-nya berubah per user. Baca `AppServiceProvider` bindings & service `__construct` untuk memastikan tidak ada yang `$this->user = ...` lalu dipakai lintas request.

### Step 1 — Scan & catat temuan di `docs/ops/OCTANE-AUDIT.md` (tabel: lokasi → risiko → keputusan).
### Step 2 — Perbaiki temuan nyata (bila ada) dengan test (RED→GREEN).
### Step 3 — Commit:
```bash
git add docs/ops/OCTANE-AUDIT.md
git commit -m "docs(ops): record octane worker-mode state-leak audit findings"
```

---

## Task 3: Jalankan seluruh test suite terhadap mode worker

**Files:** tidak ada perubahan kode (kecuali temuan Task 2).

**Detail (ROADMAP:884):** Jalankan test dengan Octane worker aktif:
```bash
# Jalankan Octane (dev, FrankenPHP) di background
php artisan octane:start --server=frankenphp --host=127.0.0.1 --port=8001
# Suite backend (terhadap kode yang sama; HTTP test memakai in-memory SQLite — verifikasi tetap hijau)
vendor/bin/pest
# Matikan
php artisan octane:stop
```
> Catatan: `php artisan test` memakai `RefreshDatabase` + SQLite in-memory dan **tidak** membutuhkan server HTTP sungguhan. Untuk benar-benar menguji worker, jalankan subset test HTTP nyata ke `127.0.0.1:8001` (atau uji manual Task 4). Tujuan utama Task 3: pastikan tidak ada test yang bergantung pada state yang tidak di-reset antar-request.

### Step 1 — Jalankan suite terhadap worker (atau dokumentasikan batasan & jalankan uji manual Task 4).
### Step 2 — Perbaiki kegagalan bila ada.

---

## Task 4: Uji manual dua-user (bukti tidak ada data tertukar)

**Files:** (tidak ada perubahan — verifikasi)

**Detail (ROADMAP:885):** Bukti paling penting: login sebagai dua user berbeda secara bergantian dan pastikan tidak ada data yang tertukar.
1. Jalankan stack produksi dengan **worker mode** Octane (ganti entrypoint API: `php artisan octane:start --server=frankenphp --host=0.0.0.0 --port=8000`) — atau di dev.
2. Login `employee@…` → buka ticket miliknya → logout.
3. Login `manager@…` → buka dashboard manager → pastikan **tidak** menampilkan data employee.
4. Ulangi beberapa kali; verifikasi `/me` selalu mengembalikan user yang sedang login.
5. Cek header/tidak ada cache respons lintas user (Cache-Control/private).

### Step 1 — Jalankan skenario; catat hasil di `docs/ops/OCTANE-AUDIT.md`.

---

## Task 5: Keputusan final — worker mode vs classic

**Files:**
- Modify: `docs/ops/DEPLOYMENT.md`

**Detail (K5):** Ambil keputusan terdokumentasi:
- **Aktif worker mode di produksi** bila audit bersih + test hijau + uji dua-user lolos → update `compose.prod.yaml`/Dockerfile untuk `octane:start` (opsional, default compose prod tetap classic).
- **Tetap classic mode** bila ada keraguan → tulis alasan teknis di `DEPLOYMENT.md` (sesuai ROADMAP:886). Ini **bukan kegagalan sub-tahap** — ini keputusan engineering yang sah.

### Step 1 — Update `docs/ops/DEPLOYMENT.md` dengan keputusan + cara menjalankan (untuk kedua mode).
### Step 2 — Commit:
```bash
git add docs/ops/DEPLOYMENT.md
git commit -m "docs(ops): record octane worker-mode decision in deployment guide"
```

---

## Exit Criteria 10d

- [ ] `laravel/octane:^2.19` ter-install, server `frankenphp`, `config/octane.php` ada.
- [ ] Audit state bocor selesai (`docs/ops/OCTANE-AUDIT.md`): singleton per-request, `static`, mutasi config — semuanya terverifikasi/tidak ada temuan.
- [ ] Test suite hijau terhadap mode worker (atau batasan terdokumentasi).
- [ ] Uji manual dua-user membuktikan tidak ada data tertukar.
- [ ] Keputusan final (worker aktif / classic) terdokumentasi di `docs/ops/DEPLOYMENT.md`.
- [ ] `vendor/bin/pest` hijau.
