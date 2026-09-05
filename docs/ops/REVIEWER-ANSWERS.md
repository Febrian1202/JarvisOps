# Jawaban Reviewer — 6 Pertanyaan Presentasi Capstone (PRD §33)

Dokumen ini berisi jawaban siap-ucap untuk enam pertanyaan yang akan diajukan reviewer pada sesi presentasi JARVIS OPS (PRD §33 — Presentation). Setiap jawaban disusun dengan struktur: **ringkasan inti**, **poin teknis kunci**, **bukti konkret (kode/test)**, dan **saran pembuktian langsung** saat demo live.

> Prinsip: tidak ada jargon kosong. Setiap klaim harus bisa ditunjuk ke file kode atau test nyata.

---

## Q1 — Masalah apa yang diselesaikan sistem ini?

### Ringkasan Inti
JARVIS OPS menyelesaikan masalah pengelolaan layanan IT internal perusahaan yang selama ini berjalan manual melalui chat, telepon, dan spreadsheet: tiket tersebar di banyak kanal tanpa jejak, tidak ada pengukuran waktu penyelesaian (SLA), status peminjaman aset tidak tercatat, dan solusi yang pernah berhasil tidak terdokumentasi untuk dipakai ulang. Sistem ini memusatkan seluruh siklus layanan — dari pembuatan tiket, penugasan, penyelesaian, hingga konfirmasi pelapor — dalam satu platform yang terukur dan teraudit.

### Poin Teknis Kunci
1. **Tiket terpusat & berstatus jelas** — lima status eksplisit (OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED) mencegah tiket "hilang" di chat.
2. **SLA terukur per tiket** — setiap tiket membekukan target SLA saat dibuat, sehingga kepatuhan dapat dihitung otomatis (dashboard manager menampilkan compliance ±87% pada data demo).
3. **Aset IT terlacak** — status aset (available/assigned/maintenance/retired/lost) dan riwayat kepemilikan multi-pemegang tercatat lengkap.
4. **Knowledge base organisasi** — solusi yang sudah ditemukan teknisi terdokumentasi dan dapat dicari karyawan lain.
5. **Akuntabilitas penuh** — setiap perubahan tercatat di timeline tiket dan audit log kepatuhan.

### Bukti Konkret
- Distribusi status & compliance demo: `apps/api/database/seeders/DemoDataSeeder.php` (distribusi 43 tiket, 87,5% compliance) — diverifikasi test `apps/api/tests/Feature/Schema/DemoDataSeederTest.php`.
- Dashboard manager menampilkan compliance & performa teknisi: `apps/api/app/Services/Dashboard/ManagerDashboardService.php`.
- Riwayat aset multi-pemegang: `apps/api/app/Models/Asset.php:78-84` (`histories()`, `assignments()`).

### Pembuktian Langsung
Buka **Dashboard Manager** → tunjukkan kartu SLA Compliance (±87%), tabel **Performa Technician** (3 teknisi dengan angka berbeda), lalu **Asset Management** → detail `AST-00002` → timeline riwayat kepemilikan (Budi → gudang → maintenance → Employee).

---

## Q2 — Bagaimana sistem bekerja (end-to-end)?

### Ringkasan Inti
Alur kerja intinya: Employee membuat tiket → sistem membekukan target SLA ke tiket → Manager menugaskan ke Technician → Technician memproses, berkomentar, dan menyelesaikan → Employee mengonfirmasi dan menutup tiket → Manager melihat dampaknya di dashboard analytics. Seluruh proses memicu tiga mekanisme pencatatan paralel: timeline operasional (`ticket_histories`), audit kepatuhan (`audit_logs`), dan notifikasi in-app.

### Poin Teknis Kunci
1. **Snapshot SLA saat pembuatan** — `tickets.sla_duration_minutes` dan `tickets.sla_deadline` dibekukan dari `ticket_priorities.sla_minutes` saat tiket dibuat; perubahan konfigurasi priority di masa depan tidak merusak metrik historis.
2. **Transisi status dikontrol matriks** — perubahan status tervalidasi terhadap `TicketTransitionMatrix` per role; percobaan transisi ilegal ditolak.
3. **Scheduler SLA latar belakang** — command `tickets:check-sla` berjalan tiap 5 menit, menandai tiket aktif yang lewat deadline (`sla_breached=true`) dan mengirim notifikasi `TICKET_SLA_BREACHED`.
4. **Notifikasi in-app polling 30 detik** — tanpa WebSocket/email; klien mem-poll endpoint notifikasi setiap 30 detik.
5. **Audit trail otomatis** — setiap aksi penting menulis `audit_logs` (aktor, aksi, data lama/baru, IP) dalam transaksi yang sama dengan perubahan bisnis.

