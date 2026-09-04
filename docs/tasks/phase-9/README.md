# Fase 9 — Dashboard UI (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Bacalah README ini sebagai peta arsitektur dan urutan ketergantungan, lalu kerjakan sub-tahap 9a–9e secara berurutan. Setiap sub-berkas berisi langkah TDD (`- [ ]`) yang bisa dikerjakan satu per satu.
>
> **Skill frontend wajib (gunakan yang sama dengan sesi fase 8 yang sudah berjalan):** `impeccable`, `next-best-practices`, `vercel-react-best-practices`, `shadcn`, `frontend-design`, `tailwindcss-development`, `test-driven-development`. Muat skill-skill ini lewat tool `skill` sebelum menulis kode frontend.
>
> **Konvensi centang:** `[x]` = sudah terpenuhi saat dokumen ini ditulis (Fase 6 backend + Fase 7/8 frontend + wireframe sudah ada). `[ ]` = pekerjaan yang harus diselesaikan di sub-tahap. Jangan membangun ulang yang sudah `[x]`.

**Goal:** Memvisualisasikan keempat dashboard API (employee, technician, manager, admin) menjadi UI lengkap dengan Recharts, pemilih rentang tanggal, tabel performa technician yang bisa diurutkan, highlight SLA breached, dan router berbasis role di `/` — sehingga golden path §38 PRD langkah 12–13 ("Manager melihat analytics" → "Dashboard menunjukkan SLA & performance") bisa didemokan dari browser.

**Basis asumsi:** Fase 8 (fitur frontend penuh) **sudah selesai dan di-merge** saat pengerjaan dimulai. Backend Fase 6 (dashboard API) **sudah selesai**: keempat endpoint live dengan 30 test / 144 assertion hijau. Bila asumsi meleset, **hentikan** dan selesaikan fase yang hilang lebih dulu.

**Branch:** `feat/phase-9<sub>` per sub-tahap, di-merge ke `main` via PR (ROADMAP Phase 0).
**Estimasi:** ~4,25 hari (ROADMAP mengalokasikan ~2 hari; ini *conscious overrun* seperti Fase 5/7/8 — ditampung di buffer Minggu 8).
**Tag:** `v0.9.0` di sub-tahap 9e (D-30).

---

## Peta sub-tahap

| Sub | Topik | File | Estimasi | Branch |
| --- | --- | --- | --- | --- |
| 9a | Amandemen Backend & Komponen Bersama | `9a-foundation-amendments.md` | ~1,0 hari | `feat/phase-9a-foundation` |
| 9b | Dashboard Employee & Technician | `9b-employee-technician.md` | ~1,0 hari | `feat/phase-9b-employee-technician` |
| 9c | Dashboard Manager (charts, tren, distribusi, tabel performa) | `9c-manager-dashboard.md` | ~1,25 hari | `feat/phase-9c-manager-dashboard` |
| 9d | Dashboard Admin & Router Role di `/` | `9d-admin-dashboard-router.md` | ~0,75 hari | `feat/phase-9d-admin-router` |
| 9e | E2E, A11y, & Finalisasi | `9e-e2e-finalization.md` | ~0,5 hari | `feat/phase-9e-e2e-finalization` |

Urutan antar sub-tahap **berurutan**: 9b/9c/9d bergantung pada amandemen B1–B4 dan komponen bersama dari 9a; 9d meng-reuse `ManagerDashboardView` dari 9c dan butuh semua halaman ada untuk router di `/`.

---

## Dokumen acuan (urut otoritas)

