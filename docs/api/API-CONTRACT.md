# JARVIS OPS — API CONTRACT

**Document Revision:** 1.0
**Base URL:** `/api`
**Auth:** Laravel Sanctum, header `Authorization: Bearer <token>`
**Basis:** PRD §29, NFR-005, NFR-006, `DECISIONS.md` Bagian C

---

## 1. Aturan Umum

| Aspek | Ketentuan |
| --- | --- |
| Format | JSON untuk request dan response. Upload memakai `multipart/form-data`. |
| Header wajib | `Accept: application/json` — tanpa ini Laravel bisa mengembalikan redirect HTML |
| Timestamp | ISO 8601 UTC, contoh `2026-08-31T10:00:00Z` |
| Tanggal saja | `YYYY-MM-DD` |
| Penamaan field | `snake_case` |
| Penamaan route | `kebab-case`, resource dalam bentuk plural |
| ID di URL | ID numerik. Ticket dicari lewat query `search`, bukan `ticket_number` di path. |
| Durasi | Selalu dalam **menit** (integer), diformat di frontend |

Semua respons — sukses maupun gagal — memakai envelope yang sama. Frontend tidak boleh perlu menebak bentuk respons dari status code.

---

## 2. Envelope Response

### 2.1 Sukses — objek tunggal

```json
{
  "success": true,
  "message": "Ticket retrieved successfully.",
  "data": {
    "id": 12,
    "ticket_number": "TCK-0012"
  }
}
```

### 2.2 Sukses — koleksi dengan pagination

```json
{
  "success": true,
  "message": "Tickets retrieved successfully.",
  "data": [
    { "id": 12, "ticket_number": "TCK-0012" },
    { "id": 11, "ticket_number": "TCK-0011" }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 124,
    "last_page": 13,
    "from": 1,
    "to": 10
  }
}
```

`meta` cukup untuk merender `Showing 1-10 of 124 tickets` beserta kontrol halaman sesuai §25 PRD. Tidak ada `links` berisi URL — frontend memakai BFF proxy, jadi URL absolut dari backend justru menyesatkan.

### 2.3 Sukses tanpa data

```json
{
  "success": true,
  "message": "Notification marked as read.",
  "data": null
}
```

### 2.4 Error umum

```json
{
  "success": false,
  "message": "You are not allowed to assign a technician.",
  "errors": null
}
```

### 2.5 Error validasi (422)

```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "title": ["The title field is required."],
    "asset_id": ["The selected asset is not assigned to you."]
  }
}
```

Kunci pada `errors` adalah nama field persis seperti yang dikirim, sehingga bisa dipetakan langsung ke `setError` react-hook-form tanpa penerjemahan.

---

## 3. HTTP Status Code

| Code | Dipakai untuk |
| --- | --- |
| 200 | GET, PUT, POST aksi yang berhasil |
| 201 | Resource baru dibuat |
| 204 | Tidak dipakai — selalu kembalikan body dengan envelope |
| 400 | Request cacat yang bukan soal validasi field |
| 401 | Tidak ada token, token invalid, atau token dicabut |
| 403 | Terautentikasi tapi tidak berhak (kegagalan Policy) |
| 404 | Resource tidak ada, **atau** ada tapi user tidak boleh tahu keberadaannya |
| 409 | Konflik state, mis. asset sudah ter-assign ke orang lain |
| 422 | Validasi gagal, termasuk transisi status ilegal |
| 429 | Rate limit terlampaui |
| 500 | Kesalahan tak terduga. Di produksi tidak membocorkan detail. |

Catatan soal 403 vs 404: untuk resource yang keberadaannya sendiri bersifat sensitif (ticket milik orang lain), gunakan **404**. Mengembalikan 403 memberi tahu penyerang bahwa ID tersebut ada.

---

## 4. Query Parameter Standar

Berlaku untuk semua endpoint list.

