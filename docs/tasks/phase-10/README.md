# Fase 10 — Quality, Deployment, Demo (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Bacalah README ini sebagai peta. Fase 10 adalah **fase terakhir** — tujuannya mengubah aplikasi yang berfungsi menjadi aplikasi yang **bisa dipertahankan di depan reviewer** (ROADMAP:839): audit keamanan, Docker produksi, CI, Octane worker mode, dokumentasi, dan demo yang siap presentasi. Kerjakan sub-tahap 10a–10g secara berurutan.
>
> **Skill frontend wajib (gunakan yang sama dengan sesi fase 8 yang sudah berjalan):** `impeccable`, `next-best-practices`, `vercel-react-best-practices`, `shadcn`, `frontend-design`, `tailwindcss-development`, `test-driven-development`. Muat skill-skill ini lewat tool `skill` sebelum menulis kode frontend (mis. `CsvExportButton` di 10f, polish UI di 10e).
>
> **Konvensi centang:** `[x]` = sudah terpenuhi saat dokumen ini ditulis (Fase 9 diasumsikan selesai dan di-merge, tag `v0.9.0` sudah ada di `main`). `[ ]` = pekerjaan sub-tahap. Jangan membangun ulang yang sudah `[x]`.

**Goal:** Aplikasi berjalan di container produksi (`docker compose -f compose.prod.yaml up` dari kondisi bersih), CI hijau di `main`, dokumentasi lengkap (termasuk `docs/ops/DEPLOYMENT.md` & `docs/ops/TESTING.md`), `docs/schema.sql` tersinkron dengan migration final, golden path §38 PRD siap didemokan tanpa kesalahan, dan — atas keputusan user — **Octane worker mode dikerjakan sebagai sub-tahap wajib**, dengan Export CSV sebagai prioritas buffer.

**Basis asumsi:** Fase 9 (Dashboard UI) **sudah selesai dan di-merge**, tag `v0.9.0` ada di `main`, seluruh exit criteria Fase 9 hijau. Bila asumsi meleset, **hentikan** dan selesaikan Fase 9 lebih dulu.

**Branch:** `feat/phase-10<sub>` per sub-tahap, di-merge ke `main` via PR.
**Estimasi:** ~5,75 hari (ROADMAP: Minggu 7 hari 4 – Minggu 8; Minggu 8 memang buffer).
**Tag final:** `v1.0.0` (D-30).

---

## Peta sub-tahap

| Sub | Topik | File | Estimasi | Branch |
| --- | --- | --- | --- | --- |
| 10a | Security Audit & Hardening | `10a-security-audit-hardening.md` | ~0,75 hari | `feat/phase-10a-security` |
| 10b | Docker Produksi | `10b-docker-produksi.md` | ~1,0 hari | `feat/phase-10b-docker-prod` |
| 10c | CI & Dokumentasi | `10c-ci-dokumentasi.md` | ~1,0 hari | `feat/phase-10c-ci-docs` |
| 10d | Octane Worker Mode | `10d-octane-worker-mode.md` | ~0,75 hari | `feat/phase-10d-octane` |
| 10e | Demo Data & Golden Path | `10e-demo-data-golden-path.md` | ~0,75 hari | `feat/phase-10e-demo` |
| 10f | Buffer + Export CSV + Bug Fixing | `10f-buffer-export-csv.md` | ~1,0 hari | `feat/phase-10f-buffer` |
| 10g | Final Check & Tag v1.0.0 | `10g-final-check-tag.md` | ~0,5 hari | `feat/phase-10g-final` |

Urutan: 10a (audit) → 10b (image produksi) → 10c (CI yang memakai `compose.prod.yaml`; dokumentasi bisa paralel) → 10d (Octane, butuh test suite yang lengkap — dikerjakan setelah CI hijau) → 10e (demo data, idealnya sebelum 10g) → 10f (buffer; bisa tumpang tindih) → 10g (finalisasi & tag, **harus paling akhir**).

---

## Dokumen acuan (urut otoritas)

