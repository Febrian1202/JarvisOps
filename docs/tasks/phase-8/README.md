# Fase 8 — Fitur Frontend (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini membangun seluruh permukaan UI modul yang sudah ada backendnya: Ticket, Asset, Knowledge Base, Administrasi, dan Profil.
>
> **Skill frontend wajib (gunakan yang sama dengan sesi fase 8 yang sudah berjalan):** `impeccable`, `next-best-practices`, `vercel-react-best-practices`, `shadcn`, `frontend-design`, `tailwindcss-development`, `test-driven-development`. Muat skill-skill ini lewat tool `skill` sebelum menulis kode frontend.

**Goal:** Menyelesaikan seluruh fitur frontend sesuai ROADMAP Fase 8 (tickets, assets, knowledge base, administration, profile), dengan golden path §38 PRD terselesaikan penuh dari browser. Backend **tidak** diubah secara struktural; hanya 4 amandemen sempit yang terdokumentasi (lihat §Titik Awal → Amandemen) agar UI bisa dibangun di atas API yang sudah ada.

**Basis asumsi:** Fase 6 (dashboard API) dan Fase 7 (shared components + auth + BFF + notifications) **sudah selesai dan di-merge** saat pengerjaan dimulai. Rencana ini ditulis dengan asumsi tersebut — sama seperti Fase 6 dan 7 mengasumsikan pendahulunya. Bila asumsi meleset, **hentikan** dan selesaikan fase yang hilang lebih dulu.

**Branch:** `feat/phase-8-<sub>` per sub-tahap, di-merge ke `main` via PR (ROADMAP Phase 0).
**Estimasi:** ~8,75 hari (ROADMAP mengalokasikan ~4 hari; ini *conscious overrun* seperti Fase 5 dan 7 — ditampung di buffer Minggu 8).
**Tag:** `v0.8.0` di sub-tahap 8g.

---

## Peta sub-tahap

| Sub | Topik | File | Estimasi | Branch |
| --- | --- | --- | --- | --- |
| 8a | Foundation, Wireframe, & Amandemen Backend | `8a-foundation-wireframe-amendment.md` | ~1,25 hari | `feat/phase-8a-foundation` |
| 8b | Daftar & Buat Ticket | `8b-ticket-list-create.md` | ~1,25 hari | `feat/phase-8b-ticket-list-create` |
| 8c | Detail Ticket, Timeline, & Aksi | `8c-ticket-detail-actions.md` | ~1,5 hari | `feat/phase-8c-ticket-detail` |
| 8d | Manajemen Aset | `8d-asset-management.md` | ~1,25 hari | `feat/phase-8d-asset` |
| 8e | Knowledge Base | `8e-knowledge-base.md` | ~1,0 hari | `feat/phase-8e-knowledge-base` |
| 8f | Administrasi & Profil | `8f-administration-profile.md` | ~1,5 hari | `feat/phase-8f-administration` |
| 8g | E2E, A11y, & Finalisasi | `8g-e2e-a11y-finalization.md` | ~1,0 hari | `feat/phase-8g-e2e-finalization` |

Urutan antar sub-tahap **berurutan** (bukan paralel): 8b/8c bergantung pada pola `useApiMutation` dari 8a; 8d/8e/8f memakai komponen list/form generik yang distabilkan di 8a–8c. Satu-satunya yang boleh start lebih awal adalah **8e** jika `react-markdown` + sanitizer di 8a sudah ter-commit.

---

## Dokumen acuan (urut otoritas)

1. `docs/adr/DECISIONS.md` — D-01..D-30; khususnya D-04 (hierarki kategori), D-21 (409 pada transisi), D-23 (UTC → Asia/Jakarta), D-24 (bahasa pesan), D-26 (`expected_status_id` pada `/status` dan `/assign` saja), D-27 (domain notifikasi), D-28 (SLA bertanda), D-30 (tag versi).
2. `docs/product/STATUS-TRANSITION.md` — matriks transisi + syarat `note` pembatalan.
3. `docs/product/PERMISSION-MATRIX.md` — §3.4 aset, §3.5 KB, §3.8 admin; **bertambah 3 baris route + ability `user.lookup` di sub-tahap 8a**.
4. `docs/api/API-CONTRACT.md` — envelope, §13 server-set fields, filter tiap resource.
5. `docs/architecture/FRONTEND-ARCHITECTURE.md` — pola BFF, komponen, state.
6. `DESIGN.md` — tema warm cream (lihat FRONTEND-ARCHITECTURE §3).
7. `docs/product/PRD.md` §17 (aset), §18 (KB), §19 (admin), §24 (profil), §31 (audit), §38 (golden path), §40 (a11y).
8. `docs/product/ROADMAP.md` Fase 8 (berkas ini mengamandemen rencana UI-nya; lihat §Resolusi Konflik, poin C1–C7).