### Bukti Konkret
- Snapshot SLA: `apps/api/app/Services/Ticket/TicketService.php:119` (`'sla_duration_minutes' => (int) $priority->sla_minutes`).
- Matriks transisi: `apps/api/app/Services/Ticket/TicketStatusService.php:61` (`TicketTransitionMatrix::allows($from, $to, $role)`).
- Scheduler 5 menit: `apps/api/routes/console.php:6` (`Schedule::command('tickets:check-sla')->everyFiveMinutes()`).
- Polling 30 detik: `apps/web/src/hooks/use-notifications-poll.ts:15` (`refetchInterval: 30 * 1000`).
- Audit dalam service: `apps/api/app/Services/Ticket/TicketStatusService.php:118,136` (`$this->auditLogger->log(...)`).
- Golden path 13 langkah terotomasi: `apps/web/e2e/golden-path.spec.ts` (5 langkah E2E mencakup seluruh §38, hijau 21 test total).

### Pembuktian Langsung
Jalankan **DEMO-RUNBOOK.md** bagian golden path — 13 langkah PRD §38 terbukti end-to-end dalam < 3 menit (terukur: 11 detik otomasi), dan tunjukkan timeline tiket + audit log setelahnya.

---

## Q3 — Mengapa arsitektur ini dipilih?

### Ringkasan Inti
Arsitektur dipilih berdasarkan tiga prinsip: **keamanan token secara default** (BFF + httpOnly cookie), **pemisahan tanggung jawab yang ketat** (API murni JSON, UI murni render), dan **kesederhanaan operasional** (satu monorepo, satu Docker Compose, tanpa layanan eksternal seperti WebSocket atau SMTP). Next.js menangani tampilan, Laravel menangani seluruh aturan bisnis, dan keduanya berkomunikasi melalui proxy internal — bukan langsung dari browser.

### Poin Teknis Kunci
1. **BFF proxy + httpOnly cookie** — token Sanctum tidak pernah bisa dibaca JavaScript browser (kebal XSS); Next.js Route Handler menyuntikkan header `Authorization` dari sisi server.
2. **Frontend tidak pernah memanggil Laravel langsung** — semua request browser menuju `/api/proxy/*` internal; CORS nyaris tidak diekspos.
3. **Gate/Policy inti Laravel, bukan library pihak ketiga** — 66 ability per role terdaftar dari `AbilityMatrix`, admin bypass via `Gate::before` dengan dua pengecualian tegas (D-16).
4. **Monorepo dengan kontrak API eksplisit** — `docs/api/API-CONTRACT.md` + envelope respons tunggal `{success, message, data, meta?}` menjaga konsistensi lintas tim.
5. **FrankenPHP + opsi Octane worker mode** — runtime produksi ramping; Octane worker terverifikasi bebas kebocoran state namun classic mode tetap default aman.

### Bukti Konkret
- httpOnly cookie: `apps/web/src/lib/server/session.ts:6-8` (`httpOnly: true, secure: prod, sameSite: 'lax'`).
- Pencetakan token dari BFF: `apps/web/src/app/api/auth/login/route.ts:39` (`await setToken(payload.data.token)`).
- Admin bypass + pengecualian: `apps/api/app/Providers/AppServiceProvider.php:56` (`Gate::before(...)`), matriks ability: `apps/api/app/Authorization/AbilityMatrix.php:23-25`.
- Keputusan Octane: `docs/ops/DEPLOYMENT.md` + audit `docs/ops/OCTANE-AUDIT.md` (classic mode = default, worker mode = opsi teruji).
- Catatan arsitektur lengkap: `docs/ops/ARCHITECTURE-NOTES.md` (7 keputusan utama).

### Pembuktian Langsung
Buka DevTools → **Application → Cookies** → tunjukkan cookie `auth_token` ber-flag httpOnly (tidak bisa diakses `document.cookie`). Lalu tunjukkan `session.ts:6` sebagai sumbernya.

---

## Q4 — Bagaimana database didesain?

### Ringkasan Inti
Database terdiri dari 18 tabel relasional yang dinormalisasi (3NF) dengan integritas referensial penuh: master data (roles, departments, ticket priorities/statuses/categories), transaksi (tickets, comments, attachments, histories), dan pencatatan (audit_logs, asset_history, notifications). Keputusan desain paling penting adalah **snapshot SLA pada tabel tickets** — memutus ketergantungan metrik historis dari konfigurasi master yang bisa berubah.

