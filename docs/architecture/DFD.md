# DATA FLOW DIAGRAM (DFD)

## JARVIS OPS — IT Service Management System

**Version:** 1.0
**Sumber:** `docs/product/PRD.md` (PRD v1.0 + Addendum v1.1), `docs/schema.sql`
**Dokumen terkait:** `docs/architecture/CONTEXT-DIAGRAM.md`, `docs/architecture/ERD.md`, `docs/architecture/BACKEND-ARCHITECTURE.md`

---

## 1. Notasi

| Simbol            | Arti                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| Lingkaran / oval  | Proses (process) — diberi nomor hierarkis (1, 1.1, 1.1.1)             |
| Persegi           | External entity (Employee, Technician, Manager, Admin, Scheduler)     |
| Bentuk terbuka    | Data store (D1, D2, …) — merepresentasikan tabel/kelompok tabel MySQL |
| Panah             | Aliran data                                                          |

---

## 2. Daftar Proses (Level 1)

| No | Proses                          | Modul PRD  | Ringkasan                                                             |
| -- | ------------------------------- | ---------- | --------------------------------------------------------------------- |
| 1  | Authentication & Authorization  | 6.1        | Login, logout, session/token, RBAC, permission validation             |
| 2  | User & Master Data Management   | 6.1 / 30   | User, role, department, ticket category, priority & SLA config        |
| 3  | Ticket Management               | 6.2 / 7-12 | Create, view, update, assign, status workflow, comment, attachment    |
| 4  | SLA Management                  | 6.5 / 13   | Hitung deadline, scheduled check, penandaan breach, on-the-fly calc   |
| 5  | Asset Management                | 6.3 / 15-17| Asset CRUD, assignment, asset history, validasi kepemilikan           |
| 6  | Knowledge Base Management       | 6.4 / 18-19| Article CRUD, kategori, draft/publish, search                         |
| 7  | Notification Management         | 6.6 / 22   | Buat notifikasi database, unread count, polling, mark as read         |
| 8  | Dashboard & Analytics           | 6.5 / 20-21| Statistik ticket, SLA, tren, performa technician, statistik asset      |
| 9  | Audit Logging                   | 6.7 / 23   | Catat aktivitas penting: user, action, entity, timestamp, metadata    |

---

## 3. Daftar Data Store

| Kode | Data Store           | Tabel MySQL (`docs/schema.sql`)                                              |
| ---- | -------------------- | ----------------------------------------------------------------------- |
| D1   | Users                | `users`, `employee_profiles`                                            |
| D2   | Roles & Departments  | `roles`, `departments`                                                  |
| D3   | Ticket Master        | `ticket_categories`, `ticket_priorities`, `ticket_statuses`              |
| D4   | Tickets              | `tickets`                                                               |
| D5   | Ticket Detail        | `ticket_comments`, `ticket_attachments`, `ticket_histories`              |
| D6   | Assets               | `assets`, `asset_assignments`, `asset_histories`                        |
| D7   | Knowledge Base       | `knowledge_categories`, `knowledge_articles`                            |
| D8   | Notifications        | `notifications`                                                         |
| D9   | Audit Logs           | `audit_logs`                                                            |
| D10  | File Storage         | Laravel Storage (filesystem lokal/public; object storage = future)      |

---

## 4. DFD Level 1

