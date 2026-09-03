# Sub-tahap 10e — Demo Data & Golden Path

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini membuat aplikasi **siap dipresentasikan** (ROADMAP:903-908): data demo yang realistis (compliance mendekati contoh 87% §14 PRD), golden path §38 dijalankan dari browser & diukur, dan materi jawaban reviewer. Idealnya dikerjakan setelah 10b (demo jalan di stack yang sama dengan produksi) tapi tidak wajib.

**Goal:** `DemoDataSeeder` menghasilkan dataset yang membuat dashboard manager menampilkan compliance ±87% dan semua status terwakili; golden path §38 berjalan end-to-end tanpa kesalahan dalam latihan; jawaban 6 pertanyaan reviewer (§33 PRD) siap.

**Branch:** `feat/phase-10e-demo`
**Estimasi:** ~0,75 hari
**Prasyarat:** 10b (docker prod) selesai untuk latihan di environment yang sama; dashboard UI Fase 9 selesai.

---

## Task 1: Perluas `DemoDataSeeder` — data realistis & deterministik

**Files:**
- Modify: `apps/api/database/seeders/DemoDataSeeder.php`
- Create: `tests/Feature/Schema/DemoDataSeederTest.php` (atau perluas `SeedersTest.php`)

**Detail (K8):** Perluas seeder agar dashboard tiap role punya data untuk didemokan. Prinsip **deterministik** (angka tetap setelah `migrate:fresh --seed`), bukan `rand()`.

**Distribusi ticket (per target compliance ±87%, PRD §14 — contoh 87% = resolved dalam SLA / total resolved):**
- Bangun ~30–40 ticket untuk employee utama & beberapa employee lain agar dashboard manager/technician kaya.
- Status: campuran OPEN, ASSIGNED, IN_PROGRESS, RESOLVED (dalam SLA), RESOLVED (breached), CLOSED.
- Skenario SLA: beri `resolved_at` & `sla_deadline` eksplisit. Untuk compliance 87% ± beberapa poin: mis. 30 resolved → 26 dalam SLA (`resolved_at <= sla_deadline`) + 4 breached. Jangan andalkan factory `resolved()` (yang `resolved_at = now()` tanpa jaminan deadline) — **set kolom secara eksplisit**.
- Sertakan beberapa ticket **breached aktif** (belum resolved, `sla_breached=true`, `sla_deadline` lampau) supaya: highlight SLA di dashboard technician & employee, notifikasi SLA breach, dan angka "SLA Breached" tidak nol.

**Dukungan role:**
- **Technician** (technician@…): beberapa ticket di-assign ke dia (ASSIGNED/IN_PROGRESS) + beberapa resolved dengan SLA, supaya kartu "Ditugaskan", "SLA Compliance Saya", "Rata-rata Waktu" punya nilai.
- **Manager/Admin** (manager@…, admin@…): data yang sama sudah cukup untuk dashboard manager (superset global); pastikan ada ≥ 2 technician dengan performa berbeda (buat 1–2 technician tambahan `budi@jarvisops.test`, `citra@jarvisops.test`) untuk tabel "Performa Technician" yang bermakna (bukan 1 baris).

**Asset & history (K8):**
- Asset yang di-assign ke employee utama → riwayat multi-pemegang (`AssetHistory`) beberapa entri (assign → release → assign) supaya timeline "riwayat kepemilikan" di detail asset (PRD §17) menarik.
- Status asset: available/assigned/maintenance/retired semua terwakili (distribusi `assets_by_status` admin).

**Artikel KB:** cukup sudah (10 published + 1 draft). Pastikan ada artikel ber-`view_count` tinggi agar "Artikel Terbaru" dashboard employee bervariasi.

> **Jebakan — determinisme vs `rand()`:** Factory memakai `fake()`. Untuk data demo yang angka compliance-nya harus stabil (bisa di-assert Playwright & ditunjukkan ke reviewer), **hindari `rand()`** di bagian yang menentukan compliance/resolved. Hitung tanggal relatif terhadap `now()` (mis. `now()->subDays(n)`) supaya konsisten setiap seed.
>
> **Jebakan — jangan ganggu test yang bergantung seed:** `SeedersTest.php` / `Schema/*Test` mungkin meng-assert jumlah tertentu. Perluas test seeder (bukan hanya mengubah data) dan pastikan test lama tetap hijau. Bila ada test yang meng-assert angka spesifik seed lama, sesuaikan dengan sengaja.
>
> **Jebakan — jangan besar-besaran:** Cukup data untuk demo (30–50 ticket), bukan dataset 10.000 baris. Dashboard API melakukan agregasi SQL — tetap cepat.

### Step 1 — RED (bila memungkinkan) / perluas `SeedersTest`:
```php
test('demo seeder produces tickets across all statuses with near-87% compliance', function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->seed(DemoUserSeeder::class);
    $this->seed(DemoDataSeeder::class);

    $compliance = ...; // hitung resolved dalam SLA / total resolved dari Ticket
    expect($compliance)->toBeBetween(80, 95);
    // semua status terwakili
    foreach ([1,2,3,4,5] as $statusId) {
        expect(Ticket::where('status_id', $statusId)->exists())->toBeTrue();
    }
    // beberapa technician punya resolved tickets
});
```
### Step 2 — GREEN: perluas `DemoDataSeeder`.
### Step 3 — verifikasi manual:
```bash
make fresh
# Login tiap role → cek dashboard angka masuk akal & compliance manager ±87%
```
### Step 4 — Commit:
```bash
git add apps/api/database/seeders/DemoDataSeeder.php apps/api/tests/Feature/Schema/DemoDataSeederTest.php
git commit -m "feat(seed): expand demo data with realistic ticket distribution, near-87% SLA compliance, and asset history"
```

