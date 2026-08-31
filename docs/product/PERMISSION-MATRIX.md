# JARVIS OPS — PERMISSION MATRIX

**Version:** 1.0
**Basis:** PRD §5, Addendum §5.2
**Implementasi:** Laravel Gate + Policy berbasis kolom `users.role_id`

---

## 1. Mekanisme

Otorisasi memakai **Gate dan Policy bawaan Laravel**, tanpa paket eksternal.

Alasan menolak `spatie/laravel-permission`: skema sudah menetapkan satu role per user lewat `users.role_id` (bukan many-to-many). Paket tersebut akan menambah lima tabel dan konsep permission-per-user yang tidak dipakai sama sekali, sementara nilai yang diberikannya — UI pengelolaan permission dinamis — bukan bagian MVP. Gate berbasis enum lebih sedikit kode, lebih mudah dibaca reviewer, dan lebih cepat.

### Lapisan penjagaan

```
Request
  ↓
[1] Middleware auth:sanctum       → 401 jika tidak terautentikasi
  ↓
[2] Middleware role:              → 403, penjagaan kasar per grup route
  ↓
[3] Policy / Gate                 → 403, penjagaan sebenarnya per resource
  ↓
[4] FormRequest                   → 422, validasi field
  ↓
[5] Service                       → 422/409, business rule
```

Lapisan 3 adalah penjaga sebenarnya. Lapisan 2 hanya mempersingkat — dan tidak boleh menjadi satu-satunya penjaga, karena middleware tidak tahu apa-apa tentang kepemilikan resource.

Navigasi dan tombol yang disembunyikan di frontend **bukan lapisan keamanan**. Ia hanya mencegah pengguna melihat pilihan yang akan gagal.

### Enum role

```php
enum RoleName: string {
    case Employee   = 'employee';
    case Technician = 'technician';
    case Manager    = 'manager';
    case Admin      = 'admin';
}
```

Nilai enum ini harus cocok persis dengan `roles.name` yang ditulis seeder. Nama role tidak pernah ditulis sebagai string literal di luar enum ini.

### Hierarki

Admin mewarisi seluruh kemampuan Manager. Manager mewarisi seluruh kemampuan Technician untuk hal yang berkaitan dengan ticket dan knowledge base — tapi **tidak** mewarisi kepemilikan: Manager tidak otomatis jadi "technician pemegang" pada ticket mana pun.

Diimplementasikan dengan `Gate::before` untuk Admin saja:

```php
Gate::before(fn ($user) => $user->isAdmin() ? true : null);
```

Manager tidak memakai `Gate::before` karena ada hal yang justru **tidak boleh** dilakukan Manager — mengakses audit log penuh, misalnya. Membuat Manager lolos semua gate akan menghapus batas itu.

---

## 2. Keputusan Atas "Limited" di PRD

PRD memakai kata "Limited" di tiga tempat tanpa mendefinisikannya. Berikut keputusannya.

### 2.1 Technician terhadap artikel milik orang lain

Addendum §5.2 menandai Edit Other Article, Unpublish, dan Delete sebagai "Limited" untuk Technician.

**Keputusan:** Technician boleh **edit** dan **unpublish** artikel siapa pun, tapi hanya boleh **delete** artikel miliknya sendiri.

Alasan: knowledge base adalah aset bersama tim IT — memperbaiki artikel usang milik rekan adalah perilaku yang diinginkan, dan menahannya di belakang persetujuan Manager membuat KB cepat basi. Delete berbeda sifatnya: ia menghilangkan pekerjaan orang lain dan tidak punya jalur pemulihan di UI. Unpublish sudah cukup untuk menyembunyikan artikel yang salah, jadi tidak ada alasan operasional untuk memberi Technician hak menghapus milik orang lain.

Addendum §5.2 juga menawarkan penyederhanaan ("Technician dapat mengelola artikel"). Keputusan di atas mengambil penyederhanaan itu dengan satu pengecualian yang sempit.

### 2.2 Manager terhadap audit log

PRD §5 menandai View Audit Log sebagai "Limited" untuk Manager.

