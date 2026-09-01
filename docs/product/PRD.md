# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## JARVIS OPS

### IT Service Management System

**Version:** 1.1
**Status:** Approved — Basis Implementasi
**Product Type:** Web Application
**Frontend:** Next.js
**Backend:** Laravel
**Database:** MySQL

---

# 1. Product Overview

## 1.1 Product Name

**JARVIS OPS**

JARVIS OPS adalah aplikasi **IT Service Management (ITSM)** berbasis web yang digunakan perusahaan untuk mengelola permintaan dan permasalahan IT, aset perusahaan, knowledge base, serta monitoring performa layanan IT.

Aplikasi memiliki beberapa tipe pengguna dengan hak akses yang berbeda:

- Employee
- Technician
- Manager
- Administrator

Sistem dirancang untuk menggantikan proses pelaporan masalah IT yang sebelumnya dapat dilakukan secara manual melalui chat, email, atau komunikasi informal.

---

# 2. Problem Statement

Dalam lingkungan perusahaan, permasalahan IT dapat dilaporkan melalui berbagai media seperti WhatsApp, email, chat internal, atau disampaikan langsung kepada tim IT.

Pendekatan tersebut memiliki beberapa masalah:

1. Permintaan IT sulit dilacak.
2. Tidak ada standar prioritas untuk setiap masalah.
3. Sulit mengetahui siapa technician yang menangani suatu masalah.
4. Riwayat penanganan tidak terdokumentasi dengan baik.
5. Manager kesulitan mengetahui performa tim IT.
6. Tidak ada informasi yang jelas mengenai apakah ticket telah melewati SLA.
7. Informasi mengenai troubleshooting yang pernah dilakukan sulit ditemukan.
8. Data aset IT tidak terintegrasi dengan informasi employee.

JARVIS OPS dibuat untuk menyediakan satu platform terpusat dalam mengelola proses tersebut.

---

# 3. Product Goals

## 3.1 Primary Goal

Membangun platform IT Service Management sederhana namun production-like yang memungkinkan perusahaan untuk:

- melaporkan masalah IT;
- mengelola ticket;
- melakukan assignment technician;
- memantau status ticket;
- mengelola aset IT;
- menyediakan knowledge base;
- memonitor SLA;
- melihat analytics dan laporan.

## 3.2 Secondary Goals

Project juga bertujuan menunjukkan kemampuan developer dalam:

- REST API development;
- relational database design;
- authentication;
- authorization;
- role-based access control;
- business logic;
- frontend development;
- dashboard visualization;
- validation;
- testing;
- documentation;
- deployment.

---

# 4. Target Users

## 4.1 Employee

Employee menggunakan sistem untuk melaporkan masalah atau request IT dan memantau penyelesaiannya.

Contoh:

> "Laptop saya tidak dapat terhubung ke Wi-Fi."

> "Saya membutuhkan instalasi software tertentu."

---

## 4.2 Technician

Technician merupakan anggota tim IT yang bertanggung jawab menangani ticket.

Aktivitas utama:

- melihat ticket yang ditugaskan;
- menerima dan memproses ticket;
- memperbarui status;
- menambahkan troubleshooting notes;
- mengunggah attachment;
- menyelesaikan ticket.

---

## 4.3 Manager

Manager bertanggung jawab memonitor performa tim IT dan melakukan tindakan yang membutuhkan approval.

Aktivitas:

- melihat seluruh ticket;
- melakukan assignment;
- memonitor SLA;
- melihat performa technician;
- melihat analytics;
- melihat laporan.

---

## 4.4 Administrator

Administrator bertanggung jawab terhadap konfigurasi sistem.

Aktivitas:

- mengelola user;
- mengelola role;
- mengelola department;
- mengelola kategori ticket;
- mengelola priority dan SLA;
- mengelola asset;
- mengelola knowledge base;
- melihat audit log.

---

# 5. User Roles & Permissions

| Capability             | Employee | Technician | Manager | Admin |
| ---------------------- | -------: | ---------: | ------: | ----: |
| Login                  |       ✅ |         ✅ |      ✅ |    ✅ |
| View Own Profile       |       ✅ |         ✅ |      ✅ |    ✅ |
| Create Ticket          |       ✅ |         ✅ |      ✅ |    ✅ |
| View Own Ticket        |       ✅ |         ✅ |      ✅ |    ✅ |
| View All Ticket        |       ❌ |         ✅ |      ✅ |    ✅ |
| Update Assigned Ticket |       ❌ |         ✅ |      ✅ |    ✅ |
| Assign Technician      |       ❌ |         ❌ |      ✅ |    ✅ |
| Change Ticket Priority |       ❌ |         ✅ |      ✅ |    ✅ |
| Manage Assets          |       ❌ |         ✅ |      ✅ |    ✅ |
| Manage Users           |       ❌ |         ❌ |      ❌ |    ✅ |
| Manage Departments     |       ❌ |         ❌ |      ❌ |    ✅ |
| Manage Categories      |       ❌ |         ❌ |      ❌ |    ✅ |
| Manage Knowledge Base  |       ❌ |         ✅ |      ✅ |    ✅ |
| View Analytics         |       ❌ |         ✅ |      ✅ |    ✅ |
| View Reports           |       ❌ |    Limited |      ✅ |    ✅ |
| View Audit Log         |       ❌ |         ❌ | Limited |    ✅ |
| System Configuration   |       ❌ |         ❌ |      ❌ |    ✅ |

---

# 6. Core Modules

JARVIS OPS terdiri dari beberapa modul utama:

### 6.1 Authentication & Authorization

- Login
- Logout
- User session
- Role-based access control
- Protected routes
- Permission validation

