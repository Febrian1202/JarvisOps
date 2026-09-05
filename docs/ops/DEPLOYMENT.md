# Panduan Deployment Produksi — JARVIS OPS

Dokumen ini menjelaskan spesifikasi dan panduan operasional deployment sistem JarvisOps menggunakan kontainer produksi Docker Compose (`compose.prod.yaml`).

---

## 1. Topologi Arsitektur Produksi

Sistem produksi JarvisOps berjalan di atas 4 layanan kontainer terisolasi:

```
[ Klien Browser ] ───> Port 3000 (HTTP)
                             │
                      [ jarvisops-prod-web ] (Next.js 16 Standalone)
                             │ BFF Route Handlers (httpOnly cookie)
                             ▼
                      [ jarvisops-prod-api ] (FrankenPHP Classic / PHP 8.4) ─── Port 8000
                             │                                 │
                 Shared Volume: app-storage                    │
                             │                                 ▼
                 [ jarvisops-prod-scheduler ]          [ jarvisops-prod-mysql ] (MySQL 8.4)
                 (php artisan schedule:work)           Volume: mysql-data-prod
```

### Karakteristik Layanan:
1. **`mysql`**: MySQL 8.4 resmi dengan volume persisten data `mysql-data-prod` dan inisialisasi skrip otomatis.
2. **`api`**: Laravel 13 di atas FrankenPHP 1 (PHP 8.4), stateless, non-root `www-data`, auto-migrate dan pemanasan cache (`config:cache`, `route:cache`, `view:cache`) saat startup via entrypoint runtime.
3. **`scheduler`**: Image yang sama dengan API, menjalankan `php artisan schedule:work` untuk pengecekan SLA breach background, pruning token Sanctum, dan task periodik.
4. **`web`**: Node.js 22 Alpine, Next.js Standalone Runner non-root `nextjs` (UID 1001), melayani antarmuka web dan Backend-For-Frontend (BFF) proxy.

---

## 2. Prasyarat Sistem

- **Docker Engine**: Versi 24.0 atau lebih baru.
- **Docker Compose**: Versi 2.20 atau lebih baru (`docker compose`).
- **Resource Minimum**:
  - CPU: 2 Core
  - RAM: 4 GB
  - Disk: 20 GB free space

---

## 3. Langkah Deployment dari Kondisi Bersih (Clean-Start)

### Langkah 1: Persiapan Environment
Salin template konfigurasi produksi ke file environment nyata:
```bash
cp apps/api/.env.production.example apps/api/.env.production
cp apps/web/.env.production.example apps/web/.env.production
```

### Langkah 2: Pembuatan `APP_KEY`
Jalankan container API sementara untuk menghasilkan encryption key produksi:
```bash
KEY=$(docker compose -f compose.prod.yaml run --rm api php artisan key:generate --show)
sed -i "s|^APP_KEY=.*|APP_KEY=$KEY|" apps/api/.env.production
```

### Langkah 3: Konfigurasi Kredensial Produksi
Buka `apps/api/.env.production` dan pastikan kredensial berikut diubah:
- `DB_PASSWORD`: Set kata sandi database aman untuk user `jarvisops`.
- `FRONTEND_URL`: Set URL publik antarmuka web (contoh: `https://itops.perusahaan.co.id`).
- `APP_URL`: Set URL publik endpoint backend jika diakses via reverse proxy domain.

Buka `apps/web/.env.production` dan sesuaikan:
- `API_BASE_URL`: Tetap arahkan ke internal network Docker (`http://api:8000/api`) atau internal ingress.

### Langkah 4: Menjalankan Kontainer

Terdapat dua cara menjalankan kontainer produksi:

#### Opsi A: Pull Image Siap Pakai dari GitHub Packages (Direkomendasikan untuk VPS / Server)
Menghemat CPU, RAM, dan waktu karena tidak memerlukan build dari source code di VPS:

1. **Login ke GitHub Container Registry (GHCR)** (Hanya diperlukan jika repository/package masih private):
   Buat GitHub Personal Access Token (PAT classic) dengan scope `read:packages`, lalu jalankan:
   ```bash
   echo $CR_PAT | docker login ghcr.io -u USERNAME_GITHUB --password-stdin
   ```
   *(Jika package sudah diubah menjadi Public, langkah login ini bisa dilewati).*

