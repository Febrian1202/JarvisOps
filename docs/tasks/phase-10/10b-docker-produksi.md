# Sub-tahap 10b — Docker Produksi

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini membangun image produksi multi-stage dan `compose.prod.yaml` — spec deploy yang harus bisa dijalankan dari kondisi bersih (exit criteria ROADMAP:930). Jangan menyentuh `compose.yaml` dev / `Dockerfile.dev` yang sudah berfungsi untuk pengembangan.

**Goal:** `docker compose -f compose.prod.yaml up --build` dari kondisi bersih menghasilkan aplikasi berfungsi: API FrankenPHP classic (bukan worker), scheduler terpisah, MySQL persisten, web Next.js standalone. Image di-tag mengikuti Git tag (D-30: `jarvisops-api:v1.0.0`, `jarvisops-web:v1.0.0`).

**Branch:** `feat/phase-10b-docker-prod`
**Estimasi:** ~1,0 hari
**Prasyarat:** 10a selesai (tidak wajib, tapi hardening lebih dulu lebih rapi untuk image prod). Tidak ada dependensi teknis.

---

## Task 1: `apps/api/Dockerfile` (produksi, multi-stage)

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `apps/api/.dockerignore` (jika belum ada)

**Detail (K2):** Multi-stage:
- **Stage build** `dunglas/frankenphp:1-php8.4` (sama dengan Dockerfile.dev — ekstensi sudah cocok: pdo_mysql, gd, zip, intl, bcmath, opcache). Salin `composer.json`/`composer.lock`, jalankan `composer install --no-dev --optimize-autoloader --no-scripts` (lalu `composer dump-autoload --optimize` di stage final), salin source **tanpa** `tests/`.
- **Cache konfigurasi saat build** (ROADMAP:862): `php artisan config:cache && php artisan route:cache && php artisan view:cache` — butuh `.env` atau env vars saat build; jalankan di `RUN` dengan env dummy bila perlu, atau lakukan di entrypoint saat runtime. **Pilih:** lakukan di entrypoint runtime (lebih aman karena env prod baru tersedia saat run) + dokumentasikan.
- **Stage final** ramping: `dunglas/frankenphp:1-php8.4`, salin vendor + app, non-root user bila memungkinkan, WORKDIR `/app`.
- Entrypoint: tunggu MySQL healthy → `php artisan migrate --force` → `php artisan config:cache route:cache view:cache` → jalankan FrankenPHP classic (`frankenphp run --config /etc/caddy/Caddyfile` atau default).

> **Jebakan — source test & `.env`:** `.dockerignore` harus memuat `tests/`, `.env`, `.git`, `storage/logs/*`, `bootstrap/cache/*`. Jangan pernah menyalin `.env` ke image.
>
> **Jebakan — config:cache di runtime vs build:** Jika `APP_KEY`/`DB_*` baru tersedia saat container start, jalankan `config:cache` di entrypoint (bukan `RUN`), atau berikan env placeholder saat build. Konsistensi: gunakan entrypoint.

### Step 1 — Tulis `apps/api/Dockerfile` + `.dockerignore`.
### Step 2 — Uji build manual:
```bash
docker build -f apps/api/Dockerfile -t jarvisops-api:test apps/api
```
### Step 3 — Commit:
```bash
git add apps/api/Dockerfile apps/api/.dockerignore
git commit -m "feat(docker): add production multi-stage Dockerfile for API (FrankenPHP)"
```

---

## Task 2: `apps/web/Dockerfile` (produksi, multi-stage + standalone)

**Files:**
- Create: `apps/web/Dockerfile`
- Create: `apps/web/.dockerignore`
- Modify: `apps/web/next.config.ts` (`output: 'standalone'`)

**Detail (K2):**
- **Stage build** `node:22-alpine`: `npm ci`, salin source, `next build`.
- **Stage final** `node:22-alpine` ramping: salin `.next/standalone`, `.next/static`, `public` (jika ada). Jalankan `node server.js` (standalone) di port 3000.
- `next.config.ts` tambah `output: 'standalone'` — dev (`npm run dev`) tidak terpengaruh.

> **Jebakan — standalone path:** Hasil `next build` dengan standalone menghasilkan `.next/standalone/server.js`; file statis harus disalin manual ke `.next/static` di dalam standalone tree. Ikuti pola dokumentasi Next.js resmi (`node_modules/next/dist/docs/` — baca sebelum menulis, lihat AGENTS.md apps/web).
>
> **Jebakan — variabel runtime:** `API_BASE_URL` dibaca server-side saat runtime (BFF). Karena standalone mengeksekusi server Node, env disuntikkan saat `docker run`/compose, bukan saat build. Jangan `next build` dengan env produksi yang salah.

### Step 1 — Baca panduan standalone Next.js di `node_modules/next/dist/docs/` (wajib, lihat AGENTS.md apps/web).
### Step 2 — Modify `next.config.ts` + tulis `apps/web/Dockerfile` + `.dockerignore`.
### Step 3 — Uji build:
```bash
cd apps/web && npm run build
docker build -f apps/web/Dockerfile -t jarvisops-web:test apps/web
```
### Step 4 — Commit:
```bash
git add apps/web/Dockerfile apps/web/.dockerignore apps/web/next.config.ts
git commit -m "feat(docker): add production multi-stage Dockerfile for web (Next.js standalone)"
```

---

## Task 3: `compose.prod.yaml` + volume + healthcheck

**Files:**
- Create: `compose.prod.yaml`
- Create: `apps/api/.env.production.example`
- Create: `apps/web/.env.production.example`

