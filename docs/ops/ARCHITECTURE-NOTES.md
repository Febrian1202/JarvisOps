# Catatan Arsitektur Sistem (Architecture Notes) — JARVIS OPS

Dokumen ini memuat rangkuman rasionalisasi teknis dan pertimbangan arsitektural utama yang mendasari perancangan sistem JarvisOps. Dokumen ini disiapkan sebagai referensi pembelaan teknis dan bahan presentasi capstone project, khususnya untuk menjawab 6 pertanyaan kritis reviewer yang tercantum dalam PRD §33.

---

## 1. Topologi BFF Proxy & Otorisasi httpOnly Cookie

### Rasionalisasi
Pada aplikasi web modern yang memisahkan frontend (Next.js) dan backend (Laravel API), penyimpanan token autentikasi di sisi klien (`localStorage` atau `sessionStorage`) menghadirkan kerentanan kritis terhadap serangan **Cross-Site Scripting (XSS)**. Jika ada script berbahaya atau third-party package yang disusupi, token Sanctum dapat dicuri dengan mudah dari memori browser.

### Solusi di JarvisOps
- **Backend-For-Frontend (BFF)**: Next.js App Router bertindak sebagai reverse-proxy aman menggunakan Route Handlers (`/api/auth/*` dan `/api/proxy/*`).
- **httpOnly & Secure Cookie**: Saat login berhasil, Sanctum Bearer Token disimpan ke dalam cookie dengan flag `httpOnly: true`, `secure: true` (saat HTTPS), dan `sameSite: 'lax'`. JavaScript di browser tidak memiliki akses baca ke token ini.
- **Server-Side Token Injection**: Ketika antarmuka React melakukan request data, request diarahkan ke path internal `/api/proxy/[...path]`. Server Next.js membaca cookie `auth_token`, menyematkannya ke header `Authorization: Bearer <token>`, dan meneruskannya ke Laravel API secara privat di jaringan internal.

---

## 2. Pendekatan Tiga Lapis SLA (Snapshot + Scheduler + Defensive Query)

### Rasionalisasi
Pengelolaan Service Level Agreement (SLA) pada sistem ITSM memiliki tantangan historis: jika target SLA (misal: tiket High dari 240 menit diubah menjadi 180 menit) diperbarui di tabel konfigurasi master, penghitungan performa tiket-tiket masa lalu tidak boleh terpengaruh. Selain itu, penghitungan status breach tidak boleh semata-mata mengandalkan background worker yang rentan mengalami keterlambatan eksekusi (*lag*).

### Solusi di JarvisOps
1. **Snapshot Saat Pembuatan Tiket (Integritas Historis)**:
   Saat tiket pertama kali dibuat (`TicketService::create`), sistem mengambil konfigurasi durasi dari `ticket_priorities.sla_minutes` dan langsung membekukannya ke kolom `tickets.sla_duration_minutes` serta menghitung `tickets.sla_deadline`. Perubahan konfigurasi priority di masa depan tidak akan pernah merusak kalkulasi kepatuhan tiket lama.
2. **Background Scheduler Periodik (Persistensi & Notifikasi)**:
   Perintah terjadwal `php artisan tickets:check-sla` dijalankan setiap 5 menit oleh container `scheduler`. Pekerjaan ini bertugas mendeteksi tiket aktif yang telah melewati batas deadline, memperbarui flag `sla_breached = true`, mencatat `sla_breached_at`, menulis sistem audit trail (`user_id = null`), dan mendistribusikan notifikasi `TICKET_SLA_BREACHED` ke teknisi dan manajer.
3. **Defensive Dynamic Query (Akurasi Real-Time)**:
   Ketika endpoint detail atau list tiket dipanggil, sistem tidak hanya mempercayai kolom `sla_breached` dari scheduler, melainkan menghitung ulang status breach secara dinamis:
   `is_breached = sla_breached OR (status NOT IN (RESOLVED, CLOSED) AND now() > sla_deadline)`.
   Dengan cara ini, pengguna selalu melihat status SLA yang 100% presisi meski scheduler sedang tertunda beberapa detik.

---

## 3. Pemisahan Audit Log Eksplisit vs Ticket History Timeline

### Rasionalisasi
Terdapat godaan untuk menggabungkan seluruh catatan histori ke dalam satu tabel log generik. Namun dalam kebutuhan ITSM korporat, terdapat dua audiens dan tujuan yang sangat berbeda:
- Pengguna operasional (teknisi & pelapor) membutuhkan **kronologi kerja tiket** (kapan status berubah, siapa yang menugaskan, apa diagnosanya).
- Auditor dan manajemen keamanan membutuhkan **jejak kepatuhan sistem lintas modul** (siapa yang mengubah profil user, siapa mendeaktivasi akun, kapan aset dipindahtangankan, perubahan konfigurasi master data).

### Solusi di JarvisOps
- **`ticket_histories` (Operational Timeline)**: Terfokus hanya pada entitas tiket, dioptimalkan untuk query cepat berurutan saat halaman detail tiket dimuat, dan menyertakan label deskriptif yang ramah pengguna.
- **`audit_logs` (Compliance & Security Audit Trail)**: Bersifat *cross-cutting* (mencakup modul auth, users, roles, departments, assets, articles, tickets). Memiliki kolom `description` siap baca (seperti `Manager assigned Ticket #TCK-001 to Budi`), alamat IP, User-Agent, serta snapshot JSON `old_data` dan `new_data` untuk forensik audit.
- **Isolasi Data**: Endpoint audit log dibatasi ketat: hanya Admin yang dapat melihat log sistem lengkap, sedangkan Manager hanya dapat mengakses log pada domain operasional (tiket, aset, artikel).

---

## 4. Keamanan File Attachment Melalui Private Disk & Controller Gating