2. **Tarik Image dan Nyalakan Kontainer**:
   ```bash
   # Gunakan versi spesifik tag atau latest
   export APP_VERSION=v1.0.0
   docker compose -f compose.prod.yaml pull
   docker compose -f compose.prod.yaml up -d
   ```

#### Opsi B: Build Manual dari Source Code Lokal
Jika ingin mengompilasi langsung di mesin:
```bash
docker compose -f compose.prod.yaml up --build -d
```

### Langkah 5: Inisialisasi Data Awal (Opsional untuk Demo / Fresh Install)
Jika database baru dibuat dan membutuhkan data referensi master data serta akun demo awal:
```bash
docker compose -f compose.prod.yaml exec api php artisan db:seed --force
```

---

## 4. Verifikasi Kesehatan Layanan (Healthcheck)

Periksa status seluruh kontainer:
```bash
docker compose -f compose.prod.yaml ps
```
Pastikan seluruh layanan berstatus `Up (healthy)`.

Uji endpoint kesehatan secara manual:
- **API Health**:
  ```bash
  curl -s http://localhost:8000/up
  curl -s http://localhost:8000/api/health
  # Respons diharapkan: {"success":true,"message":"Service healthy.","data":{"status":"ok","db":"connected",...}}
  ```
- **Web App**:
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login
  # Respons diharapkan: 200
  ```
- **Scheduler Log**:
  ```bash
  docker compose -f compose.prod.yaml logs scheduler --tail=20
  # Pastikan worker log aktif tanpa fatal error
  ```

---

## 5. Prosedur Maintenance & Operasional

### Menjalankan Migrasi Database Manual
Entrypoint API secara otomatis menjalankan migrasi saat startup. Namun jika ingin menjalankan secara terpisah atau memeriksa status migrasi:
```bash
docker compose -f compose.prod.yaml exec api php artisan migrate:status
docker compose -f compose.prod.yaml exec api php artisan migrate --force
```

### Pembersihan & Pemanasan Ulang Cache Framework
Jika ada pembaruan konfigurasi di file `.env.production` atau kode sumber aplikasi:
```bash
docker compose -f compose.prod.yaml exec api php artisan optimize:clear
docker compose -f compose.prod.yaml exec api php artisan config:cache
docker compose -f compose.prod.yaml exec api php artisan route:cache
docker compose -f compose.prod.yaml exec api php artisan view:cache
```

### Setup & Verifikasi Background Scheduler
Layanan `scheduler` berjalan sebagai proses terpisah yang menjalankan perintah `php artisan schedule:work`. Pemisahan ini merupakan **keharusan arsitektural**, bukan opsional:
1. **Kenapa terpisah:** FrankenPHP berjalan dalam mode HTTP server dan tidak menjalankan Laravel Task Scheduler internal. Tanpa container terpisah, pekerjaan krusial seperti pengecekan pelanggaran SLA (`tickets:check-sla`), pembersihan token kedaluwarsa, dan aktivitas periodik tidak akan pernah dieksekusi.
2. **Verifikasi aktivitas scheduler:**
   ```bash
   docker compose -f compose.prod.yaml logs scheduler -f --tail=50
   ```
   Pastikan setiap 5 menit terdapat output eksekusi perintah `tickets:check-sla`.
3. **Trigger manual untuk pengujian:**
   ```bash
   docker compose -f compose.prod.yaml exec api php artisan tickets:check-sla
   ```

### Prosedur Backup Database
Jadwalkan backup MySQL berkala (misalnya menggunakan cron pada host VM):
```bash
docker compose -f compose.prod.yaml exec mysql mysqldump \
  -u jarvisops \
  -psecret_prod \
  --single-transaction \
  --quick \
  JarvisOps > backup_jarvisops_$(date +%Y%m%d_%H%M%S).sql
