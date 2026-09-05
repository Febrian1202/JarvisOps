# Sub-tahap 11d — Knowledge Base, Admin & Touch Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyempurnakan pengalaman antarmuka perangkat mobile (smartphone 360px–430px) untuk modul Knowledge Base, halaman administrasi pengguna & audit log, form profil/ganti password, serta memastikan seluruh target interaktif (tombol, input, dropdown, pagination) memenuhi standar aksesibilitas WCAG 2.2 AA (target sentuh minimal 44×44px).

**Architecture:**
- **Knowledge Base Mobile Reader & Filter**: Mengadaptasi tipografi responsif `prose-sm sm:prose`, word break aman (`break-words`), padding adaptif (`p-4 sm:p-6`), dan mengintegrasikan `MobileFilterSheet` pada `ArticleFilters` untuk layar `< 640px`.
- **Markdown Editor Touch Optimization**: Memastikan toolbar format markdown memiliki overflow horizontal yang halus (`overflow-x-auto no-scrollbar`), touch target tombol toolbar minimal 36px–44px, dan tab switch (Tulis/Pratinjau) memiliki tinggi minimal 44px pada mobile.
- **Admin Mobile Card View**: Menambahkan `renderCard` pada `UsersTable` dan `AuditLogTable` untuk merender kartu mobile informatif saat `< 640px`, sekaligus menerapkan `hidden md:table-cell` pada kolom sekunder tabel desktop.
- **Dialog & Form Touch Ergonomics**: Menyesuaikan `UserFormDialog`, `AuditLogDetailDialog`, `ResetPasswordDialog`, `ProfileForm`, dan `ChangePasswordForm` dengan input & tombol berukuran minimal `h-11` (44px) di mobile, dialog scrollable dengan sticky footer actions, serta mencegah horizontal overflow pada 360px.

**Tech Stack:** Next.js 16.3 App Router, React 19, Tailwind CSS v4, Radix UI (Dialog, Sheet, Select, Tabs, Popover), Lucide React, Vitest 4, `@testing-library/react`.

**Spec:** `docs/tasks/phase-11/11d-kb-admin-mobile.md`

## Global Constraints
- Branch: `feat/phase-11d-kb-admin-mobile`
- Zero horizontal overflow: pada viewport 360px–430px tidak boleh ada horizontal scrollbar pada body/halaman (`overflow-x: hidden`).
- WCAG 2.2 AA Touch Target: semua elemen interaktif mobile (tombol aksi tabel, trigger filter, tab, tombol pagination, input form) wajib memiliki area sentuh minimal 44×44px (`min-h-[44px]` atau padding hit-box setara).
- Conventional commits: `feat(web): ...` / `test(web): ...`.
- Semua unit & component test Vitest di `apps/web/src/test/` serta `npm run typecheck` dan `npm run lint` wajib lulus 100%.

---

### Task 1: KB Mobile Reader, Filter Sheet & Markdown Editor Ergonomics

**Files:**
- Modify: `apps/web/src/components/knowledge/ArticleDetail.tsx`
- Modify: `apps/web/src/components/knowledge/ArticleFilters.tsx`
- Modify: `apps/web/src/components/knowledge/ArticleCard.tsx`
- Modify: `apps/web/src/components/shared/markdown-editor.tsx`
- Modify: `apps/web/src/components/shared/markdown-renderer.tsx`
- Test: `apps/web/src/test/article-detail.test.tsx`
- Test: `apps/web/src/test/article-filters.test.tsx`
- Test: `apps/web/src/test/article-editor.test.tsx`

**Interfaces:**
- Consumes: `MobileFilterSheet` from `@/components/shared/mobile-filter-sheet`, `MarkdownRenderer`, `ArticleDetailProps`, `KnowledgeArticleDetail`
- Produces: 
  - `ArticleDetail` dengan padding `p-4 sm:p-6`, judul responsif `text-xl sm:text-2xl break-words`, dan tipografi `prose-sm sm:prose`.
  - `ArticleFilters` dengan search input adaptif (`w-full sm:w-64`) dan `MobileFilterSheet` untuk mobile view (`sm:hidden`).
  - `ArticleCard` dengan target link/edit minimal 44px di mobile.
  - `MarkdownEditor` dengan toolbar yang ramah sentuh dan tab `h-11 sm:h-8`.