---

## Keputusan arsitektur Fase 8 (dikunci)

Keputusan ini mengikat semua sub-tahap. Jangan menyimpang tanpa menulis ulang berkas ini.

### K1 — Semua halaman data adalah Client Component + TanStack Query
Halaman list/detail/form menggunakan **Client Component** dengan `useQuery`/`useMutation`. **Server Component hanya untuk**: shell statis, halaman detail artikel KB (`/knowledge/[slug]`, lihat Jebakan `view_count`), dan guard admin (K7). Halaman list **tidak** boleh pakai `laravelFetch` langsung — tidak ada SSR prefetch di Fase 8. Alasan: konsistensi pola, invalidasi cache yang seragam, dan 11 filter yang tersinkron URL.

### K2 — Mutasi terpusat di `useApiMutation`
Semua POST/PUT/DELETE lewat hook `useApiMutation` (dibangun di 8a) yang:
- menampilkan toast sukses (Indonesia),
- memetakan `errors.<field>` (422) ke form RHF,
- menampilkan toast untuk 403/404/409/429/500 dengan **pesan Indonesia** (lihat K8),
- meng-invalidasi query yang terdaftar di `query-keys.ts`.

Tidak ada komponen yang memanggil `fetch`/`apiFetch` langsung untuk mutasi.

### K3 — UI ticket detail digerakkan backend (`available_actions` + `editable_fields`)
Frontend **tidak pernah** menurunkan aksi dari `(status, role)` sendiri. `GET /api/tickets/{id}` mengembalikan `available_actions` (11 nilai: `assign|unassign|start|resolve|close|cancel|reopen|change_priority|comment|attach|edit`) dan `editable_fields` (`title|description|category_id`). Peta aksi → dialog/endpoint ada di `8c-ticket-detail-actions.md` §Peta Aksi. Konsekuensi: ticket `CLOSED` tidak menampilkan aksi apa pun (backend mengembalikan array kosong) — itu perilaku yang benar, bukan bug.

### K4 — Optimistic concurrency (D-21, D-26)
`POST /api/tickets/{id}/status` dan `POST /api/tickets/{id}/assign` **selalu** mengirim `expected_status_id` dari detail yang sedang dibuka. Respons `409` = ticket sudah berubah di tempat lain → toast "Status tiket sudah diubah oleh pihak lain." + invalidasi + refetch detail. `POST /api/tickets/{id}/unassign` dan `POST /api/tickets/{id}/priority` **tidak** menerima `expected_status_id` (akan diabaikan) — jangan dikirim.

### K5 — Timeline gabungan (bukan tab)
Detail ticket menampilkan **satu** Timeline Card "Riwayat Penanganan & Diskusi" yang menggabungkan komentar (`GET /comments?per_page=100`, paginasi ASC) dan riwayat (`GET /histories`, array polos ASC), di-merge client-side dan diurutkan `created_at` ASC. Attachment tampil sebagai kartu terpisah di kolom kanan (frame 08). Ini menggantikan rencana "3 tab" di ROADMAP:740 — lihat C1.

### K6 — Master data generik
Empat halaman admin master data (`departments`, `ticket-categories`, `knowledge-categories`, `ticket-priorities`) memakai satu komponen `MasterDataPage<T>` + 4 objek konfigurasi. Endpoint master data mengembalikan **array polos tanpa `meta`** — komponen tidak boleh mengasumsikan pagination server (berbeda dengan `GET /api/users` dan `/api/audit-logs` yang ter-paginasi; K9).