```
Untuk memulihkan database dari file backup SQL:
```bash
docker compose -f compose.prod.yaml exec -T mysql mysql -u jarvisops -psecret_prod JarvisOps < backup_jarvisops_YYYYMMDD_HHMMSS.sql
```

### Prosedur Backup Lampiran Tiket (Storage)
File attachment disimpan secara persisten di volume Docker `app-storage` (`/app/storage/app`). Lakukan backup volume menggunakan container utilitas tar:
```bash
docker run --rm \
  -v jarvisops_app-storage:/data:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/attachments_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```
Untuk merestorasi data lampiran ke volume Docker:
```bash
docker run --rm \
  -v jarvisops_app-storage:/data \
  -v $(pwd):/backup \
  alpine sh -c "tar xzf /backup/attachments_YYYYMMDD_HHMMSS.tar.gz -C /data"
```

---

## 6. Hardening Keamanan Produksi

Sebelum membuka akses ke publik atau jaringan korporat, pastikan checklist pengamanan berikut telah dipenuhi:

1. **Ganti Kata Sandi Akun Demo Awal**:
   Akun seeder bawaan (`admin@jarvisops.test`, `manager@jarvisops.test`, dst.) menggunakan password bawaan `Password123!`. Segera ganti password melalui antarmuka Profil atau perintah Artisan:
   ```bash
   docker compose -f compose.prod.yaml exec api php artisan tinker --execute '
     \App\Models\User::where("email", "admin@jarvisops.test")->update([
       "password" => \Illuminate\Support\Facades\Hash::make("GANTI_DENGAN_PASSWORD_KUAT_DAN_UNIK"),
       "must_change_password" => false
     ]);
   '
   ```
2. **Pastikan `APP_DEBUG=false`**:
   Di file `apps/api/.env.production`, verifikasi bahwa `APP_DEBUG=false`. Nilai `false` mencegah kebocoran database credentials, stack trace, dan query SQL pada respons error 500 JSON.
3. **Batasi CORS (Cross-Origin Resource Sharing)**:
   Konfigurasikan `FRONTEND_URL` hanya ke domain publik frontend yang valid (contoh: `FRONTEND_URL=https://itops.perusahaan.co.id`).
4. **Cookie Security (httpOnly, Secure, SameSite)**:
   Karena autentikasi menggunakan pola BFF proxy dengan httpOnly cookie, pastikan cookie `auth_token` di Next.js Route Handler memiliki atribut:
   - `httpOnly: true` (mencegah pencurian token melalui skrip JavaScript/XSS).
   - `secure: true` saat diakses via protokol HTTPS.
   - `sameSite: 'lax'` (mencegah eksploitasi CSRF).

---

## 7. Konfigurasi HTTPS & Reverse Proxy

Dalam produksi nyata, terdapat dua opsi konfigurasi HTTPS:

### Opsi A: Automatic HTTPS via Caddy (Built-in FrankenPHP)
FrankenPHP menyertakan Caddy web server dengan kapabilitas otomatisasi sertifikat TLS (Let's Encrypt / ZeroSSL).
1. Pastikan port 80 dan 443 terbuka ke internet publik.
2. Ubah `SERVER_NAME` pada konfigurasi FrankenPHP ke domain resmi (contoh: `itops-api.perusahaan.co.id`).
3. Caddy akan otomatis me-request dan memperbarui sertifikat TLS.

### Opsi B: Reverse Proxy di Depan Stack (Direkomendasikan untuk Enterprise)
Letakkan Nginx, Traefik, atau Cloudflare Ingress Controller di depan kontainer Docker:
- Teruskan `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`, dan `X-Forwarded-Host` ke port Web (`3000`) dan API (`8000`).
- Di Laravel `apps/api/.env.production`, aktifkan trusted proxy jika diperlukan untuk membaca IP klien asli pada rate limiter.

---

## 8. Known Risks & Rekomendasi Scale-Out

1. **Shared Storage untuk Attachment**:
   Saat ini penyimpanan attachment menggunakan volume Docker local `app-storage` yang di-mount bersama oleh `api` dan `scheduler`. Jika kontainer API di-scale menjadi multi-replica di beberapa host berbeda, volume tersebut harus digantikan dengan Network File System (NFS) atau S3 Object Storage (`FILESYSTEM_DISK=s3`).
2. **Database Concurrency Lock**:
   Migrasi database dijalankan saat startup container API menggunakan `--force`. Dalam deployment multi-replica, gunakan migration job terpisah atau flag `--isolated` untuk menghindari race condition skema.
3. **Octane Worker Mode**:
   Secara default, kontainer produksi menggunakan FrankenPHP Classic Mode (1 request per worker process) yang stabil dan bebas kebocoran memori. Evaluasi performa, audit state leak, dan panduan aktivasi Octane Worker Mode dijelaskan secara rinci pada [Bagian 9: Pilihan Runtime: Classic Mode vs Octane Worker Mode](#9-pilihan-runtime-classic-mode-vs-octane-worker-mode) serta laporan audit formal di [`docs/ops/OCTANE-AUDIT.md`](./OCTANE-AUDIT.md).

---

## 9. Pilihan Runtime: Classic Mode vs Octane Worker Mode

JarvisOps mendukung dua mode eksekusi server PHP pada lapisan kontainer API:

### 9.1 Keputusan Teknis: Default Produksi Tetap Classic Mode

**Keputusan Arsitektur:**  
FrankenPHP **Classic Mode** (1 request per worker process) tetap dipertahankan sebagai **default standar lingkungan produksi** JarvisOps.

**Alasan & Pertimbangan:**
1. **Determinisme & Isolasi Memori Mutlak:**  
   Sebagai sistem IT Service Management (ITSM) yang mengelola hak akses berbasis role yang ketat, data per-tiket, audit log, dan kepatuhan SLA, keselamatan integritas data pengguna adalah prioritas utama. Classic mode menjamin siklus hidup request dimulai dari kondisi memori murni (*clean slate*), mengeliminasi risiko kebocoran konteks antar-request secara inheren.
2. **Kestabilan Jangka Panjang:**  
   Tidak ada risiko akumulasi memori (*memory fragmentation* / *slow memory creep*) dari pustaka pihak ketiga atau pemrosesan payload file berukuran besar.
3. **Pemisahan Peran Scheduler yang Alami:**  
   Task scheduler background (`php artisan schedule:work`) tetap berjalan pada kontainer independen tanpa terpengaruh lifecycle worker HTTP.

### 9.2 Opsi High-Throughput: Octane Worker Mode

Bagi lingkungan dengan beban volume traffic tinggi (*high-concurrency/throughput*), Octane Worker Mode telah diinstalasi (`laravel/octane:^2.19`), diaudit secara menyeluruh, dan diverifikasi aman. Laporan audit kode dan pengujian otomatis dapat dilihat pada [`docs/ops/OCTANE-AUDIT.md`](./OCTANE-AUDIT.md).

Pengujian menunjukkan:
- **Zero State Leak:** Seluruh service layer, controller, middleware, model observer, dan helper bersifat stateless murni. Pengujian bolak-balik antar pengguna (`OctaneStateLeakTest`) terbukti 100% lulus.
- **Efisiensi Memori:** Framework Laravel dimuat satu kali ke dalam memori RAM, memangkas latensi bootstrap PHP pada setiap request.

### 9.3 Cara Mengaktifkan Octane Worker Mode

Untuk menjalankan stack produksi dengan Octane Worker Mode, gunakan Docker Compose override `compose.prod.octane.yaml`:

```bash
docker compose -f compose.prod.yaml -f compose.prod.octane.yaml up -d
```

Override tersebut mengonfigurasi service `api` dengan:
```yaml
services:
  api:
    command: ["php", "artisan", "octane:start", "--server=frankenphp", "--host=0.0.0.0", "--port=8000", "--workers=2", "--max-requests=1000"]
    environment:
      OCTANE_SERVER: frankenphp
```

**Parameter Mitigasi dan Rekomendasi Operasional:**
- `--workers=2`: Menyesuaikan jumlah worker proses dengan core CPU yang dialokasikan pada kontainer API.
- `--max-requests=1000`: Me-recycle worker secara berkala setelah melayani 1000 request untuk membersihkan akumulasi memori secara otomatis dan transparan tanpa downtime.
- **Service Scheduler Tetap Berjalan:** Kontainer `scheduler` pada `compose.prod.yaml` tetap menjalankan `php artisan schedule:work` secara independen, memastikan evaluasi SLA tiket 24/7 tetap berjalan terjadwal.

