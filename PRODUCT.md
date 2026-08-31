# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Empat role pengguna internal perusahaan. Tidak ada registrasi publik — akun hanya dibuat Administrator atau seeder (BR-016, BR-017, PRD Addendum §2.1).

**Employee** — karyawan non-IT yang perangkat atau akses kerjanya sedang bermasalah. Sebelumnya melaporkan lewat WhatsApp, email, atau menghampiri tim IT langsung (PRD §1.1, §2). Job: melaporkan masalah dan tahu kapan akan selesai tanpa harus menagih. Pemakaian episodik — hanya saat ada masalah. Yang paling dibutuhkan: nomor ticket, status, SLA deadline, daftar ticket sendiri, aset yang dipegang, artikel published.

**Technician** — anggota tim IT, pengguna paling intensif. Job: menerima, menangani, mendokumentasikan, dan menyelesaikan ticket. Satu-satunya role yang boleh self-assign dari `OPEN`, karena tanpa itu seluruh ticket macet menunggu Manager (ROADMAP Fase 1). Juga mengelola aset dan menulis artikel KB tanpa review. Hanya melihat metrik dirinya sendiri, tanpa perbandingan antar-technician — pembatasan ini disengaja agar tidak berubah jadi papan peringkat (PERMISSION §2.3).

**Manager** — memantau performa tim IT dan melakukan assignment. Melihat seluruh ticket, metrik SLA, tren, dan performa technician. Audit log yang bisa dilihat dibatasi ke modul `ticket`, `asset`, `article` saja (PERMISSION §2.2). Tidak mewarisi kepemilikan ticket dan tidak lolos `Gate::before`.

**Administrator** — konfigurasi sistem: user, department, kategori, priority/SLA, audit log penuh. Lolos semua ability lewat `Gate::before`, dengan dua pengecualian keras: tidak boleh membaca notifikasi user lain, dan tidak boleh mengubah role atau menonaktifkan akunnya sendiri (PERMISSION §3.6, §3.8).

**Adegan pemakaian:** seluruh role bekerja di depan komputer kantor. Mobile dipakai sesekali untuk cek status, bukan alur utama. Desain desktop-first; mobile tetap harus layak pakai di 375px (ROADMAP Fase 7).

**Audiens sekunder:** reviewer capstone. Harus bisa memahami masalah yang diselesaikan, cara sistem bekerja, alasan arsitektur dipilih, desain database, penerapan security, dan cara business logic bekerja (PRD §33).

## Product Purpose

Platform ITSM terpusat untuk mengelola permintaan dan permasalahan IT, aset perusahaan, knowledge base, serta monitoring performa layanan IT. Menggantikan pelaporan lewat chat, email, dan komunikasi informal.

Visi yang dikunci (PRD §40): *satu platform untuk membantu perusahaan mengelola layanan IT, aset, incident, request, dan performa IT secara terstruktur, terukur, dan terdokumentasi.* Dokumen menegaskan ini bukan aplikasi CRUD untuk membuat ticket.

Keberhasilan diukur dari kemandirian tiap role, bukan jumlah fitur (PRD §33):

- Employee membuat ticket tanpa bantuan administrator
- Technician menyelesaikan ticket dari awal hingga selesai
- Manager memonitor ticket dan SLA
- Administrator mengelola konfigurasi dasar

Checklist teknis operasional ada di PRD Addendum §12 (11 poin) dan Definition of Done per fitur di PRD §37 (10 poin).

## Positioning

Yang digantikan adalah WhatsApp, email, dan penyampaian langsung — bukan produk ITSM lain. Dokumen tidak pernah menyebut kompetitor.

Klaim yang tidak bisa ditiru jujur oleh ticket tracker generik: **angka SLA compliance historis tidak berubah ketika konfigurasi SLA diubah.** Ditopang tiga keputusan terpisah:

- SLA di-snapshot ke ticket saat pembuatan (`sla_duration_minutes`, `sla_deadline`), bukan di-join live ke tabel priority
- Reopen tidak mereset SLA — kalau direset, breach bisa dihindari selamanya lewat siklus resolve-reopen
- Ubah priority menghitung deadline dari `created_at`, bukan dari waktu perubahan — menghitung dari waktu perubahan membuat eskalasi justru memberi waktu tambahan

Mekanisme pembeda lainnya:

- **Breach dideteksi dua lapis.** Scheduler mengurus persistensi dan notifikasi; API tetap menghitung kondisi SLA saat request. Dashboard tetap melaporkan breach yang benar meski scheduler dimatikan (Addendum §3.5, ROADMAP Fase 4)
- **Attachment tidak punya URL publik sama sekali.** Tidak ada signed URL berumur panjang; setiap unduhan melewati Policy ticket induknya (PERMISSION §3.3)
- **Token Sanctum tidak pernah tersentuh JavaScript browser.** httpOnly cookie, Next.js sebagai BFF
- **Aturan 403 vs 404 berbasis kebocoran informasi.** Kalau keberadaan resource itu sendiri rahasia → 404. Manager memfilter audit log ke modul di luar cakupannya → 200 dengan hasil kosong, karena 403 mengonfirmasi modul itu ada (PERMISSION §5)
- **Data performa technician bukan alat penilaian karyawan**, melainkan operational analytics (PRD §21)
- **Compliance bernilai `null`** saat belum ada ticket resolved — `0` atau `100` akan salah dibaca sebagai fakta

## Operating Context

### Golden path (PRD §38 — ritual pusat produk, juga skenario demo)

Employee login → buat ticket → Manager assign → Technician proses → tambah troubleshooting note → RESOLVED → Employee konfirmasi → CLOSED → Manager lihat analytics. Berjalan paralel: scheduler memeriksa tiap ticket aktif setiap 5 menit, menandai yang melewati deadline sebagai breached, lalu menotifikasi technician pemegang dan Manager.

### Alur lain

- **Buat ticket:** pilih category → priority → *(opsional)* pilih aset yang dipegang → submit → `OPEN`
- **Buat user:** Admin → Users → isi informasi → pilih role → pilih department → create
- **Tulis KB:** Technician → create article → `draft` → publish → `published`. Manager/Admin tetap bisa edit dan unpublish
- **Reopen:** Employee menyatakan masalah belum selesai setelah `RESOLVED` → kembali ke `IN_PROGRESS`
- **Riwayat kepemilikan aset:** rantai pemegang harus bisa ditampilkan, mis. Andi (2025) → Budi (2026) → pemegang saat ini Citra (PRD §17)

### Halaman aplikasi (ROADMAP Fase 7–9)

| Route | Audiens |
| --- | --- |
| `/login` | semua |
| `/` — dashboard yang bercabang per role | semua |
| `/tickets`, `/tickets/new`, `/tickets/[id]` | semua; Employee ter-scope ke miliknya |
| `/my-assets` | semua role, aset yang dipegang sendiri |
| `/assets`, `/assets/new`, `/assets/[id]`, `/assets/[id]/edit` | Technician, Manager, Admin |
| `/knowledge`, `/knowledge/[slug]` | semua; Employee hanya `published` |
| `/knowledge/new`, `/knowledge/[id]/edit` | Technician, Manager, Admin |
| `/admin/users`, `/admin/departments`, `/admin/categories`, `/admin/knowledge-categories`, `/admin/priorities` | Admin |
| `/admin/audit-logs` | Admin penuh; Manager ter-scope ke 3 modul |
| `/profile`, `/notifications` | semua |
| Halaman 403 dan 404 | semua |

Route group `(auth)` untuk login, `(app)` untuk halaman terproteksi. Elemen persisten di app shell: bell notifikasi dengan badge unread. Navigasi difilter berdasarkan role dari `/me`, tetapi itu kenyamanan pengguna — penjaga sebenarnya tetap Policy di Laravel.

### Isi dashboard per role (PRD §20)

- **Employee:** ticket open sendiri, in-progress sendiri, yang baru resolved, aset yang dipegang, artikel KB terbaru
- **Technician:** ticket assigned, open, in-progress, SLA breached, rata-rata waktu penyelesaian, aktivitas terbaru
- **Manager:** total ticket, open, resolved, SLA compliance, tren ticket, distribusi per priority, distribusi per category, performa technician
- **Administrator:** seluruh metrik Manager plus total user, aset, technician, department, dan aktivitas sistem

Metrik SLA yang ditampilkan (PRD §14): total ticket, within SLA, breached, persentase compliance, rata-rata waktu penyelesaian. Metrik performa technician (PRD §21): jumlah ticket ditangani, resolved, rata-rata waktu penyelesaian, compliance, ticket open, ticket breached — tabelnya bisa diurutkan. Seluruh agregasi dilakukan di SQL, bukan menarik semua baris lalu menghitung di PHP.