**Detail (K3):** Empat service (bukan tiga — scheduler WAJIB terpisah, AGENTS.md):
- `mysql`: image `mysql:8.4`, volume `mysql-data-prod`, env dari `.env.production`, healthcheck (`mysqladmin ping`), batas resource.
- `api`: build `apps/api/Dockerfile`, port 8000, volume persisten `app-storage:/app/storage/app` (attachment! K3/ROADMAP:870), env `DB_*`, `APP_ENV=production`, `APP_DEBUG=false`, `FRONTEND_URL`, healthcheck `GET /up` (health route `/up` dari Laravel bootstrap — sudah ada), restart policy.
- `scheduler`: image yang sama, `command: php artisan schedule:work`, volume storage sama (SLA scheduler menulis `sla_breached`), tanpa port publik, healthcheck disable.
- `web`: build `apps/web/Dockerfile`, port 3000, env `API_BASE_URL=http://api:8000/api`, `FRONTEND_URL`, healthcheck.

> **Jebakan — volume storage DIKUNCI:** Scheduler dan API menulis ke `storage/app` (attachment di-upload via API; scheduler hanya baca DB, tapi log scheduler & cache di `storage`). **Keduanya wajib mount volume `storage/app` yang sama** supaya attachment yang di-upload via API terbaca konsisten. Bila API di-replicate, volume harus shared (mis. NFS) — catat di DEPLOYMENT.
>
> **Jebakan — migrasi di startup:** Jalankan `php artisan migrate --force` di entrypoint API dengan mekanisme tunggal (lock) supaya dua replica tidak migrasi bersamaan. Untuk MVP satu instance, cukup guard sederhana.
>
> **Jebakan — port DB dev 3307 vs prod:** `compose.prod.yaml` pakai env prod; jangan bentrok dengan dev (nama volume & container prefix berbeda, mis. `jarvisops-prod-*`).

### Step 1 — Tulis `compose.prod.yaml` + dua `.env.production.example`.
### Step 2 — Verifikasi konfigurasi:
```bash
docker compose -f compose.prod.yaml config
```
### Step 3 — Commit:
```bash
git add compose.prod.yaml apps/api/.env.production.example apps/web/.env.production.example
git commit -m "feat(docker): add production compose stack with scheduler, persistent storage, and healthchecks"
```

---

## Task 4: Uji dari kondisi bersih

**Files:** tidak ada perubahan (hanya verifikasi).

**Detail:** Buktikan exit criteria utama (ROADMAP:930):
```bash
# Simulasi kondisi bersih — stop semua & hapus volume prod
docker compose -f compose.prod.yaml down -v
# Salin env produksi
cp apps/api/.env.production.example apps/api/.env.production
cp apps/web/.env.production.example apps/web/.env.production
# Set APP_KEY (generate dulu di api)
docker compose -f compose.prod.yaml run --rm api php artisan key:generate --show
# Up dari bersih
docker compose -f compose.prod.yaml up --build -d
# Verifikasi
curl -s http://localhost:8000/api/health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login   # 200
docker compose -f compose.prod.yaml ps   # semua healthy
```

Verifikasi tambahan:
- Login dari browser ke `localhost:3000` (BFF → API internal).
- Upload attachment → file ada di volume `storage/app`.
- Scheduler: `docker compose -f compose.prod.yaml logs scheduler` menunjukkan `schedule:work` berjalan.
- Restart container → data MySQL & attachment tetap (volume persisten).
- `APP_DEBUG=false`: error 500 tidak memuat stack trace.

> **Jebakan — waktu migrasi vs healthcheck API:** API entrypoint menunggu MySQL healthy sebelum migrasi. Atur `depends_on: condition: service_healthy` + retry di entrypoint.

### Step 1 — Jalankan seluruh verifikasi di atas.
### Step 2 — Catat anomali; perbaiki & commit:
```bash
git commit -am "fix(docker): resolve production compose issues found in clean-start test"
```

---

## Task 5: Dokumen ringkas `docs/ops/DEPLOYMENT.md` (draft; disempurnakan di 10c)

**Files:**
- Create: `docs/ops/DEPLOYMENT.md` (draft)

**Detail:** Skeleton untuk 10c: prasyarat (env, APP_KEY, FRONTEND_URL), langkah `up` dari bersih, cara ganti password demo (Addendum §2.3), backup DB (`mysqldump`) & volume storage, healthcheck endpoints, known-risk dari 10a (bila sudah ada).

### Step 1 — Tulis draft.
### Step 2 — Commit:
```bash
git add docs/ops/DEPLOYMENT.md
git commit -m "docs(ops): add deployment draft for production compose stack"
```

---

## Exit Criteria 10b

- [ ] `apps/api/Dockerfile` & `apps/web/Dockerfile` multi-stage build sukses; image tidak memuat `tests/`, `.env`, `.git`.
- [ ] `compose.prod.yaml` menjalankan mysql + api + scheduler + web dari kondisi bersih; semua healthy.
- [ ] Attachment tersimpan di volume persisten bersama API & scheduler; data MySQL persisten setelah restart.
- [ ] Migrasi `--force` jalan saat startup; config/route/view cache aktif di produksi.
- [ ] `.env.production.example` ada untuk kedua app; `APP_DEBUG=false`; CORS & cookie sesuai K4.
- [ ] Draft `docs/ops/DEPLOYMENT.md` ada.
- [ ] `docker compose -f compose.prod.yaml config` valid.
