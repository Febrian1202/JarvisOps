# Penutupan Fase 3 — Ticket Core & Workflow (`CLOSED.md`)

**Tanggal Selesai:** 2 September 2026  
**Status:** COMPLETE (409 passing tests, 1572 assertions, 0 failures)

---

## 1. Ringkasan Eksekutif

Fase 3 telah menyelesaikan implementasi seluruh modul inti *Ticket Lifecycle, Core Data, State Machine, Otorisasi, Relasi Aset, Komentar, dan Riwayat Perubahan (History)* sesuai spesifikasi PRD, API Contract, dan Matriks Otorisasi tanpa penyimpangan dari ADR/Decisions yang telah disetujui.

---

## 2. Rincian Pekerjaan per Sub-Tahap

### Sub-Tahap 3a: Fondasi, Kebijakan, & State Machine
- **Kebijakan & Matriks:** `TicketPolicy`, `TicketCommentPolicy`, `AssetPolicy`, `NotificationPolicy` diimplementasikan dengan pemisahan ability murni role vs ownership.
- **SLA & Snapshot:** `SlaService` dengan perhitungan defensif (`isBreached`, `remainingMinutes`), kalkulasi deadline 24/7 flat, dan recalculate from creation saat priority berubah.
- **Audit & Notifikasi:** `AuditLogger` dan `NotificationService` tipis (DB writer) dengan 16 case `AuditAction`, 9 module `AuditModule`, dan 10 enum `NotificationType` SCREAMING_SNAKE.
- **Transisi State:** `TicketStatusName`, `TicketActor`, `TicketActionResolver`, `TicketActorResolver`, `TicketTransitionMatrix` yang memetakan seluruh legalitas transisi state machine.

### Sub-Tahap 3b: Ticket CRUD & Relasi Aset
- **CRUD:** Pembuatan (`201 Created`), detail, update parsial berdasarkan hak akses kolom (`editable_fields`), dan soft delete tiket (`DELETE` oleh Admin).
- **Format Tiket:** Penomoran otomatis format `TCK-XXXX` berbasis autoincrement ID di dalam database transaction.
- **Relasi Aset & Validasi Kepemilikan:** `AssetAssignedToReporter` custom validation rule untuk memastikan hanya aset aktif milik pelapor yang dapat ditautkan (BR-012, BR-014), serta endpoint kenyamanan `GET /api/assets/assignable`.

### Sub-Tahap 3c: Query, Search, Filter, & Referensi
- **Scoping Role:** Pelapor hanya dapat melihat tiket miliknya; Manager, Teknisi, dan Admin dapat melihat seluruh tiket.
- **Filter & Search:** Filter multi-status/priority/kategori, rentang tanggal `created_from`/`created_to`, teknisi (`unassigned` / ID spesifik), dan status SLA (`on_track` / `breached`).
- **Sorting Whitelist:** `HandlesPagination` dengan pencegahan information leakage (422 untuk kolom sort ilegal).
- **Endpoint Referensi:** `GET /api/ticket-categories`, `GET /api/ticket-priorities`, `GET /api/ticket-statuses`, `GET /api/technicians`.

### Sub-Tahap 3d: Workflow Transisi & Concurrency
- **Transisi Status:** `POST /api/tickets/{id}/status` dengan validasi state machine, pencatatan histori label terbaca manusia, timestamp `resolved_at`/`closed_at`, serta penulisan note sebagai komentar tiket.
- **Penugasan:** `POST /api/tickets/{id}/assign` dan `POST /api/tickets/{id}/unassign` dengan validasi role teknisi aktif.
- **Perubahan Prioritas:** `POST /api/tickets/{id}/priority` dengan rekalkulasi deadline SLA dan pencegahan modifikasi pada tiket closed.
- **Optimistic Locking:** Evaluasi `expected_status_id` (409 Conflict) sebelum evaluasi legalitas transisi state (D-21, D-26).

### Sub-Tahap 3e: Komentar, History, & Golden Path
- **Komentar:** `GET /api/tickets/{id}/comments` (paginated ASC), `POST /api/tickets/{id}/comments` (`201 Created`, hanya partisipan aktif), `PUT`/`DELETE` (jendela 15 menit untuk author atau Admin kapan saja). Notifikasi `TICKET_COMMENTED` dikirim ke partisipan lain (mengecualikan aktor).
- **History Timeline:** `GET /api/tickets/{id}/histories` yang menyajikan kronologi perubahan tiket urut naik dengan nilai yang terbaca manusia (bukan ID).
- **Golden Path Test:** `GoldenPathTest` yang memverifikasi seluruh siklus hidup tiket dari pelaporan hingga penutupan penuh via HTTP client.

---

## 3. Keputusan & ADR yang Dipatuhi

- **D-01 & D-02:** Flat 24/7 calendar, 5 status tanpa pause.
- **D-05:** Format nomor tiket `TCK-%04d`.
- **D-08 & D-27:** Audit vocabularies dan 10 SCREAMING_SNAKE notification types.
- **D-16 & D-17:** Pengecualian Admin (tidak bisa membuka closed ticket / akun sendiri) dan presedensi otorisasi (403/404 mendahului 422).
- **D-19:** Teknisi dapat melihat semua tiket namun hanya dapat memodifikasi tiket yang ditugaskan kepadanya.
- **D-20 & D-22:** Endpoint pelengkap (unassign, comments CRUD) dan return code 201 untuk operasi create.
- **D-24 & D-29:** Bahasa pesan envelope dalam Bahasa Inggris; validasi FormRequest dan pesan error service dalam Bahasa Indonesia; audit/notifikasi dalam Bahasa Indonesia.
- **D-26:** Dukungan `expected_status_id` dengan error code `409 Conflict`.
- **D-28:** Nilai turunan SLA defensif (`on_track` / `breached` dan `sla_remaining_minutes`).

---

## 4. Item yang Diserahkan ke Fase 4 & 5

1. **Fase 4 (SLA Scheduler, Notification API, Audit Log API):**
   - Background command scheduler `tickets:check-sla` (setiap 5 menit) untuk persistensi `sla_breached` dan `sla_breached_at`.
   - Endpoint query notifikasi (`GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`).
   - Endpoint query audit logs (`GET /api/audit-logs`, `GET /api/audit-logs/{id}`).

2. **Fase 5 (Asset Management Penuh, Knowledge Base, Attachments, Admin CRUD):**
   - Modul upload dan download attachment tiket (`/api/tickets/{id}/attachments`, `/api/attachments/{id}/download`).
   - Modul manajemen aset lengkap dan transfer assignment.
   - Modul Knowledge Base / FAQ artikel.
   - Modul CRUD User & Pengaturan Master Data oleh Admin.
