# Sub-tahap 11b — Ticket & Asset Mobile Optimization

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Skill frontend:** `impeccable`, `shadcn`, `tailwindcss-development`, `test-driven-development`.

**Goal:** Modul Tiket dan Aset nyaman dipakai dari HP: daftar jadi kartu, detail tiket punya sticky action bar, form dan upload foto lapangan ergonomis.

**Branch:** `feat/phase-11b-tickets-assets-mobile`
**Estimasi:** ~1,0 hari
**Prasyarat:** 11a selesai (`DataTable` mendukung `renderCard`, `MobileFilterSheet` tersedia).

---

## Task 1: `TicketCard` + integrasi ke `TicketTable`

**Files:**
- Create: `apps/web/src/components/tickets/TicketCard.tsx`
- Modify: `apps/web/src/components/tickets/TicketTable.tsx`
- Test: `apps/web/src/components/tickets/TicketCard.test.tsx`

**Detail:** Kartu menampilkan baris atas (nomor tiket + `StatusBadge` + `PriorityBadge`), judul (line-clamp-2), baris meta (pelapor/teknisi + `RelativeTime`), dan `SlaIndicator`. Seluruh kartu bisa diklik → `router.push(/tickets/{id})`. Target sentuh min 44px.

- [ ] **Step 1 — RED:** tulis test render `TicketCard` (nomor, badge, judul, SLA) dan navigasi klik.
- [ ] **Step 2 — Jalankan test, pastikan gagal:**
  ```bash
  npm run test TicketCard --prefix apps/web
  ```
- [ ] **Step 3 — GREEN:** implementasikan `TicketCard`, lalu pasang sebagai `renderCard` di `TicketTable`.
- [ ] **Step 4 — Verifikasi:** `npm run test TicketCard TicketTable --prefix apps/web` lulus, `npm run lint --prefix apps/web` bersih.
- [ ] **Step 5 — Commit:**
  ```bash
  git add apps/web/src/components/tickets/TicketCard.tsx apps/web/src/components/tickets/TicketTable.tsx apps/web/src/components/tickets/TicketCard.test.tsx
  git commit -m "feat(web): add TicketCard mobile view for ticket list"
  ```

---

## Task 2: Sticky Mobile Action Bar di detail tiket

**Files:**
- Create: `apps/web/src/components/tickets/TicketMobileActionBar.tsx`
- Modify: `apps/web/src/app/(app)/tickets/[id]/page-client.tsx`
- Test: `apps/web/src/components/tickets/TicketMobileActionBar.test.tsx`

**Detail:** Bar bawah `fixed bottom-0 sm:hidden` berisi aksi primer dari `available_actions` (assign/start/resolve/close/reopen) + tombol Komentar. Tambahkan `pb-20 sm:pb-0` pada container halaman agar konten tidak tertutup bar. Tombol min-height 44px.

- [ ] **Step 1 — RED:** test render aksi sesuai `available_actions` dan tombol komentar memicu callback.
- [ ] **Step 2 — Jalankan test, pastikan gagal.**
- [ ] **Step 3 — GREEN:** implementasikan komponen + integrasi ke `page-client.tsx` (hanya tampil `< 640px`).
- [ ] **Step 4 — Verifikasi:** test lulus, cek manual di viewport 390px tidak ada konten tertutup.
- [ ] **Step 5 — Commit:**
  ```bash
  git commit -am "feat(web): add sticky mobile action bar on ticket detail"
  ```

---

## Task 3: `AssetCard` + optimasi form/upload mobile

**Files:**
- Create: `apps/web/src/components/assets/AssetCard.tsx`
- Modify: `apps/web/src/components/assets/AssetTable.tsx`
- Modify: `apps/web/src/components/shared/file-upload.tsx`
- Test: `apps/web/src/components/assets/AssetCard.test.tsx`

**Detail:** `AssetCard` menampilkan asset_tag + `AssetStatusBadge`, nama, brand/model, pemegang. Di `file-upload.tsx` tambahkan `accept="image/*"` dan atribut `capture` opsional agar teknisi bisa foto langsung dari kamera HP. Pastikan input form `h-11` di mobile.

- [ ] **Step 1 — RED:** test `AssetCard` + test atribut input file.
- [ ] **Step 2 — Jalankan test, pastikan gagal.**
- [ ] **Step 3 — GREEN:** implementasikan `AssetCard`, pasang sebagai `renderCard`, perbarui `file-upload.tsx`.
- [ ] **Step 4 — Verifikasi:** test lulus.
- [ ] **Step 5 — Commit:**
  ```bash
  git commit -am "feat(web): add AssetCard mobile view and camera-ready upload"
  ```
