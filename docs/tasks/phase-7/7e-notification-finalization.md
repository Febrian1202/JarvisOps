# Fase 7e — Notification UI, A11y Audit, & Finalisasi (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Setiap task memiliki langkah `- [ ]` yang harus dieksekusi secara atomic dan diakhiri dengan commit.
> - **Untuk developer manusia:** Sub-tahap penutup Fase 7 ini membangun UI notifikasi lengkap (polling 30 detik pada Topbar, dropdown notifikasi interaktif, tombol tandai baca, halaman `/notifications` paginated), melakukan pembersihan berkas boilerplate, audit kepatuhan WCAG 2.2 AA, sinkronisasi dokumentasi, dan penerbitan Git tag `v0.7.0`.

**Goal:** Mengintegrasikan notifikasi in-app ke dalam Topbar dan halaman mandiri `/notifications`, memastikan polling berkala berjalan hemat tanpa membebani browser saat tab nonaktif (`refetchIntervalInBackground: false`), menghapus seluruh sisa file boilerplate bawaan create-next-app, mengaudit aksesibilitas kontras/keyboard, serta menyelesaikan exit criteria Fase 7.

**Branch:** `feat/phase-7e-notification`
**Estimasi Waktu:** ~1.0 hari (4 task)
**Prasyarat:** 7a, 7b, 7c, dan 7d selesai.

---

### Task 1: Notification Bell, Polling 30 Detik, & Dropdown Menu

**Files:**
- Modify: `apps/web/src/components/shell/notification-bell.tsx`
- Create: `apps/web/src/hooks/use-notifications-poll.ts`
- Create: `apps/web/src/test/notification-bell.test.tsx`

**Detail:**
1. `useNotificationsPoll`: Hook TanStack Query yang memanggil `GET /api/proxy/notifications/unread-count` setiap **30 detik** (`refetchInterval: 30000`). Polling otomatis berhenti saat jendela browser kehilangan fokus (`refetchIntervalInBackground: false`).
2. `NotificationBell`: Menampilkan ikon lonceng dengan badge merah jika `unread_count > 0`. Saat diklik, membuka popover/dropdown yang memuat 5 notifikasi terbaru (`GET /api/proxy/notifications?per_page=5`).
3. Aksi Cepat:
   - Klik item notifikasi: memanggil `POST /api/proxy/notifications/{id}/read`, mengarahkan pengguna ke URL tiket terkait (`item.data.url`), dan meng-invalidasi query `unread-count`.
   - Tombol "Tandai Semua Dibaca": memanggil `POST /api/proxy/notifications/read-all`.
   - Link "Lihat Semua Notifikasi": mengarahkan ke `/notifications`.

- [x] **Step 1: Tulis unit test untuk hook polling dan bell `apps/web/src/test/notification-bell.test.tsx` (TDD RED).**
  ```tsx
  import React from 'react';
  import { screen } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import { NotificationBell } from '@/components/shell/notification-bell';
  import { renderWithProviders } from '@/test/test-utils';

  describe('NotificationBell Component', () => {
    it('renders notification bell icon button with accessible label', () => {
      renderWithProviders(<NotificationBell />);
      expect(screen.getByRole('button', { name: /notifikasi/i })).toBeInTheDocument();
    });
  });
  ```
- [x] **Step 2: Jalankan test (RED).**
  ```bash
  cd apps/web && npm run test -- src/test/notification-bell.test.tsx
  ```
- [x] **Step 3: Implementasikan `use-notifications-poll.ts` dan perbarui `notification-bell.tsx`.**
  ```typescript
  // apps/web/src/hooks/use-notifications-poll.ts
  import { useQuery } from '@tanstack/react-query';
  import { apiFetch } from '@/lib/client/api';
  import { notificationKeys } from '@/lib/query-keys';

  export function useNotificationsPoll() {
    return useQuery({
      queryKey: notificationKeys.unreadCount,
      queryFn: () => apiFetch<{ unread_count: number }>('/notifications/unread-count'),
      refetchInterval: 30 * 1000,
      refetchIntervalInBackground: false,
    });
  }
  ```
- [x] **Step 4: Jalankan test (GREEN) & typecheck.**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [x] **Step 5: Commit.**
  ```bash
  git add apps/web/src/components/shell/notification-bell.tsx apps/web/src/hooks/use-notifications-poll.ts apps/web/src/test/notification-bell.test.tsx
  git commit -m "feat(notifications): implement NotificationBell with 30s background-safe polling and quick-action popover"
  ```

---

### Task 2: Halaman Notifikasi Penuh (`/notifications`)

**Files:**
- Modify: `apps/web/src/app/(app)/notifications/page.tsx`
- Create: `apps/web/src/hooks/use-notifications.ts`
- Create: `apps/web/src/test/notifications-page.test.tsx`

**Detail:**
Membangun halaman manajemen notifikasi lengkap:
1. Menampilkan daftar notifikasi dengan server-side pagination via `DataTable` atau komponen list interaktif.
2. Filter status notifikasi: "Semua", "Belum Dibaca" (`is_read=0`), "Sudah Dibaca" (`is_read=1`).
3. Tombol "Tandai Semua Dibaca" di header halaman.
4. Setiap kartu/baris notifikasi menampilkan ikon sesuai `type`, pesan dalam bahasa Indonesia yang ramah, waktu relatif (`RelativeTime`), dan indikator dot biru untuk item belum dibaca.