1. `docs/adr/DECISIONS.md` — khususnya D-01 (SLA 24/7), D-02 (5 status tanpa pause), D-03 (compliance = resolved within SLA / total resolved × 100; **null bila 0 resolved**), D-15 (pinned IDs), D-23 (UTC → Asia/Jakarta di frontend; `date_from`/`date_to` = `YYYY-MM-DD` lokal), D-24 (bahasa pesan), D-28 (SLA bertanda; `null` setelah resolved/closed), D-30 (tag `v0.9.0`), D-31 (`user_id` null pada event sistem).
2. `docs/product/PERMISSION-MATRIX.md` — §3.7 dashboard (ability per role), §2.3 "Limited" Technician (hanya metrik sendiri, **tanpa** tabel perbandingan antar-technician), §5 (dashboard role salah → 403, bukan 404).
3. `docs/api/API-CONTRACT.md` — envelope, §10 Dashboard (4 endpoint + `date_from`/`date_to` default 30 hari), §13 server-set fields.
4. `docs/architecture/FRONTEND-ARCHITECTURE.md` — pola BFF, Client vs Server Component, §11 Dashboard & Charts (dynamic import `ssr:false` + `LoadingSkeleton`, Recharts), §3 design system (warm cream, radius, tanpa shadow).
5. `DESIGN.md` — tema warm-neutral (implementasi via Tailwind v4 `@theme` di `apps/web`, lihat FRONTEND-ARCHITECTURE §3).
6. `docs/product/PRD.md` — §14 (SLA metrics), §20.1–§20.4 (empat dashboard), §21 (performa technician 6 kolom), §38 (golden path langkah 12–13).
7. `docs/product/ROADMAP.md` Fase 9 (berkas ini mengamandemen rencana UI-nya; lihat §Resolusi Konflik).
8. `docs/product/PRODUCT.md` — `:214-220` aksesibilitas WCAG 2.2 AA per layar (kontras, fokus keyboard, label form, semantik), layout 375/768/1440px, **chart terbaca di layar mobile**.
9. `docs/design/wireframe.pen` — frame `02 Dashboard Employee`, `03 Dashboard Technician`, `04 Dashboard Manager`, `05 Dashboard Administrator`. **Wajib dibuka lewat pencil MCP tools**, bukan `read`/`grep` (AGENTS.md). Referensi layout; nilai warna/grid di dalamnya tidak mengikat — token visual dari DESIGN.md yang berlaku.

---

## Keputusan arsitektur Fase 9 (dikunci)

Keputusan ini mengikat semua sub-tahap. Jangan menyimpang tanpa menulis ulang berkas ini.

### K1 — Semua dashboard adalah Client Component + TanStack Query
Keempat halaman dashboard memakai `useQuery`/`useApiMutation` (pola Fase 8 K1). **Server Component hanya untuk**: router `/` (K10) dan shell statis. Tidak ada SSR prefetch data dashboard. Alasan: konsistensi pola, `refetchOnWindowFocus` untuk angka yang perlu segar, dan kemudahan invalidasi.

### K2 — Komponen bersama dashboard di `components/dashboard/`
- `MetricCard` — `{label, value: string|number|null, icon: LucideIcon, footer?, tone?: 'default'|'danger'}`. `value === null` → render "—" (bukan "0" dan bukan "0%"). `tone:'danger'` untuk SLA breached: teks + ikon merah yang lolos kontras ≥ 3:1 (lih. 9a). Desain: `bg-cream border-cream-border rounded-card`, **tanpa box-shadow** (DESIGN.md).
- `DashboardPanel` — kartu dengan header (judul + aksi opsional seperti "Lihat semua") dan body. Basis semua panel di keempat dashboard.
- `LazyChart` — wrapper `next/dynamic` untuk komponen chart (K4), menampilkan `Skeleton` saat load.
- `DateRangePicker` — popover kalender (K5).

### K3 — Skeleton per kartu, bukan satu spinner per halaman
Setiap MetricCard dan DashboardPanel punya state skeleton sendiri (`<Skeleton />` dari Fase 7). Halaman **tidak** menampilkan satu `<LoadingSkeleton>` raksasa yang menutupi semua. Ini kriteria ROADMAP:814.

### K4 — Chart Recharts di-load dinamis
Chart (trend, dan chart lain bila dipakai) dimuat lewat `LazyChart` dengan `ssr: false` + `Skeleton` fallback (FRONTEND-ARCHITECTURE §11). Recharts adalah satu-satunya pustaka chart (ROADMAP §2). Aktifkan `accessibilityLayer` dan `aria-label` ringkasan (WCAG 1.1.1; lihat 9e). Distribusi prioritas/kategori boleh berupa **bar horizontal CSS** (mengikuti wireframe 04, lebih ringan & mudah di-mobile) — keduanya tetap butuh label teks yang bisa dibaca screen reader.

