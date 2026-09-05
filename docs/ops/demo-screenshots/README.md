# Katalog Screenshot Cadangan Demo (`docs/ops/demo-screenshots/`)

Folder ini adalah **rencana cadangan Level 3** (lihat `docs/ops/DEMO-RUNBOOK.md` §4): bila demo live gagal total, presentasi dialihkan ke rangkaian screenshot berikut. Ambil screenshot setelah `make fresh` sehingga angkanya identik dengan data deterministik `DemoDataSeeder` (compliance 87,5%, 43 tiket).

## Format penamaan
`NN-<langkah>-<halaman>.png` — `NN` urut sesuai 13 langkah golden path PRD §38.

## Daftar screenshot wajib

| # | Nama file | Halaman | Akun | Yang disorot saat presentasi offline |
| --- | --- | --- | --- | --- |
| 01 | `01-login-employee.png` | `/login` | — | Form login; sebut BFF + httpOnly cookie |
| 02 | `02-buat-tiket.png` | `/tickets/new` | employee | Pemilihan kategori & prioritas Tinggi (SLA 4 jam) |
| 03 | `03-detail-tiket-baru.png` | `/tickets/{id}` | employee | Status **Baru**; badge SLA countdown; ticket number |
| 04 | `04-manager-ticket-list.png` | `/tickets` | manager | Tiket baru muncul di antrean global |
| 05 | `05-assign-dialog.png` | `/tickets/{id}` (dialog) | manager | Dropdown teknisi (3 nama); tombol Tugaskan |
| 06 | `06-status-assigned.png` | `/tickets/{id}` | manager | Status **Ditugaskan**; timeline entri pertama |
| 07 | `07-technician-dashboard.png` | `/dashboard/technician` | technician | Kartu "Ditugaskan ke Saya", "SLA Breached" non-nol |
| 08 | `08-in-progress-comment.png` | `/tickets/{id}` | technician | Status **Sedang Dikerjakan** + komentar troubleshooting |
| 09 | `09-resolved.png` | `/tickets/{id}` | technician | Status **Selesai** + solusi; badge SLA dalam target |
| 10 | `10-notifikasi-employee.png` | popover notifikasi | employee | Lonceng berisi notifikasi resolusi (polling 30 detik) |
| 11 | `11-closed.png` | `/tickets/{id}` | employee | Status **Ditutup**; lifecycle 5 status lengkap di timeline |
| 12 | `12-manager-dashboard.png` | `/dashboard/manager` | manager | Grafik tren, distribusi, kartu **SLA Compliance ±87%** |
| 13 | `13-performa-technician.png` | `/dashboard/manager` | manager | Tabel performa: 3 teknisi, compliance berbeda (87,5% / 90% / 75%) |

## Screenshot pendukung (tur modul & bukti security)

| Nama file | Halaman | Yang disorot |
| --- | --- | --- |
| `20-asset-detail-history.png` | `/assets/{id}` (AST-00002) | Timeline multi-pemegang: assigned → released → maintenance → assigned |
| `21-kb-article.png` | `/knowledge-base/{slug}` | Artikel terpopuler (245 views); kategori |
| `22-audit-log-admin.png` | `/admin/audit-logs` | Entri audit transisi status & assignment dari golden path |
| `23-cookie-httponly.png` | DevTools → Application → Cookies | Cookie `auth_token` ber-flag httpOnly (bukti Q3 reviewer) |
| `24-404-cross-user.png` | akses tiket lintas user | Halaman 404 (bukti anti-enumerasi Q5 reviewer) |
| `25-upload-validation.png` | dialog unggah file > 5 MB | Pesan validasi Indonesia (bukti Q5 reviewer) |

## Cara memperbarui
1. `make up && make fresh`.
2. Jalankan golden path manual sesuai runbook, screenshot tiap langkah ke folder ini.
3. Screenshot modul pendukung & bukti security (tabel kedua).
4. Commit: `git add docs/ops/demo-screenshots && git commit -m "docs(ops): refresh demo backup screenshots"`.
