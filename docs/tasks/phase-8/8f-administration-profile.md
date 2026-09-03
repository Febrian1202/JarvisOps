# Sub-tahap 8f — Administrasi & Profil

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini membangun seluruh halaman admin (users, master data, audit logs) dan profil. Ini sub-tahap paling padat dari sisi jumlah halaman — gunakan `MasterDataPage` dari 8a agar 4 halaman master data jadi 4 konfigurasi.

**Goal:** `/admin/users`, `/admin/priorities`, `/admin/categories`, `/admin/knowledge-categories`, `/admin/departments`, `/admin/audit-logs`, dan `/profile` + ganti password.

**Branch:** `feat/phase-8f-administration`
**Estimasi:** ~1,5 hari
**Prasyarat:** 8a selesai (`MasterDataPage`, `query-keys.ts`, `errorMessages`)

---

## Task 1: Admin route guard (K7)

**Files:**
- Create: `apps/web/src/app/(app)/admin/layout.tsx`

**Detail:** Server Component guard. Panggil `laravelFetch('/me')`. Bila `role.name !== 'administrator'` → `redirect('/403')`. Khusus `/admin/audit-logs`, Manager berhak (ability `audit-log.viewAny`) — layout harus membedakan: untuk rute audit-logs izinkan Manager, untuk rute lain Admin-only.

**Implementasi:**
```tsx
// layout.tsx
import { redirect } from 'next/navigation';
import { laravelFetch } from '@/lib/server/api';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await laravelFetch('/me').then(r => r.json());
  const role = me?.data?.user?.role?.name;
  if (role !== 'administrator') redirect('/403');
  return children;
}
```

> **Jebakan — audit-logs untuk Manager:** Layout di atas menolak Manager untuk semua `/admin/*`. Karena Manager punya `audit-log.viewAny`, halaman `/admin/audit-logs` harus bisa diakses Manager. **Solusi:** jangan pasang layout admin tunggal — beri guard per halaman (helper `requireAdmin()`) atau layout dengan pengecualian rute. Lihat Task 4.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add admin route guard (server component)"
```

---

## Task 2: `/admin/users` — CRUD pengguna

**Files:**
- Create: `apps/web/src/app/(app)/admin/users/page.tsx`
- Create: `apps/web/src/app/(app)/admin/users/page-client.tsx`
- Create: `apps/web/src/components/admin/UsersTable.tsx`
- Create: `apps/web/src/components/admin/UserFormDialog.tsx`
- Create: `apps/web/src/components/admin/ResetPasswordDialog.tsx`
- Create: `apps/web/src/schemas/user.ts`

**Detail:** DataTable dari `GET /api/users` — search, filter role/department/status. Kolom: full_name, email, role, department, employee_code, status, aksi.

**Aksi per baris:**
- **Edit:** dialog RHF. `PUT /api/users/{id}`. Field: full_name, email, department_id, role_id, profile.employee_code, profile.phone, profile.position, profile.hire_date. **Tidak** ada field status di update (backend `UpdateUserRequest` tidak menerimanya).
- **Create:** dialog RHF. `POST /api/users`. Field termasuk `password` + `password_confirmation` (wajib, `StoreUserRequest`) + `status` (required).
- **Activate / Deactivate:** `POST /api/users/{id}/activate` / `deactivate`. Confirmation dialog.
- **Reset password:** `POST /api/users/{id}/reset-password` → respons berisi `temporary_password` **sekali**. Tampilkan di `ResetPasswordDialog` dengan tombol salin + peringatan "Password baru hanya ditampilkan satu kali." (C19).
- **Hapus:** `DELETE /api/users/{id}`. Confirm. Admin tidak bisa menghapus diri sendiri (backend 403).

**Role & department dropdown:** dari `/api/roles` dan `/api/departments`.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add admin users page with CRUD, activate/deactivate, reset password"
```

---

## Task 3: Master data — 4 halaman via `MasterDataPage` (K6, C12)

**Files:**
- Create: `apps/web/src/app/(app)/admin/priorities/page.tsx`
- Create: `apps/web/src/app/(app)/admin/categories/page.tsx`
- Create: `apps/web/src/app/(app)/admin/knowledge-categories/page.tsx`
- Create: `apps/web/src/app/(app)/admin/departments/page.tsx`
- Create: `apps/web/src/components/admin/master-data-configs.ts`

**Detail:** Empat halaman = satu komponen `MasterDataPage<T>` + 4 objek konfigurasi:

| Halaman | Endpoint | Kolom | Form |
|---------|----------|-------|------|
| `/admin/departments` | `/api/departments` | name, description | name, description |
| `/admin/categories` | `/api/ticket-categories` | name, description, parent | name, description, parent_id (select bertingkat D-04) |
| `/admin/knowledge-categories` | `/api/knowledge-categories` | name, description | name, description |
| `/admin/priorities` | `/api/ticket-priorities` | name, level, sla_minutes, description | name, level, sla_minutes, description |

**Jebakan — array polos tanpa `meta` (C12):** Endpoint master data mengembalikan array langsung, bukan `{ data, meta }`. `MasterDataPage` memakai `useQuery` biasa + search/filter client-side (data < 100 baris).

**Jebakan — sla_minutes:** Ubah prioritas **tidak** mengubah SLA ticket yang sudah ada (snapshot). Tampilkan hint di form: "Perubahan SLA hanya berlaku untuk ticket baru."

**Jebakan — parent_id (D-04):** `ticket-categories` punya hierarki parent/child. Dropdown parent harus menampilkan pohon, jangan kategori dengan parent yang sama sebagai pilihan. Validasi mencegah parent = self.

**Jebakan — 409 referential (C20):** Hapus kategori/prioritas/departemen yang masih dipakai → 409 dengan pesan Indonesia. `MasterDataPage` menampilkan `data.message` sebagai toast.

### Step 1 — Implementasi `master-data-configs.ts` + 4 halaman.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add master data pages (departments, categories, knowledge-categories, priorities) via MasterDataPage"
```

---

## Task 4: `/admin/audit-logs`

**Files:**
- Create: `apps/web/src/app/(app)/admin/audit-logs/page.tsx`
- Create: `apps/web/src/app/(app)/admin/audit-logs/page-client.tsx`
- Create: `apps/web/src/components/admin/AuditLogTable.tsx`
- Create: `apps/web/src/components/admin/AuditLogDetailDialog.tsx`

**Detail:** DataTable dari `GET /api/audit-logs` — filter user, module, action, tanggal (date_from/date_to). Kolom: user, action, module, module_id, description, ip_address, created_at. Klik baris → detail dialog.

**Detail dialog:** `GET /api/audit-logs/{id}` → tampilkan `old_data` vs `new_data` (perbandingan). Jika salah satu null, tampilkan "—".

**Manager scoping:** Manager melihat log hanya untuk modul yang diizinkan (D-08 amendment 3). Dropdown module untuk Manager: ticket, asset, article, knowledge_category. Filtering lain tetap tampil.

**Guard:** Rute ini bisa diakses Admin **dan** Manager (K7 pengecualian). Guard per halaman, bukan layout admin tunggal — gunakan `requireAuditViewer()` yang memeriksa `audit-log.viewAny`.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add audit log page with filters and detail dialog"
```

---

## Task 5: `/profile` + ganti password

**Files:**
- Create: `apps/web/src/app/(app)/profile/page.tsx`
- Create: `apps/web/src/app/(app)/profile/page-client.tsx`
- Create: `apps/web/src/components/profile/ProfileForm.tsx`
- Create: `apps/web/src/components/profile/ChangePasswordForm.tsx`

**Detail:** Halaman profil (C21):
- **Tampilan:** full_name, email (read-only), role, department, employee_code, phone.
- **Edit:** `PUT /api/me` — hanya `full_name` + `phone` (C21).
- **Ganti password:** `PUT /api/me/password` — current_password, password, password_confirmation. Setelah sukses → logout (backend merevoke token lain, session harus refresh).

**Jebakan — 401 setelah ganti password:** `ChangePasswordRequest` membutuhkan `current_password`. Bila salah → 422 di field `current_password`. Setelah sukses, token lain di-revoke; token saat ini tetap valid, tapi untuk keamanan tampilkan tombol "Logout" agar sesi di-refresh.

### Step 1 — Implementasi.

### Step 2 — Commit:
```bash
git commit -m "feat(web): add profile page with edit and change password"
```

---

## Exit Criteria 8f

- [x] `/admin/*` dijaga server-component guard; Manager bisa akses audit-logs, bukan halaman admin lain.
- [x] `/admin/users` — CRUD, activate/deactivate, reset-password (temporary password sekali-tampil + salin), hapus.
- [x] 4 halaman master data via `MasterDataPage` — array polos tanpa `meta`, 409 handling, parent select bertingkat, sla_minutes hint.
- [x] `/admin/audit-logs` — filter, detail dialog, Manager scoping.
- [x] `/profile` — edit full_name + phone, ganti password.
- [x] `npm run test`, `npx tsc --noEmit`, `npm run lint` hijau.