---

## Task 2: Latihan golden path §38 dari browser + pengukuran

**Files:**
- Modify: `apps/web/e2e/` (tambah spec golden path bila belum; rujuk `docs/tasks/phase-8/8g-e2e-a11y-finalization.md` yang sudah membuat golden path API/browser)
- Create: `docs/ops/DEMO-RUNBOOK.md` (script latihan + ukuran waktu)

**Detail (ROADMAP:906):** Golden path §38 PRD (13 langkah: Employee buat ticket → Manager assign → Technician proses → Employee close → Manager lihat analytics → dashboard SLA & performance). Verifikasi:
- Sudah ada spec E2E golden path dari Fase 8 (`golden-path.spec.ts`) + dashboard spec dari Fase 9. Pastikan keduanya **hijau terhadap data demo baru** (10e Task 1). Sesuaikan assertion yang bergantung angka.
- Ukur durasi: jalankan di browser, catat waktu tiap segmen. Target < 3 menit untuk seluruh golden path (nyaman untuk presentasi).
- Cek **dashboard step 12–13** benar-benar menampilkan SLA & performance yang berubah setelah ticket baru dibuat (data segar — TanStack refetch).

> **Jebakan — angka assertion:** Playwright yang meng-assert angka seed spesifik akan patah setelah 10e Task 1. Update assertion ke rentang (mis. compliance antara 80–95) atau teks label (bukan angka presisi).

### Step 1 — Jalankan E2E:
```bash
make fresh && cd apps/web && npm run test:e2e
```
### Step 2 — Tulis `docs/ops/DEMO-RUNBOOK.md`: langkah demo, akun per langkah, tombol yang diklik, durasi, dan **backup skenario** (ROADMAP:908 — screenshot/rekaman langkah kunci).
### Step 3 — Commit:
```bash
git add apps/web/e2e docs/ops/DEMO-RUNBOOK.md
git commit -m "test(e2e): verify golden path against demo data and add demo runbook"
```

---

## Task 3: Jawaban 6 pertanyaan reviewer (§33 PRD)

**Files:**
- Create: `docs/ops/REVIEWER-ANSWERS.md`

**Detail (ROADMAP:907):** Tulis jawaban siap-ucap untuk enam poin §33 Presentation:
1. **Masalah yang diselesaikan** — IT service management terstruktur: ticket, SLA, aset, KB; pain point manual/tidak terukur.
2. **Bagaimana sistem bekerja** — alur: employee buat ticket → SLA snapshot → manager assign → technician proses → employee close; semua tercatat (history + audit).
3. **Mengapa arsitektur tersebut dipilih** — BFF proxy + httpOnly cookie (token aman dari JS), Laravel API + policy/gate, Next.js UI; alasan monorepo, FrankenPHP.
4. **Bagaimana database didesain** — rujuk `docs/schema.sql`/ERD: relasi, snapshot SLA di `tickets`, `audit_logs`, `asset_history`; index.
5. **Bagaimana security diterapkan** — RBAC ability (D-16), 404-vs-403, attachment private + policy, rate limit, cross-user protection, validasi file.
6. **Bagaimana business logic bekerja** — status transition matrix, SLA 3 lapis (snapshot/scheduler/defensif), notification event, audit trail.
Setiap jawaban: 1 paragraf + 3–5 poin + tautan ke kode/dokumen pendukung (untuk demo live saat ditanya).

> **Jebakan — jangan jargon kosong:** Setiap klaim (mis. "attachment tervalidasi 5MB") harus bisa ditunjuk ke file/test nyata. Sertakan `file_path:line` atau nama test sebagai bukti.

### Step 1 — Tulis `docs/ops/REVIEWER-ANSWERS.md`.
### Step 2 — Commit:
```bash
git add docs/ops/REVIEWER-ANSWERS.md
git commit -m "docs(ops): add reviewer answers for capstone presentation (PRD section 33)"
```

---

## Task 4: Backup skenario demo

**Files:**
- Update: `docs/ops/DEMO-RUNBOOK.md` (bagian backup)

**Detail (ROADMAP:908):** Siapkan cadangan bila demo live bermasalah:
- Screenshot tiap halaman kunci (dashboard tiap role, daftar ticket, detail ticket, audit log) — simpan di folder `docs/ops/demo-screenshots/` (atau referensi lokasi).
- Rekaman singkat golden path (opsional).
- Skenario cadangan: "kalau internet/live gagal → tunjukkan screenshot + jalankan lokal".

### Step 1 — Ambil screenshot halaman kunci (browser) & simpan; update runbook.
### Step 2 — Commit:
```bash
git add docs/ops/DEMO-RUNBOOK.md docs/ops/demo-screenshots/
git commit -m "docs(ops): add demo backup screenshots and fallback scenario"
```

---

## Exit Criteria 10e

- [ ] `DemoDataSeeder` menghasilkan: ticket di semua status, compliance manager ±87%, beberapa SLA breach aktif, ≥2 technician berperforma berbeda, riwayat asset multi-pemegang, asset status lengkap.
- [ ] Test seeder hijau & deterministik; test lama tidak rusak.
- [ ] Golden path §38 E2E hijau terhadap data demo; durasi tercatat (< 3 menit).
- [ ] `docs/ops/DEMO-RUNBOOK.md` ada (langkah + backup scenario + screenshot).
- [ ] `docs/ops/REVIEWER-ANSWERS.md` ada (6 jawaban §33, masing-masing dengan bukti kode/test).
