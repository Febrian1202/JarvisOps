# JARVIS OPS — TICKET STATUS TRANSITION

**Version:** 1.0
**Basis:** PRD §10, §11, §12, §31; Addendum §7
**Implementasi:** `App\Services\TicketStatusService`

---

## 1. Mengapa Dokumen Ini Ada

PRD hanya menjelaskan jalur bahagia (`OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`) dan satu pengecualian (reopen dari `RESOLVED`). PRD tidak menyatakan apakah lompatan seperti `OPEN → RESOLVED` diizinkan, siapa yang boleh menutup ticket, atau apakah `CLOSED` benar-benar final.

Tanpa keputusan eksplisit, hal-hal itu akan diputuskan diam-diam di tengah implementasi dan tersebar di beberapa tempat. Dokumen ini menutup semua sel kosong tersebut.

---

## 2. Status

Seeder `ticket_statuses` memakai flag berikut:

| ID | Nama | `is_closed` | `is_final` | Arti |
| --- | --- | --- | --- | --- |
| 1 | `OPEN` | false | false | Baru dibuat, belum ada technician |
| 2 | `ASSIGNED` | false | false | Sudah punya technician, belum dikerjakan |
| 3 | `IN_PROGRESS` | false | false | Sedang dikerjakan |
| 4 | `RESOLVED` | true | false | Technician menyatakan selesai, menunggu konfirmasi |
| 5 | `CLOSED` | true | true | Dikonfirmasi selesai dan ditutup |

Arti kedua flag:

- **`is_closed`** — ticket berhenti dihitung terhadap SLA. Dipakai kondisi breach Addendum §3.4 (`status NOT IN (RESOLVED, CLOSED)`).
- **`is_final`** — tidak ada transisi keluar yang normal. Hanya `CLOSED`.

Membedakan keduanya penting: `RESOLVED` menghentikan jam SLA tapi masih bisa dibuka kembali. Kalau keduanya digabung jadi satu flag, reopen jadi tidak mungkin dimodelkan.

---

## 3. Matriks Transisi

Baris = status asal, kolom = status tujuan. Isi sel = role yang diizinkan.

| Dari ↓ / Ke → | OPEN | ASSIGNED | IN_PROGRESS | RESOLVED | CLOSED |
| --- | --- | --- | --- | --- | --- |
| **OPEN** | — | M, A | T\*, M, A | ✗ | M, A |
| **ASSIGNED** | M, A | M, A | T(own), M, A | ✗ | M, A |
| **IN_PROGRESS** | ✗ | M, A | — | T(own), M, A | M, A |
| **RESOLVED** | ✗ | ✗ | R, T(own), M, A | — | R, M, A |
| **CLOSED** | ✗ | ✗ | ✗ | ✗ | — |

Keterangan:

- **R** = Reporter (pembuat ticket)
- **T** = Technician
- **T(own)** = Technician yang di-assign pada ticket tersebut (BR-005)
- **T\*** = Technician mana pun — self-assign, lihat §4.1
- **M** = Manager, **A** = Admin
- **✗** = ilegal, tolak dengan `422`
- **—** = status sama, tolak dengan `422` (bukan no-op sunyi)

**Employee yang bukan reporter tidak muncul di mana pun.** Employee hanya bisa menutup atau membuka kembali ticket miliknya sendiri.

---

## 4. Keputusan Yang Diambil, Beserta Alasannya

### 4.1 `OPEN → IN_PROGRESS` oleh Technician (self-assign)

**Diizinkan.** Technician mengambil ticket yang belum di-assign, lalu `technician_id` otomatis diisi dirinya dan history mencatat dua perubahan: assignment dan status.

Alasan: PRD §5 memberi Technician kemampuan "Update Assigned Ticket" tapi tidak memberinya "Assign Technician". Kalau self-assign dilarang sepenuhnya, seluruh ticket akan macet menunggu Manager, padahal dalam praktik tim IT kecil technician biasanya mengambil pekerjaan sendiri. Ini melonggarkan §5 PRD secara sadar, dan tidak melanggar BR-004 karena BR-004 mengatur *menugaskan orang lain*, bukan mengambil pekerjaan sendiri.

Kalau Anda ingin lebih ketat pada §5 PRD, hapus `T*` dari sel ini — tidak ada bagian lain yang bergantung padanya.