- [ ] **Step 1: Tulis test untuk responsive ArticleFilters dan ArticleDetail**
Perbarui `apps/web/src/test/article-filters.test.tsx` untuk menguji kehadiran `MobileFilterSheet` saat viewport mobile (`sm:hidden`), dan perbarui `apps/web/src/test/article-detail.test.tsx` untuk memverifikasi kelas kontainer yang aman dari text clipping (`break-words`).

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan (RED)**
Run: `npm run test --prefix apps/web apps/web/src/test/article-filters.test.tsx`
Expected: FAIL karena `MobileFilterSheet` belum diintegrasikan di `ArticleFilters`.

- [ ] **Step 3: Update `ArticleDetail` & `MarkdownRenderer` untuk kenyamanan membaca di mobile**
  - Pada `ArticleDetail.tsx`: Ubah padding card menjadi `p-4 sm:p-6`, heading `text-xl sm:text-2xl break-words tracking-tight`, meta info flex-wrap dengan gap nyaman.
  - Pada `MarkdownRenderer.tsx`: Pastikan container memiliki `break-words [word-break:break-word]` dan `prose prose-sm sm:prose` agar teks panjang, tabel markdown, atau URL tidak menyebabkan horizontal scroll pada mobile.

- [ ] **Step 4: Update `ArticleFilters` dengan `MobileFilterSheet`**
  - Di `ArticleFilters.tsx`:
    - Layout utama: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`.
    - Search input: `w-full sm:w-64`.
    - Mobile: tampilkan `MobileFilterSheet` yang merangkum kategori, status (bila user memiliki akses), dan urutan (`sort_by`).
    - Desktop: pertahankan baris horizontal select trigger (`hidden sm:flex`).

- [ ] **Step 5: Optimalkan `MarkdownEditor` untuk mobile ergonomics**
  - Pada `markdown-editor.tsx`:
    - Toolbar: buat kontainer toolbar dapat di-scroll horizontal tanpa scrollbar jelek (`overflow-x-auto no-scrollbar py-1`).
    - Tombol toolbar: tambahkan target sentuh nyaman (`size-9 min-w-[36px]`).
    - TabsList & TabsTrigger: gunakan `h-11 sm:h-8` di mobile agar mudah dipencet jempol.
    - Textarea: `min-h-60 sm:min-h-72` dengan `p-3 sm:p-4`.

- [ ] **Step 6: Jalankan seluruh test KB dan pastikan lulus (GREEN)**
Run: `npm run test --prefix apps/web apps/web/src/test/article-*.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit perubahan Task 1**
```bash
git add apps/web/src/components/knowledge/ apps/web/src/components/shared/markdown-editor.tsx apps/web/src/components/shared/markdown-renderer.tsx apps/web/src/test/article-*.test.tsx
git commit -m "feat(web): mobile-friendly KB reader, filter sheet, and editor ergonomics"
```

---

### Task 2: Responsive Admin Tables (Users & Audit Logs) with Mobile Card View

**Files:**
- Modify: `apps/web/src/components/admin/UsersTable.tsx`
- Modify: `apps/web/src/components/admin/AuditLogTable.tsx`
- Test: `apps/web/src/test/users-table.test.tsx`
- Test: `apps/web/src/test/audit-log-table.test.tsx`

**Interfaces:**
- Consumes: `renderCard` prop dari `DataTableProps`
- Produces: 
  - `UsersTable` renderCard: kartu pengguna mobile menampilkan nama lengkap, email, role badge, status badge, kode karyawan, dan tombol aksi horizontal dengan hit-box minimal 44px (`min-h-[44px] min-w-[44px]`).
  - `AuditLogTable` renderCard: kartu log mobile menampilkan relative time, tanggal, user pelaku, badge aksi, label modul dengan #id, keterangan, dan tombol detail.

- [ ] **Step 1: Tulis test untuk render kartu mobile di `UsersTable` dan `AuditLogTable`**
Tambahkan skenario test di `apps/web/src/test/users-table.test.tsx` dan `apps/web/src/test/audit-log-table.test.tsx` untuk memastikan elemen kartu mobile ter-render dengan benar saat data tersedia dan tombol aksi mobile berfungsi.

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan (RED)**
Run: `npm run test --prefix apps/web apps/web/src/test/users-table.test.tsx apps/web/src/test/audit-log-table.test.tsx`
Expected: FAIL atau kartu belum ada.

