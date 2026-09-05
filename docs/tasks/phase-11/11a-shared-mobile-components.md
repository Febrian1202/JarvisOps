# Sub-tahap 11a — Shared Mobile Components & View Adapter

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Skill frontend:** `shadcn`, `tailwindcss-development`, `test-driven-development`.

**Goal:** Membangun fondasi komponen adaptif mobile yang digunakan lintas halaman: hook breakpoint, responsif card view pada `DataTable`, dan Bottom Sheet filter untuk menggantikan deretan select box yang sempit.

**Branch:** `feat/phase-11a-shared-mobile`
**Estimasi:** ~0,75 hari
**Prasyarat:** v1.0.0 di `main`.

---

## Task 1: SSR-Safe `useMediaQuery` Hook

**Files:**
- Create: `apps/web/src/hooks/use-media-query.ts`
- Test: `apps/web/src/hooks/use-media-query.test.ts`

**Interfaces:**
- Produces: `useMediaQuery(query: string): boolean`, `useIsMobile(): boolean` (shortcut `(max-width: 639px)`)

- [ ] **Step 1: Tulis test Vitest untuk `useMediaQuery`**
  Menguji fallback default saat SSR dan responsivitas saat `window.matchMedia` berubah.
- [ ] **Step 2: Jalankan test dan pastikan gagal (RED)**
  `npm run test apps/web/src/hooks/use-media-query.test.ts`
- [ ] **Step 3: Implementasikan `useMediaQuery` & `useIsMobile`**
  Menggunakan `useSyncExternalStore` atau `useEffect` yang ramah React 19 SSR.
- [ ] **Step 4: Jalankan test dan pastikan lulus (GREEN)**
- [ ] **Step 5: Commit:**
  `git commit -m "feat(web): add SSR-safe useMediaQuery and useIsMobile hooks"`

---

## Task 2: Responsive Card View Adapter di `DataTable`

**Files:**
- Modify: `apps/web/src/components/shared/data-table/data-table.tsx`
- Test: `apps/web/src/components/shared/data-table/data-table.test.tsx`

**Interfaces:**
- Consumes: `ColumnDef<TData>`, `PaginationMeta`
- Produces: Tambahan prop opsional `renderCard?: (row: TData, index: number) => React.ReactNode` pada `DataTableProps<TData>`

- [ ] **Step 1: Tulis test untuk render kartu di mobile viewport**
  Memastikan jika `renderCard` disediakan, container mobile merender kartu, sedangkan desktop tetap menampilkan `<table>`.
- [ ] **Step 2: Jalankan test dan pastikan gagal (RED)**
- [ ] **Step 3: Implementasikan tampilan ganda di `DataTable`**
  Gunakan kelas utilitas CSS Tailwind `hidden sm:block` untuk tabel desktop dan `block sm:hidden space-y-3` untuk mobile list. Ini mencegah hydration flicker.
- [ ] **Step 4: Jalankan test dan pastikan lulus (GREEN)**
- [ ] **Step 5: Commit:**
  `git commit -m "feat(web): add responsive mobile card adapter to DataTable"`

---

## Task 3: `MobileFilterSheet` Component

**Files:**
- Create: `apps/web/src/components/shared/mobile-filter-sheet.tsx`
- Modify: `apps/web/src/components/shared/filter-bar.tsx`
- Test: `apps/web/src/components/shared/mobile-filter-sheet.test.tsx`

**Interfaces:**
- Consumes: `FilterField[]`, Radix Dialog / Sheet UI
- Produces: `<MobileFilterSheet filters={...} activeCount={...} onApply={...} onReset={...} />`

- [ ] **Step 1: Tulis test untuk `MobileFilterSheet`**
  Menampilkan trigger button dengan badge active filter count, membuka sheet dialog saat disentuh, serta tombol reset & terapkan.
- [ ] **Step 2: Jalankan test dan pastikan gagal (RED)**
- [ ] **Step 3: Implementasikan `MobileFilterSheet`**
  Komponen drawer bottom sheet dengan tombol bersihkan dan terapkan filter.
- [ ] **Step 4: Integrasikan ke `FilterBar`**
  Tampilkan baris select lengkap di tablet/desktop (`hidden sm:flex`), dan gantikan dengan `MobileFilterSheet` di layar kecil (`sm:hidden`).
- [ ] **Step 5: Jalankan test unit dan pastikan lulus (GREEN)**
- [ ] **Step 6: Commit:**
  `git commit -m "feat(web): introduce MobileFilterSheet and integrate into FilterBar"`