```mermaid
flowchart TB
    %% External entities
    EMP(["Employee"])
    TECH(["Technician"])
    MGR(["Manager"])
    ADM(["Administrator"])
    SCH(["Scheduler"])

    %% Processes
    P1(("1<br/>Authentication &<br/>Authorization"))
    P2(("2<br/>User & Master<br/>Data Management"))
    P3(("3<br/>Ticket<br/>Management"))
    P4(("4<br/>SLA<br/>Management"))
    P5(("5<br/>Asset<br/>Management"))
    P6(("6<br/>Knowledge Base<br/>Management"))
    P7(("7<br/>Notification<br/>Management"))
    P8(("8<br/>Dashboard &<br/>Analytics"))
    P9(("9<br/>Audit<br/>Logging"))

    %% Data stores
    D1[("D1 Users")]
    D2[("D2 Roles &<br/>Departments")]
    D3[("D3 Ticket Master")]
    D4[("D4 Tickets")]
    D5[("D5 Ticket Detail")]
    D6[("D6 Assets")]
    D7[("D7 Knowledge Base")]
    D8[("D8 Notifications")]
    D9[("D9 Audit Logs")]
    D10[("D10 File Storage")]

    %% ---- Authentication
    EMP -->|credential| P1
    TECH -->|credential| P1
    MGR -->|credential| P1
    ADM -->|credential| P1
    P1 -->|verifikasi email & password hash| D1
    D1 -->|data user, status aktif| P1
    P1 -->|role & permission| D2
    D2 -->|definisi role| P1
    P1 -->|auth token / sesi| EMP
    P1 -->|auth token / sesi| TECH
    P1 -->|auth token / sesi| MGR
    P1 -->|auth token / sesi| ADM
    P1 -->|update last_login_at| D1
    P1 -->|event login/logout| P9

    %% ---- Master data
    ADM -->|data user, role, department,<br/>kategori, priority & SLA| P2
    P2 -->|simpan user & employee profile| D1
    P2 -->|simpan role & department| D2
    P2 -->|simpan kategori, priority, status| D3
    D3 -->|master data| P2
    P2 -->|konfirmasi & daftar master data| ADM
    P2 -->|event perubahan konfigurasi| P9

    %% ---- Ticket
    EMP -->|data ticket baru, komentar,<br/>attachment, konfirmasi selesai| P3
    TECH -->|update status, note, attachment,<br/>perubahan priority| P3
    MGR -->|assignment technician, priority| P3
    P3 -->|ticket & status| D4
    D4 -->|data ticket| P3
    P3 -->|komentar, attachment metadata, histori| D5
    D5 -->|detail ticket| P3
    P3 -->|simpan file| D10
    D10 -->|file terverifikasi| P3
    D3 -->|kategori, priority, sla_minutes, status| P3
    P3 -->|validasi asset milik reporter| P5
    P5 -->|asset valid / ditolak| P3
    P3 -->|permintaan hitung SLA deadline| P4
    P4 -->|sla_duration_minutes & sla_deadline| P3
    P3 -->|event ticket assigned / status changed /<br/>commented / resolved| P7
    P3 -->|event perubahan ticket| P9
    P3 -->|nomor & status ticket, detail, histori| EMP
    P3 -->|daftar ticket assigned, detail| TECH
    P3 -->|seluruh data ticket| MGR

    %% ---- SLA
    SCH -->|trigger setiap 5 menit| P4
    P4 -->|baca ticket aktif & deadline| D4
    P4 -->|set sla_breached, sla_breached_at| D4
    P4 -->|event SLA breached| P7
    P4 -->|event SLA breached| P9
    P4 -->|ringkasan hasil job| SCH

    %% ---- Asset
    TECH -->|data asset & assignment| P5
    ADM -->|data asset & assignment| P5
    P5 -->|simpan asset, assignment, history| D6
    D6 -->|data asset, assignment aktif| P5
    P5 -->|daftar asset & histori| TECH
    P5 -->|daftar asset milik sendiri| EMP
    P5 -->|event perubahan asset| P9
    D1 -->|data pemilik asset| P5

    %% ---- Knowledge base
    TECH -->|draft, edit, publish artikel| P6
    MGR -->|edit, unpublish, delete artikel| P6
    ADM -->|kelola artikel & kategori| P6
    EMP -->|kata kunci pencarian| P6
    P6 -->|simpan artikel & kategori| D7
    D7 -->|artikel & kategori| P6
    P6 -->|artikel published, hasil pencarian| EMP
    P6 -->|artikel & statistik view| TECH
    P6 -->|event perubahan artikel| P9

    %% ---- Notification
    P7 -->|simpan notifikasi| D8
    D8 -->|notifikasi belum dibaca| P7
    EMP -->|polling & mark as read| P7
    TECH -->|polling & mark as read| P7
    MGR -->|polling & mark as read| P7
    ADM -->|polling & mark as read| P7
    P7 -->|daftar notifikasi & unread count| EMP
    P7 -->|daftar notifikasi & unread count| TECH
    P7 -->|daftar notifikasi & unread count| MGR
    P7 -->|daftar notifikasi & unread count| ADM

    %% ---- Dashboard
    EMP -->|permintaan dashboard| P8
    TECH -->|permintaan dashboard| P8
    MGR -->|permintaan dashboard, filter periode| P8
    ADM -->|permintaan dashboard| P8
    D4 -->|agregasi ticket & SLA| P8
    D5 -->|data histori untuk resolution time| P8
    D6 -->|statistik asset| P8
    D1 -->|jumlah user & technician| P8
    D7 -->|artikel terbaru| P8
    P4 -->|status SLA on-the-fly| P8
    P8 -->|dashboard employee| EMP
    P8 -->|dashboard technician| TECH
    P8 -->|dashboard & laporan manager| MGR
    P8 -->|dashboard admin & statistik sistem| ADM

    %% ---- Audit
    P9 -->|simpan log aktivitas| D9
    D9 -->|riwayat aktivitas| P9
    P9 -->|audit log lengkap| ADM
    P9 -->|audit log terbatas| MGR

    style P3 fill:#dae8fc,stroke:#6c8ebf
    style P4 fill:#ffe6cc,stroke:#d79b00
```