### 4.2 `OPEN → RESOLVED` dan `ASSIGNED → RESOLVED`

**Ilegal.** Ticket harus melewati `IN_PROGRESS` sebelum bisa `RESOLVED`.

Alasan: melompati `IN_PROGRESS` menghilangkan jejak bahwa pekerjaan pernah dilakukan, dan membuat "average resolution time" tidak bermakna. Kalau memang tidak ada pekerjaan yang perlu dilakukan (mis. salah lapor), jalur yang benar adalah `→ CLOSED` oleh Manager/Admin.

### 4.3 `OPEN/ASSIGNED/IN_PROGRESS → CLOSED` oleh Manager/Admin

**Diizinkan.** Ini jalur pembatalan.

Alasan: ticket duplikat, salah lapor, atau tidak relevan lagi harus bisa ditutup tanpa dipaksa melewati `RESOLVED`. Menutup lewat `RESOLVED` akan mencatatnya sebagai ticket yang berhasil diselesaikan dan mencemari angka SLA compliance.

Transisi ini **wajib menyertakan `note`** (lihat §6) supaya alasan penutupan terekam.

### 4.4 `RESOLVED → IN_PROGRESS` (reopen)

**Diizinkan** untuk Reporter, Technician pemegang, Manager, Admin. Ini eksplisit disebut §12 PRD.

Efek: `resolved_at` dikosongkan kembali ke `null`. `sla_deadline` **tidak dihitung ulang** dan `sla_breached` **tidak direset**.

Alasan tidak mereset SLA: kalau reopen memberi jam baru, ticket bisa di-resolve lalu dibuka berulang untuk menghindari breach selamanya. SLA mengukur seberapa cepat masalah asli tertangani, dan masalah asli itu baru selesai saat ticket `CLOSED`.

### 4.5 `RESOLVED → CLOSED`

**Diizinkan** untuk Reporter, Manager, Admin. **Technician tidak boleh menutup ticket-nya sendiri.**

Alasan: §31 Skenario 5 PRD menyebut penutupan berasal dari konfirmasi Employee. Membiarkan technician menutup sendiri menghilangkan tahap konfirmasi, yang justru merupakan inti dari keberadaan dua status terpisah `RESOLVED` dan `CLOSED`. Manager dan Admin tetap bisa menutup untuk kasus reporter tidak responsif.

### 4.6 `CLOSED → apa pun`

**Ilegal untuk semua role.** `CLOSED` adalah `is_final`.

Alasan: kalau ticket yang sudah ditutup bisa dibuka lagi, seluruh laporan historis bisa berubah setelah dipublikasikan. Untuk masalah yang muncul kembali, buat ticket baru — dan itu justru informasi yang berguna (masalah berulang terlihat sebagai beberapa ticket, bukan satu ticket yang dibuka-tutup).

BR-009 menyatakan Employee tidak bisa memodifikasi ticket `CLOSED`. Dokumen ini memperluasnya: **tidak ada** role yang bisa mengubah status ticket `CLOSED`. Admin masih bisa soft-delete jika benar-benar perlu.

### 4.7 `ASSIGNED → OPEN` (unassign)

**Diizinkan** untuk Manager/Admin. `technician_id` dikosongkan.

Alasan: technician resign atau cuti panjang, ticket perlu dilepas ke kolam. Tanpa jalur ini, satu-satunya cara adalah reassign paksa ke orang lain.

### 4.8 `IN_PROGRESS → ASSIGNED`

**Diizinkan** untuk Manager/Admin, dipakai saat reassign ke technician lain.

Alasan: pekerjaan berpindah tangan, dan status kembali ke `ASSIGNED` menunjukkan pemegang baru belum mulai. Technician tidak boleh melakukan ini sendiri — melepas pekerjaan yang sudah dimulai adalah keputusan Manager.

### 4.9 Transisi ke status yang sama

**Ilegal**, `422`. Bukan no-op yang diam.

Alasan: kalau diterima diam-diam, klik tombol dua kali akan menghasilkan dua baris history identik atau dua notifikasi. Menolaknya membuat bug di frontend langsung terlihat.

---

## 5. Prasyarat Per Status Tujuan

Divalidasi sebelum transisi dijalankan.

