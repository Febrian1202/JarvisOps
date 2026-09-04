# Sub-tahap 9c — Dashboard Manager

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap paling kompleks dari Fase 9 — dashboard manager penuh: pemilih rentang tanggal, 6 kartu metrik, tabel performa technician yang bisa diurutkan, line/bar chart tren, dan distribusi prioritas/kategori. Referensi layout: wireframe frame 04 (buka via pencil MCP). Kerjakan berurutan dari Task 1.

**Goal:** Halaman `/dashboard/manager` dengan seluruh metrik §20.3 + §21 PRD, DateRangePicker tersinkron URL, distribusi berbasis reference list, dan komponen yang bisa di-reuse admin (9d). Prasyarat: 9a (DateRangePicker, MetricCard, DashboardPanel, LazyChart, formatters, label, referenceKeys) + 9b (pola dashboard).

**Branch:** `feat/phase-9c-manager-dashboard`
**Estimasi:** ~1,25 hari
**Prasyarat:** 9a & 9b selesai dan di-merge

---

## Task 1: Hook data & kustomisasi tanggal

**Files:**
- Modify: `apps/web/src/hooks/use-dashboards.ts` (dari 9b)
- Create: `apps/web/src/test/use-dashboard-params.test.ts` (test murni `buildManagerParams`)

**Detail:** Tambah hook `useManagerDashboard(params)` dan helper murni `buildDashboardParams(searchParams)` yang membaca URL (`date_from`, `date_to`) dan mengembalikan `{ date_from?, date_to? }` — **hanya** saat keduanya ada (C11).

```typescript
export function useManagerDashboard(params: { date_from?: string; date_to?: string } = {}) {
  return useQuery({
    queryKey: dashboardKeys.manager(params),
    queryFn: () => apiFetch<ManagerDashboardData>('/dashboard/manager', {}),
    select: (res) => res.data,
    staleTime: 60_000,
    refetchIntervalInBackground: false,
  });
}
```

> **Jebakan — key query & URL:** `dashboardKeys.manager(params)` membuat key berbeda per rentang — wajib, supaya ganti tanggal tidak menampilkan cache lama. Jangan memakai key statis `manager`.

**Perilaku tanggal di halaman:**
- Baca `date_from`/`date_to` dari `useSearchParams` (Suspense boundary — lihat 9b/8b).
- `DateRangePicker` → `router.replace` dengan search params baru (tanpa reload).
- Reset → hapus kedua param (URL bersih → backend default 30 hari).
- **Jangan menampilkan rentang pada kartu snapshot** (`open_tickets`, `closed_tickets`, `unassigned_tickets`), hanya pada kartu/chart yang ter-filter range.

### Step 1 — RED (test util)
- [x] Test `use-dashboard-params.test.ts` dibuat dan memverifikasi: param kosong → tidak ada query; keduanya tanggal → keduanya dikirim; hanya salah satu → tidak dikirim (C11); plus `toQueryString` dan `useManagerDashboard`.

### Step 2 — GREEN implementasi
- [x] Helper murni `buildDashboardParams` + `toQueryString` dan hook `useManagerDashboard(params)` dengan `dashboardKeys.manager(params)` diimplementasikan.
- [x] Token tema `--color-cream`, `--color-cream-card`, `--color-cream-border`, `--color-charcoal-40`, `--radius-card` ditambahkan ke `@theme inline` di `globals.css` (memperbaiki styling kartu 9a/9b yang sebelumnya tanpa definisi token).
- [x] Verifikasi test vitest, `npx tsc --noEmit`, dan lint hijau.

### Step 3 — Commit
- [x] Commit: `feat(web): add manager dashboard hook, date params helper, and cream tokens` (055c22f)

---

## Task 2: Layout & 6 kartu metrik

**Files:**
- Create: `apps/web/src/components/dashboard/manager/manager-dashboard.tsx`
- Create: `apps/web/src/components/dashboard/manager/manager-metrics.tsx`
- Create: `apps/web/src/components/dashboard/manager/sla-compliance-card.tsx` (gauge/kontraksi SLA)
- Create: `apps/web/src/app/(app)/dashboard/manager/page.tsx`
- Create: `apps/web/src/app/(app)/dashboard/manager/page-client.tsx`
- Create: `apps/web/src/test/manager-dashboard.test.tsx`