| Parameter | Tipe | Default | Keterangan |
| --- | --- | --- | --- |
| `page` | int | 1 | Halaman |
| `per_page` | int | 10 | Maksimum 100 |
| `search` | string | — | Pencarian teks, cakupannya spesifik per resource |
| `sort_by` | string | `created_at` | Hanya kolom yang di-whitelist |
| `sort_dir` | `asc`/`desc` | `desc` | |

`sort_by` **wajib** divalidasi terhadap daftar kolom yang diizinkan per resource. Meneruskannya langsung ke `orderBy` membuka celah kebocoran informasi.

---

## 5. Authentication

### `POST /api/login`

Tanpa auth. Rate limit 5 percobaan per menit per IP.

```json
{ "email": "employee@jarvisops.test", "password": "password" }
```

Respons `200`:

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "1|abcdef...",
    "user": {
      "id": 4,
      "email": "employee@jarvisops.test",
      "full_name": "Andi",
      "status": "active",
      "role": { "id": 1, "name": "employee" },
      "department": { "id": 2, "name": "Finance" }
    }
  }
}
```

Kegagalan:

- Kredensial salah → `422`, `errors.email: ["These credentials do not match our records."]`
- User `status != 'active'` → `422`, `errors.email: ["This account is inactive."]` (BR-019)

Pesan untuk email tidak ditemukan dan password salah **harus identik** agar tidak membocorkan email mana yang terdaftar.

Token hanya melewati BFF Next.js; ia disimpan di cookie httpOnly dan tidak pernah dikirim ke browser dalam bentuk yang bisa dibaca JavaScript. Token memiliki **masa hidup absolut 12 jam**, dan akan ditolak (`401`) bila melewati batas itu (lihat `DECISIONS.md` D-25).

### `POST /api/logout`

Mencabut token yang sedang dipakai. Respons `200`, `data: null`.

### `GET /api/me`

### `PUT /api/me`

Update profil mandiri (telepon, nama). Tidak bisa mengubah `role_id` atau `email`.

```json
{
  "full_name": "Budi Santoso Updated",
  "phone": "08123456789"
}
```

Respon `200 OK` mengembalikan object user yang telah diperbarui.

```json
{
  "success": true,
  "message": "Profile retrieved successfully.",
  "data": {
    "id": 4,
    "email": "employee@jarvisops.test",
    "full_name": "Andi",
    "role": { "id": 1, "name": "employee" },
    "department": { "id": 2, "name": "Finance" },
    "profile": {
      "employee_code": "EMP-0004",
      "position": "Staff",
      "phone": "08123456789"
    },
    "permissions": ["ticket.create", "ticket.view-own", "article.view-published"]
  }
}
```

`permissions` dipakai frontend untuk menyembunyikan menu dan tombol. Ini kenyamanan, bukan keamanan — Policy di backend tetap penjaga sebenarnya.

### `PUT /api/me/password`

```json
{ "current_password": "old", "password": "new", "password_confirmation": "new" }
```

### `GET /up`

Tanpa auth. Endpoint bawaan Laravel 11/13 untuk healthcheck container.

---

## 6. Tickets

### `GET /api/tickets`

Scoping otomatis: Employee hanya melihat ticket dengan `reporter_id` miliknya. Technician, Manager, Admin melihat semua.

| Parameter | Keterangan |
| --- | --- |
| `search` | Cocok pada `ticket_number` atau `title` |
| `status_id` | Satu ID atau daftar dipisah koma |
| `priority_id` | Idem |
| `category_id` | Idem |
| `technician_id` | ID, atau `unassigned` untuk yang belum di-assign. Tidak boleh dikirim lewat body PUT (D-18). |
| `reporter_id` | Diabaikan untuk Employee (selalu dirinya sendiri) |
| `department_id` | |
| `asset_id` | |
| `sla_status` | `on_track` \| `breached` |
| `created_from`, `created_to` | `YYYY-MM-DD` |
| `sort_by` | `created_at`, `updated_at`, `sla_deadline`, `priority_id`, `status_id`, `ticket_number` |

Item list (ringkas, tanpa deskripsi panjang):

```json
{
  "id": 12,
  "ticket_number": "TCK-0012",
  "title": "Laptop tidak bisa menyala",
  "status": { "id": 3, "name": "IN_PROGRESS" },
  "priority": { "id": 2, "name": "High", "sla_minutes": 240 },
  "category": { "id": 1, "name": "Hardware" },
  "reporter": { "id": 4, "full_name": "Andi" },
  "technician": { "id": 3, "full_name": "Budi" },
  "sla_deadline": "2026-08-31T14:00:00Z",
  "sla_breached": false,
  "sla_status": "on_track",
  "created_at": "2026-08-31T10:00:00Z"
}
```

`sla_status` dihitung on-the-fly saat request (Addendum §3.5), sementara `sla_breached` adalah nilai persisten yang ditulis scheduler. Keduanya sengaja ditampilkan: kalau berbeda, artinya scheduler sedang tertinggal dan frontend tetap menampilkan angka yang benar.

### `POST /api/tickets`

```json
{
  "title": "Laptop tidak bisa menyala",
  "description": "Setelah update kemarin, laptop tidak mau booting.",
  "category_id": 1,
  "priority_id": 2,
  "asset_id": 7
}
```

Aturan:

- `title` wajib, maksimum 200
- `description` wajib
- `category_id`, `priority_id` wajib dan harus ada (BR-006, BR-007)
- `asset_id` opsional (BR-011); jika diisi, harus asset yang sedang ter-assign ke user pembuat (BR-012, BR-014)
- `reporter_id`, `status_id`, `department_id`, dan semua field SLA **diabaikan** jika dikirim — semuanya ditentukan server (BR-001, BR-002)

Respons `201` berisi ticket lengkap dengan `ticket_number` dan `sla_deadline` yang sudah terisi.

### `GET /api/tickets/{id}`

Ticket lengkap: seluruh atribut, relasi (status, priority, category, reporter, technician, department, asset), jumlah komentar dan attachment, serta `available_actions`.

```json
{
  "id": 12,
  "ticket_number": "TCK-0012",
  "title": "Laptop tidak bisa menyala",
  "description": "...",
  "status": { "id": 3, "name": "IN_PROGRESS" },
  "priority": { "id": 2, "name": "High", "sla_minutes": 240 },
  "category": { "id": 1, "name": "Hardware" },
  "reporter": { "id": 4, "full_name": "Andi", "department": "Finance" },
  "technician": { "id": 3, "full_name": "Budi" },
  "asset": { "id": 7, "asset_tag": "AST-LTP-001", "name": "Lenovo ThinkPad T14" },
  "sla_duration_minutes": 240,
  "sla_deadline": "2026-08-31T14:00:00Z",
  "sla_breached": false,
  "sla_status": "on_track",
  "sla_remaining_minutes": 95,
  "resolved_at": null,
  "closed_at": null,
  "comments_count": 3,
  "attachments_count": 1,
  "available_actions": ["comment", "attach", "resolve"],
  "created_at": "2026-08-31T10:00:00Z",
  "updated_at": "2026-08-31T12:25:00Z"
}
```

`available_actions` dihitung backend dari status + role + kepemilikan. Frontend memakainya untuk memutuskan tombol yang tampil, sehingga logika transisi tidak perlu diduplikasi di dua tempat.

`asset` tetap disertakan meski asset sudah di-soft-delete — histori ticket tidak boleh hilang (BR-015). Tambahkan penanda `"deleted": true` bila demikian.

### `PUT /api/tickets/{id}`

Field yang boleh diubah tergantung role. Employee hanya bisa mengubah `title` dan `description` selama ticket belum `CLOSED` (BR-009). Technician/Manager/Admin tidak dapat mengedit isi tiket yang telah `CLOSED`. Mereka juga bisa mengubah `category_id`.

(`priority_id` dan `status_id` harus diubah via endpoint khusus untuk menjaga log dan locking, lihat D-18).

### `DELETE /api/tickets/{id}`

Soft delete. Admin saja.

### `POST /api/tickets/{id}/assign`

### `POST /api/tickets/{id}/unassign`

Manager/Admin saja. Alias eksplisit untuk `ASSIGNED -> OPEN` (D-20).

```json
{
  "note": "Teknisi sebelumnya cuti sakit."
}
```

Manager/Admin saja (BR-004).

```json
{ "technician_id": 3, "note": "Tolong ditangani hari ini." }
```

Validasi: target harus user dengan role `technician` dan `status = active`. Efek: status → `ASSIGNED`, history dicatat, notifikasi ke technician (Skenario 2 §31).

### `POST /api/tickets/{id}/status`

```json
{ "status_id": 3, "note": "Mulai pengecekan hardware." }
```

Transisi ilegal → `422` dengan `errors.status_id`. Aturan lengkap ada di `docs/product/STATUS-TRANSITION.md`.

### `POST /api/tickets/{id}/priority`

```json
{ "priority_id": 1, "note": "Eskalasi, seluruh tim terdampak." }
```

Technician/Manager/Admin.

### `GET /api/tickets/{id}/comments` · `POST /api/tickets/{id}/comments`

### `PUT /api/tickets/{id}/comments/{comment_id}` · `DELETE /api/tickets/{id}/comments/{comment_id}`

Mengubah atau menghapus komentar (D-20). Hanya bisa dilakukan oleh pembuat komentar dalam batas 15 menit, atau oleh Admin kapan saja.

Hanya partisipan ticket (reporter, technician yang di-assign, Manager, Admin).

```json
{ "body": "Sudah dicek, RAM perlu diganti." }
```

### `GET /api/tickets/{id}/histories`

Timeline perubahan, urut `created_at` menaik.

```json
{
  "id": 45,
  "field_changed": "status_id",
  "old_value": "ASSIGNED",
  "new_value": "IN_PROGRESS",
  "user": { "id": 3, "full_name": "Budi" },
  "created_at": "2026-08-31T10:43:00Z"
}
```

`old_value` dan `new_value` menyimpan **label yang terbaca manusia**, bukan ID mentah. Menyimpan ID akan membuat timeline tidak bisa dibaca kalau nama status atau priority berubah di kemudian hari.

### `GET /api/tickets/{id}/attachments` · `POST /api/tickets/{id}/attachments`

Upload `multipart/form-data`, field `file`. Maksimum 5 MB, hanya `jpg`, `jpeg`, `png`, `pdf` (Addendum §6.2).

```json
{
  "id": 9,
  "original_filename": "error-screenshot.png",
  "mime_type": "image/png",
  "file_size": 245678,
  "uploaded_by": { "id": 4, "full_name": "Andi" },
  "download_url": "/api/attachments/9/download",
  "created_at": "2026-08-31T10:05:00Z"
}
```

`storage_path` dan `stored_filename` **tidak pernah** dikirim ke client — keduanya detail internal dan membocorkannya membuka celah traversal.

### `GET /api/attachments/{id}/download`

Mengembalikan file stream setelah Policy ticket terkait lulus (Addendum §6.5). Bukan JSON. Tidak ada URL publik ke file.

### `DELETE /api/attachments/{id}`

Uploader, Manager, atau Admin. Record dan file fisik keduanya dihapus.

---

## 7. Assets

### `GET /api/assets`

Technician/Manager/Admin.

| Parameter | Keterangan |
| --- | --- |
| `search` | `asset_tag`, `serial_number`, `name` |
| `status` | `available` \| `assigned` \| `maintenance` \| `retired` \| `lost` |
| `category` | |
| `assigned_user_id` | Pemegang aktif |
| `sort_by` | `asset_tag`, `name`, `status`, `purchase_date`, `created_at` |

### `GET /api/assets/assignable`

### `GET /api/assets/{id}`

Detail aset tunggal (D-20).

```json
{
  "success": true,
  "message": "Asset retrieved.",
  "data": {
    "id": 1,
    "asset_tag": "AST-0001",
    "name": "ThinkPad X1",
    "category": "Laptop",
    "status": "assigned",
    "current_assignment": {
      "user_id": 2,
      "full_name": "Employee Satu",
      "assigned_at": "2026-08-30T10:00:00Z"
    }
  }
}
```

Asset yang boleh dipilih user login saat membuat ticket (Addendum §1.3): sedang ter-assign kepadanya, status layak pakai, bukan `retired`/`lost`.

Endpoint ini murni kenyamanan UI. Validasi sebenarnya tetap dilakukan saat `POST /api/tickets` (BR-014).

### `GET /api/my-assets`

Asset yang sedang dipegang user login, untuk US-004.

### `POST /api/assets` · `PUT /api/assets/{id}` · `DELETE /api/assets/{id}`

```json
{
  "asset_tag": "AST-LTP-001",
  "name": "Lenovo ThinkPad T14",
  "category": "Laptop",
  "brand": "Lenovo",
  "model": "T14 Gen 3",
  "serial_number": "PF3ABCDE",
  "purchase_date": "2025-03-15",
  "status": "available",
  "notes": null
}
```

`asset_tag` dan `serial_number` unik. Delete adalah soft delete — histori ticket tetap utuh (BR-015).

### `POST /api/assets/{id}/assign`

```json
{ "user_id": 4, "notes": "Penggantian unit lama." }
```

Ditolak `422` jika status asset `maintenance` (§16 PRD), `retired`, atau `lost`. Ditolak `409` jika asset masih punya assignment aktif.

### `POST /api/assets/{id}/release`

```json
{ "notes": "Dikembalikan, karyawan resign." }
```

Mengisi `released_at`, status asset kembali `available`.

### `GET /api/assets/{id}/history`

Gabungan `asset_assignments` dan `asset_histories`, urut waktu, untuk merender riwayat kepemilikan seperti §17 PRD.

---

## 8. Knowledge Base

### `GET /api/articles`

Employee hanya menerima artikel `published`. Technician/Manager/Admin bisa memakai `status` untuk melihat draft.

| Parameter | Keterangan |
| --- | --- |
| `search` | `title` dan `content` |
| `category_id` | |
| `status` | `draft` \| `published` — diabaikan untuk Employee |
| `author_id` | |
| `sort_by` | `created_at`, `title`, `view_count` |

### `GET /api/articles/{slug}`

Diakses lewat slug agar URL frontend enak dibaca. Menambah `view_count`. Menyertakan `related_articles` (kategori sama, maksimum 5, kecuali dirinya).

### `POST /api/articles` · `PUT /api/articles/{id}` · `DELETE /api/articles/{id}`

```json
{
  "title": "Wi-Fi Tidak Terhubung",
  "category_id": 3,
  "content": "1. Periksa koneksi Wi-Fi.\n2. Pastikan airplane mode tidak aktif.",
  "status": "draft"
}
```

`slug` dibuat otomatis dari judul dan dijamin unik. Kalau judul diubah, slug **tidak** ikut berubah — mengubahnya akan mematikan tautan yang sudah tersebar.

### `POST /api/articles/{id}/publish` · `POST /api/articles/{id}/unpublish`

Technician boleh publish langsung (Addendum §5.1).

### `GET /api/knowledge-categories`

Bisa diakses semua role terautentikasi (dibutuhkan untuk filter).

---

## 9. Notifications

### `GET /api/notifications`

Selalu tercakup ke user login. Tidak ada parameter apa pun yang bisa dipakai melihat notifikasi orang lain.

| Parameter | Keterangan |
| --- | --- |
| `is_read` | `true` \| `false` |
| `type` | Tipe notifikasi |

```json
{
  "id": 88,
  "type": "TICKET_ASSIGNED",
  "data": {
    "ticket_id": 12,
    "ticket_number": "TCK-0012",
    "title": "Laptop tidak bisa menyala",
    "actor_name": "Manager Dewi",
    "message": "Ticket #TCK-0012 telah ditugaskan kepada Anda.",
    "url": "/tickets/12"
  },
  "is_read": false,
  "read_at": null,
  "created_at": "2026-08-31T10:20:00Z"
}
```

`data` sengaja berisi teks siap tampil dan URL tujuan. Dengan begitu dropdown notifikasi bisa dirender tanpa query tambahan per item — penting karena endpoint ini dipanggil tiap 30 detik.

### `GET /api/notifications/unread-count`

```json
{ "success": true, "message": "...", "data": { "unread_count": 3 } }
```

Endpoint paling sering dipanggil di seluruh sistem (polling 30 detik × jumlah user). Jaga tetap satu query `COUNT` dengan index `(user_id, is_read)` yang sudah ada di skema.

### `POST /api/notifications/{id}/read` · `POST /api/notifications/read-all`

Menandai notifikasi milik user lain → `404`.

---

## 10. Dashboard

Empat endpoint, masing-masing dijaga role sesuai `docs/product/PERMISSION-MATRIX.md`.

### `GET /api/dashboard/employee`

```json
{
  "my_open_tickets": 2,
  "my_in_progress_tickets": 1,
  "my_resolved_tickets": 8,
  "recent_tickets": [],
  "my_assets": [],
  "recent_articles": []
}
```

> **Amandemen B4:** `recent_articles[]` disajikan menggunakan `ArticleListResource` dengan eager load `category,author`. Payload ringkas (tanpa field `content` penuh) dan menyertakan objek relasi `{ id, name }` untuk kategori serta `{ id, full_name }` untuk author.

### `GET /api/dashboard/technician`

```json
{
  "assigned_tickets": 5,
  "open_tickets": 12,
  "in_progress_tickets": 3,
  "sla_breached": 1,
  "avg_resolution_minutes": 195,
  "sla_compliance_percentage": 93.0,
  "recent_activity": [
    {
      "id": 12,
      "field_changed": "status_id",
      "old_value": "2",
      "new_value": "3",
      "user": { "id": 3, "full_name": "Budi" },
      "ticket": { "ticket_number": "TIC-20260901-0001", "title": "Printer Rusak" },
      "created_at": "2026-09-01T08:00:00.000000Z"
    }
  ]
}
```

> **Amandemen B1:** Ditambahkan metrik `sla_compliance_percentage` untuk tiket resolved teknisi yang sedang login. Menggunakan formula D-03 (`resolved within SLA / total resolved × 100`), dan bernilai `null` bila belum ada tiket yang terselesaikan (`total resolved = 0`).
>
> **Amandemen B3:** Elemen `recent_activity[]` menyertakan relasi `ticket: { ticket_number, title }` saat relasi ter-load (`whenLoaded('ticket')`) agar item aktivitas dapat ditautkan langsung ke detail tiket di antarmuka.

### `GET /api/dashboard/manager`

```json
{
  "total_tickets": 124,
  "open_tickets": 18,
  "resolved_tickets": 100,
  "closed_tickets": 92,
  "unassigned_tickets": 4,
  "sla": {
    "within_sla": 87,
    "breached": 13,
    "compliance_percentage": 87.0,
    "avg_resolution_minutes": 195
  },
  "ticket_trend": [{ "date": "2026-08-25", "created": 8, "resolved": 6 }],
  "by_priority": [{ "priority": "High", "count": 34 }],
  "by_category": [{ "category": "Hardware", "count": 41 }],
  "technician_performance": [
    {
      "technician": { "id": 3, "full_name": "Budi" },
      "handled": 48,
      "resolved": 42,
      "open": 4,
      "breached": 3,
      "avg_resolution_minutes": 195,
      "sla_compliance_percentage": 93.0
    }
  ]
}
```

> **Amandemen B2:** Ditambahkan metrik `unassigned_tickets` yang menghitung snapshot live tiket berstatus OPEN dan belum ditugaskan (`technician_id IS NULL`). Nilai ini bersifat live dan tidak dipengaruhi filter rentang tanggal (`date_from` / `date_to`).

`compliance_percentage` memakai formula §14 PRD persis: `resolved within SLA / total resolved × 100`. Bila `total resolved = 0`, kembalikan `null` — bukan `0` dan bukan `100`. Keduanya akan salah dibaca sebagai fakta, padahal yang benar adalah "belum ada data".

Parameter opsional `date_from` dan `date_to` untuk membatasi rentang; default 30 hari terakhir.

### `GET /api/dashboard/admin`

Seluruh isi dashboard manager, ditambah:

```json
{
  "total_users": 42,
  "total_technicians": 6,
  "total_departments": 5,
  "total_assets": 88,
  "assets_by_status": [{ "status": "assigned", "count": 61 }],
  "recent_system_activity": []
}
```

---

## 11. Administration

Seluruh endpoint di bagian ini Admin saja, kecuali disebutkan lain.

### Users

| Endpoint | Keterangan |
| --- | --- |
| `GET /api/users` | Filter `role_id`, `department_id`, `status`; search nama & email |
| `POST /api/users` | Buat user (BR-017) |
| `GET /api/users/{id}` | |
| `PUT /api/users/{id}` | |
| `DELETE /api/users/{id}` | Soft delete |
| `POST /api/users/{id}/activate` | |
| `POST /api/users/{id}/deactivate` | Deaktivasi juga mencabut seluruh token user tersebut |
| `POST /api/users/{id}/reset-password` | Set password sementara |

```json
{
  "full_name": "Andi Pratama",
  "email": "andi@jarvisops.test",
  "password": "temporary-password",
  "role_id": 1,
  "department_id": 2,
  "status": "active",
  "profile": {
    "employee_code": "EMP-0004",
    "phone": "08123456789",
    "position": "Staff",
    "hire_date": "2025-01-15"
  }
}
```

Email duplikat → `422` (BR-018). Tidak ada endpoint registrasi publik (BR-016).

### `GET /api/technicians`

Daftar ringkas user berrole technician yang aktif, untuk dropdown assignment. Manager/Admin.

### Referensi lain

### `GET /api/roles`

Daftar role untuk dropdown (D-20).

```json
{
  "success": true,
  "message": "Roles retrieved.",
  "data": [
    { "id": 1, "name": "administrator" },
    { "id": 2, "name": "manager" },
    { "id": 3, "name": "technician" },
    { "id": 4, "name": "employee" }
  ]
}
```

Seluruh resource di bawah memakai pola CRUD yang sama: `GET` daftar, `POST` buat, `PUT /{id}` ubah, `DELETE /{id}` hapus (soft delete).

| Resource | Base path | Catatan |
| --- | --- | --- |
| Departments | `/api/departments` | GET boleh semua role terautentikasi |
| Ticket categories | `/api/ticket-categories` | GET boleh semua role |
| Ticket priorities | `/api/ticket-priorities` | GET boleh semua role; termasuk `sla_minutes` |
| Ticket statuses | `/api/ticket-statuses` | **Hanya GET.** Status adalah bagian dari business logic, bukan konfigurasi — menambah atau menghapusnya akan merusak matriks transisi. |
| Knowledge categories | `/api/knowledge-categories` | GET boleh semua role |

Mengubah `sla_minutes` pada priority **tidak** mengubah ticket yang sudah ada, karena setiap ticket menyimpan snapshot `sla_duration_minutes` dan `sla_deadline` sendiri.

### `GET /api/audit-logs` · `GET /api/audit-logs/{id}`

Admin penuh; Manager terbatas sesuai permission matrix.

| Parameter | Keterangan |
| --- | --- |
| `user_id`, `module`, `action` | |
| `module_id` | |
| `date_from`, `date_to` | |

```json
{
  "id": 301,
  "user": { "id": 2, "full_name": "Manager Dewi" },
  "action": "assign",
  "module": "ticket",
  "module_id": 12,
  "description": "Assigned ticket TCK-0012 to Budi",
  "ip_address": "10.0.0.5",
  "created_at": "2026-08-31T10:20:00Z"
}
```

`old_data` dan `new_data` hanya disertakan pada `GET /api/audit-logs/{id}`, tidak di list — keduanya bisa besar dan biasanya tidak dipakai saat menelusuri.

**Penyimpangan dari ERD v1.2:** `audit_logs` di `docs/schema.sql` belum punya kolom `description`, padahal PRD §23 meminta "Metadata / description" dan contoh §23 menampilkan kalimat siap baca (`Manager assigned Ticket #TCK-001 to Budi`). Menyusun kalimat itu on-the-fly dari `old_data`/`new_data` berarti frontend harus tahu cara memformat setiap kombinasi module × action — logika yang lebih baik dibuat sekali di backend saat log ditulis.