1. `docs/adr/DECISIONS.md` — D-16 (admin bypass + dua pengecualian), D-30 (tag SemVer per fase, `v1.0.0` untuk rilis penuh), D-24 (bahasa pesan), §Lampiran audit rule (Fase 10).
2. `docs/product/PERMISSION-MATRIX.md` — baris-demi-baris audit route vs ability (65 route rows), §1 kapan 404 vs 403.
3. `docs/api/API-CONTRACT.md` — kontrak final; **harus sinkron** setelah semua amandemen fase sebelumnya.
4. `docs/schema.sql` — **lampiran laporan**; tersinkronkan dengan migration final di 10c (bukan executable).
5. `docs/architecture/ERD.md`, `BACKEND-ARCHITECTURE.md`, `FRONTEND-ARCHITECTURE.md`, `CONTEXT-DIAGRAM.md` — dasar catatan arsitektur untuk presentasi.
6. `docs/product/PRD.md` — §12 Definition of Technical Success (11 poin), §37 Definition of Done (10 poin), §38 Demo Scenario (golden path), §33 (6 pertanyaan reviewer).
7. `docs/product/ROADMAP.md` Fase 10 (berkas ini = rencana rincinya; perhatikan §Ruang lingkup opsional).
8. `PRODUCT.md` — produk truth untuk skill `impeccable` (tidak relevan untuk pekerjaan infra, tapi relevan untuk demo prep bila ada polish UI).

---

## Keputusan arsitektur Fase 10 (dikunci)

### K1 — Keamanan adalah audit, bukan refactor besar
10a **mengaudit dan memperbaiki titik temu**, bukan menulis ulang arsitektur. Temuan dikelompokkan: (a) langsung diperbaiki, (b) dicatat sebagai known-risk di `docs/ops/DEPLOYMENT.md` bila butuh keputusan infra lebih besar. Setiap perbaikan didahului test yang gagal (RED) lalu diperbaiki (GREEN). Tidak ada test → tidak ada perbaikan.

### K2 — Image produksi = multi-stage, source test tidak ikut
`docker/api/Dockerfile` (produksi) dan `docker/web/Dockerfile` (produksi) multi-stage:
- API: `composer install --no-dev --optimize-autoloader`, tanpa direktori `tests/`, `config:cache route:cache view:cache` saat build.
- Web: `output: 'standalone'` di `next.config.ts`, `next build`, image runtime ramping.
- Keduanya **terpisah dari `Dockerfile.dev`** yang tetap dipakai `compose.yaml` (dev).

### K3 — `compose.prod.yaml` = spec deploy yang diuji dari kondisi bersih
Empat service: `mysql`, `api` (FrankenPHP classic), `scheduler` (proses terpisah — wajib, lihat AGENTS.md), `web` (Next standalone). Volume persisten untuk `storage/app` (attachment) dan `mysql-data`. Healthcheck tiap service. Batas resource + `restart` policy. Migrasi jalan saat startup API dengan `--force`. Verifikasi exit criteria: `docker compose -f compose.prod.yaml up --build` dari bersih.

### K4 — CORS & cookie mengikuti topologi BFF
Frontend **tidak pernah** memanggil Laravel langsung — semua lewat BFF proxy (httpOnly cookie). Maka CORS di Laravel nyaris tidak dipakai browser; tetap konfigurasikan `config/cors.php` agar hanya mengizinkan origin frontend (prinsip least-privilege) + verifikasi cookie `httpOnly/secure/sameSite` mengikuti `APP_URL` produksi. Jangan memindahkan token ke tempat yang bisa dibaca JS.

### K5 — Octane worker mode dikerjakan sebagai sub-tahap wajib (10d), tapi "classic mode adalah default"
Keputusan user: Octane **wajib dikerjakan**. Namun sesuai ROADMAP:887 — jika saat 10d ada keraguan sekecil apa pun soal kebocoran state, atau test suite tidak hijau penuh, **tetap di classic mode dan dokumentasikan keputusannya di `docs/ops/DEPLOYMENT.md`**. Worker mode bukan tujuan; aplikasi ITSM yang benar adalah tujuannya. Gunakan `laravel/octane:^2.19` (bukan Octane 3). Hanya FrankenPHP server (bukan RoadRunner/Swoole) agar konsisten dengan runtime produksi K2.