### 6.2 Ticket Management

- Create ticket
- View ticket
- Update ticket
- Assign technician
- Change priority
- Change status
- Comment
- Attachment
- Ticket history

### 6.3 Asset Management

- Asset inventory
- Asset assignment
- Asset status
- Asset history

### 6.4 Knowledge Base

- Article management
- Categories
- Search
- Published/unpublished status

### 6.5 Dashboard & Analytics

- Ticket statistics
- SLA statistics
- Ticket trends
- Technician performance
- Asset statistics

### 6.6 Notification

- Ticket assignment notification
- Ticket status change notification
- Ticket comment notification

### 6.7 Audit Log

Mencatat aktivitas penting yang dilakukan pengguna di dalam sistem.

---

# 7. Ticket Management

Ticket merupakan core entity dalam JARVIS OPS.

## 7.1 Ticket Attributes

Setiap ticket minimal memiliki:

- Ticket ID
- Title
- Description
- Category
- Priority
- Status
- Reporter
- Assigned Technician
- Department
- Created At
- Updated At
- Due At / SLA Deadline
- Resolved At
- Closed At

---

# 8. Ticket Category

Contoh kategori:

### Hardware

- Laptop
- Desktop
- Monitor
- Printer
- Peripheral

### Software

- Operating System
- Microsoft Office
- Internal Application
- Installation Request

### Network

- Wi-Fi
- Internet
- VPN
- DNS

### Account

- Password
- Account Access
- Permission

### Other

- Other IT Request

Kategori dapat dikelola oleh Administrator.

---

# 9. Ticket Priority

Sistem memiliki empat level priority:

| Priority | SLA Target | Example                        |
| -------- | ---------: | ------------------------------ |
| Critical |    2 hours | Company-wide system outage     |
| High     |    4 hours | Employee unable to work        |
| Medium   |    8 hours | Non-critical application issue |
| Low      |   24 hours | General request                |

SLA di atas merupakan konfigurasi awal dan dapat diubah oleh Administrator.

---

# 10. Ticket Status

Lifecycle ticket:

```text
OPEN
  ↓
ASSIGNED
  ↓
IN_PROGRESS
  ↓
RESOLVED
  ↓
CLOSED
```

## 10.1 Status Description

### OPEN

Ticket baru dibuat dan belum ditangani.

### ASSIGNED

Ticket telah diberikan kepada technician.

### IN_PROGRESS

Technician sedang menangani ticket.

### RESOLVED

Technician menyatakan masalah telah diselesaikan.

### CLOSED

Ticket telah dikonfirmasi selesai dan ditutup.

---

# 11. Ticket Business Rules

## BR-001

Setiap ticket harus memiliki reporter.

## BR-002

Ticket baru otomatis memiliki status `OPEN`.

## BR-003

Ticket baru tidak wajib memiliki technician.

## BR-004

Manager atau Admin dapat melakukan assignment technician.

## BR-005

Technician hanya dapat memproses ticket yang di-assign kepadanya, kecuali role tersebut memiliki permission tambahan.

## BR-006

Ticket harus memiliki priority.

## BR-007

Ticket harus memiliki category.

## BR-008

Perubahan status ticket harus dicatat ke dalam ticket history.

## BR-009

Ticket yang berstatus `CLOSED` tidak dapat dimodifikasi oleh Employee.

## BR-010

Setiap perubahan penting harus tercatat dalam audit log.

---

# 12. Ticket Workflow

Contoh workflow utama:

```text
Employee
   │
   │ Create Ticket
   ▼
 OPEN
   │
   │ Assign Technician
   ▼
 ASSIGNED
   │
   │ Technician starts work
   ▼
 IN_PROGRESS
   │
   │ Problem solved
   ▼
 RESOLVED
   │
   │ Employee confirmation
   ▼
 CLOSED
```

Jika employee menyatakan masalah belum selesai setelah status `RESOLVED`, ticket dapat dikembalikan menjadi `IN_PROGRESS`.

---

# 13. SLA Management

SLA digunakan untuk mengukur waktu penyelesaian ticket.

Setiap ticket memiliki:

```text
Created At
     +
SLA Duration
     =
SLA Deadline
```

Contoh:

```text
Created:
10:00

Priority:
High

SLA:
4 hours

Deadline:
14:00
```

Jika ticket belum masuk status `RESOLVED` atau `CLOSED` sampai melewati deadline, sistem menandainya sebagai:

**SLA BREACHED**

---

# 14. SLA Metrics

Dashboard menampilkan:

- Total Tickets
- Tickets Within SLA
- SLA Breached
- SLA Compliance Percentage
- Average Resolution Time

Contoh:

```text
SLA Compliance
87%

Within SLA
87 Tickets

Breached
13 Tickets
```

Formula awal:

```text
SLA Compliance =
Tickets Resolved Within SLA
/
Total Resolved Tickets
× 100
```

---

# 15. Asset Management

Asset Management digunakan untuk mengelola perangkat IT perusahaan.

Contoh asset:

- Laptop
- Desktop
- Monitor
- Printer
- Smartphone
- Router
- Access Point

## 15.1 Asset Attributes

Minimal:

- Asset ID
- Asset Code
- Asset Name
- Asset Category
- Brand
- Model
- Serial Number
- Purchase Date
- Status
- Assigned Employee
- Location
- Notes

---

# 16. Asset Status

Contoh status:

```text
AVAILABLE
ASSIGNED
MAINTENANCE
RETIRED
LOST
```

Asset yang sedang `MAINTENANCE` tidak dapat diberikan kepada employee baru.

---

# 17. Asset Assignment