Keputusan: migration menambahkan `description VARCHAR(500) NULL` pada `audit_logs`, dan `docs/schema.sql` disinkronkan di Fase 10.

---

## 12. Rate Limiting

| Kelompok | Batas |
| --- | --- |
| `POST /api/login` | 5 per menit per IP |
| Upload attachment | 20 per menit per user |
| Endpoint list dengan `search` | 60 per menit per user |
| Endpoint terautentikasi lainnya | 120 per menit per user |

Respons `429` menyertakan header `Retry-After`.

---

## 13. Yang Tidak Boleh Dipercaya Dari Client

Daftar ini adalah inti NFR-002 dan Addendum §8. Nilai berikut **selalu** ditentukan server, dan diabaikan bila dikirim client (atau ditolak dengan 422 jika perlu proteksi ketat):

- `reporter_id` — dari user terautentikasi (BR-001)
- `status_id` — pada create selalu `OPEN` (BR-002). Pada update tidak boleh dari payload `PUT /tickets/{id}`, harus via endpoint khusus.
- `technician_id` — ditentukan via endpoint `/assign` atau transisi self-assign.
- `ticket_number` — digenerate server
- `sla_duration_minutes`, `sla_deadline`, `sla_breached`, `sla_breached_at`
- `resolved_at`, `closed_at`
- `slug` artikel — digenerate dari title, immutable.
- `uploaded_by`, `stored_filename`, `storage_path`, `file_size`, `mime_type`
- `user_id` pada notifikasi, audit log, komentar, history
- `author_id` pada artikel
- `view_count`
- `role_id` milik diri sendiri — user tidak bisa menaikkan role-nya
- `status` user — tidak boleh memotong flow aktivasi
- Kelayakan `asset_id` — diverifikasi ulang terhadap assignment reporter (BR-014)