**Layout (wireframe frame 04):**
```
[PageHeader: Dashboard Manager + DateRangePicker di header kanan]
[Total Ticket] [Open] [Resolved] [SLA Compliance*] [Rata-rata Penyelesaian] [Belum Di-assign]
[Performa Technician (kiri, 2/3)]      [Distribusi Prioritas (kanan, 1/3)]
[Tren Ticket: Dibuat vs Selesai]       [Distribusi Kategori]
```

**Mapping kartu (Kontrak null & snapshot live, C13/C9):**

| Kartu | Sumber | Catatan |
| --- | --- | --- |
| Total Ticket | `total_tickets` | ter-filter rentang (created_at) |
| Open | `open_tickets` | **snapshot live** — jangan beri label "dalam rentang" |
| Resolved | `resolved_tickets` | ter-filter rentang (resolved_at) |
| SLA Compliance | `sla.compliance_percentage` | `null` → gauge "Belum ada data" (K6) |
| Rata-rata Penyelesaian | `sla.avg_resolution_minutes` via `formatDuration` | `null` → "—" |
| Belum Di-assign | `unassigned_tickets` (B2) | snapshot live |

**SLA Compliance card (`sla-compliance-card.tsx`):**
- Tampilkan persentase besar + progress bar (atau gauge radial CSS/Recharts — putuskan & konsisten). Wireframe 04 tidak menggambar gauge eksplisit; pakai angka besar + bar proporsional `within_sla / (within+breached)`.
- Footer: "X tepat waktu / Y breached" (dari `sla.within_sla`, `sla.breached`).
- **`null` compliance (0 resolved di rentang) → jangan render "0%";** tampilkan state "Belum ada data tiket selesai pada rentang ini" (K6).
- Highlight breached: `sla.breached > 0` → aksen warna danger di bar (konsisten `MetricCard tone:danger`).

> **Jebakan — angka total ≠ pembilang compliance (C9/§14):** `total_tickets` menghitung *created in range*, sedangkan `sla.within + breached = resolved in range`. Jangan letakkan "dari N total" di sebelah compliance; gunakan footer `within/breached` saja.
>
> **Jebakan — open/closed/unassigned snapshot:** bila user mengubah rentang, kartu ini tidak berubah. Untuk menghindari kebingungan, beri tooltip/keterangan kecil "Kondisi saat ini" di kartu Open/Closed/Unassigned.

### Step 1 — RED (Vitest mock data):
- [x] Test `manager-metrics.test.tsx` dibuat dan memverifikasi: 6 kartu metrik, `compliance_percentage: null` → "—" + footer "Belum ada data tiket selesai pada rentang ini" (bukan "0%"), `avg_resolution_minutes: 195` → "3j 15m", `unassigned_tickets > 0` → tone danger, compliance < 85% → aksen danger, dan skeleton per kartu saat loading.

### Step 2 — GREEN implementasi.
- [x] `manager-metrics.tsx` dan `sla-compliance-card.tsx` diimplementasikan di `apps/web/src/components/dashboard/manager/` (bar proporsional `within_sla / breached`, footer `within/breached`, label "Kondisi saat ini" pada kartu snapshot).

### Step 3 — verifikasi
- [x] Verifikasi test vitest, `npx tsc --noEmit`, dan lint hijau.

### Step 4 — Commit
- [x] Commit: `feat(web): add manager dashboard metrics and sla compliance card` (f11831f)

---

## Task 3: Tabel Performa Technician (sortable)

**Files:**
- Create: `apps/web/src/components/dashboard/manager/technician-performance-table.tsx`
- Create: `apps/web/src/test/technician-performance-table.test.tsx`

**Detail:** Tabel 6 kolom sesuai §21 PRD & wireframe 04 (header): TECHNICIAN, SELESAI, COMPLIANCE, RATA-RATA, AKTIF, BREACHED. Sumber: `technician_performance[]`.

