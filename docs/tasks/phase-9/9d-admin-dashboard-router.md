# Sub-tahap 9d — Dashboard Admin & Router Role di `/`

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini menyelesaikan dashboard admin (superset manager + kartu admin + audit log + pintasan master data) dan router role di `/` yang mengarahkan user ke dashboard sesuai perannya. Prasyarat: 9c selesai (`ManagerDashboardView` reusable).

**Goal:** `/dashboard/admin` menampilkan semua metrik admin (superset manager) dan `/` mengarahkan user ke dashboard peran yang benar tanpa flash/redirect ganda.

**Branch:** `feat/phase-9d-admin-router`
**Estimasi:** ~0,75 hari
**Prasyarat:** 9c selesai dan di-merge

---

## Task 1: Ekstrak `ManagerDashboardView` di 9c (dikerjakan di 9c, verifikasi di sini)

**Files:** (tidak ada perubahan di 9d — hanya verifikasi ekspor)

**Detail:** Pastikan `ManagerDashboardView` (atau `ManagerDashboardContent`) dari 9c di-export sebagai komponen yang bisa di-render di dalam admin dashboard. Bila 9c belum mengekstrak, lakukan refactor minimal: pindahkan body dashboard manager (metrics + date picker + performa + tren + distribusi) ke `ManagerDashboardView` (bukan page komponen penuh).

> **Jebakan — jangan duplikasi kode:** Admin dashboard **tidak boleh** menyalin kode komponen manager. Ekstrak di 9c, import di 9d.

### Step 1 — Verifikasi di `components/dashboard/manager/` ada `ManagerDashboardView` (atau `manager-dashboard-content.tsx`). Bila tidak, ekstrak di 9c.
### Step 2 — Commit di 9c (bila refactor) atau verifikasi saja.

---

## Task 2: Dashboard Admin — `/dashboard/admin`

**Files:**
- Create: `apps/web/src/app/(app)/dashboard/admin/page.tsx`
- Create: `apps/web/src/app/(app)/dashboard/admin/page-client.tsx`
- Create: `apps/web/src/components/dashboard/admin/admin-dashboard.tsx`
- Create: `apps/web/src/components/dashboard/admin/admin-metrics.tsx`
- Create: `apps/web/src/components/dashboard/admin/audit-log-panel.tsx`
- Create: `apps/web/src/components/dashboard/admin/config-shortcuts.tsx`
- Create: `apps/web/src/test/admin-dashboard.test.tsx`

**Layout (wireframe frame 05 — konten mengikuti ROADMAP + API, C2):**
```
[PageHeader: Dashboard Administrator]
[Total Pengguna] [Total Aset IT] [Technician] [Departemen]   ← 4 kartu admin
[ManagerDashboardView — seluruh 9c content: metrics, performa, tren, distribusi]  ← K11
[Audit Log Terbaru (kiri, 2/3)]                              [Pintasan Konfigurasi (kanan, 1/3)]
```

**Mapping data (API admin):**

| UI | Sumber | Catatan |
| --- | --- | --- |
| Kartu "Total Pengguna" | `total_users` | termasuk inactive |
| Kartu "Total Aset IT" | `total_assets` | |
| Kartu "Technician" | `total_technicians` | |
| Kartu "Departemen" | `total_departments` | |
| Semua content manager | `ManagerDashboardView` | inherits date range, semua chart & tabel |
| Panel "Audit Log Terbaru" | `recent_system_activity` (≤8) | |
| Panel "Pintasan Konfigurasi" | static links (client-side) | |

**Panel Audit Log Terbaru (`audit-log-panel.tsx`):** wireframe 05 kolom kiri. Tabel: WAKTU (RelativeTime), PENGGUNA (`user.full_name` atau "Sistem" bila null — D-31), AKSI (label dari `auditActionLabels`/`auditModuleLabels` di `labels.ts`), KETERANGAN (`description` — sudah Indonesia, D-24). Klik baris → `/admin/audit-logs` (Fase 8). Empty → `EmptyState` "Belum ada aktivitas sistem."

**Panel Pintasan Konfigurasi (`config-shortcuts.tsx`):** wireframe 05 kolom kanan. 5 link statis ke halaman admin Fase 8:
- "Pengguna & Role" → `/admin/users`
- "Departemen" → `/admin/departments`
- "Kategori Ticket" → `/admin/categories`
- "Prioritas & SLA" → `/admin/priorities`
- "Kategori Knowledge Base" → `/admin/knowledge-categories`

Masing-masing dengan ikon lucide. Tampilkan dengan `DashboardPanel` (actionLabel: "Kelola").

> **Jebakan — `ManagerDashboardView` DateRangePicker:** Admin dashboard perlu mengelola rentang tanggal yang sama untuk semua chart (milik sendiri + manager section). Deklarasikan `DateRangePicker` di level admin dashboard, bukan di dalam `ManagerDashboardView` — atau `ManagerDashboardView` menerima `range` sebagai props (bukan mengelola sendiri). Pilih pendekatan: `ManagerDashboardView` menerima `date_from`/`date_to` props dan `onRangeChange` — **tanggal dikelola di level admin** (single source of truth). Bila 9c belum menerima props, sesuaikan. (Refactor kecil di 9c.)
>
> **Jebakan — `assets_by_status` sparse:** Map ke semua status (`available, assigned, maintenance, retired, lost`) + label Indonesia (`assetStatusLabels`). Zip dengan reference 5 status — jangan hanya menampilkan yang ada.
>
> **Jebakan — `recent_system_activity` user null:** `user: null` = event sistem (D-31) → render "Sistem". Jangan render `null` atau crash.