Asset dapat diberikan kepada employee.

Contoh:

```text
Asset:
Laptop Lenovo ThinkPad

Employee:
Andi

Assigned:
10 August 2026
```

Assignment harus memiliki history sehingga sistem dapat mengetahui:

```text
Laptop A
 ├── Andi       (2025)
 ├── Budi       (2026)
 └── Current: Citra
```

---

# 18. Knowledge Base

Knowledge Base menyediakan artikel troubleshooting yang dapat membantu employee menyelesaikan masalah sederhana tanpa membuat ticket.

Contoh artikel:

### "Wi-Fi Tidak Terhubung"

Category:
Network

Steps:

1. Periksa koneksi Wi-Fi.
2. Pastikan airplane mode tidak aktif.
3. Restart network adapter.
4. Coba reconnect.
5. Hubungi IT Support jika masalah berlanjut.

---

# 19. Knowledge Base Features

- Create article
- Edit article
- Delete article
- Publish article
- Unpublish article
- Category
- Search
- View article
- Related articles

Employee dapat membaca artikel yang berstatus **Published**.

---

# 20. Dashboard

## 20.1 Employee Dashboard

Menampilkan:

- My Open Tickets
- My In Progress Tickets
- Recently Resolved
- My Assets
- Recent Knowledge Base Articles

---

## 20.2 Technician Dashboard

Menampilkan:

- Assigned Tickets
- Open Tickets
- In Progress Tickets
- SLA Breached
- Average Resolution Time
- Recent Activity

---

## 20.3 Manager Dashboard

Menampilkan:

- Total Tickets
- Open Tickets
- Resolved Tickets
- SLA Compliance
- Ticket Trend
- Tickets by Priority
- Tickets by Category
- Technician Performance

---

## 20.4 Admin Dashboard

Menampilkan seluruh metrik Manager ditambah:

- Total Users
- Total Assets
- Total Technicians
- Total Departments
- System Activity

---

# 21. Technician Performance

Manager dapat melihat performa technician berdasarkan:

- Number of tickets handled
- Number of tickets resolved
- Average resolution time
- SLA compliance
- Open tickets
- Breached tickets

Contoh:

```text
Technician Performance

Budi
Resolved Tickets : 42
SLA Compliance   : 93%
Avg Resolution   : 3h 15m

Citra
Resolved Tickets : 37
SLA Compliance   : 89%
Avg Resolution   : 4h 02m
```

Data ini tidak digunakan sebagai penilaian karyawan resmi pada MVP, tetapi sebagai operational analytics.

---

# 22. Notification

Sistem memberikan notification ketika event penting terjadi.

Contoh:

### Ticket Assigned

> Ticket #TCK-0001 telah ditugaskan kepada Anda.

### Ticket Status Changed

> Ticket #TCK-0001 telah berubah menjadi IN_PROGRESS.

### Ticket Resolved

> Ticket #TCK-0001 telah ditandai sebagai RESOLVED.

### Ticket Comment

> Budi menambahkan komentar pada Ticket #TCK-0001.

Pada MVP, notification dapat berupa **in-app notification**.

Email notification dapat menjadi future enhancement.

---

# 23. Audit Log

Audit log digunakan untuk merekam aktivitas penting.

Contoh:

```text
10:10
Andi created Ticket #TCK-001

10:20
Manager assigned Ticket #TCK-001 to Budi

10:43
Budi changed status:
ASSIGNED → IN_PROGRESS

11:35
Budi changed status:
IN_PROGRESS → RESOLVED
```

Audit log minimal menyimpan:

- User
- Action
- Entity
- Entity ID
- Timestamp
- Metadata / description

---

# 24. Search & Filtering

Ticket harus mendukung:

- Search by ticket ID
- Search by title
- Filter by status
- Filter by priority
- Filter by category
- Filter by technician
- Filter by date

Asset:

- Search by asset code
- Search by serial number
- Filter by status
- Filter by category
- Filter by assigned employee

Knowledge Base:

- Search article
- Filter category

---

# 25. Pagination

Data dengan jumlah besar harus menggunakan pagination.

Contoh:

```text
Showing 1-10 of 124 tickets

< Previous
1 2 3 4 5
Next >
```

---

# 26. File Attachment

Ticket dapat memiliki attachment.

Contoh:

- screenshot error;
- image;
- document.

File attachment harus memiliki:

- original filename;
- stored filename;
- file size;
- MIME type;
- uploader;
- upload timestamp.

Ukuran dan tipe file harus divalidasi oleh backend.

---

# 27. Functional Requirements

## FR-001 Authentication

User dapat login menggunakan credential yang valid.

## FR-002 Authorization

Sistem harus membatasi akses berdasarkan role dan permission.

## FR-003 Create Ticket

Employee dapat membuat ticket baru.

## FR-004 Ticket Assignment

Manager/Admin dapat melakukan assignment technician.

## FR-005 Ticket Processing

Technician dapat memproses ticket yang menjadi tanggung jawabnya.

## FR-006 Ticket History

Sistem menyimpan histori perubahan ticket.

## FR-007 SLA Calculation

Sistem menghitung deadline berdasarkan priority.

## FR-008 Asset Management

User dengan permission yang sesuai dapat mengelola asset.

## FR-009 Knowledge Base

User dapat mencari dan membaca knowledge article yang dipublikasikan.

## FR-010 Analytics

Manager dan Admin dapat melihat statistik operasional.

## FR-011 Notification

User menerima notification terkait aktivitas yang relevan.

## FR-012 Audit Logging

Aktivitas penting dicatat dalam audit log.

---

# 28. Non-Functional Requirements

## NFR-001 Performance