**Keputusan:** Manager boleh melihat audit log untuk modul `ticket`, `asset`, dan `article`. Manager **tidak** boleh melihat log modul `user`, `role`, `department`, `ticket_category`, `ticket_priority`, dan `auth`.

Alasan: audit log yang boleh dilihat Manager adalah yang berkaitan dengan pekerjaan operasional tim IT — itu tujuan Manager melihatnya. Log modul `user` dan `auth` berisi jejak administrasi akun dan percobaan login, yang menyentuh wilayah kepegawaian dan keamanan sistem; keduanya urusan Admin.

Implementasi: filter modul diterapkan sebagai **query scope di server**, bukan sebagai parameter yang dikirim frontend. Kalau Manager mengirim `?module=user`, hasilnya kosong — bukan error, dan bukan data.

### 2.3 Technician terhadap report

PRD §5 menandai View Reports sebagai "Limited" untuk Technician.

**Keputusan:** Technician hanya melihat metriknya sendiri lewat `GET /api/dashboard/technician`. Technician tidak punya akses ke `GET /api/dashboard/manager`, dan tidak melihat tabel perbandingan performa antar-technician.

Alasan: PRD §21 menyatakan data performa technician adalah operational analytics, bukan penilaian karyawan resmi. Membuka perbandingan antar-rekan ke seluruh technician mengubah sifatnya menjadi papan peringkat, yang tidak diminta dan berisiko salah dipakai.

---

## 3. Matriks Ability

Kolom E/T/M/A = Employee, Technician, Manager, Admin.

Notasi:

- **✅** boleh
- **❌** tidak boleh
- **own** hanya resource miliknya sendiri
- **assigned** hanya ticket yang di-assign kepadanya
- **scoped** dibatasi query scope di server

### 3.1 Autentikasi & profil

| Ability | E | T | M | A | Penjaga |
| --- | :-: | :-: | :-: | :-: | --- |
| `auth.login` | ✅ | ✅ | ✅ | ✅ | Tanpa auth; ditolak jika `status != active` |
| `auth.logout` | ✅ | ✅ | ✅ | ✅ | `auth:sanctum` |
| `profile.view-own` | ✅ | ✅ | ✅ | ✅ | `auth:sanctum` |
| `profile.change-password` | ✅ | ✅ | ✅ | ✅ | `auth:sanctum` |

### 3.2 Ticket — `TicketPolicy`

| Ability | E | T | M | A | Catatan |
| --- | :-: | :-: | :-: | :-: | --- |
| `viewAny` | ✅ scoped | ✅ | ✅ | ✅ | Employee hanya `reporter_id = self` |
| `view` | ✅ own | ✅ | ✅ | ✅ | Bukan reporter & bukan T/M/A → **404** |
| `create` | ✅ | ✅ | ✅ | ✅ | §5 PRD: semua role boleh |
| `update` | ✅ own, bukan CLOSED | ✅ | ✅ | ✅ | BR-009 |
| `delete` | ❌ | ❌ | ❌ | ✅ | Soft delete |
| `assign` | ❌ | ❌ | ✅ | ✅ | BR-004 |
| `unassign` | ❌ | ❌ | ✅ | ✅ | |
| `changeStatus` | ✅ own terbatas | ✅ assigned | ✅ | ✅ | Aturan penuh di `STATUS-TRANSITION.md` |
| `selfAssign` | ❌ | ✅ | ❌ | ❌ | Hanya dari status `OPEN` |
| `changePriority` | ❌ | ✅ | ✅ | ✅ | §5 PRD |
| `comment` | ✅ own | ✅ | ✅ | ✅ | Partisipan saja |
| `viewHistory` | ✅ own | ✅ | ✅ | ✅ | Mengikuti `view` |
| `attach` | ✅ own | ✅ | ✅ | ✅ | Partisipan saja |

Definisi **partisipan** ticket: reporter, technician yang di-assign, Manager mana pun, Admin mana pun.

Employee pada `changeStatus` hanya boleh dua hal: `RESOLVED → CLOSED` dan `RESOLVED → IN_PROGRESS`, keduanya pada ticket miliknya.