### K5 — Pemilih rentang tanggal = shadcn `Calendar` + `Popover` + preset
Manager (dan Admin via reuse) mendapat `DateRangePicker`:
- Komponen shadcn `calendar.tsx` (react-day-picker) + `popover.tsx` — `react-day-picker` perlu di-install (belum ada).
- Preset cepat: 7 / 30 / 90 hari + tombol "Sesuaikan…".
- Tersinkron URL search params: `date_from` & `date_to` (`YYYY-MM-DD`, WIB) — tautan terfilter bisa di-share & tahan refresh.
- **Aturan wajib: selalu kirim keduanya atau tidak sama sekali.** Quirk backend (`DashboardDateRange`): hanya `date_from` → range menyempit ke 1 hari; hanya `date_to` → range terbalik (semua nol). Lihat C11.
- Default (tanpa param) = 30 hari terakhir WIB — backend sudah menangani; jangan mengirim param saat preset default.

### K6 — Kontrak `null` dipatuhi (D-03, D-28)
- `sla.compliance_percentage`, `sla.avg_resolution_minutes`, `technician_performance[].*` (avg & compliance), `avg_resolution_minutes` technician: `null` = "belum ada data" → render "—", **bukan** 0/0%.
- Gauge/tampilan SLA compliance saat `null` → state "Belum ada data" eksplisit, bukan 0%.
- `recent_system_activity[].user` bisa `null` (D-31) → render "Sistem".
- `technician_performance[].technician.full_name` bisa literal `"Unknown"` (user terhapus) → biarkan apa adanya.

### K7 — Bucket sparse di-zip dengan reference list
`by_priority`, `by_category`, `assets_by_status` **mengabaikan bucket bernilai 0** (INNER JOIN + GROUP BY). Sebelum digambar: zip dengan reference list (`/api/ticket-priorities` — untuk label "Critical (2 jam)" dari `sla_minutes`; `/api/ticket-categories`) agar sumbu/daftar stabil dan proporsi benar. Referensi di-fetch sekali dengan `staleTime: 5 * 60 * 1000` (pola Fase 8).

### K8 — Durasi & SLA diformat di frontend
- Durasi menit → "3j 15m" via `formatDuration(minutes | null)` (util baru di `src/lib/formatters.ts`; formatters belum ada — dibangun di 9a).
- Sisa SLA bertanda (D-28): `formatSlaRemaining(signedMinutes)` → positif "2j 14m", negatif "Terlambat 18m". Dipakai untuk kolom sisa SLA di Employee (dihitung client-side dari `sla_deadline`, lihat C16).
- Semua timestamp UTC diubah ke Asia/Jakarta untuk tampilan (D-23) — pakai `RelativeTime` (tooltip absolut) + `date-fns`.

### K9 — Technician: kartu "Antrean OPEN" ≠ tiket saya
`technician.open_tickets` adalah **antrean OPEN global** (status_id 1, semua teknisi), bukan punya dia — D-19 + keputusan Fase 6. Label kartu "Antrean OPEN (Bisa Diambil)", bukan "Tiket Open Saya". Per teks §2.3 PERMISSION-MATRIX, dashboard technician **tidak** menampilkan perbandingan performa antar-technician.

### K10 — Router berbasis role di `/`
`src/app/(app)/page.tsx` menjadi **Server Component**: panggil `laravelFetch('/me')`, baca `data.role.name`, lalu `redirect()` ke `/dashboard/{employee|technician|manager|admin}`. Role `administrator` → `/dashboard/admin`. Fallback aman → `/dashboard/employee` (semua role punya `dashboard.employee`). `/dashboard` tetap `redirect('/')` seperti sekarang. Peta role→route diletakkan di `src/lib/navigation.ts` (`ROLE_HOME`). Guard sebenarnya tetap Policy Laravel — redirect ini hanya UX (PERMISSION-MATRIX §1).

