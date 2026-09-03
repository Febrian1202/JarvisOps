# Sub-tahap 8b — Daftar & Buat Ticket

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini menaikkan `/tickets` dari proving-ground 7d menjadi halaman penuh dengan 11 filter, search debounce, sorting, SLA indicators, dan pembuatan ticket baru. Sebelum mulai, pastikan Fase 7 sudah menyediakan `DataTable`, `FilterBar`, `SlaIndicator`, `StatusBadge`, `PriorityBadge`, `RelativeTime`, `PageHeader`, `EmptyState`, dan `Skeleton`. Lihat juga `action-to-endpoint.ts` dari 8a.

**Goal:** Halaman `/tickets` dengan 11 filter tersinkron URL, sort whitelist, row ke detail, dan halaman `/tickets/new` dengan form RHF + Zod, asset picker, SLA preview, dan saran KB.

**Branch:** `feat/phase-8b-ticket-list-create`
**Estimasi:** ~1,25 hari
**Prasyarat:** 8a selesai (`useApiMutation`, `useUploadWithProgress`, label, query keys, action map)

---

## Task 1: Upgrade halaman daftar ticket — 11 filter + URL sync

**Files:**
- Modify: `apps/web/src/app/(app)/tickets/page.tsx`
- Modify: `apps/web/src/app/(app)/tickets/page-client.tsx` (client component)
- Create: `apps/web/src/components/tickets/TicketFilters.tsx`
- Create: `apps/web/src/components/tickets/TicketTable.tsx`

**Detail:** Halaman `/tickets` yang sudah ada (proving-ground 7d) dinaikkan menjadi:

**Filter yang didukung:**
| Filter | Tipe | Endpoint Param | Keterangan |
|--------|------|----------------|------------|
| Search | Text input | `search` | Cari nomor, judul; debounce 300ms |
| Status | Chip row + dropdown | `status_id` | Single-select, wireframe quick filters (Open, Assigned, dll.) |
| Priority | Dropdown | `priority_id` | Dari `/api/ticket-priorities` |
| Category | Dropdown | `category_id` | Dari `/api/ticket-categories`, grouped by parent |
| Technician | Dropdown (hanya M/A) | `technician_id` | Dari `/api/technicians`. Technician lihat preset "Tiket Saya" / "Belum Ditugaskan" |
| Department | Dropdown | `department_id` | Dari `/api/departments` |
| SLA Status | Chip | `sla_status` | `on_track` / `breached` |
| Date From | Date picker | `created_from` | YYYY-MM-DD, WIB |
| Date To | Date picker | `created_to` | YYYY-MM-DD, WIB |
| Reporter | Tersembunyi untuk Employee | `reporter_id` | Tidak dirender bila Employee (scope otomatis) |
| Asset | Dropdown | `asset_id` | Hanya untuk admin/manager |

**Sort whitelist:** `created_at`, `updated_at`, `sla_deadline`, `priority_id`, `status_id`, `ticket_number`
**Default sort:** `created_at` DESC

**Kolom tabel:** ticket_number, title, reporter (nama), priority (badge), category, technician, status (badge), SLA (indicator), created_at (relative time via `RelativeTime`)

**Perilaku row:** Klik → navigasi ke `/tickets/[id]`

> **Jebakan — Filter tersinkron URL:** Gunakan `useSearchParams` + `useRouter` untuk menyimpan filter ke URL search params. Saat komponen mount, baca filter dari URL. Saat filter berubah, update URL tanpa reload (`router.replace`). Jangan gunakan state lokal saja — tautan ke halaman terfilter harus bisa di-share.
>
> **Jebakan — `useSearchParams` butuh Suspense:** Bungkus client component dalam `Suspense` boundary di `page.tsx` (server component). Next 16 mewajibkan ini.
>
> **Jebakan — Filter teknisi untuk Technician:** `GET /api/technicians` dijaga `technician.list` (M/A). Untuk Technician, jangan panggil endpoint itu. Tawarkan dua preset "Tiket Saya" (mengirim `technician_id=<current_user_id>`) dan "Belum Ditugaskan" (`technician_id=unassigned`). Keduanya valid di `IndexTicketRequest`.
>
> **Jebakan — `reporter_id` diabaikan server untuk Employee:** Filter `reporter_id` tidak dirender sama sekali untuk Employee, karena backend meng-scope berdasarkan `reporter_id` user saat ini. Menampilkan filter yang tidak berefek membingungkan.

### Step 1 — RED:
```typescript
// Test: filter tersinkron URL
test('ticket list reads filters from URL on mount', async () => {
  // Mock useSearchParams to return { status_id: '1', priority_id: '2' }
  // Render TicketFilters → verify dropdowns show correct values
});

test('ticket list updates URL when filter changes', async () => {
  // Mock router.replace
  // Click status filter "Open"
  // Verify router.replace called with status_id=1
});
```

### Step 2 — GREEN:
Implementasi `TicketFilters.tsx` dengan `FilterBar` dari Fase 7. Tambahkan field untuk setiap filter di atas. Gunakan `useQuery` untuk reference data (categories, priorities, statuses, departments, technicians) dengan `staleTime: 5 * 60 * 1000`.