Frontend bukan sumber kebenaran untuk permission, SLA, kepemilikan asset, kepemilikan ticket, maupun business rule apa pun.

---

## 14. Amandemen Endpoint Fase 8

Untuk mendukung form filter, assign aset, dan editor artikel KB di UI frontend, ditambahkan 3 endpoint operasional (Amandemen A2, A3, A4):

### A2. Distinct Kategori Aset
- **Route:** `GET /api/assets/categories`
- **Gate:** `asset.viewAny`
- **Respons:** Array string daftar kategori unik aset yang ada di database, terurut abjad.
```json
{
  "success": true,
  "message": "Asset categories retrieved.",
  "data": ["Laptop", "Monitor", "Printer"]
}
```

### A3. Pengguna untuk Penugasan Aset
- **Route:** `GET /api/users/assignable`
- **Gate:** `user.lookup` (Admin, Manager, Technician)
- **Parameter:** `?search=` (opsional)
- **Respons:** Array ringkas pengguna aktif yang dapat menerima penugasan aset.
```json
{
  "success": true,
  "message": "Assignable users retrieved.",
  "data": [
    {
      "id": 4,
      "full_name": "Demo Employee",
      "department": "Human Resources"
    }
  ]
}
```

### A4. Detail Artikel untuk Editor
- **Route:** `GET /api/articles/{article}/edit`
- **Gate:** `ArticlePolicy@update` (Admin, Manager, Technician pembuat artikel)
- **Respons:** Mengembalikan detail artikel tanpa menaikkan `view_count` dan tanpa `related_articles`.
```json
{
  "success": true,
  "message": "Article edit data retrieved.",
  "data": {
    "id": 1,
    "title": "Cara Konfigurasi VPN Kantor",
    "slug": "cara-konfigurasi-vpn-kantor",
    "content": "...",
    "category_id": 2,
    "status": "published"
  }
}
```