### 3.3 Attachment — `AttachmentPolicy`

| Ability | E | T | M | A | Catatan |
| --- | :-: | :-: | :-: | :-: | --- |
| `view` | ✅ | ✅ | ✅ | ✅ | Didelegasikan ke `TicketPolicy@view` ticket induk |
| `download` | ✅ | ✅ | ✅ | ✅ | Idem — Addendum §6.5 |
| `create` | ✅ own | ✅ | ✅ | ✅ | Partisipan ticket |
| `delete` | ✅ own upload | ✅ own upload | ✅ | ✅ | |

Otorisasi attachment **selalu** diturunkan dari otorisasi ticket induknya. Tidak ada jalur akses lain — tidak ada URL publik, tidak ada signed URL berumur panjang.

### 3.4 Asset — `AssetPolicy`

| Ability | E | T | M | A | Catatan |
| --- | :-: | :-: | :-: | :-: | --- |
| `viewAny` | ❌ | ✅ | ✅ | ✅ | §5 PRD |
| `view` | ❌ | ✅ | ✅ | ✅ | |
| `viewOwn` | ✅ | ✅ | ✅ | ✅ | `GET /api/my-assets`, US-004 |
| `viewAssignable` | ✅ | ✅ | ✅ | ✅ | Selalu dibatasi ke diri sendiri (BR-012) |
| `create` | ❌ | ✅ | ✅ | ✅ | |
| `update` | ❌ | ✅ | ✅ | ✅ | |
| `delete` | ❌ | ❌ | ✅ | ✅ | Soft delete, BR-015 |
| `assign` | ❌ | ✅ | ✅ | ✅ | Ditolak jika status `maintenance` |
| `release` | ❌ | ✅ | ✅ | ✅ | |
| `viewHistory` | ❌ | ✅ | ✅ | ✅ | |

`viewAssignable` diberikan ke semua role tapi **selalu** dibatasi ke asset milik pemanggil. Tidak ada parameter yang bisa mengubah cakupan itu. Ini poin nomor 1 di Addendum §12.

### 3.5 Knowledge base — `ArticlePolicy`

| Ability | E | T | M | A | Catatan |
| --- | :-: | :-: | :-: | :-: | --- |
| `viewAny` | ✅ published | ✅ | ✅ | ✅ | Employee: scope `status = published` |
| `view` | ✅ published | ✅ | ✅ | ✅ | Employee membuka draft → **404** |
| `create` | ❌ | ✅ | ✅ | ✅ | §5 PRD |
| `update` | ❌ | ✅ | ✅ | ✅ | Termasuk artikel orang lain — §2.1 |
| `publish` | ❌ | ✅ | ✅ | ✅ | Addendum §5.1 |
| `unpublish` | ❌ | ✅ | ✅ | ✅ | Termasuk artikel orang lain — §2.1 |
| `delete` | ❌ | ✅ own | ✅ | ✅ | Technician hanya miliknya — §2.1 |

### 3.6 Notification — `NotificationPolicy`

| Ability | E | T | M | A |
| --- | :-: | :-: | :-: | :-: |
| `viewAny` | ✅ own | ✅ own | ✅ own | ✅ own |
| `markAsRead` | ✅ own | ✅ own | ✅ own | ✅ own |
| `markAllAsRead` | ✅ own | ✅ own | ✅ own | ✅ own |

Notifikasi **tidak ada pengecualian Admin**. Admin tidak boleh membaca notifikasi user lain, dan `Gate::before` untuk Admin harus dikecualikan di sini. Notifikasi berisi komunikasi personal; membukanya untuk Admin tidak punya kegunaan operasional dan hanya memperbesar permukaan penyalahgunaan.

Mengakses notifikasi milik orang lain → **404**.

### 3.7 Dashboard

| Ability | E | T | M | A |
| --- | :-: | :-: | :-: | :-: |
| `dashboard.employee` | ✅ own | ✅ | ✅ | ✅ |
| `dashboard.technician` | ❌ | ✅ own | ✅ | ✅ |
| `dashboard.manager` | ❌ | ❌ | ✅ | ✅ |
| `dashboard.admin` | ❌ | ❌ | ❌ | ✅ |
| `analytics.technician-performance` | ❌ | ❌ | ✅ | ✅ |