### K11 — Admin = superset Manager (bukan layout wireframe 05 mentah)
API admin adalah **superset** manager (`AdminDashboardService` = `array_merge` manager + 6 key). Dashboard admin **meng-reuse `ManagerDashboardView`** dari 9c lalu menambahkan: metric cards admin, panel Audit Log Terbaru, panel Pintasan Master Data. Wireframe 05 tidak memuat charts manager — ROADMAP & API menang (C2).

### K12 — Aksi CTA & navigasi pakai `can()` / `useAuth`
- Employee: CTA "Buat Ticket" hanya bila `can('ticket.create')`.
- Technician: item aktivitas terbaru menaut ke `/tickets/{id}` (membutuhkan amandemen B3).
- Manager: baris tabel performa menaut ke `/tickets?technician_id={id}` (filter teknisi, M/A).
- Admin: baris audit log menaut ke `/admin/audit-logs`; pintasan master data menaut ke halaman admin Fase 8.
- Navigasi peran yang salah ke dashboard milik role lain → tampilkan halaman 403 (bukan chart kosong). Backend mengembalikan 403 untuk ability yang tidak dimiliki — `apiFetch` memetakan ke halaman 403/`errorMessages[403]` (label sudah ada).

---

## Titik awal — apa yang sudah ada (jangan dibangun ulang)

### Backend (`apps/api`, hanya 4 amandemen additive di 9a)
- [x] `GET /api/dashboard/employee` → `my_open_tickets`, `my_in_progress_tickets`, `my_resolved_tickets`, `recent_tickets[]` (≤5, `TicketListResource`), `my_assets[]` (≤5, `AssignableAssetResource`), `recent_articles[]` (≤5).
- [x] `GET /api/dashboard/technician` → `assigned_tickets`, `open_tickets`, `in_progress_tickets`, `sla_breached`, `avg_resolution_minutes` (int|null), `recent_activity[]` (≤5, `TicketHistoryResource`).
- [x] `GET /api/dashboard/manager` → `total_tickets`, `open_tickets`, `resolved_tickets`, `closed_tickets`, `sla{within_sla,breached,compliance_percentage,avg_resolution_minutes}`, `ticket_trend[]`, `by_priority[]`, `by_category[]`, `technician_performance[]`.
- [x] `GET /api/dashboard/admin` → superset manager + `total_users`, `total_technicians`, `total_departments`, `total_assets`, `assets_by_status[]`, `recent_system_activity[]` (≤8, berbasis audit log).
- [x] Guard: Gate ability per role (`AbilityMatrix`), tidak ada Policy terpisah. `must_change_password` → 403 via middleware `password.changed`.
- [x] 30 test dashboard hijau (7 file, 144 assertion), termasuk constancy query count & < 500 ms.
- [x] `IndexDashboardRequest` hanya menerima `date_from`/`date_to` (`date_format:Y-m-d`, pesan Indonesia).

### Frontend (`apps/web`, kondisi Fase 8 selesai)
- [x] `recharts ^3.10.1`, `date-fns ^4.4.0`, `lucide-react ^1.39.0` terinstall.
- [x] `dashboardKeys` di `src/lib/query-keys.ts` (`employee`, `technician`, `manager(params)`, `admin(params)`).
- [x] Item navigasi "Dashboard" (`href: '/'`) di `src/lib/navigation.ts`.
- [x] `src/app/(app)/page.tsx` — placeholder `PagePlaceholder` (diganti router di 9d).
- [x] `src/app/(app)/dashboard/page.tsx` — `redirect('/')`.
- [x] Komponen Fase 7: `StatusBadge`, `PriorityBadge`, `SlaIndicator`, `RelativeTime`, `EmptyState`, `Skeleton`, `DataTable`, `PageHeader`.
- [x] `types/dashboard.ts` sudah ada (perlu koreksi — Task 1 9a).
- [x] Label: `getSlaStatusLabel`, `getAssetStatusLabel`, `auditModuleLabels`, `auditActionLabels`, `errorMessages` (Indonesia).
- [x] Reference API: `/api/ticket-priorities`, `/api/ticket-categories` (array polos tanpa `meta`).
- [x] Playwright terinstall + config (`playwright.config.ts`, `e2e/login.spec.ts`) dari 8a.
- [x] Wireframe frames 02–05 di `docs/design/wireframe.pen` (dibaca via pencil MCP).