---

## 5. DFD Level 2 — Proses 3 (Ticket Management)

```mermaid
flowchart TB
    EMP(["Employee"])
    TECH(["Technician"])
    MGR(["Manager"])

    P31(("3.1<br/>Create Ticket"))
    P32(("3.2<br/>Assign<br/>Technician"))
    P33(("3.3<br/>Update Status<br/>(Workflow)"))
    P34(("3.4<br/>Manage Comment"))
    P35(("3.5<br/>Manage<br/>Attachment"))
    P36(("3.6<br/>Record Ticket<br/>History"))
    P37(("3.7<br/>Search, Filter<br/>& Paginate"))

    D3[("D3 Ticket Master")]
    D4[("D4 Tickets")]
    D5[("D5 Ticket Detail")]
    D6[("D6 Assets")]
    D10[("D10 File Storage")]

    P4(("4<br/>SLA Management"))
    P7(("7<br/>Notification"))
    P9(("9<br/>Audit Logging"))

    %% 3.1 Create
    EMP -->|title, description, category,<br/>priority, asset opsional| P31
    D3 -->|validasi category & priority,<br/>ambil sla_minutes| P31
    D6 -->|asset yang di-assign ke reporter| P31
    P31 -->|permintaan hitung deadline| P4
    P4 -->|sla_duration_minutes, sla_deadline| P31
    P31 -->|ticket baru: ticket_number,<br/>status OPEN, snapshot SLA| D4
    P31 -->|nomor ticket & SLA deadline| EMP
    P31 -->|perubahan awal| P36
    P31 -->|event ticket created| P9

    %% 3.2 Assign
    MGR -->|pilih technician untuk ticket| P32
    D4 -->|ticket berstatus OPEN| P32
    P32 -->|set technician_id, status ASSIGNED| D4
    P32 -->|perubahan technician & status| P36
    P32 -->|event ticket assigned| P7
    P32 -->|event assignment| P9
    P32 -->|konfirmasi assignment| MGR

    %% 3.3 Status workflow
    TECH -->|ASSIGNED to IN_PROGRESS,<br/>IN_PROGRESS to RESOLVED| P33
    EMP -->|konfirmasi CLOSED atau<br/>tolak kembali ke IN_PROGRESS| P33
    D4 -->|status & kepemilikan ticket| P33
    D3 -->|status valid, flag is_closed/is_final| P33
    P33 -->|update status_id, resolved_at, closed_at| D4
    P33 -->|perubahan status| P36
    P33 -->|event status changed / resolved| P7
    P33 -->|event perubahan status| P9
    P33 -->|status terbaru| TECH
    P33 -->|status terbaru| EMP

    %% 3.4 Comment
    EMP -->|komentar| P34
    TECH -->|troubleshooting note| P34
    P34 -->|simpan ticket_comments| D5
    D5 -->|daftar komentar| P34
    P34 -->|event ticket commented| P7
    P34 -->|daftar komentar| EMP
    P34 -->|daftar komentar| TECH

    %% 3.5 Attachment
    EMP -->|file JPG/JPEG/PNG/PDF| P35
    TECH -->|file bukti / screenshot| P35
    P35 -->|validasi MIME, ekstensi, ukuran max 5MB;<br/>simpan file| D10
    D10 -->|stored_filename & storage_path| P35
    P35 -->|simpan metadata attachment| D5
    D5 -->|daftar attachment| P35
    P35 -->|hasil upload / pesan error validasi| EMP
    P35 -->|hasil upload / pesan error validasi| TECH

    %% 3.6 History
    P36 -->|field_changed, old_value, new_value, user| D5

    %% 3.7 Search
    EMP -->|ticket id, title, filter status/priority/tanggal| P37
    TECH -->|filter status, priority, category| P37
    MGR -->|filter technician, category, periode| P37
    D4 -->|hasil query ticket| P37
    D5 -->|detail terkait| P37
    P37 -->|daftar ticket paginated| EMP
    P37 -->|daftar ticket paginated| TECH
    P37 -->|daftar ticket paginated| MGR

    style P31 fill:#d5e8d4,stroke:#82b366
    style P33 fill:#dae8fc,stroke:#6c8ebf
```

