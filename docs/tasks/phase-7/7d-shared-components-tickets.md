# Fase 7d — Shared Components & Tickets Proof-of-Concept (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Setiap task memiliki langkah `- [ ]` yang harus dieksekusi secara atomic dan diakhiri dengan commit.
> - **Untuk developer manusia:** Sub-tahap ini membangun pustaka komponen UI bersama (`DataTable`, `FilterBar`, `SearchInput`, `StatusBadge`, `SlaIndicator`, `RelativeTime`, `FileUpload`, `ConfirmDialog`, `EmptyState`) dan membuktikan seluruh integrasi tersebut pada halaman list minimal `/tickets`.

**Goal:** Membangun 9 shared components tingkat produksi dengan standar aksesibilitas WCAG 2.2 AA (kontras warna 3:1+, keyboard navigation, ARIA attributes) serta membuktikan integrasi data server (server-side pagination, multi-filter tersinkron URL, sorting, pencarian debounced, badge status, dan indikator SLA) secara end-to-end pada halaman `/tickets`.

**Branch:** `feat/phase-7d-components`
**Estimasi Waktu:** ~1.25 hari (4 task)
**Prasyarat:** 7a, 7b, dan 7c telah selesai dan terintegrasi di `(app)/layout.tsx`.

---

### Task 1: Status Badges, SLA Indicator, & Time Formatter

**Files:**
- Create: `apps/web/src/components/shared/status-badge.tsx`
- Create: `apps/web/src/components/shared/priority-badge.tsx`
- Create: `apps/web/src/components/shared/sla-indicator.tsx`
- Create: `apps/web/src/components/shared/relative-time.tsx`
- Create: `apps/web/src/test/indicators.test.tsx`

