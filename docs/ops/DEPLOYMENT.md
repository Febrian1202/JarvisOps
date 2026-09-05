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

### Langkah 4: Build dan Jalankan Kontainer
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
Entrypoint API secara otomatis menjalankan migrasi saat startup. Namun jika ingin menjalankan secara terpisah:
```bash
docker compose -f compose.prod.yaml exec api php artisan migrate --force
```

### Pembersihan Cache Framework
Jika ada pembaruan konfigurasi di file `.env.production`:
```bash
docker compose -f compose.prod.yaml exec api php artisan config:cache
docker compose -f compose.prod.yaml exec api php artisan route:cache
docker compose -f compose.prod.yaml exec api php artisan view:cache
```

### Prosedur Backup Database
```bash
docker compose -f compose.prod.yaml exec mysql mysqldump -u jarvisops -psecret_prod JarvisOps > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Prosedur Backup Lampiran Tiket (Storage)
File attachment disimpan secara persisten di volume Docker `app-storage` (`/app/storage/app`). Lakukan backup dengan container utilitas:
```bash
docker run --rm -v jarvisops_app-storage:/data -v $(pwd):/backup alpine tar czf /backup/attachments_$(date +%Y%m%d).tar.gz /data
```

---

## 6. Known Risks & Rekomendasi Scale-Out

1. **Shared Storage untuk Attachment**:
   Saat ini penyimpanan attachment menggunakan volume Docker local `app-storage` yang di-mount bersama oleh `api` dan `scheduler`. Jika kontainer API di-scale menjadi multi-replica di beberapa host berbeda, volume tersebut harus digantikan dengan Network File System (NFS) atau S3 Object Storage (`FILESYSTEM_DISK=s3`).
2. **Database Concurrency Lock**:
   Migrasi database dijalankan saat startup container API menggunakan `--force`. Dalam deployment multi-replica, gunakan migration job terpisah atau flag `--isolated` untuk menghindari race condition skema.
3. **Octane Worker Mode**:
   Secara default, kontainer produksi menggunakan FrankenPHP Classic Mode (1 request per worker process). Mode Octane worker akan dibahas dan diuji pada sub-tahap 10d.
