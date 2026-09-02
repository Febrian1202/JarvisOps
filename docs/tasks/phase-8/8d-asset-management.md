# Sub-tahap 8d — Manajemen Aset

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini membangun seluruh permukaan aset: daftar, detail, form, dan assign/release. Employee hanya melihat `/my-assets`; Technician/Manager/Admin melihat `/assets` (created/detail/edit) dan `/assets/{id}`.

**Goal:** Halaman daftar aset (search + filter status/kategori/pemegang), halaman detail aset dengan riwayat kepemilikan (PRD §17), form create/edit, dialog assign/release, dan halaman "Aset Saya".

**Branch:** `feat/phase-8d-asset`
**Estimasi:** ~1,25 hari
**Prasyarat:** 8a selesai (A2 categories endpoint, A3 assignable users endpoint)

---

## Task 1: Daftar aset (`/assets`)

**Files:**
- Create: `apps/web/src/app/(app)/assets/page.tsx`
- Create: `apps/web/src/app/(app)/assets/page-client.tsx`
- Create: `apps/web/src/components/assets/AssetTable.tsx`
- Create: `apps/web/src/components/assets/AssetFilters.tsx`

**Detail:** Ikuti pola daftar ticket (8b). DataTable kolom: asset_tag, name, category, brand, status (badge), current_assignment (nama pemegang atau "—"), purchase_date, aksi (link ke detail).

**Filter:** search (tag+serial+nama), status (dropdown dari `AssetStatus` enum), category (dropdown dari `GET /api/assets/categories` — A2), assigned_user_id (dropdown dari `GET /api/users/assignable` — A3, hanya bila `can('user.lookup')`).

**Route guard:** `asset.viewAny` — hanya Technician/Manager/Admin. Employee tidak melihat link ini di sidebar. Akses langsung → redirect `/403`.

### Step 1 — RED:
```typescript
test('asset table renders with correct columns', () => { /* ... */ });
test('employee cannot access /assets (redirects to 403)', async () => { /* ... */ });
```

### Step 2 — GREEN: implementasi.

### Step 3 — Commit:
```bash
git commit -m "feat(web): add asset list page with filters and search"
```

---

## Task 2: Detail aset (`/assets/[id]`)

**Files:**
- Create: `apps/web/src/app/(app)/assets/[id]/page.tsx`
- Create: `apps/web/src/app/(app)/assets/[id]/page-client.tsx`
- Create: `apps/web/src/components/assets/AssetDetailCard.tsx`
- Create: `apps/web/src/components/assets/AssetHistoryTimeline.tsx`

**Detail:** Ikuti wireframe frame 14. Banner: `asset_tag — name`, status badge, tombol Assign/Release (bila `can('assign')` / `can('release')`).

**Riwayat kepemilikan (PRD §17):** Dari `GET /api/assets/{id}/history` — array gabungan `type: assignment|history`, urut `occurred_at`. Render sebagai timeline:
- **Assigned:** "01 Sep 2026 — Ditugaskan ke **Budi Santoso** (catatan: untuk kebutuhan project)"
- **Released:** "15 Sep 2026 — Dilepaskan dari **Budi Santoso**"
- **History:** deskripsi dari backend

**Kartu metadata:** nama, tag, kategori, brand, model, serial number, status, purchase date, notes.

### Step 1 — RED:
```typescript
test('asset history timeline renders assignment events', () => { /* ... */ });
test('asset history shows chain of holders', () => { /* ... */ });
```

### Step 2 — GREEN: implementasi.

### Step 3 — Commit:
```bash
git commit -m "feat(web): add asset detail page with ownership history timeline"
```

---

## Task 3: Form aset (`/assets/new`, `/assets/[id]/edit`)

**Files:**
- Create: `apps/web/src/app/(app)/assets/new/page.tsx`
- Create: `apps/web/src/app/(app)/assets/new/page-client.tsx`
- Create: `apps/web/src/app/(app)/assets/[id]/edit/page.tsx`
- Create: `apps/web/src/components/assets/AssetForm.tsx`
- Create: `apps/web/src/schemas/asset.ts`

**Detail:** Ikuti wireframe frame 15. Semua field wajib (`StoreAssetRequest` / `UpdateAssetRequest`):
- asset_tag, name, category (select dari A2, dengan free-text fallback), brand, model, serial_number, purchase_date (date picker, ≤ today), status (select: available, maintenance, retired, lost — **tidak** include assigned), notes (textarea opsional).

**Kategori:** Dropdown dari `GET /api/assets/categories` (A2). Bila kategori yang diinginkan tidak ada, izinkan free-text input (backend menerima string bebas).

**Status:** Hanya `available`, `maintenance`, `retired`, `lost` — `assigned` dikelola oleh assign/release, bukan form.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add asset create/edit forms"
```

---

## Task 4: Dialog assign & release

**Files:**
- Create: `apps/web/src/components/assets/AssignDialog.tsx`
- Create: `apps/web/src/components/assets/ReleaseDialog.tsx`

**Detail:**
- **Assign:** pilih user dari `GET /api/users/assignable` (A3, dukung search). Opsional notes. `POST /api/assets/{id}/assign` → 422 bila status tidak eligible, 409 bila sudah ditugaskan.
- **Release:** konfirmasi + notes opsional. `POST /api/assets/{id}/release`.

**422 vs 409 (C5/C20):** 422 = status aset tidak memungkinkan (maintenance → tolak assign). 409 = aset sudah ditugaskan ke orang lain. Tampilkan pesan berbeda.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add asset assign/release dialogs with 422/409 handling"
```

---

## Task 5: Aset Saya (`/my-assets`)

**Files:**
- Create: `apps/web/src/app/(app)/my-assets/page.tsx`
- Create: `apps/web/src/app/(app)/my-assets/page-client.tsx`

**Detail:** Sama dengan daftar aset, tapi dari `GET /api/my-assets`. Tanpa filter pemegang, tanpa tombol assign/release. Employee melihat ini sebagai halaman utama aset mereka.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add my-assets page for employees"
```

---

## Exit Criteria 8d

- [ ] `/assets` — search, filter status/kategori/pemegang, DataTable, pagination.
- [ ] `/assets/[id]` — banner, metadata, riwayat kepemilikan timeline, tombol assign/release.
- [ ] `/assets/new` + `/assets/[id]/edit` — form lengkap, kategori dropdown + free-text, status tanpa `assigned`.
- [ ] Assign dialog — user picker dari `GET /api/users/assignable`, notes, tangani 422 vs 409.
- [ ] Release dialog — konfirmasi + notes.
- [ ] `/my-assets` — daftar aset milik user yang login.
- [ ] Employee tidak bisa mengakses `/assets` (redirect 403).
- [ ] `npm run test`, `npx tsc --noEmit`, `npm run lint` hijau.