### Business rule yang dikawal proses 3

| Rule    | Proses | Penerapan                                                                     |
| ------- | ------ | ----------------------------------------------------------------------------- |
| BR-001  | 3.1    | `reporter_id` wajib diisi dari user terautentikasi                            |
| BR-002  | 3.1    | Status awal otomatis `OPEN`                                                   |
| BR-003  | 3.1    | `technician_id` nullable saat pembuatan                                       |
| BR-004  | 3.2    | Hanya Manager/Admin yang dapat melakukan assignment                           |
| BR-005  | 3.3    | Technician hanya memproses ticket yang di-assign kepadanya                     |
| BR-006  | 3.1    | `priority_id` wajib                                                           |
| BR-007  | 3.1    | `category_id` wajib                                                           |
| BR-008  | 3.6    | Setiap perubahan status dicatat ke `ticket_histories`                          |
| BR-009  | 3.3    | Ticket `CLOSED` tidak dapat dimodifikasi Employee                             |
| BR-010  | 3.1–3.5| Setiap perubahan penting dikirim ke proses 9 (audit log)                       |
| BR-011  | 3.1    | Asset bersifat optional                                                       |
| BR-012  | 3.1    | Employee hanya dapat memilih asset yang di-assign kepadanya                    |
| BR-013  | 3.1    | Asset harus valid dan terdaftar                                               |
| BR-014  | 3.1    | Validasi kepemilikan asset dilakukan di backend, bukan filter frontend         |
| BR-015  | —      | `tickets.asset_id` memakai `ON DELETE SET NULL` sehingga histori ticket tetap  |

---

## 6. DFD Level 2 — Proses 4 (SLA Management)

```mermaid
flowchart TB
    SCH(["Scheduler"])
    TECH(["Technician"])
    MGR(["Manager"])

    P41(("4.1<br/>Calculate SLA<br/>Deadline"))
    P42(("4.2<br/>Scheduled<br/>SLA Check"))
    P43(("4.3<br/>Mark SLA<br/>Breach"))
    P44(("4.4<br/>On-the-fly SLA<br/>Evaluation"))
    P45(("4.5<br/>Compute SLA<br/>Metrics"))

    D3[("D3 Ticket Master")]
    D4[("D4 Tickets")]

    P3(("3<br/>Ticket Management"))
    P7(("7<br/>Notification"))
    P8(("8<br/>Dashboard &<br/>Analytics"))
    P9(("9<br/>Audit Logging"))

    %% 4.1
    P3 -->|priority_id & created_at ticket baru| P41
    D3 -->|sla_minutes dari priority| P41
    P41 -->|sla_duration_minutes = snapshot sla_minutes<br/>sla_deadline = created_at + durasi| P3

    %% 4.2
    SCH -->|trigger periodik tiap 5 menit| P42
    D4 -->|ticket dengan status<br/>NOT IN RESOLVED, CLOSED| P42
    P42 -->|ticket dengan current_time > sla_deadline| P43
    P42 -->|ringkasan job: diperiksa & breach| SCH

    %% 4.3
    P43 -->|sla_breached = true,<br/>sla_breached_at = now| D4
    P43 -->|event SLA breached ke technician & manager| P7
    P43 -->|log penandaan breach| P9

    %% 4.4
    D4 -->|sla_deadline, status, resolved_at| P44
    P44 -->|status SLA aktual saat request<br/>walau scheduler terlambat| P8

    %% 4.5
    D4 -->|ticket resolved & breached| P45
    P45 -->|total, within SLA, breached,<br/>compliance persen, avg resolution time| P8
    P8 -->|metrik SLA| MGR
    P8 -->|SLA breached & avg resolution| TECH

    style P42 fill:#ffe6cc,stroke:#d79b00
    style P43 fill:#f8cecc,stroke:#b85450
```