### Poin Teknis Kunci
1. **18 tabel dengan relasi eksplisit** — skema final tercermin di `docs/schema.sql` (lampiran laporan) dan ERD; ID referensi dipatok deterministik (D-15) agar seeder/test stabil.
2. **Snapshot SLA pada tickets** — kolom `sla_duration_minutes` + `sla_deadline` dibekukan saat create; tabel `ticket_priorities` bebas diubah tanpa merusak histori.
3. **Pemisahan pencatatan operasional vs kepatuhan** — `ticket_histories` (kronologi kerja tiket, ramah pengguna) vs `audit_logs` (jejak lintas modul dengan snapshot JSON old/new).
4. **Riwayat kepemilikan aset sebagai tabel terpisah** — `asset_assignments` (siapa memegang, kapan) dan `asset_history` (kronologi aksi) mendukung timeline multi-pemegang.
5. **Index pada kolom filter/dashboard** — index komposit untuk query list tiket, audit log, dan agregasi dashboard (D-14).

### Bukti Konkret
- Skema lengkap: `docs/schema.sql` (tersinkron dengan 24 migration final pada Fase 10c).
- Kolom SLA snapshot: `apps/api/app/Models/Ticket.php:35-41` (`sla_duration_minutes`, `sla_deadline`, `sla_breached`, `sla_breached_at`).
- Pinned ID seeder: `apps/api/database/seeders/ReferenceDataSeeder.php:22-54` (roles, statuses, priorities dengan ID tetap).
- Aset: `apps/api/app/Models/Asset.php:54-84` (`activeAssignment`, `assignments`, `histories`).
- ERD: `docs/architecture/ERD.md`.

### Pembuktian Langsung
Buka `docs/schema.sql` → tunjukkan tabel `tickets` (kolom snapshot SLA) dan `audit_logs` (kolom `old_data`/`new_data` JSON), lalu detail aset `AST-00002` di browser untuk bukti timeline multi-pemegang.

---

## Q5 — Bagaimana security diterapkan?

### Ringkasan Inti
Security diterapkan berlapis: otorisasi berbasis ability per role di setiap endpoint (bukan sekadar menyembunyikan tombol), proteksi token dengan httpOnly cookie via BFF, penyimpanan file lampiran di disk privat yang hanya bisa diakses lewat controller ber-policy, rate limiting berjenjang, dan penanganan error terstandardisasi yang tidak membocorkan informasi internal. Semua titik temu diaudit baris-demi-baris terhadap PERMISSION-MATRIX (65 route rows) pada Fase 10a.

### Poin Teknis Kunci
1. **RBAC 66 ability + admin bypass terkontrol** — admin melewati semua gate kecuali dua pengecualian tegas (D-16); satu user satu role.
2. **404 vs 403 yang disengaja** — resource lintas-user yang tidak boleh diketahui keberadaannya dikembalikan sebagai 404 (anti-enumerasi), sesuai PERMISSION-MATRIX §1.
3. **Attachment di disk privat + policy** — file disimpan di `storage/app/private` (tanpa symlink publik); unduhan hanya via endpoint yang menjalankan policy tiket induk; validasi ukuran 5 MB, MIME + ekstensi (JPG/JPEG/PNG/PDF).
4. **Rate limiting berjenjang** — login 5/menit/IP, upload 20/menit/user, search 60/menit/user, API 120/menit/user.
5. **Error JSON terstandar tanpa stack trace** — 401/403/404/405/422/429/409/500 lewat satu handler; `APP_DEBUG=false` di produksi.
6. **Isolasi lintas-user teruji otomatis** — test khusus memastikan user A tidak bisa membaca/mengubah resource user B.

### Bukti Konkret
- Gate::before + exceptions: `apps/api/app/Providers/AppServiceProvider.php:56`; ability matrix: `apps/api/app/Authorization/AbilityMatrix.php`.
- Disk privat: `apps/api/config/filesystems.php:35-45` (`root => storage_path('app/private')`, `visibility => 'private'`).
- Download ber-policy: `apps/api/app/Http/Controllers/Attachment/AttachmentController.php:56-66` (`$this->authorize('download', $attachment)` → `Storage::disk('private')->download(...)`).
- Rate limiter: `apps/api/app/Providers/AppServiceProvider.php:41-47` (login 5, upload 20, search 60, api 120).
- 409 optimistik: `apps/api/app/Services/Ticket/TicketStatusService.php:54` (`StateConflictException` saat `expected_status_id` tidak cocok, D-21).
- Audit security Fase 10a: `docs/ops/SECURITY-AUDIT.md`; test kunci: `AttachmentSecurityTest`, `AttachmentValidationTest`, `CrossUserLeakTest`, `MassAssignmentAuditTest`, `GateRegistrationTest`.

