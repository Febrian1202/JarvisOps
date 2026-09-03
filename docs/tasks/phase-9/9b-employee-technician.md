# Sub-tahap 9b — Dashboard Employee & Technician

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini membangun dua dashboard paling sederhana lebih dulu untuk memantapkan pola (`MetricCard`, `DashboardPanel`, Client Component + TanStack Query, skeleton per kartu) sebelum dashboard kompleks di 9c. Kerjakan Task 1 (Employee) lalu Task 2 (Technician). Referensi layout: wireframe frame 02 (Employee) & 03 (Technician) — buka via pencil MCP.

**Goal:** Halaman `/dashboard/employee` (greeting, 4 kartu, tabel tiket terbaru, aset & artikel) dan `/dashboard/technician` (6 kartu, highlight SLA breached, daftar aktivitas terbaru yang menaut ke tiket). Prasyarat: 9a selesai (B1–B4 + `MetricCard`, `DashboardPanel`, `formatters.ts`, label).

**Branch:** `feat/phase-9b-employee-technician`
**Estimasi:** ~1,0 hari
**Prasyarat:** 9a selesai dan di-merge

---

## Task 1: Dashboard Employee — `/dashboard/employee`

**Files:**
- Create: `apps/web/src/app/(app)/dashboard/employee/page.tsx`
- Create: `apps/web/src/app/(app)/dashboard/employee/page-client.tsx`
- Create: `apps/web/src/components/dashboard/employee/employee-dashboard.tsx`
- Create: `apps/web/src/components/dashboard/employee/ticket-mini-table.tsx`
- Create: `apps/web/src/components/dashboard/employee/asset-list.tsx`
- Create: `apps/web/src/components/dashboard/employee/article-list.tsx`
- Create: `apps/web/src/hooks/use-dashboards.ts`
- Create: `apps/web/src/test/employee-dashboard.test.tsx`

**Layout (wireframe frame 02):**
```
Greeting (dinamis per waktu WIB)          [CTA Buat Ticket]   (can('ticket.create'))
[Ticket Terbuka] [Sedang Dikerjakan] [Selesai] [Aset Dipegang]   ← 4 MetricCard
[Ticket Saya  (panel kiri, 2/3)]        [Aset Yang Kamu Pegang (panel kanan)]
                                        [Artikel Terbaru]
```

**Mapping data (API employee):**

| UI | Sumber |
| --- | --- |
| Greeting subtitle "Kamu punya N ticket yang sedang berjalan" | `my_open_tickets` |
| Kartu "Ticket Terbuka" | `my_open_tickets` (footer: "Menunggu penanganan") |
| Kartu "Sedang Dikerjakan" | `my_in_progress_tickets` (footer: "Sedang ditangani teknisi") |
| Kartu "Selesai" | `my_resolved_tickets` (footer: "Total selesai") — **label bukan "Baru Selesai"** (angka all-time, C9/C13) |
| Kartu "Aset Dipegang" | `my_assets.length` (footer: "Aset terdaftar atas nama Anda") |
| Tabel "Ticket Saya" | `recent_tickets` (≤5, `TicketListItem`) |
| Panel "Aset Yang Kamu Pegang" | `my_assets` (≤5, `AssignableAsset`) |
| Panel "Artikel Terbaru" | `recent_articles` (≤5, `KnowledgeArticleListItem`) |

**Greeting dinamis:** "Selamat pagi / siang / sore / malam, {full_name}" berdasarkan jam **Asia/Jakarta** (bukan jam browser). Gunakan `useAuth()` dari Fase 7 untuk `full_name`; helper `getGreeting(hour)` di `formatters.ts` (tambah di 9b bila belum ada). Subtitle memakai `my_open_tickets`.

**CTA Buat Ticket:** link ke `/tickets/new`, tampil hanya bila `can('ticket.create')` (K12). Sembunyikan untuk role yang tidak berhak (backup: tombol dihantarkan 403 oleh backend).

**Tabel "Ticket Saya" (`ticket-mini-table.tsx`):** kolom NOMOR, JUDUL, STATUS (StatusBadge), PRIORITAS (PriorityBadge), SISA SLA (kustom, lihat Jebakan), DIBUAT (RelativeTime). Klik baris → `/tickets/{id}`. Data ≤5 — **tanpa pagination** (C15). Gunakan `DataTable` bila ringan, atau tabel polos `<table>` + th `scope="col"` (a11y, Fase 8g). Empty state → `EmptyState` "Belum ada tiket."

**Panel "Aset Yang Kamu Pegang" (`asset-list.tsx`):** tiap item: nama aset + `asset_tag` + StatusBadge status. Klik → `/assets/{id}` (route ada dari Fase 8). Empty → "Kamu belum memegang aset apa pun."

**Panel "Artikel Terbaru" (`article-list.tsx`):** tiap item: judul + kategori. Klik → `/knowledge/{slug}`. Empty → "Belum ada artikel terbaru."