**Detail:**
1. `StatusBadge`: Menampilkan 5 status tiket (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`) dengan warna warm-neutral terkontrol (tanpa warna neon jenuh) dan label bahasa Indonesia terjemahan dari `labels.ts`.
2. `PriorityBadge`: Menampilkan prioritas (`Critical`, `High`, `Medium`, `Low`) dengan visual hierarchy yang jelas.
3. `SlaIndicator`: Menampilkan kondisi SLA:
   - `breached` (terlambat): Muted red text/badge (`#b91c1c`) dengan durasi keterlambatan.
   - `warning` (mendekati deadline): Terjadi jika sisa waktu ≤ 25% dari `sla_duration_minutes` (warm amber `#b45309`).
   - `on_track` (aman): Muted green / warm slate (`#15803d` / `#5f5f5d`).
4. `RelativeTime`: Menampilkan format "2 jam lalu", "3 hari lalu" dengan tooltip tanggal absolut format WIB (`Intl.DateTimeFormat` Asia/Jakarta).

- [ ] **Step 1: Tulis unit test untuk komponen indikator `apps/web/src/test/indicators.test.tsx` (TDD RED).**
  ```tsx
  import React from 'react';
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import { StatusBadge } from '@/components/shared/status-badge';
  import { SlaIndicator } from '@/components/shared/sla-indicator';

  describe('StatusBadge and SlaIndicator Components', () => {
    it('renders translated status label in Indonesian', () => {
      render(<StatusBadge status="IN_PROGRESS" />);
      expect(screen.getByText('Sedang Dikerjakan')).toBeInTheDocument();
    });

    it('renders breached SLA with proper warning text', () => {
      render(<SlaIndicator slaStatus="breached" remainingMinutes={-45} />);
      expect(screen.getByText(/terlambat 45 menit/i)).toBeInTheDocument();
    });
  });
  ```
- [ ] **Step 2: Jalankan test (RED).**
  ```bash
  cd apps/web && npm run test -- src/test/indicators.test.tsx
  ```
- [ ] **Step 3: Implementasikan `status-badge.tsx`, `priority-badge.tsx`, `sla-indicator.tsx`, dan `relative-time.tsx`.**
- [ ] **Step 4: Jalankan test (GREEN) & typecheck.**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [ ] **Step 5: Commit.**
  ```bash
  git add apps/web/src/components/shared/ apps/web/src/test/indicators.test.tsx
  git commit -m "feat(components): implement StatusBadge, PriorityBadge, SlaIndicator, and RelativeTime components"
  ```

---

### Task 2: DataTable Component (Server-Side Pagination & Sorting)

**Files:**
- Create: `apps/web/src/components/shared/data-table/data-table.tsx`
- Create: `apps/web/src/components/shared/data-table/data-table-pagination.tsx`
- Create: `apps/web/src/components/shared/data-table/data-table-column-header.tsx`
- Create: `apps/web/src/components/shared/empty-state.tsx`
- Create: `apps/web/src/test/data-table.test.tsx`

**Detail:**
1. `DataTable<TData>`: Komponen tabel generik yang dirancang untuk dataset server-side:
   - Menerima `columns: ColumnDef<TData>[]`, `data: TData[]`, `meta?: PaginationMeta`, `isLoading?: boolean`, `onPageChange`, `onSortChange`.
   - Header kolom mendukung pengurutan naik/turun dengan indikator visual dan atribut ARIA `aria-sort`.
   - Menampilkan skeleton loading saat `isLoading = true`.
   - Menampilkan `EmptyState` yang bersahabat saat data kosong (`data.length === 0`).
2. `DataTablePagination`: Kontrol paginasi terpadu (menampilkan info "Menampilkan 1-10 dari 124 data", dropdown ukuran halaman 10/25/50, tombol Sebelumnya/Berikutnya/Awal/Akhir).

- [ ] **Step 1: Tulis unit test untuk `DataTable` di `apps/web/src/test/data-table.test.tsx` (TDD RED).**
  ```tsx
  import React from 'react';
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import { DataTable } from '@/components/shared/data-table/data-table';

  describe('DataTable Component', () => {
    const dummyColumns = [
      { id: 'id', header: 'ID', accessorKey: 'id' },
      { id: 'title', header: 'Judul', accessorKey: 'title' },
    ];

    it('renders table headers and rows correctly', () => {
      const data = [{ id: 1, title: 'Laptop Rusak' }];
      render(<DataTable columns={dummyColumns} data={data} />);
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Laptop Rusak')).toBeInTheDocument();
    });

    it('displays empty state when data is empty', () => {
      render(<DataTable columns={dummyColumns} data={[]} />);
      expect(screen.getByText(/tidak ada data/i)).toBeInTheDocument();
    });
  });
  ```
- [ ] **Step 2: Jalankan test (RED).**
  ```bash
  cd apps/web && npm run test -- src/test/data-table.test.tsx
  ```
- [ ] **Step 3: Implementasikan komponen DataTable di `apps/web/src/components/shared/data-table/` dan `empty-state.tsx`.**
- [ ] **Step 4: Jalankan test (GREEN) & typecheck.**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [ ] **Step 5: Commit.**
  ```bash
  git add apps/web/src/components/shared/data-table/ apps/web/src/components/shared/empty-state.tsx apps/web/src/test/data-table.test.tsx
  git commit -m "feat(components): implement server-paginated DataTable with column headers and EmptyState"
  ```

---

### Task 3: FilterBar, SearchInput, FileUpload, & ConfirmDialog

**Files:**
- Create: `apps/web/src/components/shared/search-input.tsx`
- Create: `apps/web/src/components/shared/filter-bar.tsx`
- Create: `apps/web/src/components/shared/file-upload.tsx`
- Create: `apps/web/src/components/shared/confirm-dialog.tsx`
- Create: `apps/web/src/hooks/use-debounce.ts`
- Create: `apps/web/src/test/filter-bar.test.tsx`

**Detail:**
1. `SearchInput`: Input pencarian dengan icon kaca pembesar dan debounce 300ms yang secara otomatis memperbarui URL query param `?search=...`.
2. `FilterBar`: Wadah filter terpadu (dropdown status, kategori, prioritas) yang tersinkronisasi dua arah dengan `useSearchParams` Next.js (sehingga link filter dapat di-bookmark dan di-share). Tombol "Reset Filter" membersihkan seluruh query params aktif.
3. `FileUpload`: Komponen upload file attachment dengan validasi client-side (maksimal 5 MB, tipe JPG/JPEG/PNG/PDF), preview nama/ukuran file, dan progress indikator.
4. `ConfirmDialog`: Dialog konfirmasi aksi destruktif (mis. hapus tiket, release aset) berbasis modal Radix.

- [ ] **Step 1: Tulis unit test untuk `useDebounce` dan `FileUpload` validation (TDD RED).**
  ```tsx
  import { renderHook, act } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import { useDebounce } from '@/hooks/use-debounce';

  describe('useDebounce hook', () => {
    it('debounces value updates after delay', () => {
      vi.useFakeTimers();
      const { result, rerender } = renderHook(({ val }) => useDebounce(val, 300), {
        initialProps: { val: 'initial' },
      });

      expect(result.current).toBe('initial');
      rerender({ val: 'updated' });
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('updated');
      vi.useRealTimers();
    });
  });
  ```
- [ ] **Step 2: Jalankan test (RED).**
  ```bash
  cd apps/web && npm run test -- src/test/filter-bar.test.tsx
  ```
- [ ] **Step 3: Implementasikan `use-debounce.ts`, `search-input.tsx`, `filter-bar.tsx`, `file-upload.tsx`, dan `confirm-dialog.tsx`.**
- [ ] **Step 4: Jalankan test (GREEN) & typecheck.**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [ ] **Step 5: Commit.**
  ```bash
  git add apps/web/src/components/shared/ apps/web/src/hooks/use-debounce.ts apps/web/src/test/filter-bar.test.tsx
  git commit -m "feat(components): implement URL-synced FilterBar, SearchInput, FileUpload, and ConfirmDialog"
  ```

---

### Task 4: Pembuktian Integrasi — Halaman Minimal `/tickets` List Page

**Files:**
- Modify: `apps/web/src/app/(app)/tickets/page.tsx`
- Create: `apps/web/src/hooks/use-tickets.ts`
- Create: `apps/web/src/test/tickets-page.test.tsx`

**Detail:**
Gunakan seluruh komponen yang telah dibuat (DataTable, FilterBar, SearchInput, StatusBadge, PriorityBadge, SlaIndicator, RelativeTime) untuk membangun halaman list tiket nyata di `/tickets`:
1. Memanggil `GET /api/proxy/tickets` dengan TanStack Query (`useQuery` di `useTickets`).
2. Meneruskan seluruh parameter URL (`page`, `per_page`, `status_id`, `priority_id`, `category_id`, `search`, `sort_by`, `sort_dir`) ke backend.
3. Menampilkan baris tiket lengkap: Nomor Tiket, Judul, Kategori, Prioritas (Badge), Status (Badge), SLA Deadline & Status (SlaIndicator), Pelapor, Teknisi, dan Waktu Pembuatan (RelativeTime).
4. Menangani state loading skeleton dan empty state saat tidak ada tiket yang cocok.

- [ ] **Step 1: Buat hook `apps/web/src/hooks/use-tickets.ts`.**
  ```typescript
  import { useQuery } from '@tanstack/react-query';
  import { apiFetch } from '@/lib/client/api';
  import { ticketKeys } from '@/lib/query-keys';
  import { TicketListItem, TicketQueryParams } from '@/types/tickets';
  import { PaginatedResponse } from '@/types/api';

  export function useTickets(params: TicketQueryParams) {
    return useQuery({
      queryKey: ticketKeys.list(params),
      queryFn: () => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            searchParams.set(key, String(val));
          }
        });
        return apiFetch<PaginatedResponse<TicketListItem>>(`/tickets?${searchParams.toString()}`);
      },
    });
  }
  ```
- [ ] **Step 2: Implementasikan `apps/web/src/app/(app)/tickets/page.tsx`.**
- [ ] **Step 3: Tulis integrasi test di `apps/web/src/test/tickets-page.test.tsx`.**
  ```tsx
  import React from 'react';
  import { screen } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import TicketsPage from '@/app/(app)/tickets/page';
  import { renderWithProviders } from '@/test/test-utils';

  describe('Tickets Proving Ground Page', () => {
    it('renders page title and filter toolbar', () => {
      renderWithProviders(<TicketsPage />);
      expect(screen.getByRole('heading', { name: /daftar tiket/i })).toBeInTheDocument();
    });
  });
  ```
- [ ] **Step 4: Jalankan test (GREEN) & typecheck.**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [ ] **Step 5: Verifikasi build produksi Next.js.**
  ```bash
  cd apps/web && npm run build
  ```
- [ ] **Step 6: Commit.**
  ```bash
  git add apps/web/src/app/\(app\)/tickets/page.tsx apps/web/src/hooks/use-tickets.ts apps/web/src/test/tickets-page.test.tsx
  git commit -m "feat(tickets): build minimal tickets list page proving DataTable, FilterBar, and SLA indicators"
  ```

---

## Exit Criteria 7d

- [ ] Pustaka 9 shared components (`StatusBadge`, `PriorityBadge`, `SlaIndicator`, `RelativeTime`, `DataTable`, `FilterBar`, `SearchInput`, `FileUpload`, `ConfirmDialog`) tuntas dan memiliki unit test di Vitest.
- [ ] Halaman `/tickets` berhasil menampilkan daftar tiket riil dari API dengan fitur server-side pagination, sorting, search debounce, dan filter kategori/status/prioritas.
- [ ] Indikator SLA menampilkan label keterlambatan (merah) untuk breached ticket dan peringatan waktu sisa (amber) untuk mendekati deadline.
- [ ] Seluruh komponen memenuhi standar kontras WCAG 2.2 AA dan navigasi keyboard.
- [ ] `npm run test`, `npm run typecheck`, dan `npm run build` 100% hijau.