`dashboard.technician` untuk Technician selalu memakai `technician_id = self`; parameter apa pun yang mencoba mengubahnya diabaikan (§2.3).

### 3.8 Administrasi

| Ability | E | T | M | A | Catatan |
| --- | :-: | :-: | :-: | :-: | --- |
| `user.viewAny` | ❌ | ❌ | ❌ | ✅ | |
| `user.view` | ❌ | ❌ | ❌ | ✅ | |
| `user.create` | ❌ | ❌ | ❌ | ✅ | BR-017 |
| `user.update` | ❌ | ❌ | ❌ | ✅ | |
| `user.delete` | ❌ | ❌ | ❌ | ✅ | |
| `user.activate` / `deactivate` | ❌ | ❌ | ❌ | ✅ | Deaktivasi mencabut token |
| `user.reset-password` | ❌ | ❌ | ❌ | ✅ | |
| `technician.list` | ❌ | ❌ | ✅ | ✅ | Untuk dropdown assign |
| `department.viewAny` | ✅ | ✅ | ✅ | ✅ | Read boleh semua |
| `department.manage` | ❌ | ❌ | ❌ | ✅ | |
| `ticket-category.viewAny` | ✅ | ✅ | ✅ | ✅ | |
| `ticket-category.manage` | ❌ | ❌ | ❌ | ✅ | |
| `ticket-priority.viewAny` | ✅ | ✅ | ✅ | ✅ | |
| `ticket-priority.manage` | ❌ | ❌ | ❌ | ✅ | Termasuk `sla_minutes` |
| `ticket-status.viewAny` | ✅ | ✅ | ✅ | ✅ | Read-only untuk semua |
| `knowledge-category.viewAny` | ✅ | ✅ | ✅ | ✅ | |
| `knowledge-category.manage` | ❌ | ❌ | ❌ | ✅ | |
| `audit-log.viewAny` | ❌ | ❌ | ✅ scoped | ✅ | Batas modul di §2.2 |
| `audit-log.view` | ❌ | ❌ | ✅ scoped | ✅ | |

Admin **tidak boleh** mengubah role atau menonaktifkan akunnya sendiri. Tanpa aturan ini, Admin terakhir bisa mengunci dirinya keluar dari sistem tanpa jalur pemulihan.

Tidak ada ability `user.register`. Registrasi publik tidak ada (BR-016).

---

## 4. Pemetaan Endpoint ke Ability

Tabel ini adalah checklist audit Fase 10. Setiap route di `routes/api.php` harus punya barisnya di sini.