- [ ] **Step 3: Implementasikan `renderCard` di `UsersTable.tsx`**
  - Buat subkomponen kartu `UserCard` atau inline callback `renderCard`:
    - Header kartu: nama lengkap (`text-sm font-semibold truncate`), role badge, dan status badge.
    - Body: email, departemen, dan kode karyawan.
    - Footer kartu: tombol aksi `Edit`, `Reset Password`, `Toggle Status`, `Hapus` dengan ukuran hit-target `size-10` atau `min-h-[44px] min-w-[44px] rounded-lg` yang nyaman disentuh satu tangan.
  - Sembunyikan kolom desktop sekunder (`hidden md:table-cell`) untuk `email`, `employee_code`, dan `department`.

- [ ] **Step 4: Implementasikan `renderCard` di `AuditLogTable.tsx`**
  - Buat subkomponen kartu `AuditLogCard` atau inline callback `renderCard`:
    - Header: waktu relatif + tanggal kecil, badge aksi, modul label & `#id`.
    - Body: nama pelaku dan deskripsi singkat.
    - Footer: IP address (jika ada) dan tombol "Lihat Rincian" dengan tinggi `min-h-[44px] h-11 w-full sm:w-auto`.
  - Kolom tabel desktop disesuaikan dengan `hidden md:table-cell` untuk `ip_address` dan `description` panjang.