### Belum ada (harus dibangun)
- [x] `react-day-picker` + shadcn `calendar.tsx` (untuk DateRangePicker, K5).
- [x] `src/lib/formatters.ts` (formatDuration, formatSlaRemaining).
- [x] Komponen `components/dashboard/*` (MetricCard, DashboardPanel, LazyChart, DateRangePicker).
- [x] Amandemen B1–B4 di backend.

---

## Amandemen backend yang disetujui (dikerjakan di 9a)

| # | Perubahan | Berkas yang tersentuh |
| --- | --- | --- |
| B1 | Technician `sla_compliance_percentage` (own resolved, formula D-03, `null` bila 0 resolved) | `app/Services/Dashboard/TechnicianDashboardService.php`, `app/Services/Dashboard/SlaMetricsCalculator.php` (helper all-time), test baru |
| B2 | Manager `unassigned_tickets` (snapshot live: `technician_id IS NULL` + status OPEN, bukan range-filtered) | `app/Services/Dashboard/ManagerDashboardService.php`, `app/Services/Dashboard/DashboardCountsQuery.php`, test baru |
| B3 | Technician `recent_activity[]` + `ticket: { ticket_number, title }` (service sudah eager-load `ticket`) | `app/Http/Resources/Ticket/TicketHistoryResource.php`, test baru |
| B4 | Employee `recent_articles` → `ArticleListResource` + eager load `category,author` (bukan `ArticleResource` yang membawa `content` penuh) | `app/Services/Dashboard/EmployeeDashboardService.php`, test baru |

Semua additive — tidak ada perubahan route, gate, atau ability baru (tidak ada sync `PERMISSION-MATRIX` untuk amandemen ini; verifikasi saja di 9e).

---

## Resolusi konflik antar-dokumen

Tabel ini memutuskan mana yang berlaku saat dokumen bertentangan.