- **Sorting client-side** (K/ROADMAP:812): klik header kolom mengurutkan naik/turun. Default urutan dari API (`resolved DESC`). Semua kolom sortable (nama, selesai, compliance, rata-rata, aktif, breached). Implementasi murni (function `sortTechnicians(rows, key, dir)`) → uji di Vitest.
- Format: compliance → `%` (mis. "93%", `null` → "—"); rata-rata → `formatDuration`; aktif/breached angka; breached `> 0` → warna danger.
- Klik baris → `/tickets?technician_id={id}` (K12) — filter teknisi tersedia utk Manager/Admin (Fase 8). `<tr tabIndex>` + Enter/Space utk a11y (Fase 8g) atau tombol "Lihat".
- `scope="col"` pada `<th>`; `<caption className="sr-only">` ringkasan tabel (a11y).
- Empty state → `EmptyState` "Belum ada performa technician."

> **Jebakan — nilai null:** `sla_compliance_percentage` & `avg_resolution_minutes` per baris bisa `null` (teknisi belum resolve di rentang). Sorting harus menaruh `null` di bawah/atas konsisten (definisikan: null selalu di akhir saat DESC). Jangan bandingkan `null` sebagai 0.
>
> **Jebakan — `full_name` "Unknown":** teknisi soft-delete → literal "Unknown" (dari backend). Biarkan; jangan render crash.

### Step 1 — RED (test fungsi sort + render):
- [x] Test `technician-performance-table.test.tsx` dibuat dan memverifikasi: sorting semua 6 kolom (client-side, `sortTechnicians` murni), `null` selalu di akhir untuk asc & desc, toggle arah, default `resolved DESC`, klik baris → `/tickets?technician_id={id}`, empty state, skeleton, dan `full_name` "Unknown" tidak crash.

### Step 2 — GREEN implementasi; verifikasi.
- [x] `technician-performance-table.tsx` diimplementasikan dengan `DataTableColumnHeader` untuk semua kolom, `formatDuration` untuk rata-rata, warna danger untuk breached > 0, dan `DashboardPanel` mendapat prop `emptyTitle` (backward-compatible).
- [x] Verifikasi test vitest, `npx tsc --noEmit`, dan lint hijau.

### Step 3 — Commit.
- [x] Commit: `feat(web): add technician performance table component for manager dashboard` (26f50ee)

---

## Task 4: Tren Ticket (Recharts, dynamic import)

**Files:**
- Create: `apps/web/src/components/dashboard/manager/ticket-trend-chart.tsx`
- Create: `apps/web/src/components/dashboard/manager/manager-dashboard.tsx` (revisi — sisipkan panel)
- Create: `apps/web/src/test/ticket-trend-chart.test.tsx`

**Detail:** Panel "Tren Ticket" memakai Recharts `BarChart` (dua seri: `created` & `resolved`) — wireframe 04. Data: `ticket_trend[]` (zero-filled tiap hari, dari backend).

- **Dynamic import (K4):** `const TicketTrendChart = lazyChart(() => import('./ticket-trend-chart').then(m => ({ default: m.TicketTrendChart })))` — pakai `LazyChart` dari 9a.
- Komponen chart: `ResponsiveContainer` + `BarChart` + 2 `Bar` (`dataKey="created"` fill charcoal, `dataKey="resolved"` fill muted/aksen — ikuti token DESIGN). Legenda `chartSeriesLabels` (`Ticket Dibuat`/`Ticket Selesai`).
- **Aksesibilitas (K4/9e):** aktifkan `accessibilityLayer`; beri `<aria-label>`/`role="img"` + teks ringkasan (mis. "Tren tiket 30 hari terakhir") yang bisa dibaca SR. Jangan andalkan tooltip saja.
- **Tooltip:** `Tooltip` Recharts menampilkan tanggal + kedua nilai; format tanggal via `date-fns` (Asia/Jakarta, `YYYY-MM-DD` → "1 Agu").
- Sumbu X ramai untuk 90 hari → format label tiap hari ke-`n` saja / `interval="preserveStartEnd"` + `minTickGap`.
- Empty state: bila seluruh `created` & `resolved` = 0 → `EmptyState` "Belum ada data tiket pada rentang ini."
- Responsive: mobile 375px → chart tetap muat (mis. `aspect`/`height` tetap, `ResponsiveContainer` mengecilkan).