**Hook `use-dashboards.ts`:**
```typescript
export function useEmployeeDashboard() {
  return useQuery({
    queryKey: dashboardKeys.employee(),
    queryFn: () => apiFetch<EmployeeDashboardData>('/dashboard/employee'),
    select: (res) => res.data, // unwrap envelope — pola Fase 8
    staleTime: 60_000,
    refetchIntervalInBackground: false,
  });
}
```
Tambahkan `useTechnicianDashboard` di Task 2, `useManagerDashboard(params)` & `useAdminDashboard(params)` di 9c/9d. `apiFetch` mengembalikan **envelope** `ApiResponse<T>` — pakai `select: (res) => res.data` (pola halaman Fase 8); query string tanggal di-append ke endpoint dengan `URLSearchParams` (pola `useTickets`), bukan objek `params`.

> **Jebakan — `recent_tickets[].technician` opsional (C17):** kolom teknisi bila perlu tampil, guard `ticket.technician ? ticket.technician.full_name : '—'`; jangan akses `.full_name` tanpa guard.
>
> **Jebakan — label Selesai bukan "Baru Selesai":** `my_resolved_tickets` adalah jumlah **all-time**, bukan daftar recent. Jangan memberi label yang menyiratkan rentang waktu.
>
> **Jebakan — skeleton per kartu (K3):** saat `isLoading`, tiap MetricCard & panel menampilkan skeleton sendiri. **Jangan** render satu `LoadingSkeleton` menutupi seluruh halaman.
>
> **Jebakan — greeting & waktu:** jam dihitung dari `Asia/Jakarta` (D-23), bukan `new Date().getHours()`. Untuk test, injeksi jam sebagai argumen fungsi murni `getGreeting(7)` → "Selamat pagi".

### Step 1 — RED (Vitest, mock `useAuth` + `apiFetch` via `vi.mock`):
```typescript
// test/employee-dashboard.test.tsx
// - render employee dashboard dengan mock data
// - verifikasi 4 kartu menampilkan angka sesuai data
// - verifikasi null tidak dirender sebagai "0" (mis. bila future nullable)
// - verifikasi CTA "Buat Ticket" tampil bila can('ticket.create') true, hilang bila false
// - verifikasi tabel tiket meng-klik baris → router.push('/tickets/123')
// - verifikasi greeting pagi/siang/sore/malam via getGreeting()
```

### Step 2 — GREEN: implementasi page + komponen + hook.
- `page.tsx` (server) hanya render `PageHeader` + `<EmployeeDashboard />` (client) dalam `Suspense` bila perlu (bukan prefetch data — K1).
- `page-client.tsx` / `employee-dashboard.tsx`: `useEmployeeDashboard()` + `useAuth()`; susun layout grid (desktop: kolom 2/3–1/3; mobile: stack vertikal).

### Step 3 — REFACTOR & verifikasi
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint
```

### Step 4 — Commit
```bash
git add apps/web/src/app/\(app\)/dashboard/employee/ \
        apps/web/src/components/dashboard/employee/ \
        apps/web/src/hooks/use-dashboards.ts \
        apps/web/src/test/employee-dashboard.test.tsx