- [x] **Step 1: Buat hook `apps/web/src/hooks/use-notifications.ts`.**
- [x] **Step 2: Implementasikan `apps/web/src/app/(app)/notifications/page.tsx`.**
- [x] **Step 3: Tulis test integrasi di `apps/web/src/test/notifications-page.test.tsx`.**
  ```tsx
  import React from 'react';
  import { screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import NotificationsPage from '@/app/(app)/notifications/page';
  import { renderWithProviders } from '@/test/test-utils';

  describe('Notifications Page', () => {
    it('renders page header and mark all as read button', () => {
      renderWithProviders(<NotificationsPage />);
      expect(screen.getByRole('heading', { name: /notifikasi/i })).toBeInTheDocument();
    });
  });
  ```
- [x] **Step 4: Jalankan test (GREEN) & typecheck.**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [x] **Step 5: Commit.**
  ```bash
  git add apps/web/src/app/\(app\)/notifications/page.tsx apps/web/src/hooks/use-notifications.ts apps/web/src/test/notifications-page.test.tsx
  git commit -m "feat(notifications): build complete paginated /notifications page with filters and read-all action"
  ```

---

### Task 3: Pembersihan Berkas Boilerplate & Audit Aksesibilitas WCAG 2.2 AA

**Files:**
- Delete: `apps/web/public/file.svg`, `apps/web/public/globe.svg`, `apps/web/public/next.svg`, `apps/web/public/vercel.svg`, `apps/web/public/window.svg`
- Delete: `apps/web/src/app/dashboard/` (jika masih tersisa)
- Modify: `apps/web/src/app/globals.css` (verifikasi final contrast & focus appearance)

**Detail:**
1. Bersihkan seluruh file SVG demo bawaan `create-next-app` dari direktori `public/`.
2. Lakukan audit checklist aksesibilitas WCAG 2.2 AA pada seluruh komponen:
   - Non-text Contrast (SC 1.4.11): Batas input, checkbox, badge, dan kontrol tabel memiliki rasio kontras ≥ 3:1 terhadap background `#f7f4ed`.
   - Focus Appearance (SC 2.4.11 / 2.4.13): Seluruh elemen interaktif memiliki ring fokus terlihat saat ditekan via Tab keyboard (`:focus-visible`).
   - Semantic HTML: Tabel menggunakan `<thead>`, `<tbody>`, `<th>` dengan `scope="col"`, tombol memiliki `aria-label` jika hanya berupa ikon.

- [x] **Step 1: Hapus berkas SVG demo di `apps/web/public/`.**
  ```bash
  cd apps/web && rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
  ```
- [x] **Step 2: Jalankan full test suite dan typecheck.**
  ```bash
  cd apps/web && npm run test && npm run typecheck && npm run lint
  ```
- [x] **Step 3: Commit.**
  ```bash
  git add apps/web/
  git commit -m "chore(web): remove create-next-app boilerplate SVGs and verify WCAG 2.2 AA contrast rules"
  ```

---

### Task 4: Sinkronisasi Dokumentasi & Penerbitan Git Tag `v0.7.0`

**Files:**
- Modify: `docs/product/ROADMAP.md` (centang seluruh checklist Fase 7)
- Modify: `README.md` (perbarui status implementasi menjadi Fase 7 Selesai)
- Create: Git Tag `v0.7.0`

**Detail:**
Sinkronisasi seluruh dokumen proyek untuk mencerminkan bahwa fondasi frontend, App Shell, pustaka komponen bersama, dan sistem notifikasi telah selesai secara penuh dan siap memasuki Fase 8 (Halaman Fungsional Lengkap).

**Checklist Sinkronisasi:**
1. `docs/product/ROADMAP.md`: Centang seluruh checkbox pada blok Fase 7 (`- [x]`) dan tandai exit criteria Fase 7 telah tercapai.
2. `README.md`: Update bagian Status Implementasi menjadi `Fase 7 (Frontend Foundation) — SELESAI (Tag: v0.7.0)`.

- [x] **Step 1: Update `docs/product/ROADMAP.md` dan `README.md`.**
- [x] **Step 2: Verifikasi build produksi Next.js final.**
  ```bash
  cd apps/web && npm run build
  ```
- [x] **Step 3: Jalankan seluruh test backend & frontend untuk verifikasi holistik.**
  ```bash
  cd apps/api && vendor/bin/pest
  cd apps/web && npm run test
  ```
- [x] **Step 4: Commit dan terbitkan Git Tag `v0.7.0`.**
  ```bash
  git add docs/product/ROADMAP.md README.md
  git commit -m "docs: complete Phase 7 frontend foundation and update project roadmap"
  git tag -a v0.7.0 -m "Phase 7: Frontend Foundation, App Shell, & Shared Components — Plus Jakarta Sans, shadcn theme, DataTable, AuthProvider, NotificationBell"
  git push origin main --tags
  ```

---

## Exit Criteria 7e

- [x] NotificationBell melakukan polling `GET /api/notifications/unread-count` tiap 30 detik secara background-safe.
- [x] Popover notifikasi dan halaman `/notifications` paginated berfungsi penuh dengan aksi tandai baca.
- [x] Seluruh SVG demo create-next-app terhapus bersih.
- [x] Kontras warna dan ring keyboard focus memenuhi standar WCAG 2.2 AA.
- [x] `npm run build` sukses membuat bundle produksi Next.js 16 tanpa error.
- [x] `docs/product/ROADMAP.md` dan `README.md` tersinkronisasi.
- [x] Git tag `v0.7.0` diterbitkan.