### K6 — CI: satu workflow, jalankan di setiap push/PR ke `main`
GitHub Actions `.github/workflows/ci.yml`: Pint `--test`, Pest (backend), `tsc --noEmit`, `next lint`, `next build`, cache dependency composer+npm. **Tidak** menjalankan Playwright E2E di CI secara default (butuh MySQL + web + browser; mahal) — E2E tetap lokal/demo prep (10e), kecuali waktu buffer memungkinkan menambah job terpisah dengan service container.

### K7 — Dokumentasi = syarat lulus, bukan pelengkap
`docs/ops/DEPLOYMENT.md`, `docs/ops/TESTING.md`, sinkron `docs/schema.sql` + `API-CONTRACT.md` + `ROADMAP.md` + `README.md` adalah **exit criteria 10c** (ROADMAP:894-902). Catatan arsitektur presentasi (BFF, snapshot SLA, audit log, attachment lewat controller) ditulis di 10c dan dipoles di 10e.

### K8 — Demo data menghasilkan compliance mendekati contoh §14 PRD (~87%)
`DemoDataSeeder` diperluas (10e) agar: ticket menyebar di semua status, cukup ticket resolved **dalam SLA** agar compliance ±87%, beberapa breached (untuk highlight dashboard & notifikasi SLA), riwayat asset multi-pemegang, artikel KB yang terlihat di dashboard employee. Angka **deterministik** (bukan `rand()` sebanyak mungkin) supaya assert Playwright & demo stabil. DemoUserSeeder (4 akun, password `Password123!`) dipertahankan untuk dev; **password demo produksi diganti** (ROADMAP:854) via `.env.production.example` atau dokumentasi deploy (K10a).

### K9 — Export CSV (prioritas buffer, keputusan user)
Export **backend-driven** dengan stream (bukan menumpuk array di memori): satu endpoint per entity yang relevan untuk demo reviewer — tickets (dengan filter yang sama seperti list), assets, audit-logs. Dijaga ability yang sama dengan `viewAny` masing-masing. Format CSV dengan BOM UTF-8 agar terbuka benar di Excel Indonesia. Diprioritaskan di atas dark mode / advanced filtering / saved filters.

### K10 — Dark mode, advanced filtering, saved filters = di luar cakupan Fase 10
Dipindah dari buffer ROADMAP ke **"Di luar cakupan"** (keputusan user: export CSV lebih bernilai untuk reviewer; YAGNI). Bila 10f selesai lebih cepat dari estimasi, baru dipertimbangkan kembali — urutan: a11y enhancement > dark mode > advanced filtering.

---

## Titik awal — apa yang sudah ada (jangan dibangun ulang)

### Security (sebagian besar sudah)
- [x] Rate limiter terdefinisi: `login` (5/menit/IP), `upload` (20/menit/user), `search` (60/menit/user), `api` (120/menit/user) — `AppServiceProvider`.
- [x] `throttle:login` diterapkan di `/login`; `throttle:upload` diterapkan di route attachment.
- [x] Exception handler JSON 100% terstandarisasi (`bootstrap/app.php`): 401/403/404/405/422/429/409/500 tanpa stack trace saat `APP_DEBUG=false`.
- [x] Gate terdaftar dari `AbilityMatrix` + admin bypass (D-16), test `GateRegistrationTest`.
- [x] PERMISSION-MATRIX 65 route rows sebagai checklist audit.
- [x] Validasi attachment (ukuran 5MB, MIME + ekstensi) + otorisasi download via `AttachmentPolicy` (test `AttachmentSecurityTest`, `AttachmentValidationTest`).
- [x] `.env` di-gitignore; `APP_DEBUG` default `true` hanya di `.env.example` (dev).
- [ ] `config/cors.php` **belum ada** (pakai default Laravel) → perlu K4.
- [ ] `throttle:search` **didefinisikan tapi tidak diterapkan** ke endpoint search mana pun → temuan audit nyata (10a).
- [ ] Cross-user leak test (akses resource milik user lain lewat manipulasi ID) belum otomatis terpusat.
- [ ] Audit `$fillable` semua model belum menjadi test otomatis.

