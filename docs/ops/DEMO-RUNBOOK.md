# DEMO-RUNBOOK — Panduan Presentasi Live JARVIS OPS

Dokumen ini adalah naskah presentasi live untuk capstone JARVIS OPS: langkah demi langkah, akun per langkah, tombol yang diklik, target waktu, dan rencana cadangan bila demo live bermasalah (ROADMAP:906-908).

---

## 1. Metadata & Pra-Kondisi

### Target Waktu
| Segmen | Target |
| --- | --- |
| Golden Path §38 (13 langkah) | < 3 menit (hasil pengukuran otomatis E2E: ±11 detik tanpa narasi; ±2 menit dengan narasi presentasi) |
| Tur modul pendukung (aset, KB, audit) | 1–2 menit |
| **Total presentasi** | **< 5 menit** sebelum sesi tanya jawab |

### Akun Demo (password semua: `Password123!`)
| Role | Nama | Email | Halaman pendaratan |
| --- | --- | --- | --- |
| Administrator | Demo Administrator | `admin@jarvisops.test` | `/dashboard/admin` |
| Manager | Demo Manager | `manager@jarvisops.test` | `/dashboard/manager` |
| Technician | Demo Technician | `technician@jarvisops.test` | `/dashboard/technician` |
| Employee | Demo Employee | `employee@jarvisops.test` | `/dashboard/employee` |

> Teknisi pendukung data (`budi@jarvisops.test`, `citra@jarvisops.test`) dan pelapor tambahan (`dewi@jarvisops.test`, `eko@jarvisops.test`) tidak dipakai di golden path, tetapi memperkaya tabel performa & daftar tiket.

### Persiapan Lingkungan Bersih (jalankan H-1 sebelum presentasi)
```bash
make up            # pastikan api (8000), web (3000), mysql, scheduler hidup
make fresh         # migrate:fresh --seed → data demo deterministik
# verifikasi cepat: login employee@jarvisops.test di http://localhost:3000
```

Verifikasi data demo sehat (compliance ±87%, 43 tiket, 3 teknisi berperforma):
```bash
docker compose exec api php artisan tinker --execute '
$resolved = App\Models\Ticket::whereNotNull("resolved_at");
echo "compliance: ".round($resolved->whereColumn("resolved_at","<=","sla_deadline")->count() / $resolved->count() * 100,1)."%";
'
```

---

## 2. Naskah Golden Path §38 PRD (13 Langkah)

> Narasi disarankan dalam Bahasa Indonesia. Kolom "Tombol/Klik" adalah elemen UI persis yang harus diklik.

### Segmen A — Employee membuat tiket (Langkah 1–2) · ±30 detik
| # | Aksi | Akun | Tombol/Klik | Yang dijelaskan ke reviewer |
| --- | --- | --- | --- | --- |
| 1 | Login employee | `employee@jarvisops.test` | tombol **Masuk** | BFF + httpOnly cookie; dashboard personal muncul |
| 2 | Buat tiket | employee | Sidebar **Tiket** → **Buat Tiket Baru** → pilih Kategori *Hardware*, Prioritas *Tinggi* → isi judul "Kendala Laptop Mati Total" + deskripsi → **Kirim** | SLA 4 jam otomatis dibekukan ke tiket (snapshot); redirect ke detail tiket dengan status **Baru** |

### Segmen B — Manager menugaskan (Langkah 3–4) · ±25 detik
| # | Aksi | Akun | Tombol/Klik | Yang dijelaskan |
| --- | --- | --- | --- | --- |
| 3 | Login manager | `manager@jarvisops.test` | **Keluar** → login manager | Antrian tiket & kartu SLA breached non-nol |
| 4 | Assign tiket | manager | Buka tiket terbaru → **Tugaskan** → pilih *Demo Technician* → **Tugaskan** | Status → **Ditugaskan**; notifikasi terkirim ke teknisi |

### Segmen C — Technician memproses (Langkah 5–8) · ±40 detik
| # | Aksi | Akun | Tombol/Klik | Yang dijelaskan |
| --- | --- | --- | --- | --- |
| 5 | Login technician | `technician@jarvisops.test` | login | Kartu "Ditugaskan ke Saya" berisi tiket baru |
| 6 | Mulai proses | technician | Buka tiket → **Mulai Kerjakan** → **Konfirmasi** | Status → **Sedang Dikerjakan**; timeline tercatat |
| 7 | Catatan troubleshooting | technician | kolom komentar: "Ganti power adapter dan cek kesehatan baterai." → **Kirim** | Jejak kerja teknisi masuk timeline |
| 8 | Selesaikan | technician | **Selesaikan Tiket** → isi solusi → **Konfirmasi** | Status → **Selesai**; notifikasi ke employee |

