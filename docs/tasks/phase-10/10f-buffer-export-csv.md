# Sub-tahap 10f — Buffer + Export CSV + Bug Fixing

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap buffer (Minggu 8). Prioritas (keputusan user K9): **Export CSV** dulu (nilai tinggi untuk reviewer), lalu **bug fixing** hasil pengujian menyeluruh. Dark mode / advanced filtering / saved filters **di luar cakupan** (K10) — hanya bila waktu sisa setelah semuanya hijau.

**Goal:** Fitur opsional paling bernilai (export CSV per entity) selesai dengan pola backend-stream yang aman, dan bug yang ditemukan di pengujian manual diperbaiki.

**Branch:** `feat/phase-10f-buffer`
**Estimasi:** ~1,0 hari
**Prasyarat:** 10a–10e selesai (bisa tumpang tindih dengan 10e; idealnya setelah CI hijau).

---

## Task 1: Export CSV — backend

**Files:**
- Create: `apps/api/app/Http/Controllers/Export/ExportController.php` (atau `Csv/ExportController.php`)
- Create: `apps/api/app/Services/Export/CsvExporter.php` (helper stream)
- Modify: `apps/api/routes/api.php`
- Create: `tests/Feature/Export/CsvExportTest.php`

**Detail (K9):**
- **Endpoint** (pilih 3 entity yang bernilai untuk reviewer; bisa diperluas):
  - `GET /api/export/tickets?<filter yang sama dengan IndexTicketRequest>` — ability `ticket.viewAny`.
  - `GET /api/export/assets` — ability `asset.viewAny`.
  - `GET /api/export/audit-logs` — ability `audit.viewAny` (M/A).
- **Streaming:** pakai generator + `StreamedResponse` (atau CSV stream via `League\Csv` bila sudah tersedia — cek dependency; kalau belum, `fputcsv` ke `php://output` cukup). **Jangan** `implode()` array besar di memori.
- **Format:** BOM UTF-8 (`\xEF\xBB\xBF`) di awal file supaya Excel Indonesia membuka header dengan benar; kolom `snake_case`; nilai ISO-8601 UTC (D-24/D-23 konsisten dengan API — frontend/tool yang membuka mengonversi).
- **Daftar kolom** disamakan dengan resource list masing-masing (mis. export ticket = id, ticket_number, title, status, priority, category, reporter, technician, sla_deadline, sla_status, created_at, resolved_at).
- **Envelope:** export CSV **bukan** envelope JSON — kembalikan `text/csv` murni (header `Content-Type`, `Content-Disposition: attachment`). Ini pengecualian yang perlu dicatat di API-CONTRACT (10c/10g).

> **Jebakan — ability & scope:** Export wajib menghormati scope role (Employee hanya export...? — putuskan: Employee **tidak** dapat export global; export hanya untuk yang punya `viewAny`). Pastikan query export memakai scope yang sama dengan list (mis. Employee tetap dibatasi `reporter_id` bila ability-nya `ticket.viewOwn`). Jangan buka lubang akses baru lewat export.
>
> **Jebakan — 429/throttle:** Endpoint export yang berat sebaiknya diberi throttle sendiri (`throttle:export`, mis. 10/menit/user) untuk mencegah abuse. Tambahkan limiter di `AppServiceProvider`.

### Step 1 — RED:
```php
// tests/Feature/Export/CsvExportTest.php
test('ticket export returns CSV with BOM and expected columns', function () {
    $manager = User::factory()->manager()->create();
    Ticket::factory()->count(3)->create();

    Sanctum::actingAs($manager);
    $response = $this->get('/api/export/tickets');

    $response->assertOk()
        ->assertHeader('Content-Type', 'text/csv')
        ->assertHeader('Content-Disposition', 'attachment')
        ->assertSeeText("\xEF\xBB\xBFticket_number", escape: false) // BOM
        ->assertSeeText('ticket_number,title,status', escape: false);
});

test('employee cannot export global tickets', function () {
    $emp = User::factory()->employee()->create();
    Sanctum::actingAs($emp);
    $this->get('/api/export/tickets')->assertStatus(403);
});
```
### Step 2 — GREEN: `CsvExporter` + `ExportController` + route (daftarkan sebelum `apiResource` bila ada konflik path) + `throttle:export`.
### Step 3 — verifikasi:
```bash
vendor/bin/pest tests/Feature/Export/CsvExportTest.php
vendor/bin/pest tests/Feature
vendor/bin/pint --dirty --format agent
```
### Step 4 — Commit:
```bash
git add app/Http/Controllers/Export/ app/Services/Export/ routes/api.php tests/Feature/Export/ app/Providers/AppServiceProvider.php
git commit -m "feat(api): add streamed CSV export for tickets, assets, and audit logs"
```