API utama (list, detail, aksi) harus memberikan response < 200 ms pada kondisi normal. Endpoint agregasi dashboard harus selesai < 500 ms dengan volume data standar.

## NFR-002 Security

Backend harus melakukan:

- input validation;
- authorization;
- password hashing;
- protection terhadap unauthorized access;
- file validation.

## NFR-003 Responsive Design

Frontend harus dapat digunakan pada:

- Desktop
- Tablet
- Mobile

## NFR-004 Maintainability

Code harus menggunakan struktur yang terorganisir dan mengikuti separation of concerns.

## NFR-005 API Consistency

API harus menggunakan response structure yang konsisten.

## NFR-006 Error Handling

API harus memberikan HTTP status code dan error response yang jelas.

---

# 29. Suggested API Architecture

Base URL:

```text
/api
```

Contoh endpoint:

### Authentication

```text
POST   /api/login
POST   /api/logout
GET    /api/me
```

### Tickets

```text
GET    /api/tickets
POST   /api/tickets
GET    /api/tickets/{id}
PUT    /api/tickets/{id}
DELETE /api/tickets/{id}
```

### Ticket Actions

```text
POST /api/tickets/{id}/assign
POST /api/tickets/{id}/status
POST /api/tickets/{id}/comments
POST /api/tickets/{id}/attachments
```

### Assets

```text
GET    /api/assets
POST   /api/assets
GET    /api/assets/{id}
PUT    /api/assets/{id}
DELETE /api/assets/{id}
```

### Knowledge Base

```text
GET    /api/articles
POST   /api/articles
GET    /api/articles/{id}
PUT    /api/articles/{id}
DELETE /api/articles/{id}
```

### Dashboard

```text
GET /api/dashboard/employee
GET /api/dashboard/technician
GET /api/dashboard/manager
GET /api/dashboard/admin
```

Endpoint di atas merupakan rancangan awal dan dapat berubah ketika ERD dan implementation detail dibuat.

---

# 30. Main User Stories

## Employee

### US-001

Sebagai Employee, saya ingin login agar dapat menggunakan sistem.

### US-002

Sebagai Employee, saya ingin membuat ticket agar masalah IT saya dapat dilaporkan.

### US-003

Sebagai Employee, saya ingin melihat status ticket agar mengetahui perkembangan penanganannya.

### US-004

Sebagai Employee, saya ingin melihat asset yang sedang saya gunakan.

### US-005

Sebagai Employee, saya ingin mencari artikel troubleshooting sebelum membuat ticket.

### US-006

Sebagai Employee, saya ingin menerima notification ketika ticket saya berubah status.

---

## Technician

### US-007

Sebagai Technician, saya ingin melihat ticket yang ditugaskan kepada saya.

### US-008

Sebagai Technician, saya ingin memperbarui status ticket.

### US-009

Sebagai Technician, saya ingin menambahkan komentar agar proses troubleshooting terdokumentasi.

### US-010

Sebagai Technician, saya ingin melihat histori ticket.

### US-011

Sebagai Technician, saya ingin melihat asset yang berkaitan dengan employee atau ticket.

---

## Manager

### US-012

Sebagai Manager, saya ingin melihat seluruh ticket agar dapat memonitor pekerjaan tim IT.

### US-013

Sebagai Manager, saya ingin melakukan assignment ticket kepada technician.

### US-014

Sebagai Manager, saya ingin melihat SLA performance tim.

### US-015

Sebagai Manager, saya ingin melihat performa technician.

---

## Admin

### US-016

Sebagai Admin, saya ingin mengelola user.

### US-017

Sebagai Admin, saya ingin mengelola department.

### US-018

Sebagai Admin, saya ingin mengelola kategori ticket.

### US-019

Sebagai Admin, saya ingin mengelola asset.

### US-020

Sebagai Admin, saya ingin melihat audit log.

---

# 31. Acceptance Criteria — Core Ticket Flow

## Scenario 1 — Create Ticket

**Given** user telah login sebagai Employee
**When** user mengisi title, description, category, dan priority
**Then** sistem membuat ticket baru dengan status `OPEN`.

---

## Scenario 2 — Assign Ticket

**Given** ticket berstatus `OPEN`
**When** Manager memilih technician
**Then** sistem mengubah status menjadi `ASSIGNED` dan membuat notification.

---

## Scenario 3 — Start Work

**Given** ticket telah assigned kepada Technician
**When** Technician memulai pekerjaan
**Then** status berubah menjadi `IN_PROGRESS`.

---

## Scenario 4 — Resolve Ticket

**Given** ticket berstatus `IN_PROGRESS`
**When** Technician menandai ticket sebagai resolved
**Then** sistem mengubah status menjadi `RESOLVED` dan menyimpan `resolved_at`.

---

## Scenario 5 — Close Ticket

**Given** ticket berstatus `RESOLVED`
**When** Employee mengonfirmasi penyelesaian
**Then** ticket berubah menjadi `CLOSED`.

---

## Scenario 6 — SLA Breach

**Given** ticket belum resolved
**When** current time melewati `sla_deadline`
**Then** sistem menandai ticket sebagai `SLA BREACHED`.

---

# 32. MVP Scope

Untuk capstone, fitur berikut ditetapkan sebagai **MVP wajib**:

### Must Have

- Authentication
- Role-based authorization
- Employee management
- Ticket management
- Ticket assignment
- Ticket workflow
- Comments
- Ticket history
- Priority
- Category
- SLA calculation
- Asset management
- Knowledge Base
- Dashboard
- Search
- Filtering
- Pagination
- Notification
- Audit Log

### Must Have (MVP)