### Aturan SLA

```text
sla_deadline = created_at + sla_duration_minutes

SLA BREACHED bila:
    current_time > sla_deadline
    AND status NOT IN (RESOLVED, CLOSED)

SLA Compliance = (Tickets Resolved Within SLA / Total Resolved Tickets) x 100
```

Proses 4.1 menyimpan **snapshot** `sla_duration_minutes` pada ticket agar perubahan konfigurasi
priority oleh Admin tidak mengubah SLA ticket lama. Proses 4.4 berfungsi sebagai *defensive
mechanism*: dashboard tetap akurat meskipun scheduler tertunda.

---

## 7. DFD Level 2 — Proses 5 (Asset Management)

```mermaid
flowchart TB
    EMP(["Employee"])
    TECH(["Technician"])
    ADM(["Administrator"])

    P51(("5.1<br/>Manage Asset<br/>Inventory"))
    P52(("5.2<br/>Assign Asset<br/>to Employee"))
    P53(("5.3<br/>Release / Change<br/>Asset Status"))
    P54(("5.4<br/>Record Asset<br/>History"))
    P55(("5.5<br/>Validate Asset<br/>Ownership"))
    P56(("5.6<br/>Search & Filter<br/>Asset"))

    D1[("D1 Users")]
    D6[("D6 Assets")]
    P3(("3<br/>Ticket Management"))
    P9(("9<br/>Audit Logging"))

    TECH -->|asset_tag, name, category, brand,<br/>model, serial number, purchase date| P51
    ADM -->|data asset| P51
    P51 -->|simpan/ubah assets| D6
    P51 -->|aksi create/update/delete| P54
    P51 -->|event perubahan asset| P9

    TECH -->|pilih asset & employee| P52
    ADM -->|pilih asset & employee| P52
    D6 -->|"status asset<br/>(MAINTENANCE tidak bisa di-assign)"| P52
    D1 -->|data employee tujuan| P52
    P52 -->|asset_assignments: assigned_at,<br/>status asset menjadi ASSIGNED| D6
    P52 -->|aksi assignment| P54
    P52 -->|event assignment| P9

    TECH -->|release / set MAINTENANCE,<br/>RETIRED, LOST| P53
    P53 -->|released_at & status baru| D6
    P53 -->|aksi perubahan status| P54

    P54 -->|asset_histories: action,<br/>description, action_at| D6

    P3 -->|asset_id & reporter_id yang diklaim| P55
    D6 -->|assignment aktif untuk reporter| P55
    P55 -->|"valid atau ditolak (BR-012, BR-014)"| P3

    EMP -->|permintaan my assets| P56
    TECH -->|asset code, serial number,<br/>filter status/kategori/pemilik| P56
    D6 -->|hasil query asset| P56
    P56 -->|daftar asset milik sendiri| EMP
    P56 -->|daftar asset & riwayat pemakaian| TECH

    style P55 fill:#d5e8d4,stroke:#82b366
```

Riwayat kepemilikan asset diperoleh dari `asset_assignments` (bukan hanya kolom pemilik saat ini),
sehingga rantai pemakaian seperti `Laptop A → Andi (2025) → Budi (2026) → Citra (current)` dapat
direkonstruksi.

---

## 8. DFD Level 2 — Proses 6 (Knowledge Base) & Proses 7 (Notification)