> **Jebakan — zero-fill & banyak hari:** jangan render 90 bar label penuh; gunakan `minTickGap`. Tanggal dari `ticket_trend[].date` = `YYYY-MM-DD` (string); jangan di-parse ulang ke UTC — biarkan sebagai tanggal lokal.
>
> **Jebakan — double-fetch SSR:** komponen chart `ssr: false` (K4) supaya Recharts tidak SSR (hydrate mismatch). Data tetap via `useManagerDashboard`.

### Step 1 — RED (render test dengan mock `ticket_trend` 3 hari):
- [x] Test `ticket-trend-chart.test.tsx` dibuat dan memverifikasi: `figure role="img"` + `aria-label`, ringkasan sr-only berisi total dibuat/selesai, empty state (array kosong & semua nilai 0), skeleton saat loading, serta helper murni `formatTrendTick` ("2026-09-04" → "4 Sep") dan `summarizeTrend`.

### Step 2 — GREEN implementasi (chart + lazy wrapper + panel).
- [x] `ticket-trend-chart.tsx` diimplementasikan: Recharts `BarChart` 2 seri (fill `var(--chart-1)`/`var(--chart-2)`), tooltip & legenda berlabel Indonesia ("Dibuat"/"Selesai"), `minTickGap` untuk 30–90 hari, dibungkus `lazyChart` (`ssr: false`), dan wrapper `figure`/`figcaption` a11y (Recharts 3 `accessibilityLayer` aktif default).

### Step 3 — verifikasi
- [x] Verifikasi test vitest, `npx tsc --noEmit`, dan lint hijau.

### Step 4 — Commit
- [x] Commit: `feat: add ticket trend chart to manager dashboard` (012ef87)

---

## Task 5: Distribusi Prioritas & Kategori

**Files:**
- Create: `apps/web/src/components/dashboard/manager/priority-distribution.tsx`
- Create: `apps/web/src/components/dashboard/manager/category-distribution.tsx`
- Create: `apps/web/src/test/distribution.test.tsx`

**Detail:** Distribusi memakai **bar horizontal CSS** (wireframe 04) bukan pie — ringan, responsif, mudah a11y. Data: `by_priority[]` & `by_category[]` (sparse — C14/K7).

- **Zip dengan reference list (K7):**
  - Prioritas: ambil `/api/ticket-priorities` (array polos: `{id, name, sla_minutes}`) via `referenceKeys.ticketPriorities()`. Untuk tiap referensi, cari count di `by_priority`; label = `"{name} ({slaDuration})"` mis. "Critical (2 jam)" — `sla_minutes` → `formatDuration`. Bila bucket API berisi nama yang tidak ada di referensi (soft-deleted priority), tetap tampilkan dengan label apa adanya (C14).
  - Kategori: `/api/ticket-categories` → tampilkan semua dengan count 0? Wireframe hanya menampilkan yang ada. **Keputusan:** tampilkan bar untuk tiap bucket yang ada (seperti API), tapi urutkan stabil & hitung persentase terhadap total agar bar proporsional. Menampilkan kategori 0-count membanjiri panel; skip. (Untuk prioritas, tampilkan 4 bar seeded walau 0-count agar formasi "Critical/High/Medium/Low" stabil — jumlah kecil, nilai informatif.)
- Tiap bar: label kiri, bar track (fill `width %` dari max), angka kanan "N ticket (P%)".
- **A11y:** bar bukan grafik gambar — cukup struktur teks + `role="list"`/`aria-label` "Distribusi prioritas"; proporsi dijelaskan lewat persentase teks. Tidak perlu `<canvas>`.
- Sparse & empty: `by_priority` kosong (tidak ada tiket di rentang) → `EmptyState` "Belum ada data distribusi."

