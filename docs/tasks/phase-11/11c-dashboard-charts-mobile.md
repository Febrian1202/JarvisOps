# Sub-tahap 11c — Dashboard & Charts Mobile Ergonomics

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Skill frontend:** `impeccable`, `tailwindcss-development`, `test-driven-development`.

**Goal:** Dashboard 4 role dan grafik Recharts tetap terbaca di layar 360px: metrik jadi grid 2 kolom kompak, chart tidak terpotong, date picker tidak clipping.

**Branch:** `feat/phase-11c-dashboard-mobile`
**Estimasi:** ~0,75 hari
**Prasyarat:** 11a selesai.

---

## Task 1: Compact metric grid + chart responsiveness

**Files:**
- Modify: `apps/web/src/components/dashboard/metric-card.tsx`
- Modify: `apps/web/src/components/dashboard/manager/manager-metrics.tsx`
- Modify: `apps/web/src/components/dashboard/admin/admin-metrics.tsx`
- Modify: `apps/web/src/components/dashboard/manager/ticket-trend-chart.tsx`
- Modify: `apps/web/src/components/dashboard/manager/category-distribution.tsx`
- Modify: `apps/web/src/components/dashboard/manager/priority-distribution.tsx`
- Test: perbarui/ tambah `metric-card.test.tsx` bila ada

**Detail:**
- Grid metrik: `grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` (manager 6 kartu), angka `text-lg sm:text-2xl`, padding kompak.
- Recharts: bungkus dengan `ResponsiveContainer` tinggi `h-56 sm:h-72`, margin kanan minimal, `tick={{ fontSize: 11 }}`, interval label X dirapatkan di mobile. Tooltip tetap bisa disentuh (default Recharts sudah touch-aware; jangan matikan).
- Tabel `technician-performance-table` di mobile: sembunyikan kolom sekunder via `hidden md:table-cell` (pola yang sudah dipakai `AuditLogTable`/`UsersTable`).

- [ ] **Step 1 — Audit:** buka `/` sebagai manager di viewport 360px, catat elemen yang overflow/terpotong.
- [ ] **Step 2 — Implementasikan:** ubah grid + chart height/margin/tick sesuai detail di atas.
- [ ] **Step 3 — Verifikasi:**
  ```bash
  npm run test --prefix apps/web
  npm run lint --prefix apps/web
  ```
  Cek manual 360px: tidak ada horizontal scroll body, label chart terbaca.
- [ ] **Step 4 — Commit:**
  ```bash
  git commit -am "feat(web): compact dashboard metrics and charts for mobile"
  ```

---

## Task 2: Mobile-safe `DateRangePicker`

**Files:**
- Modify: `apps/web/src/components/dashboard/date-range-picker.tsx`
- Test: `apps/web/src/components/dashboard/date-range-picker.test.tsx`

**Detail:** Di mobile (`< 640px`) popover kalender mudah terpotong. Gunakan pola: trigger ringkas (`h-11`, label tanggal pendek) + konten kalender dalam Dialog/Sheet modal fullscreen-ish di mobile, popover biasa di desktop. Manfaatkan `useIsMobile` dari 11a.

- [ ] **Step 1 — RED:** test trigger mudah disentuh dan konten terbuka sebagai dialog di mobile.
- [ ] **Step 2 — Jalankan test, pastikan gagal.**
- [ ] **Step 3 — GREEN:** implementasikan branch mobile/desktop.
- [ ] **Step 4 — Verifikasi:** test lulus.
- [ ] **Step 5 — Commit:**
  ```bash
  git commit -am "feat(web): make DateRangePicker mobile-safe via dialog"
  ```