### Pembuktian Langsung
Dua browser berdampingan: login employee vs technician → employee membuka URL detail tiket teknisi lain → 404. Lalu coba unggah file > 5 MB → ditolak dengan pesan validasi Indonesia.

---

## Q6 — Bagaimana business logic bekerja?

### Ringkasan Inti
Seluruh aturan bisnis dieksekusi di backend (service layer), bukan di UI: transisi status tiket divalidasi matriks per role, SLA dievaluasi tiga lapis (snapshot, scheduler, query defensif), notifikasi dipicu event perubahan status, dan audit trail dicatat dalam transaksi database yang sama. Frontend hanya menampilkan hasil keputusan backend — termasuk opsi aksi yang tersedia per role dan per status.

### Poin Teknis Kunci
1. **Transisi status via matriks + optimistic concurrency** — kombinasi (from, to, role) yang tidak diizinkan ditolak; kiriman basi (status sudah berubah di server) dikembalikan 409 (D-21).
2. **SLA tiga lapis** — (a) snapshot saat create, (b) scheduler 5 menit menandai breach + notifikasi, (c) query defensif menghitung ulang breach saat dibaca sehingga tampilan selalu akurat meski scheduler tertunda.
3. **Available actions dinamis** — endpoint resolve action per tiket per role (dari matriks yang sama), sehingga UI tidak pernah mengizinkan aksi yang backend akan tolak.
4. **Notifikasi berbasis event** — assignment, resolusi, close, dan SLA breach memicu baris notifikasi (DB) yang dibaca polling 30 detik.
5. **Agregasi dashboard defensif** — metrik compliance dihitung dari kolom `resolved_at <= sla_deadline` (bukan flag semata) sehingga angka dashboard selalu bisa direkonsiliasi dengan data mentah.

### Bukti Konkret
- Matriks transisi: `apps/api/app/Services/Ticket/TicketStatusService.php:61` + `apps/api/app/Authorization/TicketTransitionMatrix.php`.
- 409 conflict: `apps/api/app/Services/Ticket/TicketStatusService.php:54,99` (`StateConflictException`).
- Scheduler + notifikasi breach: `apps/api/routes/console.php:6` + `apps/api/app/Console/Commands/CheckTicketSlaCommand.php`; tipe notifikasi: `apps/api/app/Enums/NotificationType.php`.
- Query defensif breach: `apps/api/app/Services/Dashboard/TechnicianDashboardService.php:27-35` (`sla_breached OR sla_deadline < now()`).
- Kalkulasi compliance: `apps/api/app/Services/Dashboard/SlaMetricsCalculator.php:36-38` (`whereColumn('resolved_at', '<=', 'sla_deadline')`).
- Audit logger dalam service: `apps/api/app/Services/Ticket/TicketStatusService.php:118,136`.
- Dokumen matriks: `docs/product/STATUS-TRANSITION.md` (sumber kebenaran logika status).

### Pembuktian Langsung
Coba tutup tiket yang belum RESOLVED via UI → tombol "Tutup Tiket" tidak muncul (available actions). Tunjukkan juga di Dashboard Manager: angka "SLA Breached" non-nol pada data demo berasal dari tiket aktif yang deadline-nya terlewat — cocok dengan query defensif.

---

## Lampiran — Peta Bukti Cepat (Cheat Sheet)

| Klaim | Bukti |
| --- | --- |
| Snapshot SLA | `TicketService.php:119` |
| Matriks transisi | `TicketTransitionMatrix.php`, `TicketStatusService.php:61` |
| 409 optimistik (D-21) | `TicketStatusService.php:54,99` |
| Admin bypass (D-16) | `AppServiceProvider.php:56` |
| Rate limiting 4 lapis | `AppServiceProvider.php:41-47` |
| Disk privat attachment | `filesystems.php:35-45`, `AttachmentController.php:56-66` |
| Scheduler SLA 5 menit | `routes/console.php:6` |
| Polling notifikasi 30s | `use-notifications-poll.ts:15` |
| httpOnly cookie | `session.ts:6-8` |
| Compliance defensif | `SlaMetricsCalculator.php:36-38` |
| Data demo deterministik ±87% | `DemoDataSeeder.php`, `DemoDataSeederTest.php` |
| Golden path otomatis | `golden-path.spec.ts` (21 test E2E hijau) |