| Method | Endpoint | Ability |
| --- | --- | --- |
| POST | `/api/login` | — (tanpa auth, rate limited) |
| GET | `/api/health` | — |
| POST | `/api/logout` | `auth.logout` |
| GET | `/api/me` | `profile.view-own` |
| PUT | `/api/me/password` | `profile.change-password` |
| GET | `/api/tickets` | `TicketPolicy@viewAny` |
| POST | `/api/tickets` | `TicketPolicy@create` |
| GET | `/api/tickets/{id}` | `TicketPolicy@view` |
| PUT | `/api/tickets/{id}` | `TicketPolicy@update` |
| DELETE | `/api/tickets/{id}` | `TicketPolicy@delete` |
| POST | `/api/tickets/{id}/assign` | `TicketPolicy@assign` |
| POST | `/api/tickets/{id}/status` | `TicketPolicy@changeStatus` |
| POST | `/api/tickets/{id}/priority` | `TicketPolicy@changePriority` |
| GET | `/api/tickets/{id}/comments` | `TicketPolicy@view` |
| POST | `/api/tickets/{id}/comments` | `TicketPolicy@comment` |
| GET | `/api/tickets/{id}/histories` | `TicketPolicy@viewHistory` |
| GET | `/api/tickets/{id}/attachments` | `TicketPolicy@view` |
| POST | `/api/tickets/{id}/attachments` | `TicketPolicy@attach` |
| GET | `/api/attachments/{id}/download` | `AttachmentPolicy@download` |
| DELETE | `/api/attachments/{id}` | `AttachmentPolicy@delete` |
| GET | `/api/assets` | `AssetPolicy@viewAny` |
| GET | `/api/assets/assignable` | `AssetPolicy@viewAssignable` |
| GET | `/api/my-assets` | `AssetPolicy@viewOwn` |
| POST | `/api/assets` | `AssetPolicy@create` |
| GET | `/api/assets/{id}` | `AssetPolicy@view` |
| PUT | `/api/assets/{id}` | `AssetPolicy@update` |
| DELETE | `/api/assets/{id}` | `AssetPolicy@delete` |
| POST | `/api/assets/{id}/assign` | `AssetPolicy@assign` |
| POST | `/api/assets/{id}/release` | `AssetPolicy@release` |
| GET | `/api/assets/{id}/history` | `AssetPolicy@viewHistory` |
| GET | `/api/articles` | `ArticlePolicy@viewAny` |
| POST | `/api/articles` | `ArticlePolicy@create` |
| GET | `/api/articles/{slug}` | `ArticlePolicy@view` |
| PUT | `/api/articles/{id}` | `ArticlePolicy@update` |
| DELETE | `/api/articles/{id}` | `ArticlePolicy@delete` |
| POST | `/api/articles/{id}/publish` | `ArticlePolicy@publish` |
| POST | `/api/articles/{id}/unpublish` | `ArticlePolicy@unpublish` |
| GET | `/api/notifications` | `NotificationPolicy@viewAny` |
| GET | `/api/notifications/unread-count` | `NotificationPolicy@viewAny` |
| POST | `/api/notifications/{id}/read` | `NotificationPolicy@markAsRead` |
| POST | `/api/notifications/read-all` | `NotificationPolicy@markAllAsRead` |
| GET | `/api/dashboard/employee` | `dashboard.employee` |
| GET | `/api/dashboard/technician` | `dashboard.technician` |
| GET | `/api/dashboard/manager` | `dashboard.manager` |
| GET | `/api/dashboard/admin` | `dashboard.admin` |
| GET | `/api/users` | `user.viewAny` |
| POST | `/api/users` | `user.create` |
| GET | `/api/users/{id}` | `user.view` |
| PUT | `/api/users/{id}` | `user.update` |
| DELETE | `/api/users/{id}` | `user.delete` |
| POST | `/api/users/{id}/activate` | `user.activate` |
| POST | `/api/users/{id}/deactivate` | `user.deactivate` |
| POST | `/api/users/{id}/reset-password` | `user.reset-password` |
| GET | `/api/technicians` | `technician.list` |
| GET | `/api/departments` | `department.viewAny` |
| POST | `/api/departments` | `department.manage` |
| PUT/DELETE | `/api/departments/{id}` | `department.manage` |
| GET | `/api/ticket-categories` | `ticket-category.viewAny` |
| POST | `/api/ticket-categories` | `ticket-category.manage` |
| PUT/DELETE | `/api/ticket-categories/{id}` | `ticket-category.manage` |
| GET | `/api/ticket-priorities` | `ticket-priority.viewAny` |
| POST | `/api/ticket-priorities` | `ticket-priority.manage` |
| PUT/DELETE | `/api/ticket-priorities/{id}` | `ticket-priority.manage` |
| GET | `/api/ticket-statuses` | `ticket-status.viewAny` |
| GET | `/api/knowledge-categories` | `knowledge-category.viewAny` |
| POST | `/api/knowledge-categories` | `knowledge-category.manage` |
| PUT/DELETE | `/api/knowledge-categories/{id}` | `knowledge-category.manage` |
| GET | `/api/audit-logs` | `audit-log.viewAny` |
| GET | `/api/audit-logs/{id}` | `audit-log.view` |

---

## 5. 403 vs 404