### Runtime

Monorepo. `api` :8000 (Laravel 13.17 + Sanctum 4, FrankenPHP classic mode), `web` :3000 (Next.js 16.3 + React 19), MySQL 8, dan container `scheduler` terpisah yang wajib ada — FrankenPHP hanya melayani HTTP, tanpa container itu SLA check tiap 5 menit tidak akan pernah jalan.

### Dokumen yang jadi bagian sistem kerja

`docs/product/PRD.md`, `docs/product/ROADMAP.md` (10 fase; §2 keputusan teknis terkunci), `docs/product/STATUS-TRANSITION.md`, `docs/product/PERMISSION-MATRIX.md`, `docs/api/API-CONTRACT.md`, `docs/architecture/{ERD,DFD,CONTEXT-DIAGRAM}.md`. Migration Laravel adalah satu-satunya sumber kebenaran skema; `docs/schema.sql` dokumen lampiran yang disinkronkan di Fase 10. Artefak internal per-ticket: ticket history, audit log, asset history.

## Capabilities and Constraints

### Modul (PRD §6)

Authentication & Authorization · Ticket Management · Asset Management · Knowledge Base · Dashboard & Analytics · Notification · Audit Log.

### Terminologi domain

**Ticket status (5):** `OPEN` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`. Aturan yang dikunci: Technician boleh self-assign dari `OPEN`; `OPEN → RESOLVED` ilegal karena melompati `IN_PROGRESS` merusak makna rata-rata waktu penyelesaian; Technician tidak boleh menutup ticket-nya sendiri — tahap konfirmasi adalah alasan `RESOLVED` dan `CLOSED` dipisah; `CLOSED` final untuk semua role. Employee pada `changeStatus` hanya boleh `RESOLVED → CLOSED` dan `RESOLVED → IN_PROGRESS` pada ticket miliknya. Transisi ilegal → 422. API mengembalikan `available_actions`.

**Ticket priority (4) dan SLA awal:** Critical 120 menit · High 240 · Medium 480 · Low 1440. Dapat diubah Administrator.

**Kategori ticket (5 grup):** Hardware · Software · Network · Account · Other.

**Asset status (5):** `AVAILABLE`, `ASSIGNED`, `MAINTENANCE`, `RETIRED`, `LOST`. Aset `MAINTENANCE` tidak dapat diberikan ke employee baru. Satu aset hanya boleh punya satu assignment aktif.

**KB status (2):** `draft`, `published`. Employee membuka draft → 404.

**Tipe notifikasi (5):** `TICKET_ASSIGNED`, `TICKET_STATUS_CHANGED`, `TICKET_COMMENTED`, `TICKET_RESOLVED`, `SLA_BREACHED`. Breach menotifikasi technician pemegang dan Manager. Aktor tidak menerima notifikasi atas aksinya sendiri.

**Partisipan ticket:** reporter, technician yang di-assign, Manager mana pun, Admin mana pun.

Format: nomor ticket `TCK-0001`, kode aset `AST-LTP-001`.

### Batasan teknis yang mengikat

- **Frontend bukan sumber kebenaran** untuk permission, SLA, kepemilikan aset, kepemilikan ticket, dan business rule. Menyembunyikan menu atau tombol adalah kenyamanan, bukan keamanan
- **Otorisasi Gate/Policy bawaan Laravel**, tanpa paket eksternal. Satu role per user via `users.role_id`. Enum `RoleName` satu-satunya sumber nama role
- **Frontend tidak pernah memanggil Laravel langsung.** Route Handler Next.js sebagai BFF; token di httpOnly cookie, dilampirkan server-side
- **Envelope respons tunggal:** `{ success, message, data, meta? }` / `{ success, message, errors }`. Tanpa `links` di `meta`
- Seluruh durasi integer menit; timestamp ISO 8601 UTC; field `snake_case`; route `kebab-case` plural
- **Attachment:** disk private, nama file di-generate, maksimum 5 MB, hanya JPG/JPEG/PNG/PDF, validasi MIME sekaligus ekstensi dan keduanya harus cocok. Maksimum satu aset per ticket, nullable
- **Notifikasi:** baris database + polling frontend 30 detik. Tanpa WebSocket, tanpa broadcasting, tanpa SMTP. Tabel `notifications` kustom, bukan `Notifiable`
- **Scheduler** tiap 5 menit, `withoutOverlapping()`, per-chunk, idempoten
- **Nomor ticket** di-generate dengan `lockForUpdate()` atau tabel counter, bukan `max(id)+1`
- **Audit log** dipanggil eksplisit dari service layer, bukan model observer — lebih mudah ditest dan tidak ikut tercatat saat seeding
- **Deaktivasi user harus mencabut token** secara eksplisit
- **Stack frontend terkunci** (ROADMAP §2): shadcn/ui, TanStack Query, Recharts, react-hook-form, zod. Jangan perkenalkan alternatif
- Target respons dashboard < 500 ms dengan data seed; endpoint list `per_page` default 10, maksimum 100

### Search dan filter (PRD §24)

Ticket: cari per nomor dan judul; filter status, priority, category, technician, tanggal; urut `created_at`, `sla_deadline`, priority. Aset: cari per kode dan serial number; filter status, category, employee pemegang. KB: cari artikel, filter kategori.

### Tidak dikerjakan

Won't-have MVP (PRD §32): real-time chat, aplikasi mobile native, chatbot AI, payroll, manajemen keuangan, akuntansi inventaris kompleks, multi-tenant. Out of scope (PRD §34) menambahkan procurement, HRIS penuh, customer support eksternal, AI/ML lanjutan.

Dibatalkan oleh ROADMAP §2 meski PRD §32 mencantumkannya sebagai Should Have: **email notification** — butuh SMTP dan queue worker, biaya infra tidak sepadan karena in-app notification sudah ada. ROADMAP lebih baru dan berstatus Approved.

Ditunda ke Fase 10 sebagai opsional: export report, advanced filtering, dark mode, saved filters. Naik ke MVP dari Should Have: attachment dan technician performance analytics.

Bukan bagian MVP: moderation workflow KB (draft → pending review → approved), object storage S3/R2/MinIO, WYSIWYG editor (textarea markdown cukup), integrasi eksternal apa pun.

### Belum diputuskan

- **CRUD role.** PRD §4.4 menyebut "mengelola role" sebagai aktivitas Admin, tetapi PERMISSION §3.8 tidak punya baris `role.manage` dan tidak ada endpoint `/api/roles`. Enum `RoleName` disebut sebagai sumber tunggal nama role. Perlu diputuskan apakah role adalah master data statis dari seeder atau CRUD yang dikelola Admin
- SLA per priority, interval scheduler, dan interval polling semuanya ditandai "nilai awal, dapat dikonfigurasi"
- Octane worker mode: opsional Fase 10, hanya jika test suite lengkap dan waktu tersisa

## Brand Commitments

Nama produk: **JARVIS OPS**. Deskriptor: IT Service Management System. Database `jarvisops`, domain email demo `@jarvisops.test`.

Selain nama, tidak ada aset atau ketentuan identitas — dikonfirmasi pengguna. Tidak ada logo, ikon, tagline, ketentuan warna, tipografi, atau aturan tone. Apa pun yang dibutuhkan nanti dibuat dari nol.

**Bahasa antarmuka: Indonesia penuh** — dikonfirmasi pengguna, karena dokumen tidak pernah memutuskan ini dan contohnya saling bertentangan. Seluruh label, navigasi, tombol, pesan error, dan teks bantuan berbahasa Indonesia. Nilai enum di database dan API tetap Inggris (`OPEN`, `IN_PROGRESS`, `AVAILABLE`, dst.) dan ditampilkan sebagai teks Indonesia di UI. Contoh label Inggris di PRD §20 ("My Open Tickets", "SLA Compliance") adalah penamaan metrik dalam dokumen, bukan copy UI yang mengikat.

Pola voice yang sudah ditetapkan dan bersifat fungsional, bukan brand:

- Notifikasi berpola konsisten menyebut nomor ticket: *"Ticket #TCK-0001 telah ditugaskan kepada Anda."*
- Timeline riwayat harus terbaca manusia (`ASSIGNED → IN_PROGRESS`), bukan dump ID
- `description` audit log berisi kalimat siap baca, mis. *"Budi mengubah status: ASSIGNED → IN_PROGRESS"*

## Evidence on Hand

Konteks organisasi **fiktif** — capstone murni, dikonfirmasi pengguna. Tidak ada klien, perusahaan, atau instansi nyata. Nama, departemen, dan data seluruhnya fiktif dan harus konsisten dengan contoh di dokumen.

### Yang ada

- **Empat akun demo** (Addendum §2.3): `admin@`, `manager@`, `technician@`, `employee@jarvisops.test`. Password tidak dinyatakan di dokumen mana pun
- **Nama orang yang dipakai konsisten:** Andi (employee/reporter), Budi (technician), Citra (technician / pemegang aset saat ini)
- **Satu artikel KB lengkap:** *"Wi-Fi Tidak Terhubung"*, kategori Network, 5 langkah troubleshooting (PRD §18)
- **Contoh aset:** `AST-LTP-001` Lenovo ThinkPad T14, dipegang Andi sejak 10 Agustus 2026
- **Angka target demo:** SLA compliance 87% (87 within / 13 breached), 124 ticket, Budi 42 resolved / 93% / rata-rata 3j15m, Citra 37 resolved / 89% / 4j02m. Ini semua ditandai "Contoh" — angka ini menentukan data seed, bukan hasil pengukuran
- **Daftar kategori siap seed:** 5 grup kategori ticket dengan turunannya (PRD §8), 7 jenis aset (PRD §15)
- **Rencana 8 seeder** termasuk `DemoDataSeeder` terpisah yang tidak jalan saat test

### Yang TIDAK ada — jangan difabrikasi

- **Tidak ada wireframe, mockup, atau screenshot apa pun.** PRD §36 mencantumkan wireframe sebagai task, tetapi ROADMAP Fase 1 yang berstatus SELESAI hanya menghasilkan tiga dokumen teks dan wireframe tidak masuk deliverable-nya. Tidak ada referensi layout yang disetujui — seluruh desain layar dimulai dari nol
- Tidak ada logo, ikon, atau aset visual
- Tidak ada testimonial, case study, pelanggan, atau data pemakaian nyata
- Tidak ada nama perusahaan pengguna — dokumen selalu menulis "perusahaan" secara generik
- Tidak ada password demo, data produksi, atau volume nyata
- Tidak ada rekaman atau screenshot demo cadangan
- Belum ada `docs/ops/DEPLOYMENT.md`, `docs/ops/TESTING.md`, `.env.production.example`

## Product Principles

1. **Backend adalah satu-satunya sumber kebenaran.** Setiap aturan permission, SLA, kepemilikan, dan business rule divalidasi di Laravel. UI yang menyembunyikan sesuatu memberi kenyamanan, bukan jaminan.
2. **Angka historis tidak boleh berubah sendiri.** Snapshot mengalahkan join live; laporan yang sudah keluar tidak boleh bergeser karena konfigurasi berubah kemudian.
3. **Jangan biarkan sistem macet menunggu manusia.** Self-assign, perhitungan SLA defensif, dan deteksi breach dua lapis semuanya ada karena satu pihak yang lambat tidak boleh menghentikan alur atau memalsukan angka.
4. **Ukur untuk operasi, bukan untuk menilai orang.** Metrik technician adalah alat kerja; papan peringkat antar-rekan sengaja tidak dibuat.
5. **Kegagalan tidak boleh membocorkan apa pun.** Pilihan antara 403, 404, dan hasil kosong ditentukan oleh apa yang boleh diketahui pemintanya, bukan oleh kenyamanan implementasi.

## Accessibility & Inclusion

**WCAG 2.2 AA sebagai target kerja** — dikonfirmasi pengguna, menggantikan rencana ROADMAP Fase 10 yang menaruh aksesibilitas di buffer minggu 8 sebagai prioritas terakhir. Alasannya bukan kewajiban institusi: memperbaiki kontras, fokus keyboard, dan label semantik di akhir jauh lebih mahal daripada membangunnya benar sejak awal.

Konsekuensi yang mengikat: kontras, urutan fokus keyboard, label form, dan semantik yang benar masuk Definition of Done tiap layar — bukan pekerjaan pembersihan di akhir.

Requirement responsif yang sudah ada tetap berlaku (PRD NFR-003): layout harus enak dipakai di 375px, 768px, dan 1440px, dan chart harus terbaca di layar mobile. Prioritasnya desktop-first sesuai adegan pemakaian nyata.