### K7 — Guard `/admin/*` dua lapis
- Lapis 1 (`proxy.ts`): hanya cek cookie ada.
- Lapis 2 (server): **layout `(app)/admin/layout.tsx`** memanggil `laravelFetch('/me')`; bila role ≠ admin → `redirect('/403')`. Setiap halaman admin juga memanggil ability-nya via `usePermissions` client (tampilkan 403 bila tidak berhak). Policy Laravel tetap sumber kebenaran terakhir — guard Next hanya UX, bukan keamanan.
- Khusus `/admin/audit-logs`: Manager **berhak** (PERMISSION §3.8, ability `audit-log.viewAny`). Layout admin boleh dilonggarkan untuk rute ini (lihat 8f).

### K8 — Pesan error Indonesia, bukan envelope mentah
Backend menjawab `message` berbahasa **Inggris** (D-24) kecuali 409 master-data yang berbahasa **Indonesia**. Aturan:
- `422` → tampilkan `errors.<field>` (sudah Indonesia) di field form.
- `409` master-data → tampilkan `data.message` apa adanya (sudah Indonesia).
- `409` transisi ticket → teks khusus (K4), karena `message` backend berbahasa Inggris.
- `403/404/429/500` → peta status → teks Indonesia di `labels.ts` (`errorMessages`). Jangan pernah render `message` Inggris ke UI.

### K9 — Dua pola pagination
- **Ter-paginasi** (`meta` ada): tickets, users, audit-logs, assets, articles, my-assets, notifications, comments. Gunakan `DataTable` + page-size 10/25/50 (maks 100).
- **Array polos** (tanpa `meta`): departments, ticket-categories, ticket-priorities, knowledge-categories, technicians, roles, assignable assets, asset history, ticket histories. Gunakan list polos + filter client-side untuk yang kecil, dan `MasterDataPage` untuk admin.

### K10 — Unduh & unggah lewat BFF, bukan URL Laravel langsung
- `download_url` dari `AttachmentResource` berbentuk `/api/attachments/{id}/download` → **wajib ditulis ulang** menjadi `/api/proxy/attachments/{id}/download` (helper `attachmentDownloadUrl`). Unduh memakai elemen `<a href>` biasa; proxy meneruskan `Content-Disposition`.
- Unggah memakai `XMLHttpRequest` (lihat `useUploadWithProgress` di 8a) karena `fetch` tidak punya event progress. `throttle:upload` = 20/menit → tangani `429` + `Retry-After`.

### K11 — `view_count` artikel tidak boleh menggelembung
`GET /api/articles/{slug}` menaikkan `view_count` setiap dipanggil (Controller `show`). Karena itu:
- Detail artikel memakai **Server Component** (`laravelFetch`), bukan `useQuery` (menghindari double-fetch Strict Mode + `refetchOnWindowFocus`).
- Editor memakai endpoint khusus `GET /api/articles/{article}/edit` (amandemen A4) yang **tidak** menaikkan `view_count`.

---

## Titik awal — apa yang sudah ada

### Backend (`apps/api`, jangan dirombak)
- 78 route API aktif; 599 test / 2461 assertion hijau.
- Resources lengkap: `TicketResource` (dengan `available_actions`, `editable_fields`, `sla_remaining_minutes`, `sla_status`), `TicketListResource`, `AssetResource`, `AssetListResource`, `AssignableAssetResource`, `ArticleResource`, `ArticleListResource`, `UserAdminResource`, `UserListResource`, `AuditLogDetailResource`, `AuditLogListResource`, `NotificationResource`, `AttachmentResource`.
- Filter siap: tickets (11 filter + sort whitelist), assets (`search|status|category|assigned_user_id`), articles (`search|category_id|status|author_id`), users (`search|role_id|department_id|status`), audit-logs (`user_id|module|action|module_id|date_from|date_to`), notifications (`is_read|type`).
- Policy: `TicketPolicy`, `AssetPolicy`, `ArticlePolicy`, `AttachmentPolicy`, `TicketCommentPolicy`, `NotificationPolicy`.
- Scheduler SLA, NotificationService, AuditLogger, ReferentialIntegrityGuard (409 berbahasa Indonesia).

