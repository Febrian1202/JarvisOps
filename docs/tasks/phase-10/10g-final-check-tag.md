# Sub-tahap 10g — Final Check & Tag v1.0.0

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap penutup. Verifikasi penuh semua exit criteria fase, perbarui dokumen status, lalu buat tag `v1.0.0` (D-30). **Harus menjadi merge terakhir ke `main`.**

**Goal:** Membuktikan 11 poin Definition of Technical Success (§12 PRD), 10 poin Definition of Done (§37 PRD), tidak ada bug kritis, dan menandai rilis penuh `v1.0.0`.

**Branch:** `feat/phase-10g-final`
**Estimasi:** ~0,5 hari
**Prasyarat:** 10a–10f selesai dan di-merge.

---

## Task 1: Verifikasi Definition of Technical Success (§12 PRD) — 11 poin

**Files:** tidak ada perubahan (verifikasi). Buat checklist di deskripsi PR/message bila perlu.

**Detail:** Buktikan tiap poin dengan test/aksi nyata:

| # | Poin §12 | Bukti (test/aksi) |
| --- | --- | --- |
| 1 | Employee tidak bisa pilih asset milik employee lain | `tests/Feature/Asset/AssetAssignmentTest` / request `asset_id` validasi kepemilikan |
| 2 | Employee tidak bisa membuat akun sendiri | tidak ada route registrasi; `tests/Feature/Auth` |
| 3 | Hanya Admin yang membuat user | `UserAdminTest` (ability user.create) |
| 4 | Ticket otomatis dapat SLA deadline | `CreateTicketTest` / snapshot SLA |
| 5 | Scheduler mendeteksi SLA breach | `SlaSchedulerTest`, `SlaBreachDetectorTest` |
| 6 | SLA breach tersimpan di database | field `sla_breached` + `sla_breached_at` |
| 7 | Notification dibuat saat event penting | `NotificationEventDeliveryTest` |
| 8 | Notification muncul via polling | frontend `NotificationBell` 30s (Fase 7/8) + E2E |
| 9 | Technician membuat & publish KB article | `ArticleCreateTest`, `ArticlePublishTest` |
| 10 | Attachment ≤5MB & format tertentu | `AttachmentValidationTest`, `AttachmentSecurityTest` |
| 11 | Semua business-critical authorization di backend | Gate/Policy + `CrossUserLeakTest` (10a) |

Jalankan:
```bash
cd apps/api && vendor/bin/pest tests/Feature
```
Tandai tiap poin di tabel. Bila ada poin tanpa bukti → tulis test (RED→GREEN).

### Step 1 — Verifikasi & tandai 11 poin.
### Step 2 — Commit (bila ada test tambahan):
```bash
git commit -am "test(api): cover remaining Definition of Technical Success points"
```

---

## Task 2: Verifikasi Definition of Done (§37 PRD) — 10 poin

**Files:** tidak ada perubahan (verifikasi).

**Detail:** Untuk fitur inti (tickets, assets, KB, notifications, audit, dashboards) pastikan 10 poin DoD:
1. frontend terhubung API — semua halaman (E2E hijau).
2. backend validation — Request classes + test 422.
3. authorization diterapkan — policies/gates.
4. happy path berhasil — golden path §38.
5. error case ditangani — error state/`errorMessages`.
6. transaction saat perlu — service menggunakan `DB::transaction`.
7. responsive layout — audit 375/768/1440.
8. minimal automated test untuk business-critical — suite.
9. tidak ada critical bug — hasil 10f.
10. dokumentasi penggunaan — README + TESTING + runbook.

Jalankan seluruh verifikasi akhir (Task 4) lalu tandai.

### Step 1 — Tandai 10 poin (perlu verifikasi menyeluruh di Task 4).

---

## Task 3: Sinkronisasi status dokumentasi akhir

**Files:**
- Modify: `docs/product/ROADMAP.md` (centang Fase 9 & Fase 10)
- Modify: `README.md` (status: rilis `v1.0.0`, Fase 10 selesai)
- Modify: `AGENTS.md` (status fase terbaru)
- Verify: `docs/api/API-CONTRACT.md` (termasuk endpoint export CSV bila 10f menambahkannya)

**Detail:** Pastikan dokumen tidak lagi menyebut "next work" fase lama. Update `AGENTS.md` "Current state" — ringkas, sesuai gaya yang ada.

### Step 1 — Update dokumen.
### Step 2 — Commit:
```bash
git add docs/product/ROADMAP.md README.md AGENTS.md docs/api/API-CONTRACT.md
git commit -m "docs: mark phases 9-10 complete, release v1.0.0 status"
```

---

## Task 4: Verifikasi penuh (satu komando menyeluruh)

**Files:** tidak ada perubahan.

**Detail:** Jalankan semua suite dari kondisi bersih:
```bash
# Backend
cd apps/api && composer install --quiet && vendor/bin/pint --dirty --format agent
vendor/bin/pest
# Frontend
cd ../web && npm ci --quiet && npm run test && npm run typecheck && npm run lint && npm run build
# E2E (butuh stack)
make fresh && npm run test:e2e
# Produksi (opsional tapi dianjurkan)
docker compose -f compose.prod.yaml up --build -d && curl -s http://localhost:8000/api/health
```

### Step 1 — Jalankan; pastikan semuanya hijau.
### Step 2 — Bila ada kegagalan → perbaiki (di branch 10g atau cabang fix terpisah) sebelum tag.

---

## Task 5: Tag `v1.0.0`

**Detail (D-30):** Rilis penuh = `v1.0.0` (contoh D-30: "rilis penuh v1.0.0").
```bash
git checkout main
git pull origin main
git merge feat/phase-10g-final
git tag -a v1.0.0 -m "JarvisOps v1.0.0 — full release (backend + frontend)"
git push origin main --tags
# Docker image tagging (D-30): jarvisops-api:v1.0.0 / jarvisops-web:v1.0.0 + :latest
docker compose -f compose.prod.yaml build
docker tag jarvisops-api:latest jarvisops-api:v1.0.0
docker tag jarvisops-web:latest jarvisops-web:v1.0.0
```
> **Jebakan — verifikasi sebelum tag:** Jangan men-tag bila Task 4 tidak hijau penuh (verification-before-completion). Bila push gagal karena branch protection, buka PR & merge via UI.

### Step 1 — Merge & tag.
### Step 2 — Verifikasi tag: `git tag -l 'v1.0.0'`.

---

## Exit Criteria 10g (dan Fase 10)

- [x] 11 poin Definition of Technical Success (§12 PRD) terverifikasi dengan bukti test (`tests/Feature/Security/DefinitionOfTechnicalSuccessTest.php`).
- [x] 10 poin Definition of Done (§37 PRD) terverifikasi untuk fitur inti (`docs/ops/TESTING.md` §5).
- [ ] Seluruh suite hijau: `vendor/bin/pest`, `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`.
- [x] `docker compose -f compose.prod.yaml up` dari kondisi bersih berfungsi (ROADMAP:930).
- [x] Tidak ada bug kritis yang diketahui (ROADMAP:934).
- [x] Golden path §38 berhasil dalam latihan (ROADMAP:935).
- [ ] `ROADMAP.md`, `README.md`, `AGENTS.md`, `API-CONTRACT.md` sinkron; Fase 9 & 10 tercentang.
- [ ] Tag `v1.0.0` dibuat di `main` (D-30).