- Role-based authorization
- Employee management
- Ticket management
- Ticket assignment
- Ticket workflow
- Comments
- Ticket history
- Priority
- Category
- SLA calculation
- Asset management
- Knowledge Base
- Dashboard
- Search
- Filtering
- Pagination
- Notification (In-App via database)
- Audit Log
- File attachment (Private storage, controller-gated)
- Technician performance analytics

### Should Have (Fase 10 / Pasca MVP)

- Export report (CSV/PDF)
- Advanced filtering
- Dark mode
- User avatar
- Saved filters

### Won't Have in MVP

- Email / SMTP notification
- Real-time chat / WebSocket
- Mobile native application
- AI chatbot
- Payroll
- Financial management
- Complex inventory accounting
- Multi-company tenant management

---

# 33. Success Metrics

Karena JARVIS OPS merupakan capstone project, keberhasilan tidak hanya diukur dari jumlah fitur.

Metric yang digunakan:

### Product

- Employee dapat membuat ticket tanpa bantuan administrator.
- Technician dapat menyelesaikan ticket dari awal hingga selesai.
- Manager dapat memonitor ticket dan SLA.
- Admin dapat mengelola konfigurasi dasar sistem.

### Technical

- REST API berjalan dengan baik.
- Authorization diterapkan pada endpoint.
- Database memiliki relational design yang jelas.
- Core business rules diproses di backend.
- Frontend responsive.
- Automated tests tersedia untuk business-critical functionality.

### Presentation

Reviewer dapat memahami:

1. masalah yang diselesaikan;
2. bagaimana sistem bekerja;
3. mengapa arsitektur tersebut dipilih;
4. bagaimana database didesain;
5. bagaimana security diterapkan;
6. bagaimana business logic bekerja.

---

# 34. Out of Scope

Untuk menjaga scope tetap realistis, fitur berikut tidak menjadi fokus utama:

- payroll;
- accounting;
- procurement;
- full HRIS;
- customer support eksternal;
- native Android/iOS;
- advanced AI/ML;
- enterprise multi-tenant architecture.

---

# 35. Product Architecture

High-level architecture:

```text
┌──────────────────────────┐
│        Next.js           │
│                          │
│  UI / Dashboard / Forms  │
│  Tables / Charts / Auth  │
└────────────┬─────────────┘
             │
             │ REST API
             │
┌────────────▼─────────────┐
│        Laravel           │
│                          │
│  Business logic & API    │
│  (lihat catatan di bawah)│
└────────────┬─────────────┘
             │
             │ Eloquent ORM
             │
┌────────────▼─────────────┐
│          MySQL           │
│                          │
│ Users                    │
│ Tickets                  │
│ Assets                   │
│ Knowledge Base           │
│ Notifications            │
│ Audit Logs               │
└──────────────────────────┘
```

> **Lapisan aplikasi Laravel** (Controllers, Requests/Validation, Services/Business Logic, Policies/Authorization, API Resources, Notifications) dirinci di `docs/architecture/BACKEND-ARCHITECTURE.md` §2–§6. Diagram di atas hanya menampilkan arsitektur level produk.

---

# 36. Development Strategy

> **Catatan Otoritas:** Rencana fase pada bagian ini telah disempurnakan dan digantikan secara definitif oleh `docs/product/ROADMAP.md` (10 Fase terstruktur). Jadwal, deliverable, dan exit criteria wajib mengacu pada dokumen Roadmap.

Project development dibagi menjadi 10 fase (lihat `docs/product/ROADMAP.md`).

- Asset CRUD
- Assignment
- Asset history

## Phase 5 — Knowledge Base

- Article CRUD
- Category
- Search
- Publication

## Phase 6 — Frontend

- Authentication pages
- Dashboard
- Ticket UI
- Asset UI
- Knowledge Base
- Admin interface

## Phase 7 — Analytics & Notification

- Dashboard analytics
- SLA metrics
- Notifications
- Audit logs

## Phase 8 — Quality & Deployment

- Testing
- Bug fixing
- Security review
- Documentation
- Deployment
- Demo preparation

---

# 37. Definition of Done

Sebuah feature dianggap selesai apabila:

- frontend telah terhubung dengan API;
- backend validation tersedia;
- authorization telah diterapkan;
- happy path berhasil;
- error case ditangani;
- database transaction digunakan ketika diperlukan;
- responsive layout tersedia;
- minimal automated test tersedia untuk business-critical logic;
- tidak ada critical bug;
- dokumentasi penggunaan tersedia.

---

# 38. Demo Scenario

Untuk presentasi capstone, demo utama akan menggunakan skenario:

```text
1. Login sebagai Employee
        ↓
2. Employee membuat ticket
        ↓
3. Login sebagai Manager
        ↓
4. Manager assign ticket
        ↓
5. Login sebagai Technician
        ↓
6. Technician memproses ticket
        ↓
7. Technician menambahkan troubleshooting note
        ↓
8. Ticket → RESOLVED
        ↓
9. Login kembali sebagai Employee
        ↓
10. Employee confirm
        ↓
11. Ticket → CLOSED
        ↓
12. Manager melihat analytics
        ↓
13. Dashboard menunjukkan SLA & performance
```

Skenario tersebut menjadi **golden path** untuk demo.

---

# 39. Future Development

Setelah MVP selesai, sistem dapat dikembangkan menjadi:

- Email notification
- Slack/Teams integration
- AI-powered ticket categorization
- AI troubleshooting assistant
- Automatic technician assignment
- Real-time notification menggunakan WebSocket
- Mobile application
- Multi-company support
- Advanced SLA policy
- Asset depreciation
- Service catalog
- Procurement workflow