```mermaid
flowchart TB
    EMP(["Employee"])
    TECH(["Technician"])
    MGR(["Manager"])
    ADM(["Administrator"])

    P61(("6.1<br/>Manage Article"))
    P62(("6.2<br/>Publish /<br/>Unpublish"))
    P63(("6.3<br/>Search &<br/>Read Article"))
    P64(("6.4<br/>Manage KB<br/>Category"))

    P71(("7.1<br/>Create<br/>Notification"))
    P72(("7.2<br/>Fetch Unread<br/>(Polling)"))
    P73(("7.3<br/>Mark as Read"))

    D7[("D7 Knowledge Base")]
    D8[("D8 Notifications")]
    P3(("3<br/>Ticket Management"))
    P4(("4<br/>SLA Management"))
    P9(("9<br/>Audit Logging"))

    %% KB
    TECH -->|title, content, kategori| P61
    MGR -->|edit artikel apa pun| P61
    ADM -->|full control artikel| P61
    P61 -->|simpan artikel status draft| D7
    P61 -->|event perubahan artikel| P9

    TECH -->|publish / unpublish artikel sendiri| P62
    MGR -->|publish / unpublish semua artikel| P62
    P62 -->|ubah status draft to published| D7

    EMP -->|kata kunci & filter kategori| P63
    D7 -->|artikel berstatus published| P63
    P63 -->|hasil pencarian & isi artikel| EMP
    P63 -->|naikkan view_count| D7

    ADM -->|kategori knowledge base| P64
    P64 -->|simpan knowledge_categories| D7

    %% Notification
    P3 -->|ticket assigned, status changed,<br/>commented, resolved| P71
    P4 -->|SLA breached| P71
    P71 -->|user_id penerima, type, data JSON,<br/>is_read = false| D8

    EMP -->|request tiap 30 detik| P72
    TECH -->|request tiap 30 detik| P72
    MGR -->|request tiap 30 detik| P72
    D8 -->|notifikasi belum dibaca| P72
    P72 -->|badge count & daftar notifikasi| EMP
    P72 -->|badge count & daftar notifikasi| TECH
    P72 -->|badge count & daftar notifikasi| MGR

    EMP -->|tandai sudah dibaca| P73
    TECH -->|tandai sudah dibaca| P73
    P73 -->|is_read = true, read_at = now| D8

    style P62 fill:#d5e8d4,stroke:#82b366
    style P71 fill:#ffe6cc,stroke:#d79b00
```

Penerima notifikasi per event (Addendum §4.4):

| Event                 | Penerima                       |
| --------------------- | ------------------------------ |
| Ticket Assigned       | Technician                     |
| Ticket Status Changed | Reporter dan/atau Technician   |
| Ticket Commented      | Peserta ticket terkait         |
| Ticket Resolved       | Reporter                       |
| SLA Breached          | Assigned Technician + Manager  |

---

## 9. Ringkasan Proses vs Data Store (CRUD Matrix)

| Data Store            | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 |
| --------------------- | -- | -- | -- | -- | -- | -- | -- | -- | -- |
| D1 Users              | RU | CRUD | R | –  | R  | R  | R  | R  | R  |
| D2 Roles & Depts      | R  | CRUD | R | –  | –  | –  | –  | R  | –  |
| D3 Ticket Master      | –  | CRUD | R | R  | –  | –  | –  | R  | –  |
| D4 Tickets            | –  | –  | CRUD | RU | R | –  | R  | R  | R  |
| D5 Ticket Detail      | –  | –  | CRD | –  | –  | –  | R  | R  | R  |
| D6 Assets             | –  | –  | R  | –  | CRUD | – | –  | R  | R  |
| D7 Knowledge Base     | –  | –  | –  | –  | –  | CRUD | – | R  | R  |
| D8 Notifications      | –  | –  | –  | –  | –  | –  | CRU | – | –  |
| D9 Audit Logs         | –  | –  | –  | –  | –  | –  | –  | R  | CR |
| D10 File Storage      | –  | –  | CR | –  | –  | –  | –  | –  | –  |

Keterangan: C = Create, R = Read, U = Update, D = Delete (soft delete pada tabel bertanda
`deleted_at`), – = tidak ada akses.