### Step 1 — RED (Vitest mock data):
- render 4 kartu admin; `total_users` 42 → "42"; `assets_by_status` di-zip dengan 5 status&zero-fill.
- audit log: user null → "Sistem"; `description` panjang terpotong → render apa adanya.
- `ManagerDashboardView` menerima props range & onRangeChange.

### Step 2 — GREEN: implementasi.
- `page.tsx` server shell + `page-client.tsx` client.
- `AdminDashboardData` extend `ManagerDashboardData` (tipe sudah benar di `types/dashboard.ts`).

### Step 3 — verifikasi
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint && npm run build
```

### Step 4 — Commit
```bash
git add apps/web/src/app/\(app\)/dashboard/admin/ \
        apps/web/src/components/dashboard/admin/ \
        apps/web/src/test/admin-dashboard.test.tsx
git commit -m "feat(web): build admin dashboard with manager superset, audit log, and config shortcuts"
```

---

## Task 3: Router role di `/`

**Files:**
- Modify: `apps/web/src/app/(app)/page.tsx` (ganti Placeholder → router)
- Modify: `apps/web/src/lib/navigation.ts` (tambah `ROLE_HOME` constant)

**Detail:** `page.tsx` menjadi Server Component yang:
1. Panggil `laravelFetch('/me')` — token dari httpOnly cookie, server-side.
2. Baca `data.role.name` (`'administrator' | 'manager' | 'technician' | 'employee'`).
3. `redirect()` ke `/dashboard/{role}`. Peta: `administrator` → `admin`; lainnya → `employee` fallback.
4. Bila `/me` gagal (401) → `redirect('/login')` (sudah ditangani BFF proxy, tapi guard server).

```typescript
// src/app/(app)/page.tsx
import { redirect } from 'next/navigation';
import { laravelFetch } from '@/lib/server/api';
import { ROLE_HOME } from '@/lib/navigation';

export default async function DashboardRouter() {
  try {
    const me = await laravelFetch('/me');
    const role = me?.data?.role?.name;
    const path = ROLE_HOME[role] ?? '/dashboard/employee';
    redirect(path);
  } catch {
    redirect('/login');
  }
}
```

```typescript
// src/lib/navigation.ts
export const ROLE_HOME: Record<string, string> = {
  administrator: '/dashboard/admin',
  manager: '/dashboard/manager',
  technician: '/dashboard/technician',
  employee: '/dashboard/employee',
};
```

> **Jebakan — `laravelFetch` bukan di server component:** `laravelFetch` dari `@/lib/server/api` (Fase 7) hanya jalan di server. Pastikan `page.tsx` **tidak** punya `'use client'`. redirect dari `next/navigation` (bukan `next/router`).
>
> **Jebakan — performa & caching:** Tidak perlu `cache()` — redirect murah. Jangan render apapun sebelum redirect.
>
> **Jebakan — fallback role:** role `null`/undefined → fallback `/dashboard/employee` (semua role punya akses). Jangan crash.

### Step 1 — RED (test unit `ROLE_HOME` mapping):
```typescript
test('ROLE_HOME maps all role names', () => {
  expect(ROLE_HOME.administrator).toBe('/dashboard/admin');
  expect(ROLE_HOME.manager).toBe('/dashboard/manager');
  expect(ROLE_HOME.technician).toBe('/dashboard/technician');
  expect(ROLE_HOME.employee).toBe('/dashboard/employee');
});
```

### Step 2 — GREEN: implementasi router + constant.

### Step 3 — verifikasi
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint && npm run build
```

### Step 4 — Uji manual:
- Login `employee@…` → `/` → mendarat `/dashboard/employee`.
- Login `admin@…` → `/` → mendarat `/dashboard/admin`.
- Logout → `/` → `/login`.

### Step 5 — Commit
```bash
git add apps/web/src/app/\(app\)/page.tsx apps/web/src/lib/navigation.ts
git commit -m "feat(web): add role-based dashboard router at /"
```

---

## Exit Criteria 9d

- [ ] `/dashboard/admin` menampilkan 4 kartu admin + seluruh konten manager (date range, 6 kartu, performa, tren, distribusi) + audit log terbaru + pintasan master data.
- [ ] `ManagerDashboardView` diekstrak & di-reuse (dari 9c), tidak ada duplikasi kode dashboard admin.
- [ ] `assets_by_status` di-zip dengan 5 status; audit log user null → "Sistem"; pintasan 5 link navigable.
- [ ] `/` mengarahkan ke dashboard sesuai role (employee → `/dashboard/employee`, admin → `/dashboard/admin`, dll) dengan fallback employee; 401 → `/login`.
- [ ] `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` hijau.
- [ ] Commit atomik; branch `feat/phase-9d-admin-router` siap PR.