# FASE 6 — Dashboard & Analytics API · Rencana Implementasi

> **Panduan Eksekusi Dua Jalur:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans` untuk mengeksekusi rencana ini task demi task. Setiap langkah memakai sintaks checkbox (`- [ ]`) agar progres terlacak.
> - **Untuk developer manusia:** Ikuti alur TDD di [§Alur Kerja Per Task](#alur-kerja-per-task) dan lihat panduan lingkungan di [§Onboarding Developer](#onboarding-developer). Setiap task dilengkapi estimasi waktu, berkas target, snippet test/implementasi, dan blok *Jebakan* untuk menghindari kesalahan umum.

**Goal:** Menyediakan empat endpoint agregat dashboard (`GET /api/dashboard/employee|technician|manager|admin`) sesuai `PRD §20` sehingga angka SLA, tren, distribusi, dan performa technician dapat dirender oleh UI Fase 9. Di akhir fase, setiap angka yang muncul di dashboard punya sumber data di API, semua agregasi dijalankan di SQL (bukan di PHP), setiap endpoint dijaga gate sesuai role, dan seluruh angka konsisten dengan perhitungan manual.

**Architecture:**
1. **Query kernel bersama (`DashboardQueryService`):** Semua metrik dihitung lewat agregasi SQL (`selectRaw`, `groupBy`, `DB::table` untuk agregat murni) di satu query service domain `Dashboard`. Service per-role (`EmployeeDashboardService`, `TechnicianDashboardService`, `ManagerDashboardService`, `AdminDashboardService`) **menggabungkan** hasil beberapa agregasi ke satu payload — bukan menulis ulang logika agregasi. Ini menjamin definisi SLA, trend, dan performa tidak bisa berbeda antar endpoint.
2. **Kalkulator kecil terfokus:** `SlaMetricsCalculator` (compliance §14 / D-03), `TicketTrendQuery` (bucket harian), `TechnicianPerformanceQuery` (§21), `DashboardCountsQuery` (counts per role). Masing-masing method `public` murni menerima query builder + scope → mengembalikan array/collection, bisa diuji unit tanpa HTTP.
3. **Date range terpusat:** `DashboardDateRange` (value object) mem-parse `date_from`/`date_to` (format `YYYY-MM-DD`) dengan semantik D-23 (WIB → UTC), default 30 hari terakhir, dan menyediakan helper `applyToCreated()/applyToResolved()` agar filter rentang konsisten di semua metrik.
4. **Controller tipis:** Satu `DashboardController` dengan empat method (employee/technician/manager/admin). Otorisasi via `$this->authorize('dashboard.xxx')` — gate sudah terdaftar di `AbilityMatrix`, tanpa Policy class baru. Response memakai `ApiResponse::success()` dengan `data` berupa array asosiatif (bukan Eloquent Resource) karena payload-nya agregat, bukan resource tunggal.
5. **Scoping di server:** `EmployeeDashboardService` dan `TechnicianDashboardService` selalu mengunci query ke `reporter_id`/`technician_id` user login. Parameter `technician_id` pada dashboard technician **diabaikan** (PERMISSION §2.3). Gate menentukan endpoint mana yang boleh diakses; tidak ada endpoint yang memuat data lintas-user.
6. **Tanpa cache di awal** (keputusan #11): agregasi SQL pada volume data seed di bawah 500 ms, sehingga cache tidak menambah kompleksitas invalidasi. Jika pengukuran 6d menunjukkan pelanggaran exit criteria, tambah `Cache::remember` 60 detik dengan key yang menyertakan role + user + rentang tanggal (invalidasi tidak diperlukan untuk TTL pendek).

**Tech Stack:** PHP 8.5 · Laravel 13.29 · Sanctum 4 · Pest 5 (PHPUnit 13) · Pint · MySQL 8.4 (dev/prod) · SQLite in-memory (test). **Tanpa paket baru** — agregasi memakai `selectRaw`/`groupBy` bawaan; tidak ada library analytics/grafik (grafik Fase 9 di frontend).

**Spec:** Dokumen `docs/` yang sudah disetujui, dibaca dengan urutan otoritas:

| Dokumen | Perannya untuk Fase 6 |
| --- | --- |
| `docs/adr/DECISIONS.md` | D-03 (rumus compliance & perlakuan ticket cancel), D-08 Amandemen 1 & 2 (kosakata audit untuk `recent_system_activity`), D-16 (pengecualian admin), D-22 (kode status), D-23 (zona waktu & format tanggal), D-24 & D-29 (bahasa), D-28 (semantik SLA defensif), D-30 (tag SemVer). **Otoritas tertinggi.** |
| `docs/product/PERMISSION-MATRIX.md` | §2.3 (Technician hanya metrik sendiri, `?technician_id` diabaikan), §3.7 (tabel ability dashboard & `analytics.technician-performance`), §4 (inventori route 286–289), §5 (403 vs 404), §6 (checklist test — butir "Technician memakai `?technician_id=X`"). |
| `docs/api/API-CONTRACT.md` | §10 (bentuk payload empat dashboard — baris 604–684), §2 (envelope), §13 (server-set fields), §4 (query parameter & format tanggal). |
| `docs/architecture/BACKEND-ARCHITECTURE.md` | v1.4. Pipeline request, controller tipis, service layer, query service, struktur folder domain (`Dashboard`), §4.2 (endpoint baca tidak memakai DTO). |
| `docs/architecture/ERD.md` | Skema & index `tickets` (`created_at`, `resolved_at`, `sla_deadline`, composite SLA), `assets(status)`, `users(status)`, relasi assignment. |
| `docs/product/ROADMAP.md` | Task checklist & exit criteria Fase 6 (baris 599–647). |
| `docs/product/PRD.md` | §14 (SLA metrics), §20 (empat dashboard), §21 (technician performance), §24–25 (filter/pagination); Addendum §3 (SLA), §4 (notifikasi). |

Urutan otoritas saat bertentangan (DECISIONS §2):
`DECISIONS.md` > `STATUS-TRANSITION.md` / `PERMISSION-MATRIX.md` > `API-CONTRACT.md` > `ERD.md` / `schema.sql` > `ROADMAP.md` > `PRD.md`.

---

## Global Constraints

Berlaku untuk **setiap** task di seluruh sub-tahap Fase 6:

### Envelope & Kontrak API
- Setiap respons dashboard memakai **satu** envelope:
  - Sukses: `{ success: true, message: "...", data: {...} }`
  - Error: `{ success: false, message: "...", errors: {...} | null }`
- `data` pada keempat endpoint adalah **objek asosiatif** (bukan koleksi ter-pagination). **Tidak ada `meta`** pada dashboard — payload-nya agregat, bukan list.
- **`204 No Content` dilarang** — selalu status `200` beramplop. `compliance_percentage` bernilai `null` bila tidak ada ticket resolved (bukan `0`, bukan `100` — D-03 & API-CONTRACT §10).
- Dashboard adalah endpoint **baca**: D-22 tidak relevan (tidak ada create). Semua GET mengembalikan `200`.

### Format Data & Waktu
- Timestamp selalu **ISO 8601 UTC** (`YYYY-MM-DDTHH:mm:ssZ`), kecuali tanggal murni pada `ticket_trend[].date` yang berbentuk **`YYYY-MM-DD`** (API-CONTRACT §10).
- `date_from`/`date_to` (format `YYYY-MM-DD`) diinterpretasikan sebagai `00:00:00` dan `23:59:59` **waktu Asia/Jakarta (WIB/UTC+7)**, lalu dikonversi ke UTC sebelum query (D-23). Default: **30 hari terakhir** (dari hari ini WIB mundur 29 hari → hari ini).
- Durasi selalu integer **menit** (`avg_resolution_minutes`). Persentase compliance dikembalikan sebagai **float** (`87.0`) atau `null`.
- `ticket_trend[].date` mengikuti **WIB** (bucket harian dikelompokkan pada tanggal lokal aplikasi, lihat keputusan #7).
- Penamaan field `snake_case`.

### Bahasa (D-24, D-29)
- Envelope `message`: **Bahasa Inggris** (`"Employee dashboard retrieved successfully."`, `"Dashboard retrieved successfully."`).
- Seluruh isi `errors.<field>` (dari `IndexDashboardRequest`): **Bahasa Indonesia** (`"Tanggal awal tidak valid."`).
- `audit_logs.description` yang muncul di `recent_system_activity`: **Bahasa Indonesia** (sudah ditulis Fase 4/5; Fase 6 hanya membaca).
- Dokumen `docs/` (termasuk berkas rencana ini): **Bahasa Indonesia**.
- Kode program (nama class, method, variabel, komentar kode): **Bahasa Inggris**.

### Otorisasi & Akses Data
- Otorisasi murni Laravel Gate. Admin lolos `Gate::before` (D-16) — **kecuali** tidak ada pengecualian dashboard: Admin berhak membaca seluruh empat dashboard.
- Gate dijalankan di controller (`$this->authorize('dashboard.xxx')`). **Scoping dilakukan di query**, bukan dengan memfilter hasil di PHP.
- **Teknisi hanya melihat metriknya sendiri** (PERMISSION §2.3): parameter `?technician_id=X` pada `GET /api/dashboard/technician` **diabaikan** — selalu `technician_id = auth()->id()`. Tidak ada test yang boleh menganggap parameter itu berpengaruh.
- **403 vs 404 (PERMISSION §5):** dashboard adalah endpoint role-specific. Akses lintas-role → **403** (keberadaan endpoint bukan rahasia). Tidak ada skenario 404 di dashboard.
- Gate `dashboard.employee` terbuka untuk semua role (Employee/Technician/Manager/Admin) sesuai `AbilityMatrix` — tetapi `EmployeeDashboardService` mengunci ke `reporter_id = self`, jadi data selalu milik pemanggil.

### Kebersihan & Mutu Kode
- Jalankan `vendor/bin/pint --dirty --format agent` setelah memodifikasi berkas PHP apa pun.
- Seluruh feature test berjalan terhadap **SQLite in-memory** (`phpunit.xml`, `CACHE_STORE=array`).
- Branch: `feat/phase-6<x>-<topik>`, merge ke `main` lewat PR walau solo. Semua perintah dijalankan dari `apps/api`.
- **Agregasi wajib di SQL** (`selectRaw`/`groupBy`) — jangan `->get()` seluruh baris lalu hitung di PHP (ROADMAP:619). Verifikasi di 6d dengan `DB::enableQueryLog()`.

---

## Titik Awal: Apa Yang Sudah Ada

Dibaca dari kode, bukan dari dokumen. **Jangan membangun ulang hal-hal ini.**

| Sudah ada | Lokasi | Catatan untuk Fase 6 |
| --- | --- | --- |
| Gate dashboard lengkap: `dashboard.employee` (semua role), `dashboard.technician` (A/M/T), `dashboard.manager` (A/M), `dashboard.admin` (A), `analytics.technician-performance` (A/M) | `app/Authorization/AbilityMatrix.php` + `AppServiceProvider` | Sudah terdaftar & sudah lolos `GateRegistrationTest`. Fase 6 tinggal memanggil `$this->authorize()` |
| `SlaService`: `isBreached`, `remainingMinutes`, `scopeBreached`, `scopeOnTrack`, `breachCandidates`, `calculateDeadline` | `app/Services/Sla/SlaService.php` | `scopeBreached`/`scopeOnTrack` dipakai untuk filter SLA defensif; `isBreached` dipakai resource |
| `ApiResponse` (`success`) + `HandlesPagination` (tidak wajib di dashboard, karena tanpa pagination) | `app/Support/` | Dashboard memakai `ApiResponse::success` saja |
| `UserFactory` role states: `admin/manager/technician/employee/inactive` | `database/factories/UserFactory.php` | Fondasi data test dashboard |
| `TicketFactory` states: `open/assigned/inProgress/resolved/closed/breached/withTechnician` | `database/factories/TicketFactory.php` | `resolved()` & `closed()` set `resolved_at`/`closed_at`; `breached()` set deadline lewat |
| `AssetFactory` states (`available/maintenance/...`), `AssetAssignmentFactory`, `KnowledgeArticleFactory` (status `published`, `published_at`, `view_count`) | `database/factories/` | Dibutuhkan payload `my_assets` & `recent_articles` (Fase 5) |
| Resource yang bisa dipakai ulang: `TicketListResource`, `TicketHistoryResource`, `AssignableAssetResource`, `UserResource` | `app/Http/Resources/` | Dipakai untuk array `recent_tickets`, `recent_activity`, `my_assets`, dan `recent_system_activity` |
| `ReferenceDataSeeder` pinned (status 1–5, priority 1–4, role 1–4) | `database/seeders/ReferenceDataSeeder.php` | `TestCase::$seeder` → otomatis jalan di tiap feature test. **Status 4 RESOLVED & 5 CLOSED ber-`is_closed = true`** |
| Kolom/index pendukung agregasi | migration `tickets`, `assets`, `users` | `tickets(created_at)`, `tickets(resolved_at)`, `tickets(sla_deadline)` + composite SLA (D-14, Fase 4a), `assets(status)`, `users(status)` |
| `AuditLogger` + `audit_logs` (module/action/description) | `app/Services/Audit/`, tabel `audit_logs` | Sumber `recent_system_activity` (6d) |
| Route group `auth:sanctum` + `password.changed` | `routes/api.php:36` | Route dashboard ditaruh **di dalam** group ini |

Yang **belum ada sama sekali**: folder domain `Dashboard` (controller, service, request, resource, test), `DashboardQueryService`, kalkulator metrik, value object `DashboardDateRange`, `IndexDashboardRequest`, dan keempat route `/api/dashboard/*`.

### Asumsi prasyarat (sesuai arahan proyek)

> **Asumsi:** Seluruh task dan exit criteria **Fase 4 (SLA, Notification, Audit Log)** dan **Fase 5 (Asset, KB, Attachment, Administrasi)** dianggap **selesai**. Rencana ini bergantung pada:
> - `AuditLogger` menulis `audit_logs` dengan `module`/`action`/`description` pada semua aksi yang diwajibkan Fase 4 — sumber `recent_system_activity`.
> - `KnowledgeArticle` punya status `published`/`draft`, `published_at`, dan `view_count` — sumber `recent_articles`.
> - `Asset` punya relasi `activeAssignment` (assignment `released_at IS NULL`) dan `AssetAssignment` — sumber `my_assets`.
> - Gate dashboard sudah terdaftar (terverifikasi di `AbilityMatrix`).
>
> Bila pada saat 6a dieksekusi ada yang belum selesai (mis. `KnowledgeArticle` belum punya scope `published`), kerjakan dulu prasyarat tersebut — daftar dependensinya ada di masing-masing sub-berkas.

---

## Resolusi Konflik & Keputusan Desain (18 Poin)

Pembacaan ulang spec menemukan konflik & lubang. Seluruhnya sudah diresolusi di bawah. **Jangan buka ulang keputusan ini saat implementasi.**

| # | Topik | Masalah / Konflik Antar-Dokumen | Keputusan Final & Resolusi | Dasar Otoritas |
| --- | --- | --- | --- | --- |
| **1** | Definisi "open" pada dashboard | PRD §20 memakai "Open Tickets" tanpa definisi; `tickets.status_id` menyimpan 5 status dengan flag `is_closed` | **Open = `is_closed = false`** (status OPEN, ASSIGNED, IN_PROGRESS). `closed = is_closed = true` (RESOLVED & CLOSED). Pada manager dashboard, `open_tickets` = count ticket `is_closed = false`; `closed_tickets` = count status CLOSED (`is_final`). Perhatikan: RESOLVED dihitung *closed* oleh query defensif SLA, tapi `resolved_tickets` tetap dihitung dari `resolved_at IS NOT NULL`. | Seeder (status 4 `is_closed=true`), D-28 |
| **2** | `resolved_tickets` vs `closed_tickets` | API-CONTRACT §10 memunculkan keduanya di manager dashboard tanpa definisi eksplisit | `resolved_tickets` = count ticket dengan `resolved_at IS NOT NULL` (pernah di-resolve, termasuk yang sudah CLOSED — D-03). `closed_tickets` = count ticket berstatus `is_final` (CLOSED) **saat ini**. Keduanya bisa berbeda (resolved lalu reopen). | D-03, API-CONTRACT §10 |
| **3** | Rumus SLA compliance | PRD §14 menulis formula mentah; ROADMAP:616 memerinci "resolved within SLA / total resolved × 100"; tidak menyebut penanganan ticket cancel | Pakai **D-03 persis**: numerator = ticket `resolved_at IS NOT NULL AND resolved_at <= sla_deadline`; denominator = ticket `resolved_at IS NOT NULL`. Ticket cancel (`resolved_at NULL`, status CLOSED) **keluar dari pembilang & penyebut**. Penyebut 0 → `null`. | D-03 > ROADMAP > PRD |
| **4** | Makna `sla.breached` di manager dashboard | Contoh API-CONTRACT: `within_sla 87, breached 13, compliance 87.0` → 87+13 = 100 (total resolved). Bisa keliru dibaca sebagai "ticket terbuka yang breach" | `sla.breached` = **resolved melewati deadline**: count ticket `resolved_at NOT NULL AND resolved_at > sla_deadline`. Dengan begitu `within_sla + breached = total resolved` selalu konsisten. Ini **historis**, bukan snapshot breach terbuka. | API-CONTRACT §10, D-03 |
| **5** | `avg_resolution_minutes` | ROADMAP:628: "dihitung dari `created_at` ke `resolved_at`"; tidak menyebut pembulatan | `avg( TIMESTAMPDIFF(MINUTE, created_at, resolved_at) )` di set ticket `resolved_at IS NOT NULL`, dibulatkan ke integer terdekat (`ROUND`). Tanpa resolved → `null` (bukan 0). Berlaku sama untuk per-technician. | ROADMAP:628 |
| **6** | Semantik rentang tanggal | API-CONTRACT §10 hanya "default 30 hari terakhir"; tidak menyebut metrik mana yang ikut terfilter | Satu `DashboardDateRange` diterapkan **konsisten per metrik**. **Terfilter rentang:** `total_tickets` (`created_at` dalam rentang), `resolved_tickets` (`resolved_at` dalam rentang — sehingga selalu `sla.within_sla + sla.breached = resolved_tickets`), seluruh `sla{}` (`resolved_at`), `ticket_trend` (created & resolved per hari), `by_priority`/`by_category` (`created_at`), dan metrik resolved per-technician (`resolved_at`). **Snapshot "saat ini" (tidak terfilter):** `open_tickets` (status `is_closed=false` saat ini), `closed_tickets` (status `is_final` saat ini), open & breached count per-teknisi. | D-23, API-CONTRACT §10, D-03 |
| **7** | Bucket `ticket_trend` | API-CONTRACT hanya contoh satu baris; tidak ada aturan isi hari kosong & zona waktu bucket | Bucket harian **mengikuti WIB** (`GROUP BY DATE(CONVERT_TZ(created_at, '+00:00', '+07:00'))` di MySQL; di SQLite test pakai helper `strftime` — lihat 6c). Semua hari dalam rentang diisi **termasuk hari nol** (`created 0, resolved 0`) agar chart kontinu. | D-23, kebutuhan UI Fase 9 |
| **8** | Teknisi kirim `?technician_id=X` | PERMISSION §2.3 "parameter apa pun yang mencoba mengubahnya diabaikan"; PERMISSION §6 butir test memeriksa ini | Dashboard technician **selalu** `where('technician_id', auth()->id())`. Parameter `technician_id` tidak dibaca sama sekali (tidak di `IndexDashboardRequest`). Test: kirim `?technician_id=<user lain>` → data tetap milik sendiri. | PERMISSION §2.3, §6 |
| **9** | Bentuk `recent_activity` (technician) | API-CONTRACT §10 `"recent_activity": []` tanpa bentuk | Array ≤5 item dari `ticket_histories` (status/assignment terbaru) pada ticket milik teknisi, di-render via `TicketHistoryResource` **ditambah** `ticket.ticket_number` & `ticket.title`. Urut `created_at DESC`. | API-CONTRACT §10, D-08 |
| **10** | Bentuk `recent_system_activity` (admin) | API-CONTRACT §10 `"recent_system_activity": []` tanpa bentuk | Array ≤8 item dari `audit_logs` (semua modul — Admin berhak), di-render via `AuditLogResource`-shape: `{ id, user, action, module, description, created_at }`. Urut `created_at DESC`. | API-CONTRACT §10, D-08 |
| **11** | Cache | ROADMAP:621 "Cache ringan jika query berat, dengan invalidasi yang jelas" | **Tanpa cache di awal.** Agregasi SQL di-seed volume kecil jauh di bawah 500 ms; cache menambah risiko data basi tanpa keuntungan. Jika pengukuran 6d >500 ms, tambah `Cache::remember('dashboard:{role}:{user_id}:{from}:{to}', 60, ...)` — TTL 60 detik menghindari kebutuhan invalidasi eksplisit. | ROADMAP:621, exit criteria 500 ms |
| **12** | Cache & Admin breadth | — | `recent_system_activity` dan `total_*` admin memicu query tambahan; tetap tanpa cache di awal, diukur di 6d. | — |
| **13** | Struktur folder | BACKEND-ARCHITECTURE §5.3 tidak mencantumkan domain `Dashboard` (dokumen ditulis sebelum fase ini) | Buat folder domain `Dashboard`: `app/Services/Dashboard/`, `app/Http/Controllers/Dashboard/`, `app/Http/Requests/Dashboard/`. **Tanpa** `app/DTOs/Dashboard` (endpoint baca, §4.2) dan **tanpa** `app/Policies/Dashboard` (otorisasi via gate, bukan policy resource). | BACKEND-ARCHITECTURE §5.3, §4.2 |
| **14** | `compliance_percentage` null | API-CONTRACT:665 "Bila total resolved = 0, kembalikan null"; contoh PRD menampilkan 87% | `null`, bukan `0` atau `100`. Frontend Fase 9 harus menampilkan "belum ada data" untuk null. Sama untuk `sla_compliance_percentage` per-technician bila teknisi belum menyelesaikan ticket apa pun. | API-CONTRACT §10, DECISIONS Fase 1 |
| **15** | Technician performance `handled` | PRD §21 "Number of tickets handled"; API-CONTRACT menampilkan contoh 48 | `handled` = jumlah ticket di mana teknisi adalah **pemegang saat ini** (`technician_id = X`), mencakup yang masih terbuka maupun yang sudah resolved/closed atas namanya. **Keterbatasan diterima:** reassignment memindahkan ticket ke pemegang baru sehingga pemegang lama tidak lagi dihitung — konsisten dengan kolom `technician_id` snapshot, tanpa melacak histori assignment (dokumentasikan di 6c). | PRD §21, API-CONTRACT §10 |
| **16** | Sortir technician_performance | API-CONTRACT:651 menampilkan array tanpa urutan | Default urut `resolved DESC` (teknisi paling produktif di atas). Sorting interaktif adalah tanggung jawab tabel UI Fase 9, bukan API. | Kebutuhan UI §21 PRD |
| **17** | `my_assets` (employee) | API-CONTRACT:616 `"my_assets": []`; PRD §20.1 "My Assets" | Array asset yang sedang di-assign ke user login (assignment aktif, `released_at IS NULL`), ≤5 item, di-render via `AssignableAssetResource`. Order `asset_tag ASC`. | API-CONTRACT §10, PERMISSION §3.4 `viewOwn` |
| **18** | `recent_articles` (employee) | API-CONTRACT:617 `"recent_articles": []`; PRD §20.1 "Recent Knowledge Base Articles"; Employee hanya boleh lihat published | Array ≤5 artikel **published** terbaru (`published_at DESC`), di-render via resource artikel Fase 5 (atau shape inline `{ id, title, slug, category, published_at }` bila resource belum tersedia). **Scoping published wajib** — jangan bocorkan draft. | PERMISSION §3.5 `viewAny` (published), API-CONTRACT §10 |

> **Catatan penafsiran exit criteria ROADMAP:641** ("Setiap angka di §20 PRD punya sumber data di API"): keempat payload API-CONTRACT §10 adalah kontrak final. PRD §20 tidak menambah metrik di luar payload; tiap metrik di tabel §20 dipetakan ke satu field payload di sub-berkas 6b–6d.

---

## Dekomposisi Sub-Tahap

Fase 6 dibagi menjadi **empat sub-tahap berurutan**. Setiap sub-tahap dikerjakan dalam satu branch terisolasi, diuji penuh, dan digabungkan melalui Pull Request ke `main`. **Jangan mulai sub-tahap berikutnya sebelum exit criteria sub-tahap sebelumnya terpenuhi.**

```
Fase 6: Dashboard & Analytics API
│
├── 6a: Foundation & Query Kernel           (feat/phase-6a-foundation)          ~0.75 hari
│   ├── DashboardDateRange (value object, D-23 WIB→UTC, default 30 hari)
│   ├── IndexDashboardRequest (validasi date_from/date_to)
│   ├── DashboardQueryService kernel (helper date-bucket & minutes-diff SQL
│   │   driver-aware) + SlaMetricsCalculator + TicketTrendQuery +
│   │   TechnicianPerformanceQuery + DashboardCountsQuery
│   └── Unit test murni tiap kalkulator (tanpa HTTP) — fondasi angka semua endpoint
│
├── 6b: Controller + Route + Employee & Technician
│                                (feat/phase-6b-employee-technician)            ~1.0 hari
│   ├── DashboardController (4 method) + 4 route + matriks otorisasi gate
│   ├── EmployeeDashboardService + endpoint
│   ├── TechnicianDashboardService + endpoint
│   └── Test scoping (data milik sendiri, ?technician_id diabaikan, limit 5)
│
├── 6c: Dashboard Manager                  (feat/phase-6c-manager-dashboard)   ~1.0 hari
│   ├── ManagerDashboardService + endpoint
│   ├── SLA metrics (D-03), trend, distribusi, technician performance
│   └── Test compliance manual, zero-denominator null, rentang tanggal
│
└── 6d: Dashboard Admin + Finalisasi       (feat/phase-6d-admin-finalization)  ~0.5 hari
    ├── AdminDashboardService + endpoint (extends manager + totals + aktivitas)
    ├── Verifikasi N+1 & <500 ms per endpoint
    ├── Sinkronisasi ROADMAP/PERMISSION/API-CONTRACT + tag v0.6.0
    └── Test kebocoran data & integritas angka
```

### Kenapa urutannya begitu

6a lebih dulu karena seluruh endpoint 6b–6d memakai kernel query yang sama — definisi SLA, trend, dan performa harus dikunci sekali sebelum dipakai, dan kernel murni tanpa HTTP bisa diuji unit terlebih dahulu. 6b menyatukan controller, route, dan dua endpoint "data sendiri" paling sederhana sekaligus meletakkan matriks otorisasi gate yang dipakai 6c–6d. 6c (manager, endpoint terberat) dikerjakan setelah kernel & otorisasi terbukti. 6d (admin) memperluas manager dengan counts sistem + aktivitas, lalu menutup fase dengan verifikasi performa dan sinkronisasi dokumen — termasuk tag `v0.6.0`.

---

## Onboarding Developer

Bagian ini disiapkan khusus untuk mempermudah developer manusia dalam memahami dan mengoperasikan lingkungan kerja Fase 6.

### 1. Menjalankan Lingkungan Lokal
```bash
# Menyalakan seluruh service (API, Scheduler, MySQL, Web)
make up

# Masuk ke shell container API
docker compose exec api bash
```

Jika menjalankan di host langsung (tanpa Docker):
```bash
cd apps/api
php artisan serve --port=8000
```

### 2. Perintah Testing & Diagnostik Cepat
```bash
cd apps/api

# Menjalankan seluruh test suite Pest
vendor/bin/pest

# Menjalankan satu file test spesifik
vendor/bin/pest tests/Feature/Dashboard/EmployeeDashboardTest.php
vendor/bin/pest tests/Feature/Dashboard/TechnicianDashboardTest.php
vendor/bin/pest tests/Feature/Dashboard/ManagerDashboardTest.php
vendor/bin/pest tests/Feature/Dashboard/AdminDashboardTest.php

# Memeriksa daftar route yang baru terdaftar
php artisan route:list --path=api

# Migrasi terhadap MySQL dev
php artisan migrate:fresh --seed
php artisan migrate:rollback --step=1

# Linter / Code Formatter (wajib sebelum commit)
vendor/bin/pint --dirty --format agent
```

### 3. Alur Uji Manual Cepat (tanpa menunggu frontend)
Autentikasi lalu eksekusi per-role:

```bash
# 1. Login sebagai Employee
TOKEN=$(curl -s -X POST http://localhost:8000/api/login \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"email":"employee@jarvisops.test","password":"Password123!"}' \
  | jq -r .data.token)

# 2. Dashboard Employee
curl -s http://localhost:8000/api/dashboard/employee \
  -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' | jq .data

# 3. Login sebagai Technician
TTOKEN=$(curl -s -X POST http://localhost:8000/api/login \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"email":"technician@jarvisops.test","password":"Password123!"}' \
  | jq -r .data.token)

# Dashboard Technician (coba juga dengan ?technician_id=999 → hasil SAMA)
curl -s "http://localhost:8000/api/dashboard/technician?technician_id=999" \
  -H "Authorization: Bearer $TTOKEN" -H 'Accept: application/json' | jq .data

# 4. Login sebagai Manager → dashboard manager + admin
MTOKEN=$(curl -s -X POST http://localhost:8000/api/login \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  -d '{"email":"manager@jarvisops.test","password":"Password123!"}' \
  | jq -r .data.token)

curl -s "http://localhost:8000/api/dashboard/manager?date_from=2026-08-01&date_to=2026-08-31" \
  -H "Authorization: Bearer $MTOKEN" -H 'Accept: application/json' | jq .data
```

### 4. Periksa Otorisasi Lintas Role
```bash
# Manager mencoba dashboard admin → 403
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/dashboard/admin \
  -H "Authorization: Bearer $MTOKEN" -H 'Accept: application/json'
# → 403

# Employee mencoba dashboard manager → 403
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/dashboard/manager \
  -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json'
# → 403
```

### 5. Glosarium Konsep Kunci
1. **D-03 SLA compliance:** `resolved within SLA / total resolved × 100`; ticket cancel dikeluarkan; penyebut nol → `null`.
2. **`is_closed` vs `is_final`:** `is_closed = true` pada RESOLVED & CLOSED (jam SLA berhenti, D-28); `is_final = true` hanya CLOSED. Dashboard "open" memakai `is_closed = false`.
3. **Snapshot SLA (D-01, Fase 3):** `sla_duration_minutes`/`sla_deadline` disalin ke tiap ticket saat create; dashboard menghitung dari snapshot ini, **bukan** join live ke `ticket_priorities`.
4. **SLA defensif (D-28, Fase 4):** `SlaService::scopeBreached` menghitung ulang kondisi breach saat query — dipakai filter `sla_breached` teknisi, bukan sekadar kolom `sla_breached`.
5. **Date range WIB → UTC (D-23):** `date_from`/`date_to` adalah tanggal WIB; dikonversi ke UTC (`-7 jam`) sebelum query. Bucket trend dikelompokkan ulang ke WIB.
6. **Gate vs Policy:** dashboard dijaga gate (`dashboard.*`), bukan Policy — tidak ada resource instance untuk di-authorize.
7. **Tanpa DTO & tanpa pagination:** endpoint baca tidak memakai DTO (BACKEND-ARCHITECTURE §4.2); payload agregat tanpa `meta`.

---

## Alur Kerja Per Task

Setiap task di sub-berkas 6a–6d dirancang untuk dieksekusi dengan disiplin **Test-Driven Development (TDD)**:

```
┌────────────────────────────────────────────────────────┐
│ 1. Tulis Test Negatif & Positif Terlebih Dahulu (RED)  │
│    - Tulis feature / unit test di tests/Feature atau   │
│      tests/Unit sesuai instruksi Step 1.               │
│    - Jalankan pest --filter=NamaTest -> Pastikan GAGAL │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Tulis Kode Implementasi Minimum (GREEN)             │
│    - Buat/modifikasi Service, Calculator, Controller,  │
│      Request, atau Route.                              │
│    - Jalankan pest --filter=NamaTest -> Pastikan LULUS │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Refactor & Formatting (REFACTOR)                    │
│    - Jalankan vendor/bin/pint --dirty --format agent   │
│    - Pastikan seluruh test suite tetap hijau           │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. Git Commit                                          │
│    - Atomic commit sesuai konvensi Conventional        │
│      Commits (feat:, fix:, test:, chore:, docs:).      │
└────────────────────────────────────────────────────────┘
```

### Checklist Sebelum Membuka Pull Request (PR)
- [ ] Seluruh test unit & feature sub-tahap lulus (`vendor/bin/pest`).
- [ ] Tidak ada pelanggaran formatting (`vendor/bin/pint --test`).
- [ ] `php artisan migrate:fresh --seed` berhasil dijalankan pada database MySQL.
- [ ] Endpoint yang baru dibuat terdaftar di `docs/product/PERMISSION-MATRIX.md §4` (baris 286–289 — verifikasi sudah ada; tambah jika belum).
- [ ] Setiap route baru punya test tanpa token → 401.
- [ ] Checkbox task terkait di sub-berkas telah dicentang.
- [ ] Payload persis mengikuti `API-CONTRACT.md §10` (field name, tipe, nesting `sla.{}`, `technician_performance[]`).
- [ ] Tidak ada metrik yang dihitung di PHP dari `->get()` seluruh baris — verifikasi dengan `DB::enableQueryLog()` di 6d.

---

## Exit Criteria Fase 6 (Gabungan)

Fase 6 dinyatakan selesai jika seluruh kondisi berikut terpenuhi:

- [ ] **Empat endpoint** terdaftar & dijaga gate: `GET /api/dashboard/employee|technician|manager|admin` — tanpa token → 401; role salah → 403 (matriks PERMISSION §3.7).
- [ ] **Employee:** `my_open_tickets`, `my_in_progress_tickets`, `my_resolved_tickets`, `recent_tickets[]` (≤5), `my_assets[]` (≤5, assignment aktif), `recent_articles[]` (≤5, published). Hanya data milik pemanggil.
- [ ] **Technician:** `assigned_tickets`, `open_tickets`, `in_progress_tickets`, `sla_breached` (defensif), `avg_resolution_minutes`, `recent_activity[]` (≤5). `?technician_id=X` diabaikan.
- [ ] **Manager:** `total_tickets`, `open_tickets`, `resolved_tickets`, `closed_tickets`, `sla{}` (within_sla, breached, compliance, avg), `ticket_trend[]`, `by_priority[]`, `by_category[]`, `technician_performance[]`.
- [ ] **Admin:** seluruh isi manager + `total_users`, `total_technicians`, `total_departments`, `total_assets`, `assets_by_status[]`, `recent_system_activity[]` (≤8).
- [ ] **SLA metrics §14:** `within_sla + breached = total resolved` (untuk set resolved); compliance `null` bila total resolved 0; `avg_resolution_minutes` dari `created_at`→`resolved_at`.
- [ ] **Formula compliance persis §14 / D-03:** ticket cancel (`resolved_at NULL`) tidak masuk pembilang & penyebut.
- [ ] **Tren harian:** bucket WIB, semua hari terisi (termasuk nol), untuk rentang yang bisa dipilih (`date_from`/`date_to`).
- [ ] **Technician performance §21:** `handled`, `resolved`, `open`, `breached`, `avg_resolution_minutes`, `sla_compliance_percentage` per teknisi, urut `resolved DESC`.
- [ ] **Semua agregasi di SQL** (`selectRaw`/`groupBy`); tidak ada N+1 — jumlah query konstan saat volume data naik.
- [ ] **Setiap endpoint < 500 ms** dengan data seed (diukur di 6d).
- [ ] **Tanpa cache** — ditambah hanya jika pengukuran melanggar 500 ms (keputusan #11).
- [ ] `php artisan test` seluruhnya hijau (suite gabungan Fase 1–6).
- [ ] `vendor/bin/pint --test` bersih.
- [ ] Checkbox Fase 6 di `docs/product/ROADMAP.md` (baris 609–645) tersinkronisasi.
- [ ] `docs/api/API-CONTRACT.md §10` diverifikasi tidak berubah (payload final); jika ada penyimpangan, dokumentasikan.
- [ ] Git tag `v0.6.0` (Semantic Versioning, D-30) ditambahkan dan didorong saat fase selesai.

---

## Di Luar Cakupan Fase 6

Untuk menjaga fokus dan mencegah *scope creep*, item berikut **secara sadar tidak dikerjakan di Fase 6**:

- **Apa pun di `apps/web`** (halaman dashboard, chart Recharts, pemilih rentang tanggal) → **Fase 9**. Verifikasi Fase 6 lewat Pest dan HTTP client.
- **Export report CSV/PDF, advanced filtering, saved filters** → buffer Minggu 8 / Fase 10.
- **Octane worker mode, cache persistent, dashboard real-time** → Fase 10 (opsional).
- **Endpoint dashboard tambahan** (mis. per-department, export, drill-down) — tidak diminta PRD §20; hub API sudah final di API-CONTRACT §10.
- **Sinkronisasi `docs/schema.sql`** dengan migration → Fase 10.
- **Penambahan kolom/tabel** — Fase 6 murni query; skema sudah lengkap sejak Fase 2/4.
