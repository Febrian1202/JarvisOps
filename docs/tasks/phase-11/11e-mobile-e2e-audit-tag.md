# Sub-tahap 11e — Mobile E2E Testing & Release Tag v1.1.0

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap penutup Fase 11. Verifikasi penuh di viewport ponsel, lalu buat tag `v1.1.0`. **Harus menjadi merge terakhir Fase 11 ke `main`.**

**Goal:** Membuktikan seluruh halaman utama bebas overflow di 360–430px, flow teknisi/karyawan bisa diselesaikan dari HP, dan menandai rilis `v1.1.0`.

**Branch:** `feat/phase-11e-mobile-e2e-tag`
**Estimasi:** ~0,5 hari
**Prasyarat:** 11a–11d selesai dan di-merge.

---

## Task 1: Playwright mobile projects + E2E mobile suite

**Files:**
- Modify: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/mobile-responsive.spec.ts`
- Test: E2E baru

**Detail:** Tambahkan projects `Pixel 7` dan `iPhone 14` (Chromium device emulation). Suite `mobile-responsive.spec.ts` mencakup:
1. Login mobile → sidebar tersembunyi, hamburger membuka `MobileNav`.
2. `/tickets` mobile → daftar tampil sebagai kartu, tombol Filter membuka bottom sheet, memilih filter memperbarui URL.
3. `/tickets/[id]` mobile → sticky action bar terlihat, tombol aksi bisa diklik.
4. Buat tiket dari HP (smoke): `/tickets/new` terisi dan tersubmit tanpa overflow.
5. Tidak ada `document.body` horizontal overflow di `/`, `/tickets`, `/assets`, `/knowledge` pada 390px.

- [ ] **Step 1 — Tambahkan** mobile projects ke `playwright.config.ts`.
- [ ] **Step 2 — Tulis** `mobile-responsive.spec.ts` sesuai 5 skenario di atas.
- [ ] **Step 3 — Jalankan:**
  ```bash
  npm run test:e2e --prefix apps/web -- --project="Pixel 7"
  npm run test --prefix apps/web
  npm run lint --prefix apps/web
  npm run typecheck --prefix apps/web
  ```
  Semua harus hijau. Bila gagal → perbaiki, bukan menonaktifkan test.
- [ ] **Step 4 — Commit:**
  ```bash
  git add apps/web/playwright.config.ts apps/web/e2e/mobile-responsive.spec.ts
  git commit -m "test(web): add mobile viewport E2E suite (Pixel 7, iPhone 14)"
  ```

---

## Task 2: Final check + tag v1.1.0

**Files:** tidak ada perubahan kode (verifikasi + tag).

- [ ] **Step 1 — Verifikasi exit criteria Fase 11:**
  - [ ] 360px–430px: `/`, `/tickets`, `/tickets/[id]`, `/assets`, `/knowledge`, `/profile`, `/admin/*` tanpa overflow tak disengaja.
  - [ ] Card view aktif di mobile, tabel penuh di desktop.
  - [ ] Filter sheet + sticky action bar berfungsi.
  - [ ] Vitest + Playwright mobile + lint + typecheck hijau.
- [ ] **Step 2 — Perbarui ROADMAP Fase 11:** ubah semua `- [ ]` sub-tahap/exit criteria menjadi `- [x]`.
- [ ] **Step 3 — Merge ke `main` via PR, lalu tag:**
  ```bash
  git checkout main
  git pull --ff-only
  git tag -a v1.1.0 -m "Phase 11: Mobile responsive layout & touch ergonomics"
  ```
  Jangan push tag sampai diminta (keputusan repo saat ini: tunda push tag).