---

## Task 2: Export CSV — frontend (tombol di halaman terkait)

**Files:**
- Create: `apps/web/src/components/shared/CsvExportButton.tsx`
- Modify: halaman `/tickets`, `/assets`, `/admin/audit-logs` (tambahkan tombol di action bar)

**Detail (K9):**
- `CsvExportButton`: tombol yang memanggil `/api/proxy/export/{entity}` (BFF) — **download via server-side fetch** (cookie httpOnly otomatis terkirim; `apiFetch` tidak dipakai karena respons bukan JSON). Pakai `fetch` + `blob` + `URL.createObjectURL` + `<a download>`, atau navigasi langsung ke `/api/proxy/export/...` (browser menangani Content-Disposition).
- **Mengambil filter saat ini** dari URL search params (pola FilterBar Fase 8) — export menghormati filter yang sedang aktif (mis. `status_id`, `date_from`/`date_to`).
- Tampil **hanya bila** `can()` sesuai (mis. `ticket.viewAny`); untuk `/assets` → `asset.viewAny`; audit-logs → M/A.
- Loading state + toast sukses/gagal (sonner, pola `useApiMutation`).

> **Jebakan — file besar & memori browser:** Untuk MVP data demo kecil, `blob` OK. Catat di komponen: untuk volume besar, gunakan streaming/object URL langsung dari navigasi. Jangan render CSV ke DOM.
>
> **Jebakan — download via BFF:** Token ada di cookie httpOnly; request download harus ke `/api/proxy/export/...` (bukan Laravel langsung). `Content-Disposition` diteruskan proxy — verifikasi BFF `[...path]` meneruskan header respons download (jangan menelan body).

### Step 1 — RED (Vitest render test: tombol tampil saat `can` true, hidden saat false; call fetch ke proxy dengan params).
### Step 2 — GREEN: `CsvExportButton` + pasang di action bar 3 halaman.
### Step 3 — verifikasi:
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint && npm run build
```
### Step 4 — Commit:
```bash
git add apps/web/src/components/shared/CsvExportButton.tsx apps/web/src/app
git commit -m "feat(web): add CSV export buttons to ticket, asset, and audit log pages"
```

---

## Task 3: Bug fixing — pengujian manual menyeluruh

**Files:** sesuai temuan.

**Detail (ROADMAP:914):** Lakukan pengujian manual menyeluruh (atau audit dari hasil `npm run test`, E2E, dan demo latihan 10e). Fokus prioritas:
- Golden path §38 tanpa hambatan.
- Alur assign/start/resolve/close di UI; optimistic update & rollback.
- 422 mapping form (bahasa Indonesia), 409 concurrency, 403/404 handling.
- Notifikasi polling 30 detik (badge, mark-as-read).
- Dashboard: angka benar, date range, chart kosong/null state.
- Responsif mobile (375px) halaman utama.
- Upload/download attachment (5MB, tipe).

Bila menemukan bug kritis → perbaiki (RED→GREEN), commit per fix. Bug minor → catat di `docs/ops/TESTING.md` known-issues (atau fix bila cepat).

> **Jebakan — scope creep:** Jangan mulai refactor besar di buffer. Perbaiki **bug**, bukan "perbaiki arsitektur".

### Step 1 — Jalankan checklist manual; kumpulkan temuan.
### Step 2 — Perbaiki bug (test dulu bila logika).
### Step 3 — Commit per fix:
```bash
git commit -am "fix(web): <deskripsi bug> (phase 10f)"
```

---

## Exit Criteria 10f

- [x] Export CSV tersedia untuk tickets, assets, audit-logs; streamed, BOM UTF-8, ability & scope sesuai, throttle export.
- [x] Tombol export di UI (tickets/assets/audit-logs) menghormati filter aktif & `can()`; download via BFF; toast.
- [x] Test backend (RED/GREEN) & frontend hijau; `vendor/bin/pint --dirty` bersih.
- [x] Bug kritis yang ditemukan di pengujian manual diperbaiki (semua 716 test backend & 352 test frontend lolos tanpa error).
- [x] `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` hijau.
