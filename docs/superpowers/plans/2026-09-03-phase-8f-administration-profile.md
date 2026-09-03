# Sub-tahap 8f — Administrasi & Profil (Rencana Implementasi)

> **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development`. Muat skill frontend wajib dulu (AGENTS.md): `impeccable`, `next-best-practices`, `vercel-react-best-practices`, `shadcn`, `frontend-design`, `tailwindcss-development`, `test-driven-development`.

**Goal:** `/admin/users`, 4 halaman master data via `MasterDataPage`, `/admin/audit-logs`, dan `/profile` (edit + ganti password) dengan guard per halaman.

**Architecture:** Guard = Server Component via `laravelFetch('/me')` per halaman (bukan layout tunggal — Manager harus bisa masuk `/admin/audit-logs`). `/admin/users` + `/admin/audit-logs` = Client Component + TanStack Query + DataTable paginated. 4 halaman master data = satu `MasterDataPage<T>` + 4 konfigurasi (array polos tanpa `meta`, search client-side). `/profile` = dua form RHF terpisah.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, RHF + zod, shadcn/ui (`Dialog`, `Select`), Vitest + Testing Library.

**Spec:** `docs/tasks/phase-8/8f-administration-profile.md` (dokumen ini mengimplementasikannya), `docs/tasks/phase-8/README.md` (K1–K11), `PERMISSION-MATRIX.md` §3.8 + §4, `API-CONTRACT.md`.

## Global Constraints

- Envelope `{ success, message, data, meta? }`; UI text Indonesia (K8/D-24); JANGAN render `message` Inggris dari API ke UI.
- Guard: Server Component + `laravelFetch('/me')` → payload `data.user.role.name` **dan** `data.permissions` (bukan `data.role`). `/admin/*` (kecuali audit-logs) → hanya `administrator`. `/admin/audit-logs` → `audit-log.viewAny` (Admin + Manager). Gagal → `redirect('/403')`.
- `GET /api/users` ter-pagination (`meta`); `GET /api/departments|ticket-categories|knowledge-categories|ticket-priorities|roles` = **array polos** (C12).
- Master data controller mengembalikan **model Eloquent langsung** — field = kolom tabel; `parent` berupa objek relasi penuh. Tipe frontend: `TicketCategory`/`TicketPriority` (`types/tickets.ts`), `Department`/`KnowledgeCategory` lokal.
- 409 hapus data terpakai (C20) → toast error Indonesia.
- Hint `sla_minutes`: "Perubahan SLA hanya berlaku untuk ticket baru." (snapshot D-01).
- `parent_id` (D-04): dropdown parent berlabel bertingkat; zod `refine` mencegah `parent_id === id`; descendant dicegah server.
- Update user TIDAK menerima `password`/`status` (`UpdateUserRequest`). `temporary_password` tampil sekali + tombol salin (C19).
- Ganti password `PUT /api/me/password`; 422 `current_password` salah (pesan service Inggris) → field error Indonesia "Password saat ini tidak sesuai." Sesi tetap; setelah sukses tampil tombol logout.
- Edit profil `PUT /api/me` hanya `full_name` + `phone` (C21); email read-only.
- Branch `feat/phase-8f-administration`; komit atomik `feat(web): …`; TDD wajib (RED→GREEN).

## File Structure

- **Task 1:** `lib/server/require-admin.ts` + `src/test/admin-guard.test.ts`
- **Task 2:** `hooks/use-users.ts`, `schemas/user.ts`, `components/admin/{UsersTable,UserFormDialog,ResetPasswordDialog}.tsx`, `app/(app)/admin/users/page{,-client}.tsx`, tests `users-table`/`user-form-dialog`/`reset-password-dialog`
- **Task 3:** modify `components/shared/MasterDataPage.tsx` (additive), `components/admin/master-data-configs.ts`, 4× `app/(app)/admin/{departments,categories,knowledge-categories,priorities}/page{,-client}.tsx`, test `master-data-configs`
- **Task 4:** `hooks/use-audit-logs.ts`, `components/admin/{AuditLogTable,AuditLogDetailDialog}.tsx`, `app/(app)/admin/audit-logs/page{,-client}.tsx`, tests `audit-log-table`/`audit-log-detail-dialog`
- **Task 5:** `schemas/profile.ts`, `components/profile/{ProfileForm,ChangePasswordForm}.tsx`, `app/(app)/profile/page{,-client}.tsx`, tests `profile-form`/`change-password-form`

---

### Task 1: Guard admin server-side

**Interfaces (Produces):** `resolveAdminAccess(me: MePayload | null): 'admin' | 'audit-viewer' | 'denied'` (murni), `requireAdmin(): Promise<void>`, `requireAuditViewer(): Promise<void>`. `MePayload = { data: { user: { role: { name: string } }, permissions: string[] } }`.

- [ ] Step 1 (RED): test `admin-guard.test.ts` — administrator→'admin'; manager+`audit-log.viewAny`→'audit-viewer'; manager tanpa→'denied'; role lain→'denied'; null→'denied'.
- [ ] Step 2: run → FAIL (module not found).
- [ ] Step 3: implementasi (`resolveAdminAccess` + `fetchMe()` + dua fungsi guard dengan `redirect('/403')`).
- [ ] Step 4: run → PASS; `npx tsc --noEmit` → PASS.
- [ ] Step 5: Commit `feat(web): add admin route guard helpers (server component)`.

### Task 2: `/admin/users`

**Interfaces:**
- Consumes: `userKeys.list/detail`, `referenceKeys.roles()/departments()`, `useApiMutation`, `DataTable`, `ConfirmDialog`, `getRoleLabel`, `userStatusLabels`, types `UserListItem`/`UserAdminDetail`/`RoleReference`/`DepartmentReference` (`types/auth.ts`).
- Produces: `useUsers(params, enabled?)` → `ApiResponse<UserListItem[]>` paginated; `useUserReferences()` → `{ roles, departments }`; `<UsersTable items meta isLoading sortBy sortDir onSort onPageChange onPerPageChange onEdit onResetPassword onDelete onToggleStatus />`; `<UserFormDialog open user? roles departments onClose />`; `<ResetPasswordDialog open user onClose />`; `<UsersPageClient />`.

**Detail wajib:** filter search(debounce)/role_id/department_id/status; sort server full_name/email/created_at; kolom full_name, email, role badge, department, employee_code, status, aksi. Create: `full_name, email, password+password_confirmation (refine sama), role_id, department_id, status default 'active', profile.{employee_code,phone,position,hire_date}` → `POST /users`. Edit: tanpa password/status; load `UserAdminDetail` via `userKeys.detail(id)` saat dialog dibuka; `PUT /users/{id}`. Activate/Deactivate: `ConfirmDialog` → `POST /users/{id}/activate|deactivate`. Hapus: `DELETE /users/{id}`. Reset password: dialog → `POST /users/{id}/reset-password` → `data.temporary_password` monospace + "Salin" (`navigator.clipboard`) + "Password baru hanya ditampilkan satu kali."

- [ ] Step 1 (RED): 3 test file sesuai detail wajib.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implementasi hook → schema → dialog → table → page-client → page (server guard `requireAdmin()`).
- [ ] Step 4: test PASS; tsc/lint/full suite PASS.
- [ ] Step 5: Commit `feat(web): add admin users page with CRUD, activate/deactivate, reset password`.

### Task 3: Master data ×4 via `MasterDataPage`

**Ruling disetujui user:** `MasterDataPage` dimodifikasi **additive** — `FormFieldDef` + `type: 'select'` + `options`, `hint?: string`, `transformToForm?: (item: T) => Record<string, unknown>`.

**Interfaces:**
- Produces: `departmentConfig`, `ticketCategoryConfig`, `knowledgeCategoryConfig`, `ticketPriorityConfig` (di `master-data-configs.ts`, tanpa `columns` — kolom JSX dibangun di masing-masing page-client) + 4 halaman ber-guard.
- Konfigurasi: departments `/departments` (name 1..100, description ≤500); categories `/ticket-categories` (+parent_id select bertingkat, refine ≠ self); knowledge-categories `/knowledge-categories` (description ≤255); priorities `/ticket-priorities` (name ≤50, level int ≥1, sla_minutes int ≥1 + hint SLA, description ≤500).

- [ ] Step 1 (RED): `master-data-configs.test.tsx` — render config departments (kolom name/description), submit create → `POST /departments` body benar; schema kategori tolak parent_id = self; config prioritas memuat hint SLA.
- [ ] Step 2: run → FAIL.
- [ ] Step 3: modify MasterDataPage (additive) → configs → 4× page (server guard `requireAdmin()`) + page-client (kolom JSX).
- [ ] Step 4: test PASS; tsc/lint/full PASS.
- [ ] Step 5: Commit `feat(web): add master data pages via MasterDataPage (departments, categories, knowledge-categories, priorities)`.

### Task 4: `/admin/audit-logs`

**Interfaces:**
- Consumes: `auditKeys.list/detail`, types `AuditLogListItem`/`AuditLogDetail`/`AuditAction`/`AuditModule` (`types/audit.ts`), `getAuditActionLabel`, `getAuditModuleLabel`, `DataTable`, `Dialog`, `Select`, `RelativeTime`.
- Produces: `useAuditLogs(params, enabled?)`, `useAuditLogDetail(id | null)`; `<AuditLogTable items meta isLoading sortBy sortDir onSort onPageChange onRowClick />`; `<AuditLogDetailDialog open logId? onClose />`; `<AuditLogsPageClient />`.

**Detail wajib:** filter module/action/date_from/date_to (+dropdown user **Admin-only** — Manager tidak punya `user.viewAny`; opsi module Manager dibatasi `['ticket','asset','article','knowledge_category']`); kolom user (null → "Sistem"), action badge, module, module_id, description, ip_address, created_at (`RelativeTime`); sort created_at/id/module/action; klik baris → dialog detail (`GET /audit-logs/{id}`) dengan tabel perbandingan **old_data vs new_data** per key (objek di-`JSON.stringify`; null → "—") + `user_agent`; guard client defensif `can('audit-log.viewAny')`.

- [ ] Step 1 (RED): `audit-log-table.test.tsx` (kolom, badge, user null → "Sistem"); `audit-log-detail-dialog.test.tsx` (perbandingan old/new, null → "—", user_agent).
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implementasi hook → dialog → table → page-client → page (server `requireAuditViewer()`).
- [ ] Step 4: test PASS; tsc/lint/full PASS.
- [ ] Step 5: Commit `feat(web): add audit log page with filters and detail dialog`.

### Task 5: `/profile`

**Interfaces:**
- Consumes: `apiFetch`, `useApiMutation`, `setFormErrors`, `useAuth().user`.
- Produces: `profileSchema` (full_name 1..150, phone ≤20 optional), `changePasswordSchema` (current_password required; password min8+huruf+angka; confirmation refine); `<ProfileForm user />`; `<ChangePasswordForm />`; `<ProfilePageClient user />`.

**Detail wajib:** Profil: email/role/department/employee_code read-only; `PUT /me` `{full_name, phone}` saja; invalidate `['me']`. Password: `PUT /me/password`; 422 `current_password` → field error "Password saat ini tidak sesuai."; sukses → toast + tombol "Keluar Sekarang" → `POST /auth/logout` via apiFetch lalu `router.replace('/login')`.

- [ ] Step 1 (RED): `profile-form.test.tsx` (email disabled, payload tepat); `change-password-form.test.tsx` (mismatch/min ditolak, 422 → field error, sukses → tombol logout).
- [ ] Step 2: run → FAIL.
- [ ] Step 3: implementasi.
- [ ] Step 4: test PASS; tsc/lint/full PASS.
- [ ] Step 5: Commit `feat(web): add profile page with edit and change password`.

---

## Self-Review

- **Coverage:** 5 task = seluruh goal + 6 exit criteria 8f (guard, users, master data, audit-logs, profil, verifikasi hijau).
- **Rulings:** shape `/me` = `data.user.role.name`+`data.permissions`; MasterDataPage additive (disetujui user); dropdown user audit-logs Admin-only; edit user load `UserAdminDetail`; logout manual setelah ganti password.
- **Tipe konsisten:** semua tipe dari `types/auth.ts`, `types/tickets.ts`, `types/audit.ts` — sudah ada, tidak ada kontrak baru.

## Verifikasi akhir

```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint && npm run build
```