- [ ] **Step 5: Jalankan test dan pastikan lulus (GREEN)**
Run: `npm run test --prefix apps/web apps/web/src/test/users-table.test.tsx apps/web/src/test/audit-log-table.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit perubahan Task 2**
```bash
git add apps/web/src/components/admin/UsersTable.tsx apps/web/src/components/admin/AuditLogTable.tsx apps/web/src/test/users-table.test.tsx apps/web/src/test/audit-log-table.test.tsx
git commit -m "feat(web): responsive admin users and audit log tables with mobile cards"
```

---

### Task 3: Touch Target Hardening for Admin Dialogs, Filters & Profile Forms

**Files:**
- Modify: `apps/web/src/components/admin/UserFormDialog.tsx`
- Modify: `apps/web/src/components/admin/AuditLogFilters.tsx`
- Modify: `apps/web/src/components/admin/ResetPasswordDialog.tsx`
- Modify: `apps/web/src/components/admin/AuditLogDetailDialog.tsx`
- Modify: `apps/web/src/components/shared/MasterDataPage.tsx`
- Modify: `apps/web/src/components/shared/data-table/data-table-pagination.tsx`
- Modify: `apps/web/src/components/profile/ProfileForm.tsx`
- Modify: `apps/web/src/components/profile/ChangePasswordForm.tsx`
- Test: `apps/web/src/test/user-form-dialog.test.tsx`
- Test: `apps/web/src/test/audit-log-filters.test.tsx`
- Test: `apps/web/src/test/profile-form.test.tsx`
- Test: `apps/web/src/test/change-password-form.test.tsx`

**Interfaces:**
- Consumes: Dialog primitives, Form components, `useIsMobile()`
- Produces:
  - Form dialog di mobile: fullscreen-ish modal dengan scrolling mulus, input & select `min-h-[44px] h-11 sm:h-9`, sticky bottom footer action bar (`sticky bottom-0 bg-card pt-2 pb-1 border-t border-border sm:static sm:border-0`).
  - `AuditLogFilters`: tombol trigger Date & Filter `min-h-[44px] h-11 sm:h-8` di mobile, atau integrasi `MobileFilterSheet`.
  - `DataTablePagination`: tombol navigasi halaman `min-h-[44px] min-w-[44px] h-11 w-11 sm:h-8 sm:w-8` untuk memenuhi WCAG AA.
  - `ProfileForm` & `ChangePasswordForm`: tombol submit berukuran `h-11 w-full sm:w-auto min-h-[44px]`.

- [ ] **Step 1: Tulis test audit touch target pada UserFormDialog, ProfileForm, dan AuditLogFilters**
Verifikasi tombol submit dan input field memiliki kelas sizing minimal `h-11` atau `min-h-[44px]` pada mobile view.

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan (RED)**
Run: `npm run test --prefix apps/web apps/web/src/test/profile-form.test.tsx apps/web/src/test/user-form-dialog.test.tsx`
Expected: FAIL atau verifikasi styling touch target.

- [ ] **Step 3: Update `UserFormDialog.tsx`, `ResetPasswordDialog.tsx`, dan `AuditLogDetailDialog.tsx`**
  - Pada `UserFormDialog.tsx`:
    - Ubah dialog container menjadi `max-h-[92vh] sm:max-h-[85vh] w-[95vw] sm:max-w-lg p-4 sm:p-6`.
    - Input & select: `h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm`.
    - Tombol toggle password (Eye/EyeOff): pastikan hit-box `size-11 sm:size-9 min-h-[44px] min-w-[44px]`.
    - Footer action: tombol Batal & Simpan `h-11 min-h-[44px] w-full sm:w-auto`.
  - Pada `ResetPasswordDialog.tsx` & `AuditLogDetailDialog.tsx`:
    - Tombol Salin, Tutup, dan item dialog diperbarui menjadi min-h 44px di mobile.

- [ ] **Step 4: Update `MasterDataPage.tsx` dan `DataTablePagination.tsx`**
  - Pada `MasterDataPage.tsx`: Dialog tambah/edit master data diperbarui dengan input `h-11 sm:h-9` dan tombol submit `h-11`.
  - Pada `DataTablePagination.tsx`:
    - Tombol navigasi (pertama, sebelumnya, berikutnya, terakhir): `min-h-[44px] min-w-[44px] h-11 w-11 sm:h-8 sm:w-8`.
    - Sizing selector baris per halaman: `h-11 sm:h-8`.

- [ ] **Step 5: Update `AuditLogFilters.tsx`**
  - Sesuaikan filter container agar memiliki scrolling horizontal yang rapi pada mobile (`p-2.5 sm:p-3`).
  - Trigger select dan date range button diberikan `min-h-[44px] h-11 sm:h-8` di mobile.

- [ ] **Step 6: Update `ProfileForm.tsx` dan `ChangePasswordForm.tsx`**
  - Input field: `min-h-[44px] h-11 sm:h-9`.
  - Tombol submit: `min-h-[44px] h-11 w-full sm:w-auto`.

- [ ] **Step 7: Jalankan seluruh test unit/komponen yang relevan**
Run: `npm run test --prefix apps/web apps/web/src/test/user-*.test.tsx apps/web/src/test/profile-*.test.tsx apps/web/src/test/change-password-*.test.tsx apps/web/src/test/audit-log-*.test.tsx`
Expected: PASS

- [ ] **Step 8: Commit perubahan Task 3**
```bash
git add apps/web/src/components/admin/ apps/web/src/components/profile/ apps/web/src/components/shared/MasterDataPage.tsx apps/web/src/components/shared/data-table/data-table-pagination.tsx apps/web/src/test/
git commit -m "feat(web): harden admin dialogs, profile forms, and touch targets for mobile"
```

---

### Task 4: Sub-tahap 11d Full Test Suite Verification, Linting & Checklist Sync

**Files:**
- Modify: `docs/tasks/phase-11/11d-kb-admin-mobile.md`

- [ ] **Step 1: Jalankan seluruh test suite Vitest pada web**
Run: `npm run test --prefix apps/web`
Expected: 350+ tests passing, 0 failures.

- [ ] **Step 2: Jalankan TypeScript typecheck**
Run: `npm run typecheck --prefix apps/web`
Expected: 0 errors.

- [ ] **Step 3: Jalankan ESLint linter**
Run: `npm run lint --prefix apps/web`
Expected: 0 errors / clean.

- [ ] **Step 4: Update checklist pada `docs/tasks/phase-11/11d-kb-admin-mobile.md`**
Tandai seluruh checkbox `- [x]` pada Task 1 dan Task 2 di `docs/tasks/phase-11/11d-kb-admin-mobile.md`.

- [ ] **Step 5: Commit checklist update**
```bash
git add docs/tasks/phase-11/11d-kb-admin-mobile.md
git commit -m "docs(tasks): check off all exit criteria for phase 11d"
```