> **Jebakan — total denominator:** persentase dihitung terhadap total tiket yang ter-distribusi (sum counts), bukan `total_tickets` (yang ter-filter created range berbeda untuk resolved). Cukup `count / max(count) * 100` untuk lebar bar & `count / sum * 100` untuk label %.

### Step 1 — RED:
- [x] Test `distribution.test.tsx` dibuat dan memverifikasi: `mergePriorityDistribution` zero-fill 4 prioritas seeded + label durasi SLA (`formatDuration`) + bucket soft-delete tetap tampil di akhir; `calculateCategoryDistribution` menghitung persen terhadap total dan mengurutkan desc.

### Step 2 — GREEN:
- [x] `priority-distribution.tsx` dan `category-distribution.tsx` diimplementasikan (bar horizontal CSS, label kiri + "N ticket (P%)" kanan, a11y list) dan disisipkan ke view kolom kanan.

### Step 3 — verifikasi + Commit
- [x] Verifikasi test vitest, `npx tsc --noEmit`, dan lint hijau.
- [x] Commit: `feat(dashboard): add priority and category distribution panels` (741a0ae)

---

## Task 6: Rakit halaman & verifikasi manual

**Files:**
- Revisi: `apps/web/src/components/dashboard/manager/manager-dashboard.tsx` (layout penuh)
- Modify: `apps/web/src/app/(app)/dashboard/manager/page.tsx`, `page-client.tsx`

**Detail:**
1. Gabungkan Task 2–5: metrics, tabel performa, chart tren, distribusi (kiri/kanan). Header panel: DateRangePicker (page-client) + PageHeader.
2. Uji manual: ganti preset 7/30/90 hari → angka kartu & chart berubah sesuai payload API; refresh halaman mempertahankan rentang (URL); klik baris performa → `/tickets?technician_id={id}`.
3. Verifikasi angka UI = payload (exit criteria 9 fase, ROADMAP:828).

### Step 1 — RED/E2E minimal manual.
- [x] `ManagerDashboardView` diekstrak sebagai komponen presentasional murni (`data`, `isLoading`, `range`, `onRangeChange` props — tanpa fetch) agar bisa di-reuse admin di 9d.
- [x] Test `manager-dashboard.test.tsx` merender komponen asli (bukan mock SUT) dengan mock provider `useAuth`/`useReferenceData`.

### Step 2 — verifikasi
- [x] `page.tsx` (Server Component + Suspense) dan `page-client.tsx` (guard `can('dashboard.manager')` → `/403`, sinkronisasi `useSearchParams` → `useManagerDashboard`) diimplementasikan.
- [x] Verifikasi test vitest, `npx tsc --noEmit`, lint, dan `npm run build` hijau.

### Step 3 — Commit.
- [x] Commit: `feat(dashboard): refactor manager dashboard page and view with 403 guard and DateRangePicker` (96ee1f0)
- [x] Commit perbaikan: `test(manager-dashboard): test real component, mock providers` (4797fc1), `chore(test): remove unused imports in manager dashboard test` (2bd289f)

---

## Exit Criteria 9c

- [x] `/dashboard/manager` menampilkan seluruh metrik §20.3 + `unassigned_tickets` (B2) + tabel §21 (6 kolom) sortable penuh.
- [x] DateRangePicker preset 7/30/90 + kalender; URL tersinkron; **selalu kirim kedua tanggal atau tidak sama sekali**.
- [x] Chart tren (Recharts, dynamic import, `accessibilityLayer`, tooltip, empty state) terbaca di 375px.
- [x] Distribusi prioritas (label + durasi SLA) & kategori di-zip dengan reference list; empty state ada.
- [x] SLA compliance `null` → "Belum ada data"; `open/closed/unassigned` jelas berlabel snapshot live; breached ter-highlight.
- [x] Skeleton per kartu saat loading; error/403 ditangani.
- [x] `npm run test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` hijau.
- [x] Commit atomik; branch `feat/phase-9c-manager-dashboard` siap PR.