git commit -m "feat(web): build employee dashboard with greeting, metrics, recent tickets, assets, and articles"
```

---

## Task 2: Dashboard Technician — `/dashboard/technician`

**Files:**
- Create: `apps/web/src/app/(app)/dashboard/technician/page.tsx`
- Create: `apps/web/src/app/(app)/dashboard/technician/page-client.tsx`
- Create: `apps/web/src/components/dashboard/technician/technician-dashboard.tsx`
- Create: `apps/web/src/components/dashboard/technician/activity-list.tsx`
- Create: `apps/web/src/test/technician-dashboard.test.tsx`

**Layout (wireframe frame 03 — konten mengikuti ROADMAP, C1):**
```
[Ditugaskan ke Saya] [Sedang Dikerjakan] [Antrean OPEN] [SLA Breached*] [Rata-rata Waktu] [SLA Compliance Saya]
*Aktifkan tone danger bila > 0
[Panel Aktivitas Terbaru Saya]
```

**Mapping data (API technician):**

| UI | Sumber |
| --- | --- |
| Kartu "Ditugaskan ke Saya" | `assigned_tickets` (footer: "Tiket non-closed milik Anda") |
| Kartu "Sedang Dikerjakan" | `in_progress_tickets` |
| Kartu "Antrean OPEN (Bisa Diambil)" | `open_tickets` — **antrean global**, bukan miliknya (K9/C12) |
| Kartu "SLA Breached" | `sla_breached` — `tone:'danger'` bila > 0; footer "Segera selesaikan tiket terlambat" |
| Kartu "Rata-rata Waktu Selesai" | `avg_resolution_minutes` via `formatDuration` — `null` → "—" |
| Kartu "SLA Compliance Saya" | `sla_compliance_percentage` (B1) — `null` → "—", bukan 0% |
| Panel "Aktivitas Terbaru Saya" | `recent_activity` (≤5, `TicketHistoryItem` + `ticket` dari B3) |

**Panel Aktivitas Terbaru (`activity-list.tsx`):** tiap item:
- Ikon berdasarkan `field_changed` (via label `activityFieldLabels` dari 9a).
- Teks utama: label aksi + `ticket.ticket_number` bila ada (B3), mis. "Mengubah status TCK-0042".
- Waktu: `RelativeTime` (tooltip absolut Asia/Jakarta).
- Klik → `/tickets/{ticket.id}` bila `ticket` ada (K12). Bila `ticket` absen (data lama / teknisi berubah), tampilkan tanpa link.
- Empty → `EmptyState` "Belum ada aktivitas."

> **Jebakan — `recent_activity` tidak punya `ticket.id` (hanya `ticket_number`+`title`):** Untuk menaut ke `/tickets/{id}`, **tidak ada id tiket di payload** (B3 hanya menambah `ticket_number`/`title`). Opsi: (1) simpan `ticket_id` → perlu amandemen tambahan; **keputusan:** tautkan ke `/tickets?search={ticket_number}` (search by number didukung `IndexTicketRequest`, Fase 8) — atau ke `/tickets?search=TCK-0042`. Dokumentasikan di komponen. Alternatif ringan: tanpa tautan, hanya label. **Pilih tautan search-by-number** agar aktivitas tetap navigable tanpa amandemen baru.
>
> **Jebakan — kartu Antrean OPEN:** jangan menulis "Tiket Open Saya" — angka itu milik seluruh teknisi (test Fase 6 mengunci `open_tickets` = global).
>
> **Jebakan — 6 kartu di satu baris:** pada desktop penuh muat 6 (wireframe memakai 5 di 1200px); pastikan grid responsif (wrap di tablet, stack di mobile). Skeleton per kartu saat loading (K3).

### Step 1 — RED (Vitest):
```typescript
// test/technician-dashboard.test.tsx
// - render dengan mock data; verifikasi 6 kartu angka benar
// - kartu SLA Breached punya class danger bila > 0
// - avg_resolution_minutes null → "—" (bukan "0")
// - sla_compliance_percentage null → "—"
// - item aktivitas dengan ticket → link search-by-number
// - item aktivitas tanpa ticket → tidak ada link (masih render label)
```

### Step 2 — GREEN: implementasi page + komponen.

### Step 3 — REFACTOR & verifikasi
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint && npm run build
```

### Step 4 — Commit
```bash
git add apps/web/src/app/\(app\)/dashboard/technician/ \
        apps/web/src/components/dashboard/technician/ \
        apps/web/src/test/technician-dashboard.test.tsx
git commit -m "feat(web): build technician dashboard with metrics, SLA highlight, and recent activity"
```

---

## Task 3: Verifikasi manual & wiring navigasi

**Files:**
- Modify: `apps/web/src/lib/navigation.ts` (bila perlu tambahkan `ROLE_HOME` — dilakukan di 9d; verifikasi saja)

**Detail:**
1. Login tiap role → buka `/dashboard/employee` dan `/dashboard/technician` (rute baru; item nav "Dashboard" masih mengarah `/` sampai router 9d).
2. Verifikasi angka di UI sama dengan payload mentah API (bandingkan manual dengan curl untuk data seeder).
3. Verifikasi tab inactive tidak memicu refetch (K3/9e; `refetchIntervalInBackground: false`).
4. Verifikasi responsif: 375px (stack), 768px (grid 2 kolom), 1440px (layout penuh).

### Step 1 — uji manual di browser; catat anomali sebagai isu.
### Step 2 — Commit perbaikan kecil (bila ada):
```bash
git commit -am "fix(web): dashboard polish after manual verification"
```

---

## Exit Criteria 9b

- [ ] `/dashboard/employee`: greeting dinamis WIB, 4 kartu benar, tabel tiket terbaru (dengan sisa SLA & status badge), aset, artikel; CTA Buat Ticket sesuai `can()`.
- [ ] `/dashboard/technician`: 6 kartu benar; "Antrean OPEN" menampilkan angka global; kartu SLA Breached ber-tone danger; `null` compliance/avg → "—".
- [ ] Aktivitas terbaru menampilkan label Indonesia + nomor tiket; menaut ke `/tickets?search={ticket_number}` bila data tiket ada.
- [ ] Skeleton per kartu; `EmptyState` untuk daftar kosong; error 403/500 ditangani (halaman 403 / `errorMessages`).
- [ ] Responsif 375/768/1440 (chart belum ada di sub-tahap ini).
- [ ] `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` hijau.
- [ ] Commit atomik; branch `feat/phase-9b-employee-technician` siap PR.