| Status tujuan | Prasyarat |
| --- | --- |
| `ASSIGNED` | `technician_id` tidak null. Jika transisi ini dipicu `POST /assign`, technician diisi dalam transaksi yang sama. |
| `IN_PROGRESS` | `technician_id` tidak null. Untuk self-assign Technician, `technician_id` diisi dirinya di transaksi yang sama. |
| `RESOLVED` | Ticket punya technician; pelaku adalah technician pemegang, Manager, atau Admin. |
| `CLOSED` | Tidak ada prasyarat data. Dari status non-`RESOLVED`, `note` wajib. |
| `OPEN` | Hanya dari `ASSIGNED`. `technician_id` dikosongkan. |

---

## 6. Efek Samping Per Transisi

Semua efek berikut berjalan dalam **satu transaksi database**. Kalau salah satu gagal, seluruh transisi dibatalkan — ticket yang statusnya berubah tapi history-nya tidak tercatat adalah kondisi yang lebih buruk daripada transisi yang gagal.

| Transisi | Field yang diubah | History | Audit | Notifikasi |
| --- | --- | --- | --- | --- |
| `→ ASSIGNED` (assign) | `status_id`, `technician_id` | `status_id`, `technician_id` | `assign` | Technician baru |
| `→ ASSIGNED` (reassign) | `status_id`, `technician_id` | keduanya | `reassign` | Technician baru + technician lama |
| `→ OPEN` (unassign) | `status_id`, `technician_id` → null | keduanya | `unassign` | Technician lama |
| `→ IN_PROGRESS` (mulai) | `status_id` | `status_id` | `status_change` | Reporter |
| `→ IN_PROGRESS` (self-assign) | `status_id`, `technician_id` | keduanya | `self_assign` | Reporter |
| `→ IN_PROGRESS` (reopen) | `status_id`, `resolved_at` → null | keduanya | `reopen` | Technician pemegang + Manager |
| `→ RESOLVED` | `status_id`, `resolved_at` | keduanya | `resolve` | Reporter |
| `→ CLOSED` dari `RESOLVED` | `status_id`, `closed_at` | keduanya | `close` | Technician pemegang |
| `→ CLOSED` (batal) | `status_id`, `closed_at` | keduanya | `cancel` | Reporter + technician pemegang |

Aturan yang berlaku di semua baris:

- Pelaku aksi **tidak** menerima notifikasi atas aksinya sendiri
- `note` yang dikirim disimpan sebagai `ticket_comments` oleh pelaku, sehingga muncul di timeline tanpa perlu tabel baru
- `ticket_histories.old_value` dan `new_value` menyimpan **nama** status atau nama technician, bukan ID (lihat API contract §6)

---

## 7. Interaksi dengan SLA

| Kejadian | Efek pada SLA |
| --- | --- |
| Ticket dibuat | `sla_duration_minutes` dan `sla_deadline` di-snapshot dari priority |
| Priority diubah | `sla_deadline` dihitung ulang dari **`created_at`**, bukan dari waktu perubahan |
| `→ RESOLVED` | Jam SLA berhenti (`is_closed = true`) |
| `→ CLOSED` | Jam SLA tetap berhenti |
| Reopen dari `RESOLVED` | Jam SLA jalan lagi terhadap deadline **asli**; `sla_breached` tidak direset |
| Deadline terlewat saat status belum `RESOLVED`/`CLOSED` | Scheduler menandai breach (Addendum §3.4) |

Perhitungan ulang deadline dari `created_at` saat priority berubah adalah keputusan yang disengaja. Menghitung dari waktu perubahan akan membuat eskalasi priority justru *memberi* waktu tambahan — kebalikan dari maksud eskalasi.

---

## 8. Bentuk Error

Transisi ilegal, `422`:

```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "status_id": ["Cannot change status from OPEN to RESOLVED. A ticket must be worked on before it can be resolved."]
  }
}
```

Role tidak berhak, `403`:

```json
{
  "success": false,
  "message": "You are not allowed to close this ticket.",
  "errors": null
}
```

Prasyarat tidak terpenuhi, `422`:

```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "status_id": ["A technician must be assigned before this ticket can be marked as in progress."]
  }
}
```

Pesan error menyebutkan nama status, bukan ID, dan menjelaskan *mengapa* ditolak. Pesan seperti "Invalid transition" memaksa pengguna menebak.

---

## 9. `available_actions` di API