### Frontend (`apps/web`, kondisi Fase 2 — diasumsikan Fase 7 selesai)
Saat rencana ini ditulis, `apps/web` masih Fase 2 (login + dashboard placeholder, BFF `api/proxy`, `session.ts`, `types/api.ts`). Rencana mengasumsikan Fase 7 sudah menambah:
- `components/ui/*` (shadcn), `components/shared/*` (`DataTable`, `FilterBar`, `StatusBadge`, `PriorityBadge`, `SlaIndicator`, `RelativeTime`, `FileUpload`, `ConfirmDialog`, `EmptyState`, `PageHeader`, `Skeleton`).
- `lib/api.ts` (`apiFetch` + `ApiError`), `lib/labels.ts`, `lib/query-keys.ts`, `lib/formatters.ts` (UTC → Asia/Jakarta), `lib/validation.ts` (zod).
- `hooks/usePermissions.ts`, `hooks/useNotifications.ts`, `providers/auth-provider.tsx`, `providers/query-provider.tsx`.
- Halaman: `/dashboard` (placeholder), `/tickets` (proving-ground), `/tickets/[id]` (basic), `/notifications`, `/ganti-password`, `/403`, `/404`, shell `(app)`.

> Bila berkas di atas belum ada saat 8a dimulai, **berhenti dan tuntaskan Fase 7 dulu** — jangan membangun fondasi paralel.

### Amandemen backend yang disetujui (dikerjakan di 8a)
| # | Perubahan | Berkas yang tersentuh |
| --- | --- | --- |
| A1 | `ArticleResource` & `ArticleListResource`: `author.name` → `author.full_name` (hapus `email`) | `app/Http/Resources/Article/*`, test KB |
| A2 | `GET /api/assets/categories` (gate `asset.viewAny`) — distinct kategori terpakai, urut abjad | `AssetController`, `routes/api.php`, test |
| A3 | `GET /api/users/assignable` + gate `user.lookup` (Admin, Manager, Technician) — hanya `id`, `full_name`, `department`, dukung `?search=` | `UserController`, `routes/api.php`, `AbilityMatrix`, `PERMISSION-MATRIX.md`, test |
| A4 | `GET /api/articles/{article}/edit` (gate `ArticlePolicy@update`) — raw artikel, tanpa `view_count++`, tanpa `related_articles` | `ArticleController`, `routes/api.php`, test |

---

## Resolusi konflik antar-dokumen

Dokumen terkadang saling bertentangan. Tabel ini memutuskan mana yang berlaku — ditandatangani lewat persetujuan rencana ini.