Fitur future development tidak wajib untuk capstone.

---

# 40. Final Product Vision

JARVIS OPS bukan sekadar aplikasi CRUD untuk membuat ticket.

Visi produk:

> **Satu platform untuk membantu perusahaan mengelola layanan IT, aset, incident, request, dan performa IT secara terstruktur, terukur, dan terdokumentasi.**

Fokus capstone:

```text
Business Problem
       ↓
Well-defined Workflow
       ↓
Clean Database Design
       ↓
Reliable Laravel API
       ↓
Modern Next.js Interface
       ↓
Security + Authorization
       ↓
Analytics + SLA
       ↓
Production-like Application
```

Dengan pendekatan tersebut, project diharapkan dapat menunjukkan kemampuan developer untuk membangun aplikasi secara **end-to-end**, mulai dari memahami masalah hingga menghasilkan sistem yang dapat digunakan.

# JARVIS OPS — PRD Addendum

## Clarification & Technical Decisions — Version 1.1

Dokumen ini melengkapi PRD v1.0 dengan keputusan yang berkaitan dengan relasi Ticket–Asset, lifecycle User, SLA processing, in-app notification, Knowledge Base moderation, dan file attachment.

---

# 1. Ticket & Asset Relationship

## 1.1 Relationship

Setiap ticket dapat dikaitkan dengan satu asset yang sedang digunakan oleh reporter.

Relationship:

```text
Employee
    │
    │ owns/assigned
    ▼
  Asset
    ▲
    │
    │ related to
    │
  Ticket
```

Pada MVP, satu ticket hanya memiliki maksimal **satu asset terkait**.

Asset bersifat **optional/nullable** karena tidak semua ticket berkaitan dengan perangkat tertentu.

Contoh:

### Ticket terkait asset

> Laptop saya tidak bisa menyala.

```text
Ticket:
TCK-0001

Asset:
AST-LTP-001

Asset:
Lenovo ThinkPad T14

Assigned To:
Andi
```

### Ticket tanpa asset

> Saya membutuhkan akses ke VPN perusahaan.

```text
Ticket:
TCK-0002

Asset:
NULL
```

---

# 1.2 Updated Ticket Attributes

Ticket minimal memiliki:

- Ticket ID
- Title
- Description
- Category
- Priority
- Status
- Reporter
- Assigned Technician
- Department
- **Related Asset ID (Optional / Nullable)**
- Created At
- Updated At
- SLA Deadline
- Resolved At
- Closed At

---

# 1.3 Asset Selection Rule

Ketika Employee membuat ticket, field `Asset` hanya menampilkan asset yang:

1. sedang di-assign kepada Employee tersebut;
2. memiliki status yang sesuai untuk digunakan;
3. belum retired/lost.

Employee tidak dapat memilih asset milik Employee lain.

Technician/Manager/Admin dapat melihat informasi asset terkait ticket sesuai permission.

---

# 1.4 Asset–Ticket Business Rules

**BR-011**

Asset pada ticket bersifat optional.

**BR-012**

Employee hanya dapat memilih asset yang sedang di-assign kepadanya.

**BR-013**

Asset yang dipilih harus valid dan terdaftar di sistem.

**BR-014**

Backend harus melakukan validasi kepemilikan/assignment asset, bukan hanya mengandalkan filtering pada frontend.

**BR-015**

Penghapusan asset tidak boleh menghapus histori ticket yang pernah menggunakan asset tersebut.

Untuk menjaga histori, relasi ticket → asset sebaiknya menggunakan referensi yang dapat tetap dipertahankan meskipun asset kemudian berubah status.

---

# 2. User Creation & Registration

## 2.1 Registration Policy

JARVIS OPS merupakan **internal company system**.

MVP tidak menyediakan public self-registration.

```text
Public User
      X
      │
      │ No Self Registration
      ▼
Administrator
      │
      │ Create User
      ▼
    User
```

Account dibuat oleh:

- Administrator;
- Seeder untuk initial/demo accounts.

---

# 2.2 User Creation Flow

Admin membuka:

```text
Admin Dashboard
    ↓
Users
    ↓
Create User
    ↓
Fill User Information
    ↓
Select Role
    ↓
Select Department
    ↓
Create
```

Data minimal:

- Name
- Email
- Password / Temporary Password
- Role
- Department
- Employee information
- Active/Inactive status

---

# 2.3 Initial Seeder

Seeder digunakan untuk development/demo.

Contoh akun:

```text
admin@jarvisops.test
Role: Admin

manager@jarvisops.test
Role: Manager

technician@jarvisops.test
Role: Technician

employee@jarvisops.test
Role: Employee
```

Credential demo tidak boleh digunakan untuk production.

---

# 2.4 User Business Rules

**BR-016**

Public registration tidak tersedia pada MVP.

**BR-017**

Hanya Admin yang dapat membuat user baru.

**BR-018**

Admin tidak boleh membuat email yang sudah terdaftar.

**BR-019**

User yang inactive tidak dapat login.

**BR-020**

Role user ditentukan oleh Admin.

---

# 3. SLA Processing

## 3.1 SLA Strategy

SLA menggunakan kombinasi:

**Database data + scheduled background processing + on-the-fly calculation**

Scheduled task digunakan untuk menjaga data SLA tetap ter-update dan memicu notification.

Frontend/dashboard tidak menjadi satu-satunya mekanisme untuk menentukan SLA breach.

---

# 3.2 SLA Fields

Ticket memiliki:

```text
sla_duration
sla_deadline
resolved_at
closed_at
sla_breached_at
```

`SLA deadline` dihitung ketika ticket dibuat berdasarkan priority.