### Step 3 — REFACTOR & verifikasi:
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint
```

### Step 4 — Commit:
```bash
git add apps/web/src/app/(app)/tickets/ apps/web/src/components/tickets/TicketFilters.tsx apps/web/src/components/tickets/TicketTable.tsx
git commit -m "feat(web): upgrade ticket list with 11 filters, URL sync, sorting, and SLA indicators"
```

---

## Task 2: Halaman buat ticket baru

**Files:**
- Create: `apps/web/src/app/(app)/tickets/new/page.tsx`
- Create: `apps/web/src/app/(app)/tickets/new/page-client.tsx`
- Create: `apps/web/src/components/tickets/TicketForm.tsx`
- Create: `apps/web/src/schemas/ticket.ts`

**Detail:** Halaman `/tickets/new` mengikuti wireframe frame 07: dua kolom — form di kiri, info SLA + saran KB di kanan.

**Form fields:**
- `category_id` — select grouped by parent, dari `/api/ticket-categories`
- `priority_id` — select, dari `/api/ticket-priorities` (tampilkan "High — SLA 4 jam")
- `asset_id` — select opsional, dari `/api/assets/assignable` (hanya aset yang dipegang user)
- `title` — text input, max 200
- `description` — textarea
- File upload — dropzone, langsung upload via `/api/proxy/tickets/{id}/attachments` *setelah* ticket dibuat? Tidak — wireframe menunjukkan upload di form, tapi API membutuhkan ticket_id lebih dulu (POST /tickets → baru POST /attachments). **Solusi:** upload dilakukan setelah ticket sukses dibuat, redirect ke detail dengan toast "Ticket berhasil dibuat. File sedang diunggah..." dan upload di background.

**SLA card (kolom kanan):** Tampilkan SLA duration dari priority yang dipilih, preview deadline estimasi, catatan "SLA di-snapshot saat ticket dibuat dan tidak akan berubah".

**KB card (kolom kanan):** Saat user mengetik judul (debounce 500ms), cari artikel relevan via `GET /api/articles?search=<title>&per_page=3`. Tampilkan sebagai saran — wireframe frame 07 menunjukkan kartu "Sudah Cek Artikel Terkait?".

> **Jebakan — upload setelah create:** Jangan upload file sebelum ticket punya ID. Simpan file yang dipilih di state (atau FormData), POST ticket, dapatkan `ticket.id` dari respons, lalu upload file ke `/api/proxy/tickets/{id}/attachments`. Tampilkan toast "Ticket berhasil dibuat" segera, lalu progress upload di background.
>
> **Jebakan — asset picker:** Gunakan `GET /api/assets/assignable` yang mengembalikan aset yang dipegang user. Tampilkan sebagai `asset_tag — name (current_assignment.full_name)`. Field ini opsional — validasi di backend sudah `nullable`.
>
> **Jebakan — 422 validation errors:** `StoreTicketRequest` mengembalikan 422 dengan field Indonesia. `useApiMutation` dengan `onFormError` callback harus memetakan `errors.<field>` ke `setError` RHF. Pastikan field name di form cocok dengan key di response (snake_case: `category_id`, `priority_id`, `asset_id`).

### Step 1 — RED:
```typescript
test('ticket form shows validation errors', async () => {
  // Submit empty form
  // Verify error messages for required fields
});

test('ticket form submits successfully and redirects', async () => {
  // Mock POST /api/proxy/tickets → 201 with ticket data
  // Mock POST /api/proxy/tickets/{id}/attachments (if files)
  // Submit valid form
  // Verify redirect to /tickets/{id}
});
```

### Step 2 — GREEN:
Implementasi `ticketSchema` di `schemas/ticket.ts`:
```typescript
import { z } from 'zod';

export const ticketSchema = z.object({
  category_id: z.number({ required_error: 'Kategori wajib dipilih.' }),
  priority_id: z.number({ required_error: 'Prioritas wajib dipilih.' }),
  asset_id: z.number().nullable().optional(),
  title: z.string().min(1, 'Judul wajib diisi.').max(200, 'Judul maksimal 200 karakter.'),
  description: z.string().min(1, 'Deskripsi wajib diisi.'),
});

export type TicketFormData = z.infer<typeof ticketSchema>;
```

### Step 3 — REFACTOR & verifikasi:
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint
```

### Step 4 — Commit:
```bash
git add apps/web/src/app/(app)/tickets/new/ apps/web/src/components/tickets/TicketForm.tsx apps/web/src/schemas/ticket.ts
git commit -m "feat(web): add ticket creation form with asset picker, SLA preview, and KB suggestions"
```

---

## Exit Criteria 8b

- [x] `/tickets` menampilkan tabel dengan 11 filter, URL sync, sort, pagination, SLA indicator.
- [x] Filter teknisi tidak dirender untuk Employee; Technician melihat preset "Tiket Saya" / "Belum Ditugaskan".
- [x] Filter `reporter_id` tidak dirender untuk Employee.
- [x] `/tickets/new` menampilkan form 2-kolom sesuai wireframe frame 07.
- [x] Asset picker hanya menampilkan aset yang dipegang user.
- [x] Upload file terjadi setelah ticket dibuat (background).
- [x] 422 validation errors terpetakan ke field form.
- [x] `npm run test`, `npx tsc --noEmit`, `npm run lint` hijau.