| # | Konflik | Keputusan | Alasan |
| --- | --- | --- | --- |
| C1 | ROADMAP:740 "Tab: komentar, riwayat, attachment" vs wireframe 08 (timeline gabungan + attachment di kolom kanan) | **Wireframe 08 menang** — timeline gabungan (K5) | Wireframe adalah sumber visual yang disetujui; PRODUCT.md menuntut "timeline riwayat terbaca manusia". Tab memecah urutan kejadian. |
| C2 | ROADMAP Fase 8 mencantumkan `/notifications` | **Tidak dibangun ulang** — sudah selesai di 7e | Duplikasi. 8g hanya verifikasi keberadaan + aksesibilitas. |
| C3 | `ArticleResource` memakai `author.name` | **Amandemen A1** — ganti ke `full_name` | Kolom tabel `users` hanya `full_name`; tanpa aksesor, `author.name` selalu `null`. Test lolos karena hanya mengecek `author.id`. |
| C4 | Filter kategori aset (`?category=`) tidak punya sumber daftar | **Amandemen A2** | `assets.category` adalah string bebas ber-index; tidak ada tabel referensi. |
| C5 | Dialog assign aset butuh daftar user, tapi `GET /api/users` = Admin-only; `asset.assign` diberikan ke Technician/Manager | **Amandemen A3** — endpoint khusus `users/assignable` | Tidak membuka `user.viewAny` ke non-admin; menambah ability baru `user.lookup`. |
| C6 | Editor artikel butuh baca per-ID; satu-satunya endpoint baca terikat slug dan menaikkan `view_count` | **Amandemen A4** — endpoint `articles/{id}/edit` khusus | Membuka editor tidak boleh dihitung sebagai bacaan; menghindari tabrakan binding slug. |
| C7 | `available_actions` backend tidak memuat `ticket.delete` walau route & policy ada | Frontend render tombol hapus dari `can('ticket.delete')`, bukan dari `available_actions` | Backend sengaja tidak membuka delete di UI; Admin tetap berhak via policy. |
| C8 | Envelope `message` berbahasa Inggris vs requirement UI Indonesia (D-24) | K8 — peta status → teks Indonesia; 409 master-data tampil apa adanya | Bahasa UI adalah Bahasa Indonesia penuh; envelope API adalah Inggris. |
| C9 | `GET /api/articles/{slug}` menaikkan `view_count` berulang (Strict Mode, refetch) | K11 — detail artikel = Server Component; editor pakai A4 | Menjaga metrik tetap jujur. |
| C10 | `react-markdown` + `rehype-sanitize` di luar daftar stack ROADMAP §2 | **Disetujui sebagai pengecualian**; dicatat sebagai dependensi tambahan di `package.json` | Roadmap §2 mengunci *alternatif*, bukan menutup dependensi render baru; sanitasi menghilangkan risiko XSS. Diaudit di Fase 10. |
| C11 | ROADMAP meminta "upload progress" sementara `fetch` tidak mendukung progress | `XMLHttpRequest` untuk unggah (K10) | Satu-satunya cara progress nyata tanpa dependensi baru. |
| C12 | `GET /api/departments|ticket-categories|...` array polos tanpa `meta` | K9 — dua pola pagination eksplisit | `MasterDataPage` tidak boleh salah asumsi. |
| C13 | `PUT /api/tickets/{id}` mem-`prohibited` 13 field (status, teknisi, SLA, dll.) | Dialog edit hanya mengirim field dari `editable_fields` | Mengirim field terlarang → 422. |
| C14 | `POST /api/tickets/{id}/priority` tidak menerima `note` walau API-CONTRACT contohnya memuat `note` | Jangan kirim `note` ke `/priority` | FormRequest `ChangePriorityRequest` hanya `priority_id`. Kontrak contoh tidak akurat — dicatat untuk sinkronisasi Fase 10. |
| C15 | `sla_remaining_minutes` bertanda dan `null` setelah resolve (D-28) | Bar progress di-clamp visual 0–100%; label tetap "Terlambat N menit" bila negatif; sembunyikan bar bila `null` | Nilai mentah jangan dipotong untuk label. |
| C16 | `per_page` backend maks 100 | Page-size dropdown 10/25/50 | Tidak melebihi batas; tidak ada "all". |
| C17 | Dropdown teknisi hanya untuk `technician.list` (M/A); Technician tidak boleh memanggil `GET /api/technicians` | Filter teknisi dirender hanya bila `can('technician.list')`; Technician mendapat preset "Ditugaskan ke saya" / "Belum ditugaskan" | Menghindari 403 yang tak perlu; tetap memberi utility. |
| C18 | `reporter_id` diabaikan server untuk Employee (scope otomatis) | Filter `reporter_id` tidak dirender untuk Employee | UI tidak menampilkan filter yang tidak berefek. |
| C19 | Reset password mengembalikan `temporary_password` sekali | Dialog sekali-tampil + tombol salin + peringatan tidak akan muncul lagi | Keamanan: jangan simpan di state yang bertahan. |
| C20 | Master data dihapus saat masih dipakai → 409 berbahasa Indonesia | `ConfirmDialog` menampilkan `data.message` apa adanya | ReferentialIntegrityGuard menyediakan pesan siap-tampil. |
| C21 | `PUT /api/me` hanya menerima `full_name` + `phone`; email & role read-only | Form profil hanya 2 field + tampilan read-only role/department/employee_code | Sesuai `UpdateProfileRequest`. |
| C22 | Artikel Employee: `?status=` diabaikan server; `ArticlePolicy@view` menyamar 404 untuk draft | Filter status tidak dirender untuk Employee; halaman draft → `notFound()` | Employee hanya melihat published (ROADMAP KB). |
| C23 | `sla_status` filter (`on_track|breached`) tersedia | Chip quick-filter di daftar ticket | `IndexTicketRequest` mendukung; dipakai untuk klaim "SLA Breached". |
| C24 | Guard `/admin/*` tidak bisa cek role di `proxy.ts` (cookie hanya token opaque) | K7 — layout server-component cek `/me` + redirect `/403`; audit-logs dikecualikan untuk Manager | Cookie httpOnly tak bisa dibaca proxy; guard server menjaga semantik "dijaga middleware". |