Aturan seragam: kalau **keberadaan** resource itu sendiri merupakan informasi yang tidak boleh diketahui pemanggil, kembalikan **404**. Kalau resource-nya memang boleh diketahui ada tapi aksinya tidak diizinkan, kembalikan **403**.

| Situasi | Kode |
| --- | --- |
| Employee membuka ticket milik orang lain | 404 |
| Employee mencoba assign technician pada ticket miliknya | 403 |
| Technician mengubah status ticket orang lain | 403 |
| Employee membuka artikel draft | 404 |
| User membuka notifikasi orang lain | 404 |
| Employee mengunduh attachment dari ticket orang lain | 404 |
| Employee mengakses `/api/users` | 403 |
| Manager mengakses `/api/dashboard/admin` | 403 |
| Manager memfilter audit log ke modul `user` | 200, hasil kosong |

Perbedaan Technician: Technician memang berhak melihat semua ticket (§5 PRD), jadi keberadaan ticket bukan rahasia baginya — kegagalannya adalah 403, bukan 404.

Baris terakhir sengaja bukan error. Kalau permintaan di luar cakupan dijawab 403, Manager mendapat konfirmasi bahwa modul itu ada dan berisi sesuatu. Hasil kosong tidak memberi informasi apa pun.

---

## 6. Checklist Test Otorisasi (Fase 2 & 3)

Pakai `dataset()` Pest supaya satu blok test mencakup empat role sekaligus.

### Struktur

```php
dataset('roles', [
    'employee'   => ['employee', 403],
    'technician' => ['technician', 403],
    'manager'    => ['manager', 200],
    'admin'      => ['admin', 200],
]);
```

### Wajib ada

- [ ] Setiap ability di §3 punya minimal satu test positif dan satu negatif
- [ ] Setiap endpoint di §4 punya test tanpa token → 401
- [ ] Setiap kode di §5 diverifikasi dengan test (403 vs 404 tidak tertukar)

### Kebocoran lintas user

- [ ] Employee A membuka ticket Employee B → 404
- [ ] Employee A memakai `?reporter_id=B` pada list ticket → hanya ticket A yang keluar
- [ ] Employee A memilih asset milik B saat create ticket → 422 (Addendum §12 poin 1)
- [ ] Employee A mengunduh attachment dari ticket B → 404
- [ ] User A menandai notifikasi B sebagai read → 404
- [ ] Technician memakai `?technician_id=X` pada dashboard technician → tetap datanya sendiri
- [ ] Manager memfilter audit log ke modul `user` → hasil kosong
- [ ] Employee mengirim `role_id` saat ubah profil → diabaikan

### Escalation

- [ ] Employee mengirim `reporter_id` orang lain saat create → diabaikan, reporter tetap dirinya
- [ ] Employee mengirim `status_id = RESOLVED` saat create → diabaikan, tetap `OPEN`
- [ ] User mengirim `sla_deadline` saat create → diabaikan
- [ ] Non-admin mengakses seluruh endpoint admin → 403
- [ ] Admin mengubah `role_id` dirinya sendiri → 422
- [ ] Admin menonaktifkan akunnya sendiri → 422
- [ ] User inactive memakai token yang diterbitkan sebelum dinonaktifkan → 401

Baris terakhir mudah terlewat. Menonaktifkan user tidak otomatis membatalkan token yang sudah beredar — pencabutan token harus dilakukan eksplisit di `deactivate`, dan itu perlu diuji.

---

## 7. Prinsip Yang Tidak Boleh Dilanggar

1. Setiap route terautentikasi punya ability yang menjaganya. Tidak ada pengecualian selain `/api/login` dan `/api/health`.
2. Scoping dilakukan di query, bukan dengan memfilter hasil setelah diambil.
3. Filter dari client diterapkan **setelah** scoping role. Filter tidak boleh bisa memperluas cakupan.
4. `Gate::before` untuk Admin dikecualikan pada notifikasi dan pembatasan diri Admin.
5. Field yang menentukan kepemilikan dan SLA selalu ditentukan server (daftar penuh: API contract §13).
6. Frontend bukan sumber kebenaran untuk permission (Addendum §8).