| # | Konflik | Keputusan | Alasan |
| --- | --- | --- | --- |
| C1 | Wireframe 03 memuat 2 tabel antrean ticket + panel "Peringatan SLA" | **Tidak dibangun** — dashboard technician hanya metric cards + aktivitas terbaru | Fitur tabel antrean, self-assign, dan alert sudah ada di `/tickets` (Fase 8) dan komponen `NotificationBell`; API dashboard technician tidak menyediakan payload list ticket; ROADMAP Fase 9 untuk technician hanya "assigned, open, in progress, SLA breached, rata-rata penyelesaian, aktivitas terbaru". Layout wireframe dipakai; konten mengikuti ROADMAP. |
| C2 | Wireframe 05 admin tanpa charts manager vs ROADMAP "metrik Manager + ekstra" | **ROADMAP + API menang** — admin = reuse `ManagerDashboardView` + ekstra admin | `AdminDashboardService` adalah superset manager; menyembunyikan metrik manager dari admin menurunkan nilai operasional & menyalahi "menampilkan seluruh metrik Manager" (PRD §20.4). |
| C3 | Wireframe 05 metric "Audit Log Hari Ini" (count) | **Dipotong** — ganti dengan panel Audit Log Terbaru | API tidak menyediakan count audit log hari ini (hanya `recent_system_activity[]` ≤ 8); menampilkan panjang array sebagai "jumlah hari ini" menyesatkan. Keputusan user. |
| C4 | Wireframe 05 panel "Status Kesehatan Sistem & Integrasi" | **Dipotong** — tidak ada sumber data API | Tidak ada endpoint health/status storage; membuatnya berarti invent data baru yang tak diminta ROADMAP. |
| C5 | Wireframe 03 metric "SLA Compliance Saya" tidak ada di API technician | **Amandemen B1** — tambah `sla_compliance_percentage` ke endpoint technician | Keputusan user; konsisten dengan D-03 (formula & null). |
| C6 | Wireframe 04 metric "Ticket Belum Di-assign" tidak ada di API manager | **Amandemen B2** — tambah `unassigned_tickets` | Keputusan user; metrik operasional penting untuk manager. |
| C7 | Wireframe 03 item aktivitas menampilkan nomor tiket, tapi `TicketHistoryResource` tidak punya referensi tiket | **Amandemen B3** — tambah `ticket: {ticket_number, title}` (whenLoaded) | Item aktivitas harus bisa ditaut ke detail tiket. |
| C8 | Employee `recent_articles` membawa `content` penuh + tanpa `category`/`author` | **Amandemen B4** — ganti ke `ArticleListResource` dengan eager load | Payload ringan & cocok dengan tipe `KnowledgeArticleListItem` yang sudah ada; `category`/`author` dibutuhkan untuk render kartu artikel. |
| C9 | Metric manager: ROADMAP "kartu total/open/resolved" vs wireframe "total/compliance/breached/avg/unassigned" | **Gabung 6 kartu**: Total, Open, Resolved, SLA Compliance (+footer breached), Rata-rata Penyelesaian, Belum Di-assign | Keduanya terpenuhi; `closed_tickets` (ada di API, tak ada di PRD §20.3) tidak ditampilkan sebagai kartu — hanya tren/resolved. |
| C10 | Pattern date picker belum diputuskan | **shadcn `Calendar` + `Popover` + preset** | Keputusan user; konsisten dengan design system (shadcn/ui), tanpa dependensi di luar stack (react-day-picker adalah dependensi standar shadcn `calendar`). |
| C11 | Quirk `DashboardDateRange`: hanya `date_from` → 1 hari; hanya `date_to` → range terbalik | **UI selalu kirim keduanya atau tidak sama sekali** | Menghindari angka nol yang membingungkan; dokumentasikan di `DateRangePicker` (K5). |
| C12 | `technician.open_tickets` = antrean OPEN global | Label kartu "Antrean OPEN (Bisa Diambil)" | D-19: technician melihat semua tiket tapi memproses hanya yang di-assign; antrean OPEN adalah peluang self-assign. |
| C13 | `compliance_percentage` & avg `null` | Render "—"/"Belum ada data", jangan 0%/0 | D-03: 0 salah dibaca sebagai fakta. |
| C14 | `by_priority`/`by_category` sparse (zero-count dihilangkan) | Zip dengan reference list sebelum digambar | Sumbu chart/daftar stabil dan proporsi benar (K7). |
| C15 | Dashboard `data` tanpa `meta` | Tanpa kontrol pagination pada dashboard | Semua array sudah di-cap server (≤5/≤8); ROADMAP tidak meminta. |
| C16 | Kolom sisa SLA di Employee: `TicketListResource` tidak punya `sla_remaining_minutes` | Hitung client-side dari `sla_deadline` dengan `formatSlaRemaining`; "Selesai" bila status RESOLVED/CLOSED | Menghindari amandemen tambahan; `sla_status` + `sla_deadline` sudah tersedia. |
| C17 | `recent_tickets[].technician` bisa **hilang** (key absent) saat teknisi soft-deleted | Tipe `technician?: {...} | null`; render "—" bila absen/null | `whenLoaded` + filter menghapus key. |
| C18 | Envelope `message` berbahasa Inggris (D-24) | Jangan render `message` ke UI; hanya `data` | Sama seperti Fase 8 K8. |

---

## Alur kerja per task (TDD)

Semua task mengikuti pola yang sama (dijabarkan ulang di tiap sub-berkas):

