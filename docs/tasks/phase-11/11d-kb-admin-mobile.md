# Sub-tahap 11d — Knowledge Base, Admin & Touch Hardening

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Skill frontend:** `impeccable`, `shadcn`, `tailwindcss-development`, `test-driven-development`, `accessibility`.

**Goal:** Artikel KB nyaman dibaca di HP, editor markdown tidak sempit, tabel admin ringkas, dan seluruh target sentuh memenuhi WCAG 2.2 AA (44×44px).

**Branch:** `feat/phase-11d-kb-admin-mobile`
**Estimasi:** ~0,75 hari
**Prasyarat:** 11a–11c selesai.

---

## Task 1: KB mobile reader + editor tabs

**Files:**
- Modify: `apps/web/src/components/knowledge/ArticleDetail.tsx`
- Modify: `apps/web/src/components/knowledge/ArticleCardGrid.tsx`
- Modify: `apps/web/src/components/knowledge/ArticleFilters.tsx`
- Modify: `apps/web/src/components/shared/markdown-editor.tsx`
- Test: tambah/ perbarui test KB yang relevan

**Detail:**
- `ArticleDetail`: tipografi `prose prose-sm sm:prose`, max-width penuh di mobile, heading tidak overflow.
- `ArticleFilters`: gunakan kembali `MobileFilterSheet` dari 11a untuk filter kategori di HP.
- `markdown-editor`: mode tab Tulis/Pratinjau di mobile (satu panel penuh per tab), berdampingan di desktop.

- [x] **Step 1 — Implementasikan** sesuai detail (RED→GREEN per komponen bila ada test).
- [x] **Step 2 — Verifikasi:**
  ```bash
  npm run test --prefix apps/web
  ```
- [x] **Step 3 — Commit:**
  ```bash
  git commit -am "feat(web): mobile-friendly KB reader and editor tabs"
  ```

---

## Task 2: Admin tables + dialog + touch target audit

**Files:**
- Modify: `apps/web/src/components/admin/UsersTable.tsx`
- Modify: `apps/web/src/components/admin/AuditLogTable.tsx`
- Modify: `apps/web/src/components/admin/UserFormDialog.tsx`
- Modify: `apps/web/src/components/admin/AuditLogFilters.tsx`
- Modify: `apps/web/src/components/profile/ProfileForm.tsx`
- Modify: `apps/web/src/components/profile/ChangePasswordForm.tsx`

**Detail:**
- Terapkan pola `renderCard` (11a) atau `hidden md:table-cell` untuk kolom sekunder admin.
- Dialog form (`UserFormDialog`, master data): di mobile jadi sheet hampir fullscreen, scrollable, tombol submit `h-11 sticky bottom`.
- Audit touch target: tombol icon `size-11` hit-box di mobile, input/select `h-11`, pagination mudah disentuh. Tidak ada `body` horizontal overflow di 360px.

- [x] **Step 1 — Implementasikan** tabel ringkas + dialog mobile + audit touch target.
- [x] **Step 2 — Verifikasi:** test + lint lulus, cek manual 360px untuk `/admin/users`, `/admin/audit-logs`, `/profile`.
- [x] **Step 3 — Commit:**
  ```bash
  git commit -am "feat(web): responsive admin tables and touch target hardening"
  ```