Contoh:

```text
Created At:
10:00

Priority:
HIGH

SLA:
4 hours

SLA Deadline:
14:00
```

---

# 3.3 Scheduled SLA Check

Laravel Scheduler digunakan untuk mengecek ticket aktif yang SLA deadline-nya telah terlewati.

Conceptual flow:

```text
Laravel Scheduler
       ↓
Every X Minutes
       ↓
Find Active Tickets
       ↓
Check SLA Deadline
       ↓
Deadline Passed?
    /       \
  No         Yes
  │           │
  │           ▼
  │      Mark Breached
  │           │
  │           ▼
  │      Trigger Notification
  │
  ▼
Finish
```

Interval awal:

**Every 5 minutes**

Interval tersebut dapat dikonfigurasi atau disesuaikan selama development/deployment.

---

# 3.4 SLA Breach Rule

Sebuah ticket dianggap breached apabila:

```text
Current Time > SLA Deadline
AND
Status NOT IN (RESOLVED, CLOSED)
```

Ketika kondisi terpenuhi:

```text
sla_breached = true
sla_breached_at = current timestamp
```

Sistem kemudian membuat notification untuk pihak yang relevan.

---

# 3.5 Dashboard SLA

Dashboard tidak bergantung sepenuhnya pada scheduler.

Ketika mengambil data dashboard, sistem tetap dapat menghitung kondisi SLA berdasarkan:

```text
current_time
+
sla_deadline
+
ticket_status
```

Tujuannya sebagai defensive mechanism apabila scheduler terlambat berjalan.

Dengan demikian:

**Scheduler**
→ memperbarui persistence dan notification

**API/Dashboard**
→ memastikan status yang ditampilkan tetap akurat

---

# 4. In-App Notification

## 4.1 MVP Strategy

MVP tidak menggunakan WebSocket atau real-time push notification.

Notification menggunakan:

**Database-backed notification + polling**

Architecture:

```text
Laravel
   │
   │ Create Notification
   ▼
Database
   │
   │ Periodic Request
   ▼
Next.js
   │
   ▼
Notification UI
```

---

# 4.2 Polling

Frontend melakukan request secara berkala untuk mengambil notification terbaru.

Contoh:

```text
Every 30 seconds

GET /api/notifications
```

Interval dapat disesuaikan.

Tidak diperlukan WebSocket pada MVP.

---

# 4.3 Notification Behavior

Notification yang baru dibuat akan ditampilkan sebagai:

- unread notification;
- notification count/badge;
- notification list.

Contoh:

```text
🔔 3

Ticket #TCK-0012
has been assigned to you.

Ticket #TCK-0010
has been resolved.

Budi commented on
Ticket #TCK-0009.
```

User dapat menandai notification sebagai read.

---

# 4.4 Notification Events

MVP notification mencakup:

### Ticket Assigned

Recipient:

Technician

### Ticket Status Changed

Recipient:

Reporter dan/atau Technician terkait.

### Ticket Commented

Recipient:

Relevant ticket participants.

### Ticket Resolved

Recipient:

Reporter.

### SLA Breached

Recipient:

Assigned Technician dan Manager.

---

# 4.5 Real-Time Notification Disclaimer

MVP tidak menjamin instant delivery.

Notification dapat mengalami delay sesuai polling interval.

WebSocket / Laravel Broadcasting / real-time event delivery menjadi **future enhancement**.

---

# 5. Knowledge Base Moderation

## 5.1 MVP Decision

Technician **dapat membuat dan publish artikel secara langsung**.

Workflow MVP:

```text
Technician
     ↓
Create Article
     ↓
Draft
     ↓
Publish
     ↓
Published
```

Manager/Admin tetap dapat melakukan edit/unpublish jika diperlukan.

---

# 5.2 Knowledge Base Roles

| Action             | Technician | Manager | Admin |
| ------------------ | ---------: | ------: | ----: |
| Create Article     |         ✅ |      ✅ |    ✅ |
| Edit Own Article   |         ✅ |      ✅ |    ✅ |
| Edit Other Article |    Limited |      ✅ |    ✅ |
| Publish Article    |         ✅ |      ✅ |    ✅ |
| Unpublish Article  |    Limited |      ✅ |    ✅ |
| Delete Article     |    Limited |      ✅ |    ✅ |

Untuk MVP, permission dapat disederhanakan menjadi:

- Technician dapat mengelola artikel.
- Manager dapat mengelola seluruh artikel.
- Admin memiliki full control.

---

# 5.3 Future Moderation

Moderation workflow tidak menjadi bagian MVP.

Future workflow dapat menjadi:

```text
Draft
  ↓
Pending Review
  ↓
Approved
  ↓
Published
```

Approval oleh Manager/Admin dapat ditambahkan apabila sistem dikembangkan ke production environment dengan knowledge governance yang lebih ketat.

---

# 6. File Attachment

## 6.1 Storage Strategy

MVP menggunakan Laravel Storage bawaan.

Development & Production:

```text
private disk (storage/app/private atau storage/app)
```

File **tidak pernah** diletakkan di `public storage` atau symlink web server. Akses file wajib melalui controller terautentikasi (`GET /api/attachments/{id}/download`) yang memeriksa hak akses ticket induknya.

---

# 6.2 File Limit

Attachment maksimum:

**5 MB per file**

Format yang diperbolehkan:

```text
.jpg
.jpeg
.png
.pdf
```

Untuk MVP, format executable seperti:

```text
.exe
.sh
.bat
```

tidak diperbolehkan.

---

# 6.3 File Validation

Validasi dilakukan di backend.

Minimal:

- MIME/type validation;
- extension validation;
- maximum file size;
- authenticated uploader;
- authorization terhadap ticket.

Frontend validation hanya berfungsi sebagai convenience dan bukan security mechanism.

---

# 6.4 Attachment Metadata

Setiap attachment menyimpan:

- ID
- Ticket ID
- Original Filename
- Stored Filename
- MIME Type
- File Size
- Storage Path
- Uploaded By
- Created At

---

# 6.5 Attachment Security

User hanya dapat mengakses attachment jika user tersebut memiliki permission untuk mengakses ticket terkait.

File tidak boleh dianggap public hanya karena frontend memiliki URL file.

---

# 7. Updated Core Ticket Flow

Dengan keputusan di atas, golden flow menjadi:

```text
Employee Login
      ↓
Create Ticket
      ↓
Select Category
      ↓
Select Priority
      ↓
(Optional)
Select Assigned Asset
      ↓
Submit
      ↓
OPEN
      ↓
Manager Assign Technician
      ↓
ASSIGNED
      ↓
Technician
      ↓
IN_PROGRESS
      ↓
Comments / Attachment
      ↓
RESOLVED
      ↓
Employee Confirmation
      ↓
CLOSED
```

Sementara proses SLA berjalan paralel:

```text
Ticket Created
      ↓
Calculate SLA Deadline
      ↓
Store Deadline
      ↓
Laravel Scheduler
      ↓
Periodic SLA Check
      ↓
Deadline Passed?
      ↓
SLA Breached
      ↓
Notification
```

---

# 8. Updated Technical Requirements

## Backend

Laravel bertanggung jawab atas:

- Authentication
- Authorization
- User management
- Ticket business logic
- Asset validation
- SLA calculation
- SLA scheduled task
- Notification creation
- File validation
- Audit logging

## Frontend

Next.js bertanggung jawab atas:

- Login UI
- Role-based navigation
- Ticket UI
- Asset selection
- Dashboard
- Notification UI
- Notification polling
- File upload UI
- Knowledge Base UI

Frontend tidak boleh menjadi sumber kebenaran untuk:

- permission;
- SLA;
- asset ownership;
- ticket ownership;
- business rules.

Semua aturan tersebut harus divalidasi di backend.

---

# 9. Updated MVP Requirements

Dengan clarification ini, MVP wajib mencakup:

### Authentication

- Login
- Logout
- Session/auth token handling
- No public registration
- Admin-created accounts
- Seeder demo accounts

### Ticket

- Ticket CRUD
- Category
- Priority
- Status
- Reporter
- Technician
- **Optional related asset**
- Comment
- Attachment
- Ticket history
- SLA
- SLA breach

### Asset

- Asset CRUD
- Asset assignment
- Asset history
- Asset-ticket relationship

### Notification

- Database notifications
- Unread count
- Mark as read
- **Polling**
- No WebSocket

### Knowledge Base

- Article CRUD
- Search
- Category
- Draft/Published status
- Technician can publish in MVP

### Administration

- User management
- Department
- Category
- Priority/SLA configuration

### Monitoring

- Dashboard
- SLA analytics
- Technician performance
- Audit log

---

# 10. Technical Decision Summary

| Topic                    | MVP Decision                                  |
| ------------------------ | --------------------------------------------- |
| Ticket → Asset           | Optional, max 1 asset                         |
| Employee Asset Selection | Only assets assigned to employee              |
| Public Registration      | ❌                                            |
| User Creation            | Admin                                         |
| Demo Users               | Seeder                                        |
| SLA Detection            | Laravel Scheduler + defensive API calculation |
| Scheduler Interval       | Every 5 minutes                               |
| SLA Breach Persistence   | ✅                                            |
| SLA Notification         | ✅                                            |
| In-App Notification      | Database                                      |
| Notification Delivery    | Polling                                       |
| WebSocket                | ❌ MVP                                        |
| Knowledge Base           | Technician can publish                        |
| KB Review Workflow       | Future enhancement                            |
| File Storage             | Laravel Storage                               |
| Max Attachment           | 5 MB                                          |
| Allowed File Types       | JPG, JPEG, PNG, PDF                           |
| Object Storage           | Future enhancement                            |

---

# 11. Decisions That Affect Database Design

Keputusan dalam dokumen ini menyebabkan beberapa entity berikut menjadi semakin jelas:

```text
users
roles
departments

assets
asset_assignments
asset_histories

tickets
ticket_categories
ticket_priorities
ticket_statuses
ticket_comments
ticket_attachments
ticket_histories

knowledge_articles
knowledge_categories

notifications
audit_logs
```

Relasi penting:

```text
users
  │
  ├─────────────── tickets
  │                   │
  │                   ├── asset
  │                   ├── category
  │                   ├── priority
  │                   ├── technician
  │                   ├── comments
  │                   ├── attachments
  │                   └── histories
  │
  ├─────────────── assets
  │
  └─────────────── notifications
```

---

# 12. Definition of Technical Success

Implementasi dianggap memenuhi requirement apabila:

1. Employee tidak dapat memilih asset milik Employee lain.
2. Employee tidak dapat membuat akun sendiri.
3. Hanya Admin yang dapat membuat user.
4. Ticket otomatis mendapatkan SLA deadline.
5. Scheduler dapat mendeteksi SLA breach.
6. SLA breach tersimpan di database.
7. Notification dibuat ketika event penting terjadi.
8. Notification dapat muncul melalui polling.
9. Technician dapat membuat dan publish Knowledge Base article.
10. Attachment tervalidasi maksimal 5 MB dan hanya menerima format yang ditentukan.
11. Semua business-critical authorization divalidasi di Laravel backend.