1. **Step 1 — RED:** tulis test yang menggambarkan perilaku yang diminta, jalankan, pastikan gagal dengan alasan yang benar.
2. **Step 2 — GREEN:** implementasi minimal sampai test hijau.
3. **Step 3 — REFACTOR & verifikasi:** rapikan; jalankan verifikasi yang tertera (Pest/Pint untuk backend; `npm run test`, `npx tsc --noEmit`, `npm run lint` untuk frontend).
4. **Step 4 — Commit:** commit atomik dengan gaya repo (mis. `feat(web): add metric card component` / `feat(api): add technician SLA compliance to dashboard`).

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
# 5. (9a) Untuk mengecek payload dashboard mentah:
curl -H "Accept: application/json" http://localhost:8000/api/dashboard/manager # setelah login dapat token
```

**Akun demo** (semua password `Password123!`, seeder `DemoUserSeeder`):

| Role | Email | Dashboard |
| --- | --- | --- |
| Admin | `admin@jarvisops.test` | `/dashboard/admin` |
| Manager | `manager@jarvisops.test` | `/dashboard/manager` |
| Technician | `technician@jarvisops.test` | `/dashboard/technician` |
| Employee | `employee@jarvisops.test` | `/dashboard/employee` |

**Alur uji manual cepat per modul:**

1. Login `employee@…` → `/` mendarat di dashboard employee; cek greeting, 4 kartu, tabel tiket saya, aset & artikel.
2. Login `technician@…` → 6 kartu; cek kartu "Antrean OPEN" menampilkan antrean global; klik item aktivitas → detail tiket.
3. Login `manager@…` → DateRangePicker mengubah angka & chart; sort tabel performa; klik baris → daftar tiket teknisi itu.
4. Login `admin@…` → semua konten manager + kartu admin + audit log + pintasan.
5. Cek `employee@…` akses `/dashboard/manager` → 403; tab inactive tidak memicu refetch.

**Jangan pernah** memanggil `http://localhost:8000` dari komponen client — selalu lewat `/api/proxy/...` (FRONTEND-ARCHITECTURE §4).

---

## Exit criteria Fase 9

1. [ ] Keempat dashboard menampilkan **setiap** metrik yang disebut PRD §20.1–§20.4 pada role yang tepat (verifikasi checklist di 9b/9c/9d).
2. [ ] Golden path §38 langkah 12–13 didemokan: Manager login → dashboard menampilkan SLA compliance & performa technician yang akurat.
3. [ ] Router `/` mengarahkan sesuai role; akses dashboard role lain → halaman 403 (dibuktikan Playwright di 9e).
4. [ ] **Angka di UI sama dengan respons API** (ROADMAP:828; dibuktikan Playwright assert di 9e).
5. [ ] Chart terbaca di layar mobile 375px; semua halaman punya state loading (skeleton per kartu), empty, dan error.
6. [ ] Aksesibilitas WCAG 2.2 AA per layar: kontras ≥ 3:1 (badge/SLA bar), `:focus-visible` 2px, `aria-label` ikon, `scope="col"` tabel, `aria-describedby` error, chart punya ringkasan teks (PRODUCT.md:214-220).
7. [ ] `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build` semuanya hijau.
8. [ ] `vendor/bin/pest` hijau setelah amandemen B1–B4 (631 + test baru).
9. [ ] `docs/api/API-CONTRACT.md` §10 diperbarui (B1–B4), `docs/product/ROADMAP.md` Fase 9 tercentang, `README.md` + `AGENTS.md` status sinkron. `PERMISSION-MATRIX.md` hanya diverifikasi (tidak ada ability baru).
10. [ ] Tag `v0.9.0` dibuat di `main` (D-30).

## Di luar cakupan (sadar, jangan dikerjakan)

- Export report CSV/PDF, advanced filtering, saved filters, dark mode → **Fase 10** (opsional).
- Sinkronisasi `docs/schema.sql`, CI GitHub Actions, Docker produksi, Octane → **Fase 10**.
- Panel "Status Kesehatan Sistem" (tanpa sumber data) → tidak dikerjakan (C4).
- Tipe notifikasi baru untuk aset/artikel → tidak dikerjakan (D-27).
- Tabel antrean & self-assign di dashboard technician → tidak dikerjakan (C1; fitur sudah di `/tickets`).