### Docker / CI / dokumentasi (hampir semuanya belum)
- [x] `compose.yaml` (dev), `docker/api/Dockerfile.dev`, `docker/web/Dockerfile.dev`, `docker/mysql/init/*`.
- [x] `Makefile` (up/down/migrate/fresh/seed/test/pint).
- [x] `.env.example` untuk kedua app.
- [ ] `compose.prod.yaml` — belum ada.
- [ ] `Dockerfile` produksi api & web (multi-stage) — belum ada.
- [ ] `.env.production.example` — belum ada (untuk kedua app).
- [ ] `.github/workflows/` — belum ada.
- [ ] `docs/ops/` — belum ada.
- [ ] `docs/schema.sql` out of sync dengan 24 migration final.

### Demo / test
- [x] `DemoUserSeeder` (4 akun dev: admin/manager/technician/employee).
- [x] `DemoDataSeeder` (10 asset, 11 artikel KB, ±10 ticket employee).
- [x] Test suite: ±98 file, ±475 test case backend; frontend Vitest; Playwright login smoke.
- [x] Playwright config (`apps/web/playwright.config.ts`), `e2e/login.spec.ts`.
- [x] Wireframe & API untuk dashboard (Fase 9 selesai) → demo step 12–13 §38 bisa didemokan.
- [ ] DemoDataSeeder belum menghasilkan compliance ±87% / breached / asset history multi-pemegang.
- [ ] Golden path §38 belum dijalankan end-to-end dari browser & diukur.
- [ ] 6 jawaban reviewer §33 belum ditulis.
- [ ] Backup skenario demo (screenshot/rekaman) belum disiapkan.

### Octane
- [ ] `laravel/octane` belum ter-install (`composer.json` require tidak memuatnya).
- [ ] Tidak ada audit state bocor (singleton per-request, `static`, mutasi config runtime).
- [ ] Test suite penuh = jaring pengaman; jalankan sebelum 10d.

---

## Exit criteria Fase 10 (ringkas; rinci per sub-tahap)

1. [ ] Semua temuan audit 10a diperbaiki atau didokumentasikan sebagai known-risk; tidak ada endpoint tanpa penjaga.
2. [ ] `docker compose -f compose.prod.yaml up` dari kondisi bersih menghasilkan aplikasi berfungsi (ROADMAP:930).
3. [ ] CI hijau di `main` (Pint, Pest, tsc, lint, build) (ROADMAP:931).
4. [ ] Octane worker mode aktif **atau** keputusan terdokumentasi untuk tetap classic mode (10d).
5. [ ] `docs/ops/DEPLOYMENT.md`, `docs/ops/TESTING.md`, `docs/schema.sql` (sinkron), `API-CONTRACT.md`, `ROADMAP.md`, `README.md` lengkap & sinkron.
6. [ ] DemoDataSeeder menghasilkan data realistis (compliance ±87%, breached, asset history); golden path §38 dijalankan tanpa kesalahan dalam latihan (ROADMAP:935); 6 jawaban reviewer siap.
7. [ ] 11 poin Definition of Technical Success (§12 PRD) & 10 poin Definition of Done (§37 PRD) terverifikasi.
8. [ ] Export CSV (prioritas buffer) selesai bila waktu memungkinkan.
9. [ ] Tidak ada bug kritis yang diketahui (ROADMAP:934).
10. [ ] Tag `v1.0.0` dibuat di `main` (D-30).

## Di luar cakupan Fase 10

- Dark mode, advanced filtering, saved filters (dipindah dari buffer; lihat K10).
- Email/SMTP notification, WebSocket, mobile native, AI (ROADMAP:50 — tidak pernah).
- Oktan hanya bila gagal diverifikasi → classic mode (dokumentasikan, bukan gagal).
- Perubahan skema besar (mis. soft-delete masif, normalisasi ulang) — hanya perbaikan kecil yang dibutuhkan audit.