### Segmen D — Employee konfirmasi (Langkah 9–11) · ±25 detik
| # | Aksi | Akun | Tombol/Klik | Yang dijelaskan |
| --- | --- | --- | --- | --- |
| 9 | Login employee kembali | `employee@jarvisops.test` | login | Lonceng notifikasi berisi "tiket selesai" (polling 30 detik) |
| 10 | Periksa hasil | employee | Buka notifikasi / tiket | Solusi teknisi terbaca pelapor |
| 11 | Tutup tiket | employee | **Tutup Tiket** → **Konfirmasi** | Status → **Ditutup** (final); lifecycle 5 status lengkap |

### Segmen E — Manager analytics (Langkah 12–13) · ±30 detik
| # | Aksi | Akun | Tombol/Klik | Yang dijelaskan |
| --- | --- | --- | --- | --- |
| 12 | Login manager → dashboard | `manager@jarvisops.test` | Sidebar **Dashboard** | Grafik tren, distribusi prioritas/kategori |
| 13 | Verifikasi SLA & performa | manager | Scroll ke **SLA Compliance** (±87%) & tabel **Performa Technician** | Tiket yang baru ditutup ikut terhitung (data segar); 3 teknisi dengan compliance berbeda |

---

## 3. Tur Singkat Modul Pendukung (1–2 menit, opsional sesuai waktu)

1. **Asset Management** — detail `AST-00002` (MacBook Pro 14): timeline riwayat kepemilikan Budi → gudang → maintenance → Demo Employee; status aset tersebar available/assigned/maintenance/retired.
2. **Knowledge Base** — cari "laptop"; artikel terpopuler 245 views; 1 draft untuk demo editor teknisi.
3. **Audit Log (admin)** — login `admin@jarvisops.test` → **Audit Log**: filter aksi; tunjukkan entri transisi status & assignment yang baru saja terjadi saat golden path.
4. **Profil** — ganti data profil (menunjukkan validasi server + audit perubahan profil).

---

## 4. Rencana Kontingensi (Fallback Plan)

### Mitigasi Level 1 — Lag jaringan / halaman lambat (detik)
- **Gejala:** spinner lama, refetch dashboard molor.
- **Aksi:** tunggu ≤ 10 detik; bila perlu **F5**. TanStack Query akan refetch otomatis. Lanjutkan narasi ke poin berikutnya selagi menunggu.

### Mitigasi Level 2 — Data kotor / tiket demo habis / state aneh (±30 detik)
- **Gejala:** angka dashboard tidak masuk akal, tiket terakhir ternodai percobaan gagal.
- **Aksi:** reset cepat data:
  ```bash
  make fresh   # ±10 detik, data demo kembali deterministik
  ```
  Lanjutkan demo dari Segmen A. Semua angka (compliance 87,5%, 43 tiket) kembali persis.

### Mitigasi Level 3 — Server crash / container mati / proyeksi gagal (±2 menit)
- **Gejala:** `make up` gagal, error 500 berulang, browser tidak bisa buka sama sekali.
- **Aksi:** alihkan ke **mode screenshot**:
  1. Buka folder `docs/ops/demo-screenshots/` (lihat katalog di `docs/ops/demo-screenshots/README.md`).
  2. Bawakan narasi golden path memakai 13 screenshot urut nomor (satu per langkah §38).
  3. Sambil mencoba pemulihan di latar: `docker compose -f compose.prod.yaml up -d` (stack produksi) atau `make up && make fresh` (dev).
- **Narasi cadangan:** "Saya siapkan juga bukti visual dari latihan live sebelumnya" — semua angka pada screenshot sama dengan data deterministik `DemoDataSeeder`, sehingga klaim tetap terverifikasi.

### Larangan saat demo
- Jangan jalankan `migrate:fresh` **tanpa** `--seed`.
- Jangan login sebagai `budi@`/`citra@` di golden path (memecah alur asersi "Demo Technician").
- Jangan mengubah `ticket_priorities` saat demo — snapshot SLA memang aman, tapi akan mengacaukan narasi angka.

---

## 5. Checklist H-15 Menit

- [ ] `make up` → ketiga container hijau + scheduler hidup
- [ ] `make fresh` → login 4 akun utama sukses
- [ ] Compliance manager ±87% (verifikasi tinker §1)
- [ ] Lonceng notifikasi employee menampilkan item
- [ ] Browser tab bersih (tanpa akun login sisa), DevTools tertutup kecuali saat butuh bukti cookie
- [ ] Folder `docs/ops/demo-screenshots/` terbuka di tab kedua (siap fallback)
- [ ] `docs/ops/REVIEWER-ANSWERS.md` terbuka di tab ketiga (siap tanya jawab)