---

## Alur kerja per task (TDD)

Semua task mengikuti pola yang sama (dijabarkan ulang di tiap sub-berkas, tidak disingkat di sini):

1. **Step 1 — RED:** tulis test yang menggambarkan perilaku yang diminta, jalankan, pastikan gagal dengan alasan yang benar.
2. **Step 2 — GREEN:** implementasi minimal sampai test hijau.
3. **Step 3 — REFACTOR & verifikasi:** rapikan; jalankan `npx tsc --noEmit`, `npm run lint`, `npm run test` (Vitest), `vendor/bin/pest --filter=…` untuk amandemen backend, `vendor/bin/pint --dirty --format agent`.
4. **Step 4 — Commit:** commit atomik dengan gaya repo (mis. `feat(web): add ticket list filters and URL sync`).

Blok **Jebakan** di tiap task menandai titik di mana developer biasanya salah — baca sebelum menulis.

---

## Onboarding developer

```bash
# 1. Bangun environment (backend + web)
make up
# 2. Migrasi + seed (data demo; gunakan akun demo)
docker compose exec api php artisan migrate:fresh --seed
# 3. Jalankan web (port 3000) — FRONTEND TIDAK PERNAH PANGGIL LARAVEL LANGSUNG
cd apps/web && npm run dev
# 4. Jalankan API (port 8000, kalau belum jalan via make up)
cd apps/api && composer dev
```

**Akun demo** (semua password `Password123!`, seeder `DemoUserSeeder`):

| Role | Email |
| --- | --- |
| Admin | `admin@jarvisops.test` |
| Manager | `manager@jarvisops.test` |
| Technician | `technician@jarvisops.test` |
| Employee | `employee@jarvisops.test` |

**Alur uji manual cepat per modul** (untuk dev sendiri; golden path resmi ada di 8g):

1. Login `employee@…` → buat ticket baru (pilih aset yang dipegang), upload lampiran, lihat detail.
2. Login `manager@…` → assign ke `technician@…`, ubah prioritas, komentar.
3. Login `technician@…` → start → resolve → komentar.
4. Login `employee@…` → close. Cek notifikasi di tiap langkah.
5. Login `admin@…` → buka `/admin/users`, buat user, reset password; ubah prioritas di `/admin/priorities`; buka `/admin/audit-logs`.

**Jangan pernah** memanggil `http://localhost:8000` dari komponen client — itu bug (FRONTEND-ARCHITECTURE). Semua lewat `/api/proxy/...`.

---

## Exit criteria Fase 8

1. Golden path §38 PRD terselesaikan **penuh dari browser** lintas 3 akun, dibuktikan Playwright (`npm run test:e2e`) — bukan sekadar klaim manual.
2. Setiap error 422 mendarat di field yang tepat (tidak ada toast generik untuk validasi form).
3. Tidak ada aksi yang tampil untuk role yang tidak berhak (dibuktikan spec guard otorisasi).
4. Unggah & unduh attachment jalan melalui BFF proxy.
5. Setiap halaman punya state loading / empty / error yang dapat diverifikasi.
6. `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build` semuanya hijau.
7. `vendor/bin/pest` tetap hijau setelah 4 amandemen (599 + test baru).
8. `docs/product/PERMISSION-MATRIX.md`, `docs/api/API-CONTRACT.md` (3 endpoint baru), `docs/product/ROADMAP.md` (centang Fase 8), `README.md` disinkronkan.
9. Tag `v0.8.0` dibuat di `main`.

## Di luar cakupan (sadar, jangan dikerjakan)

- Halaman dashboard + chart Recharts → **Fase 9**.
- Export CSV/PDF, dark mode, saved filters, advanced filtering, FULLTEXT, rate limiter `search`, wiring CI, sinkronisasi `docs/schema.sql` → **Fase 10**.
- Tipe notifikasi baru untuk aset/artikel → **tidak dikerjakan** (D-27 menutup daftar ke domain ticket).
- Perbaikan ketidaksesuaian API-CONTRACT contoh (`note` di `/priority`) → **Fase 10** sinkronisasi kontrak.