### Rasionalisasi
Menyimpan file lampiran pada direktori publik (`storage/app/public` dengan symlink web) membuka risiko kebocoran data sensitif (*Insecure Direct Object Reference* / IDOR). Penyerang yang dapat menebak atau mengiterasi URL file lampiran (misalnya struk internal, foto perangkat keras rahasia, log jaringan) dapat mengunduh dokumen tanpa autentikasi.

### Solusi di JarvisOps
- **Private Disk (`serve => false`)**: Seluruh attachment tiket disimpan di disk privat Laravel (`/storage/app/private/ticket-attachments/`), yang tidak dipetakan ke root web server FrankenPHP/Caddy.
- **Download Controller Terproteksi**: File hanya dapat diakses melalui endpoint `GET /api/attachments/{id}/download`.
- **Policy Enforcement**: Controller memanggil `AttachmentPolicy@download` yang memverifikasi izin pengguna terhadap tiket induknya (`TicketPolicy@view`). Jika pengguna tidak memiliki hak akses terhadap tiket terkait, permintaan unduhan ditolak dengan respons 403/404.
- **Validasi Ganda Upload**: Validasi upload menerapkan pemeriksaan ketat pada ukuran berkas (maksimal 5 MB), ekstensi berkas yang diizinkan (JPG, JPEG, PNG, PDF), dan kesesuaian antara ekstensi dengan MIME type sebenarnya menggunakan binary sniffing.

---

## 5. Konsistensi Respon Envelope & Dual-Language Separation (D-24)

### Rasionalisasi
Frontend sering kali rapuh karena inkonsistensi struktur respon backend (misal: saat sukses mengembalikan object mentah, saat error validasi mengembalikan struktur Laravel default, saat error 500 mengembalikan HTML). Selain itu, terdapat kebutuhan bisnis bahwa antarmuka pengguna harus berbahasa Indonesia yang ramah, namun kode integrasi dan API kontraktual tetap profesional dan standar.

### Solusi di JarvisOps
- **Single Uniform Envelope**:
  - Format sukses: `{ "success": true, "message": "...", "data": ..., "meta": ... }`
  - Format error: `{ "success": false, "message": "...", "errors": ... }`
  - Tidak pernah mengembalikan HTTP 204 No Content (selalu menyertakan body JSON) dan tidak ada URL absolut di `meta` yang dapat membingungkan klien BFF.
- **Dual-Language Architecture (D-24)**:
  - Envelope API, status kode, dan pesan teknis backend disajikan dalam **Bahasa Inggris** (contoh: `"Ticket retrieved successfully."`, `"Unauthenticated."`).
  - Pesan validasi form input (`messages()` di FormRequest), notifikasi in-app, serta deskripsi audit log disajikan dalam **Bahasa Indonesia** alami (contoh: `"Judul tiket wajib diisi."`, `"Manajer menugaskan tiket kepada Teknisi"`).

---

## 6. Desain Database Relasional, Indexing Komposit, & Row-Level Locking

### Rasionalisasi
Aplikasi ITSM memiliki beban baca (*read-heavy*) pada dashboard dan pencarian tiket, namun memiliki operasi penulisan kritis (*concurrency-sensitive*) saat alokasi aset dan transisi tiket.

### Solusi di JarvisOps
- **Normalisasi Relasional 18 Tabel**: Menjaga integritas data tanpa redundansi (misal: keterkaitan aset dengan riwayat penugasan `asset_assignments` dan log perubahan `asset_histories`).
- **Composite Indexing untuk SLA & Filtering**:
  - Dibuat index komposit `idx_tickets_sla (sla_breached, sla_deadline)` untuk mempercepat eksekusi scheduler `tickets:check-sla` tanpa full-table scan.
  - Index `idx_tickets_status_technician (status_id, technician_id)` untuk mempercepat filter dashboard operasional.
- **Pencegahan Race Condition (Concurrency Locking)**:
  - Pada penugasan aset (`AssetAssignmentService`), digunakan `DB::transaction()` dengan `lockForUpdate()` (D-09) untuk mencegah kondisi *double-assignment* saat dua teknisi mencoba menugaskan aset yang sama secara bersamaan.
  - Pada transisi tiket (`TicketStatusService`), diterapkan mekanisme *optimistic locking* melalui parameter opsional `expected_status_id` (D-21) yang menghasilkan HTTP 409 Conflict jika status tiket telah berubah mendahului request pengguna.

---

## 7. Role-Based Access Control (RBAC) via Native Gate/Policy (D-16)

### Rasionalisasi
Banyak proyek memilih library pihak ketiga yang kompleks seperti `spatie/laravel-permission` yang memperkenalkan relasi many-to-many dinamis dan tabel-tabel tambahan. Padahal model bisnis ITSM menetapkan model 1 user = 1 role pasti melalui foreign key `users.role_id`.

### Solusi di JarvisOps
- **Pure Laravel Gate & Policy**:
  - Otorisasi dibangun di atas `AbilityMatrix` yang memetakan ability ke enum `RoleName` (`Administrator`, `Manager`, `Technician`, `Employee`).
  - Sangat cepat, mudah diaudit, dan tidak memerlukan query tambahan ke tabel permission per-request.
- **Admin Bypass Terkendali (`Gate::before`)**:
  - Administrator otomatis lolos semua pemeriksaan Gate/Policy (`Gate::before`), namun dibatasi oleh **dua proteksi keras**:
    1. **Isolasi Notifikasi**: Administrator tidak dapat membaca atau menghapus notifikasi pengguna lain (menghasilkan HTTP 404).
    2. **Pencegahan Self-Lockout**: Administrator dilarang menonaktifkan akun sendiri atau mencabut hak admin akun sendiri.