`GET /api/tickets/{id}` mengembalikan `available_actions`, dihitung dari matriks ini terhadap status ticket, role pelaku, dan kepemilikan.

| Action | Muncul ketika |
| --- | --- |
| `assign` | Manager/Admin, status bukan `CLOSED` |
| `unassign` | Manager/Admin, status `ASSIGNED` |
| `start` | Technician pemegang pada `ASSIGNED`; Technician mana pun pada `OPEN` (self-assign) |
| `resolve` | Technician pemegang / Manager / Admin pada `IN_PROGRESS` |
| `close` | Reporter / Manager / Admin pada `RESOLVED` |
| `cancel` | Manager/Admin pada `OPEN`, `ASSIGNED`, `IN_PROGRESS` |
| `reopen` | Reporter / Technician pemegang / Manager / Admin pada `RESOLVED` |
| `change_priority` | Technician / Manager / Admin, status bukan `CLOSED` |
| `comment` | Partisipan ticket, status bukan `CLOSED` |
| `attach` | Partisipan ticket, status bukan `CLOSED` |
| `edit` | Reporter pada status bukan `CLOSED`; Technician/Manager/Admin pada status bukan `CLOSED` |

Matriks ini dihitung di backend supaya frontend tidak perlu menduplikasi logikanya. Kalau aturan berubah, hanya ada satu tempat yang perlu diubah.

Frontend memakai `available_actions` hanya untuk menentukan tombol yang tampil. Setiap aksi tetap divalidasi ulang saat endpointnya dipanggil.

---

## 10. Checklist Test (Fase 3)

Satu test per baris. Dijalankan dengan Pest, memakai dataset provider untuk kombinasi role.

### Jalur bahagia — §31 PRD

- [ ] Skenario 1: Employee membuat ticket → status `OPEN`, `technician_id` null, `sla_deadline` terisi
- [ ] Skenario 2: Manager assign → status `ASSIGNED`, notifikasi ke technician
- [ ] Skenario 3: Technician pemegang mulai → status `IN_PROGRESS`
- [ ] Skenario 4: Technician resolve → status `RESOLVED`, `resolved_at` terisi
- [ ] Skenario 5: Reporter konfirmasi → status `CLOSED`, `closed_at` terisi
- [ ] Skenario 6: Deadline terlewat saat belum resolved → ditandai breached

### Transisi ilegal

- [ ] `OPEN → RESOLVED` → 422
- [ ] `ASSIGNED → RESOLVED` → 422
- [ ] `CLOSED → IN_PROGRESS` → 422
- [ ] `CLOSED → RESOLVED` → 422
- [ ] `RESOLVED → OPEN` → 422
- [ ] `RESOLVED → ASSIGNED` → 422
- [ ] `IN_PROGRESS → OPEN` → 422
- [ ] Transisi ke status yang sama → 422

### Otorisasi

- [ ] Employee bukan reporter mengubah status → 403
- [ ] Employee assign technician → 403 (BR-004)
- [ ] Technician memproses ticket orang lain → 403 (BR-005)
- [ ] Technician menutup ticket dari `RESOLVED` → 403 (§4.5)
- [ ] Technician unassign dirinya sendiri → 403
- [ ] Reporter reopen dari `RESOLVED` → sukses
- [ ] Reporter menutup ticket miliknya dari `RESOLVED` → sukses
- [ ] Manager membatalkan ticket `IN_PROGRESS` tanpa `note` → 422

### Prasyarat & efek samping

- [ ] `→ IN_PROGRESS` pada ticket tanpa technician oleh Manager → 422
- [ ] Technician self-assign dari `OPEN` → `technician_id` terisi dirinya, dua baris history
- [ ] Reopen mengosongkan `resolved_at` tapi tidak mereset `sla_breached`
- [ ] Reopen tidak mengubah `sla_deadline`
- [ ] Setiap transisi menulis tepat satu baris history per field yang berubah (BR-008)
- [ ] Setiap transisi menulis audit log (BR-010)
- [ ] Pelaku tidak menerima notifikasi atas aksinya sendiri
- [ ] Kegagalan di tengah transaksi membatalkan seluruh perubahan
- [ ] `note` tersimpan sebagai komentar dan muncul di timeline
- [ ] Ubah priority menghitung ulang `sla_deadline` dari `created_at`
- [ ] `available_actions` sesuai matriks untuk setiap kombinasi status × role
