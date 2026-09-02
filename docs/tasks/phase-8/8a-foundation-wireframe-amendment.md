# Sub-tahap 8a — Foundation, Wireframe, & Amandemen Backend

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini adalah fondasi semua sub-tahap berikutnya — wireframe yang menyetujui tata letak, amandemen backend yang menutup lubang API, dan pola frontend yang dipakai 8b–8g. Jangan tergesa menyelesaikan Task 1: wireframe yang baik menghemat revisi di 8b–8f.

**Goal:** (1) Menyediakan referensi visual untuk 13 surface Fase 8 yang belum punya wireframe, (2) Menutup 4 lubang backend agar UI bisa dibangun di atas API yang konsisten, (3) Membangun fondasi kode frontend bersama (`useApiMutation`, `useUploadWithProgress`, `query-keys.ts`, `errorMessages`, `MasterDataPage`, `action-name-to-status-id` map, label tambahan, `react-markdown` + sanitizer, Playwright skeleton).

**Branch:** `feat/phase-8a-foundation`
**Estimasi:** ~1,25 hari
**Prasyarat:** Fase 7 selesai (shadcn, TanStack, Vitest, BFF, AuthProvider, komponen shared, DataTable, FilterBar, halaman ticket proving-ground, dll.)

---

## Task 1: Wireframe — 13 frame baru di `docs/design/wireframe.pen`

**Files:** `docs/design/wireframe.pen` (modify — tambah frame)

**Detail:** Perluas `wireframe.pen` dengan 13 frame baru. Setiap frame meng-instance komponen reusable yang sudah ada (`C / Sidebar`, `C / Topbar`, `C / Status Pill`, `C / Button Primary`) dan mengikuti pola layout yang sudah disetujui di frame 06–08.

**Pola layout yang harus diikuti:**
- **List pages** (Daftar Aset, Daftar KB, Admin Users, Master Data, Audit Log): Action Bar (search + filter) → Table Card → Pagination. Ikuti frame 06 (Daftar Ticket).
- **Detail pages** (Detail Aset, Detail Artikel): Columns 2-kolom. Kolom kiri = konten utama. Kolom kanan = metadata/sidebar info. Ikuti frame 08 (Detail Ticket).
- **Form pages** (Buat Aset, Edit Aset, Buat Artikel, Edit Artikel, Form Admin): Form Container (kolom kiri) + Sidebar Info (kolom kanan). Ikuti frame 07 (Buat Ticket Baru).
- **Single-page** (Profil, Aset Saya): Card sederhana + data display.

**Daftar 13 frame baru:**

| # | Nama Frame | Pola Layout | Isi |
| --- | --- | --- | --- |
| 1 | 13 Daftar Aset | List (frame 06) | Search, filter status/kategori/pemegang, table kolom: tag, nama, kategori, brand, status, pemegang, aksi |
| 2 | 14 Detail Aset | Detail 2-kolom (frame 08) | Banner tag+nama, timeline riwayat kepemilikan (PRD §17), metadata pemegang, tombol Assign/Release |
| 3 | 15 Form Aset | Form 2-kolom (frame 07) | Fields: tag, nama, kategori (select), brand, model, serial, purchase date, status, notes |
| 4 | 16 Aset Saya | List (frame 06) | Sama dengan daftar aset tapi tanpa filter pemegang, tanpa tombol assign |
| 5 | 17 Daftar KB | List (frame 06) | Search, filter kategori, filter status (T/M/A), table: judul, kategori, penulis, status, view count, aksi |
| 6 | 18 Detail Artikel | Detail 2-kolom (frame 08) | Judul, konten (rendered markdown), metadata: kategori, penulis, status, view count, related articles |
| 7 | 19 Editor Artikel | Form 2-kolom (frame 07) | Fields: judul, kategori (select), konten (textarea), publish toggle, meta preview |
| 8 | 20 Admin Pengguna | List (frame 06) | Search, filter role/department/status, table: nama, email, role, department, status, aksi |
| 9 | 21 Admin Master Data | List (frame 06) | Generic: search, table 2–4 kolom tergantung entity, tombol tambah/edit/hapus |
| 10 | 22 Admin Audit Log | List (frame 06) | Filter user/module/action/tanggal, table: user, action, module, module_id, description, waktu, klik → dialog detail |
| 11 | 23 Dialog Detail Audit | Detail dialog | Overlay menampilkan `old_data` vs `new_data` sebagai perbandingan |
| 12 | 24 Profil | Single card | Data: full_name, email, role, department, employee_code, phone. Form edit: full_name, phone. Tombol ganti password |
| 13 | 25 Dialog Reset Password | Modal | Peringatan "Password baru hanya ditampilkan sekali", password text, tombol salin, tombol tutup |

> **Jebakan — komponen reusable:** Jangan menggambar ulang Sidebar, Topbar, Status Pill, Button Primary dari nol. Selalu buat instance (`ref`) dari komponen yang sudah ada. Bila frame 06–08 sudah memiliki sub-komponen seperti `Search Box`, `Filter`, `Table Body`, `Pagination`, `Action Bar` — gunakan `Copy` atau `ref` ke pola yang sama, bukan menulis ulang `frame` baru.
>
> **Jebakan — naming:** Setiap frame harus punya nama unik dengan prefix nomor urut (`13 Daftar Aset`, `14 Detail Aset`, `15 Form Aset`, dst.) agar mudah ditemukan. Jangan memakai nama yang sama dengan frame yang sudah ada.

### Step 1: Baca wireframe saat ini untuk memahami struktur
```bash
# Buka pencil_get_app_state untuk melihat state canvas
# Baca struktur frame 06 (Daftar Ticket) sebagai template list
# Baca struktur frame 08 (Detail Ticket) sebagai template detail
# Baca struktur frame 07 (Buat Ticket Baru) sebagai template form
```

### Step 2: Temukan posisi kosong untuk 13 frame baru
Gunakan `FindEmptySpace` di `pencil_execute` untuk menemukan area kosong. Frame 01–12 saat ini menempati:
- 01 Login: `(0, 1080)`
- 02–12: bersambung ke kanan dan bawah
- Cari posisi di bawah/menyamping frame 12 Mobile Shell.

### Step 3: Buat 13 frame, satu per satu atau dalam batch kecil (3–4 frame per execute call)
```js
// Contoh pola untuk list frame:
const pos = FindEmptySpace({width:1440,height:1024,padding:80});
const listPageId = Insert(document, {
  type: "frame", name: "13 Daftar Aset", x: pos.x, y: pos.y,
  layout: "vertical", width: 1440, clip: true, placeholder: true
});
// Instansiasi Sidebar + Topbar + Body (Action Bar + Table Card + Pagination)
Insert(listPageId, {type: "ref", ref: sidebarId, name: "Sidebar"});
// ... dan seterusnya
```

### Step 4: Selesai — screenshot
```js
TakeScreenshot(["13 Daftar Aset", "14 Detail Aset", ...].map(id => frameId))
```

### Step 5: Verifikasi
- Tidak ada tumpang tindih antar frame.
- Setiap frame menggunakan komponen reusable yang sudah ada (C/Sidebar, C/Topbar, dll.).
- Layout mengikuti pola frame 06/07/08.

---

## Task 2: Amandemen A1 — `ArticleResource.author.name` → `full_name`

**Files:**
- Modify: `app/Http/Resources/Article/ArticleResource.php`
- Modify: `app/Http/Resources/Article/ArticleListResource.php`
- Modify: `tests/Feature/Knowledge/ArticlePublishTest.php` (tambah assert `author.full_name`)
- Create: `tests/Feature/Knowledge/ArticleAuthorNameTest.php`

**Detail:** `ArticleResource:30` memakai `$this->author->name`, tapi model `User` tidak memiliki kolom `name` — hanya `full_name`. Akibatnya kolom penulis di artikel KB selalu `null`.

### Step 1 — RED: test
Buat test yang memverifikasi `author.full_name` terisi dengan benar:
```php
test('article resource returns author full_name', function () {
    $tech = User::factory()->technician()->create(['full_name' => 'Budi Santoso']);
    $article = KnowledgeArticle::factory()->create(['author_id' => $tech->id]);

    Sanctum::actingAs($tech); // any user with article.view
    $response = $this->getJson("/api/articles/{$article->slug}");

    $response->assertStatus(200)
        ->assertJsonPath('data.author.full_name', 'Budi Santoso');
});
```
Jalankan: `vendor/bin/pest tests/Feature/Knowledge/ArticleAuthorNameTest.php` → pastikan gagal.

### Step 2 — GREEN: fix resource
```php
// ArticleResource.php
'author' => $this->whenLoaded('author', fn () => [
    'id' => $this->author->id,
    'full_name' => $this->author->full_name,
    // HAPUS 'email' — tidak perlu diekspos ke Employee
]),
```
Sama untuk `ArticleListResource.php`.

### Step 3 — REFACTOR & verifikasi
```bash
vendor/bin/pest tests/Feature/Knowledge/ArticleAuthorNameTest.php
vendor/bin/pest --filter=Article
vendor/bin/pint --dirty --format agent
```

### Step 4 — Commit
```bash
git add app/Http/Resources/Article/ tests/Feature/Knowledge/ArticleAuthorNameTest.php
git commit -m "fix(api): article author returns full_name instead of null name"
```

---

## Task 3: Amandemen A2 — `GET /api/assets/categories`

**Files:**
- Create: `tests/Feature/Asset/AssetCategoriesTest.php`
- Modify: `app/Http/Controllers/Asset/AssetController.php` (tambah method `categories`)
- Modify: `routes/api.php` (daftarkan route sebelum `apiResource`)

**Detail:** API sudah mendukung `?category=` di `IndexAssetRequest`, tapi tidak ada sumber daftar kategori. `assets.category` adalah string bebas ber-index. Tambah endpoint yang mengembalikan distinct category values yang sudah terpakai, diurutkan abjad, untuk dropdown filter.

> **Jebakan — route ordering:** Route `/assets/categories` harus didaftarkan **sebelum** `apiResource('assets', ...)` karena Laravel akan mencocokkan `{asset}` sebelum literal. Ikuti pola `assets/assignable` yang sudah ada.

### Step 1 — RED:
```php
test('asset categories endpoint returns distinct categories', function () {
    Asset::factory()->create(['category' => 'Laptop']);
    Asset::factory()->create(['category' => 'Monitor']);
    Asset::factory()->create(['category' => 'Laptop']); // duplicate

    $user = User::factory()->technician()->create();
    Sanctum::actingAs($user);

    $response = $this->getJson('/api/assets/categories');
    $response->assertStatus(200)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0', 'Laptop')
        ->assertJsonPath('data.1', 'Monitor');
});

test('asset categories requires asset.viewAny', function () {
    $emp = User::factory()->employee()->create();
    Sanctum::actingAs($emp);
    $this->getJson('/api/assets/categories')->assertStatus(403);
});
```

### Step 2 — GREEN:
```php
// AssetController
public function categories(): JsonResponse
{
    $this->authorize('viewAny', Asset::class);

    $categories = Asset::query()
        ->whereNotNull('category')
        ->distinct()
        ->orderBy('category')
        ->pluck('category');

    return ApiResponse::success($categories, 'Asset categories retrieved.');
}
```
```php
// routes/api.php — SEBELUM apiResource('assets')
Route::get('/assets/categories', [AssetController::class, 'categories'])->name('assets.categories');
Route::get('/assets/assignable', [AssetController::class, 'assignable'])->name('assets.assignable');
Route::apiResource('assets', AssetController::class);
```

### Step 3 — REFACTOR & verifikasi
```bash
vendor/bin/pest tests/Feature/Asset/AssetCategoriesTest.php
vendor/bin/pest --filter=Asset
vendor/bin/pint --dirty --format agent
```

### Step 4 — Commit
```bash
git add app/Http/Controllers/Asset/AssetController.php routes/api.php tests/Feature/Asset/AssetCategoriesTest.php
git commit -m "feat(api): add GET /api/assets/categories for distinct category filter"
```

---

## Task 4: Amandemen A3 — `GET /api/users/assignable` + gate `user.lookup`

**Files:**
- Create: `tests/Feature/User/UserAssignableTest.php`
- Modify: `app/Http/Controllers/Admin/UserController.php` (tambah method `assignable`)
- Modify: `routes/api.php`
- Modify: `app/Authorization/AbilityMatrix.php` (tambah ability `user.lookup`)
- Modify: `docs/product/PERMISSION-MATRIX.md` (tambah §3.8 baris + §4 baris)

**Detail:** `asset.assign` diberikan ke Technician dan Manager (PERMISSION §3.4), tapi satu-satunya endpoint daftar user (`GET /api/users`) dijaga `user.viewAny` = Admin. Tanpa endpoint ini, dialog assign aset dan filter pemegang di `/assets` tidak bisa dibangun. Endpoint baru: `GET /api/users/assignable` — hanya mengembalikan `id`, `full_name`, `department` untuk user `active`, mendukung `?search=`.

> **Jebakan — tidak membuka `user.viewAny`:** Endpoint ini sengaja dibatasi outputnya (tanpa email, role, status, profile). Gate `user.lookup` adalah ability baru yang hanya dimiliki Admin, Manager, dan Technician — bukan substitusi `user.viewAny`.

### Step 1 — RED:
```php
test('assignable users returns active users with limited fields', function () {
    User::factory()->employee()->create(['full_name' => 'Andi Pratama']);
    User::factory()->technician()->create(['full_name' => 'Budi Santoso']);

    $tech = User::factory()->technician()->create();
    Sanctum::actingAs($tech);

    $response = $this->getJson('/api/users/assignable');
    $response->assertStatus(200);
    // Harus mengembalikan array, setiap item punya id, full_name, department
    $response->assertJsonStructure([
        'data' => [['id', 'full_name', 'department']]
    ]);
});

test('assignable users returns only active users', function () {
    User::factory()->employee()->create(['full_name' => 'Active User', 'status' => 'active']);
    User::factory()->employee()->create(['full_name' => 'Inactive User', 'status' => 'inactive']);

    $tech = User::factory()->technician()->create();
    Sanctum::actingAs($tech);

    $response = $this->getJson('/api/users/assignable');
    $response->assertJsonCount(1, 'data'); // inactive user excluded
});

test('assignable users supports search', function () {
    User::factory()->employee()->create(['full_name' => 'Andi Pratama']);
    User::factory()->employee()->create(['full_name' => 'Budi Santoso']);

    $tech = User::factory()->technician()->create();
    Sanctum::actingAs($tech);

    $response = $this->getJson('/api/users/assignable?search=andi');
    $response->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.full_name', 'Andi Pratama');
});

test('employee cannot access assignable users', function () {
    $emp = User::factory()->employee()->create();
    Sanctum::actingAs($emp);
    $this->getJson('/api/users/assignable')->assertStatus(403);
});
```

### Step 2 — GREEN:
```php
// AbilityMatrix — tambah
'user.lookup' => [RoleName::Admin, RoleName::Manager, RoleName::Technician],

// UserController
public function assignable(Request $request): JsonResponse
{
    $this->authorize('user.lookup');

    $query = User::query()->where('status', 'active');

    if ($search = $request->query('search')) {
        $term = str_replace(['%', '_'], ['\\%', '\\_'], $search);
        $query->where('full_name', 'like', "%{$term}%");
    }

    $users = $query->orderBy('full_name')
        ->get(['id', 'full_name', 'department_id'])
        ->load('department:id,name');

    return ApiResponse::success($users, 'Assignable users retrieved.');
}
```
```php
// routes/api.php
Route::get('/users/assignable', [Admin\UserController::class, 'assignable'])->name('users.assignable');
```

### Step 3 — REFACTOR & verifikasi
```bash
vendor/bin/pest tests/Feature/User/UserAssignableTest.php
vendor/bin/pest --filter=User
vendor/bin/pint --dirty --format agent
```

### Step 4 — Sinkronisasi PERMISSION-MATRIX.md
Tambah ke §3.8 (Administrasi):
```
| `user.lookup` | Melihat daftar pengguna untuk assign aset | A, M, T |
```

Tambah ke §4 (Ringkasan ability):
```
| `user.lookup` | Role-based | §3.8 |
```

### Step 5 — Commit
```bash
git add app/Http/Controllers/Admin/UserController.php \
       app/Authorization/AbilityMatrix.php \
       routes/api.php \
       tests/Feature/User/UserAssignableTest.php \
       docs/product/PERMISSION-MATRIX.md
git commit -m "feat(api): add GET /api/users/assignable with gate user.lookup for asset assignment"
```

---

## Task 5: Amandemen A4 — `GET /api/articles/{article}/edit`

**Files:**
- Create: `tests/Feature/Knowledge/ArticleEditEndpointTest.php`
- Modify: `app/Http/Controllers/Article/ArticleController.php` (tambah method `edit`)
- Modify: `routes/api.php`

**Detail:** Endpoint `GET /api/articles/{slug}` digunakan untuk display publik dan menaikkan `view_count`. Editor halaman `/knowledge/[id]/edit` butuh artikel mentah tanpa efek samping. Tambah endpoint `GET /api/articles/{article}/edit` yang:
- Terikat `Article` model binding (numeric ID)
- Dijaga `ArticlePolicy@update`
- Tidak menaikkan `view_count`
- Tidak memuat `related_articles`
- Tidak mem-filter status (draft bisa diedit)

> **Jebakan — route ordering:** Route `articles/{article}/edit` harus didaftarkan **sebelum** `apiResource` atau `articles/{article:slug}` agar Laravel tidak salah mengikat ID sebagai slug.

### Step 1 — RED:
```php
test('edit endpoint returns article without incrementing view count', function () {
    $tech = User::factory()->technician()->create();
    $article = KnowledgeArticle::factory()->published()->create([
        'author_id' => $tech->id,
        'view_count' => 5,
    ]);

    Sanctum::actingAs($tech);
    $response = $this->getJson("/api/articles/{$article->id}/edit");

    $response->assertStatus(200)
        ->assertJsonPath('data.id', $article->id)
        ->assertJsonPath('data.title', $article->title)
        ->assertJsonPath('data.content', $article->content);

    // view_count should NOT have changed
    $this->assertEquals(5, $article->fresh()->view_count);
});

test('edit endpoint returns 404 for non-existent article', function () {
    $tech = User::factory()->technician()->create();
    Sanctum::actingAs($tech);
    $this->getJson('/api/articles/999999/edit')->assertStatus(404);
});

test('employee cannot access edit endpoint', function () {
    $emp = User::factory()->employee()->create();
    $article = KnowledgeArticle::factory()->published()->create();
    Sanctum::actingAs($emp);
    $this->getJson("/api/articles/{$article->id}/edit")->assertStatus(403);
});
```

### Step 2 — GREEN:
```php
// ArticleController
public function edit(KnowledgeArticle $article): JsonResponse
{
    $this->authorize('update', $article);

    return ApiResponse::success(
        new ArticleResource($article->load(['category', 'author'])),
        'Article retrieved for editing.'
    );
}
```
```php
// routes/api.php — SEBELUM articles/{article:slug}
Route::get('/articles/{article}/edit', [ArticleController::class, 'edit'])->name('articles.edit');
Route::apiResource('articles', ArticleController::class)->parameters(['articles' => 'article:slug']);
```

### Step 3 — REFACTOR & verifikasi
```bash
vendor/bin/pest tests/Feature/Knowledge/ArticleEditEndpointTest.php
vendor/bin/pest --filter=Article
vendor/bin/pint --dirty --format agent
```

### Step 4 — Commit
```bash
git add app/Http/Controllers/Article/ArticleController.php routes/api.php tests/Feature/Knowledge/ArticleEditEndpointTest.php
git commit -m "feat(api): add GET /api/articles/{article}/edit without view_count increment"
```

---

## Task 6: Fondasi frontend — shared hooks & utilities

**Files:**
- Create: `apps/web/src/hooks/useApiMutation.ts`
- Create: `apps/web/src/hooks/useUploadWithProgress.ts`
- Modify: `apps/web/src/lib/query-keys.ts`
- Modify: `apps/web/src/lib/labels.ts`
- Create: `apps/web/src/lib/action-to-endpoint.ts`
- Modify: `apps/web/src/lib/validation.ts`
- Create: `apps/web/src/components/shared/MasterDataPage.tsx`
- Create: `apps/web/src/components/shared/index.ts` (export komponen baru)

### Detail — `useApiMutation.ts`
Hook yang membungkus `useMutation` TanStack Query dengan:
- Toast sukses (Indonesia) dari `sonner`
- Binding 422 `errors.<field>` ke form RHF (menerima `setError` callback)
- Map 403/404/409/429/500 ke teks Indonesia dari `labels.ts` → toast
- Invalidasi query dari daftar key yang diberikan

```typescript
interface UseApiMutationOptions<TData, TError> {
  mutationFn: (data: TData) => Promise<ApiResponse<unknown>>;
  onSuccessMessage?: string;
  invalidateKeys?: (string | string[])[];
  onFormError?: (errors: Record<string, string[]>) => void;
}
```

> **Jebakan — 409 master-data:** Respons 409 dari `ReferentialIntegrityGuard` sudah berbahasa Indonesia dan siap ditampilkan langsung sebagai toast. Jangan peta ulang. 409 lainnya (transisi ticket) dapat teks khusus dari K4.

### Detail — `useUploadWithProgress.ts`
Hook untuk upload file dengan progress tracking via `XMLHttpRequest`. Menerima file, endpoint, dan callback. Mengembalikan `{ upload, progress, isUploading, error }`.

```typescript
interface UseUploadWithProgressOptions {
  url: string; // relative path, e.g. /api/proxy/tickets/5/attachments
  method?: 'POST' | 'PUT';
  onProgress?: (percent: number) => void;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}
```

> **Jebakan — XHR + BFF:** `XMLHttpRequest` mengirim cookie lintas origin secara otomatis, jadi token dari httpOnly cookie tetap terkirim ke `/api/proxy/...`. Pastikan URL yang dikirim adalah relatif (dimulai `/api/proxy/...`) agar cookie domain sama.

### Detail — `query-keys.ts` (perluasan)
Tambah key factory baru:
```typescript
export const userKeys = {
  all: ['users'] as const,
  list: (filters: Record<string, unknown>) => ['users', 'list', filters] as const,
  assignable: (search?: string) => ['users', 'assignable', search] as const,
};

export const masterDataKeys = {
  departments: ['master-data', 'departments'] as const,
  ticketCategories: ['master-data', 'ticket-categories'] as const,
  knowledgeCategories: ['master-data', 'knowledge-categories'] as const,
  ticketPriorities: ['master-data', 'ticket-priorities'] as const,
};

export const auditKeys = {
  all: ['audit-logs'] as const,
  list: (filters: Record<string, unknown>) => ['audit-logs', 'list', filters] as const,
  detail: (id: number) => ['audit-logs', 'detail', id] as const,
};

export const assetKeys = {
  all: ['assets'] as const,
  list: (filters: Record<string, unknown>) => ['assets', 'list', filters] as const,
  detail: (id: number) => ['assets', 'detail', id] as const,
  history: (id: number) => ['assets', 'history', id] as const,
  categories: ['assets', 'categories'] as const,
  my: (filters: Record<string, unknown>) => ['assets', 'my', filters] as const,
};

export const articleKeys = {
  all: ['articles'] as const,
  list: (filters: Record<string, unknown>) => ['articles', 'list', filters] as const,
  detail: (slug: string) => ['articles', 'detail', slug] as const,
  edit: (id: number) => ['articles', 'edit', id] as const,
  categories: ['knowledge-categories'] as const,
};
```

### Detail — `labels.ts` (perluasan)
Tambah di bagian yang sesuai:
```typescript
export const errorMessages: Record<number, string> = {
  403: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
  404: 'Halaman yang Anda cari tidak ditemukan.',
  409: 'Data sudah diubah oleh pihak lain. Silakan muat ulang.',
  429: 'Terlalu banyak permintaan. Silakan tunggu beberapa saat.',
  500: 'Terjadi kesalahan server. Silakan coba lagi.',
};

export const slaLabels = {
  on_track: 'On Track',
  breached: 'SLA Terlambat',
  resolved: 'Selesai',
};

export const attachmentLabels = {
  upload: 'Unggah Lampiran',
  maxSize: 'Maksimal 5 MB per file',
  allowedFormats: 'Format: .jpg, .jpeg, .png, .pdf',
  delete: 'Hapus',
  download: 'Unduh',
  uploading: 'Mengunggah...',
};

// Audit module/action labels (Indonesia)
export const auditModuleLabels: Record<string, string> = {
  ticket: 'Ticket',
  asset: 'Aset',
  article: 'Artikel',
  knowledge_category: 'Kategori Pengetahuan',
  ticket_category: 'Kategori Ticket',
  ticket_priority: 'Prioritas Ticket',
  department: 'Departemen',
  user: 'Pengguna',
  login: 'Login',
  notification: 'Notifikasi',
};

export const auditActionLabels: Record<string, string> = {
  create: 'Membuat',
  update: 'Mengubah',
  delete: 'Menghapus',
  login: 'Login',
  logout: 'Logout',
  assign: 'Menugaskan',
  unassign: 'Melepas Tugas',
  status_change: 'Mengubah Status',
  priority_change: 'Mengubah Prioritas',
  comment: 'Berkomentar',
  upload: 'Mengunggah',
  download: 'Mengunduh',
  publish: 'Menerbitkan',
  unpublish: 'Menarik',
  activate: 'Mengaktifkan',
  deactivate: 'Menonaktifkan',
  reset_password: 'Reset Password',
  transition: 'Transisi Status',
  release: 'Melepas Aset',
  bulk_update: 'Ubah Massal',
  import: 'Impor',
  export: 'Ekspor',
};

export const assetStatusLabels: Record<string, string> = {
  available: 'Tersedia',
  assigned: 'Ditugaskan',
  maintenance: 'Perbaikan',
  retired: 'Pensiun',
  lost: 'Hilang',
};

export const articleStatusLabels: Record<string, string> = {
  draft: 'Draf',
  published: 'Terbit',
};

export const userStatusLabels: Record<string, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
};
```

### Detail — `action-to-endpoint.ts`
Peta dari `available_actions` backend ke endpoint dan dialog yang sesuai. Dipakai di 8c untuk merender tombol aksi.

```typescript
export const ACTION_MAP: Record<string, ActionConfig> = {
  assign: { method: 'POST', endpoint: (id) => `/api/proxy/tickets/${id}/assign`, dialog: 'assign' },
  unassign: { method: 'POST', endpoint: (id) => `/api/proxy/tickets/${id}/unassign`, dialog: 'confirm' },
  start: { method: 'POST', endpoint: (id) => `/api/proxy/tickets/${id}/status`, dialog: 'confirm', payload: { status_id: 3 } },
  resolve: { method: 'POST', endpoint: (id) => `/api/proxy/tickets/${id}/status`, dialog: 'confirm', payload: { status_id: 4 } },
  close: { method: 'POST', endpoint: (id) => `/api/proxy/tickets/${id}/status`, dialog: 'confirm', payload: { status_id: 5 } },
  cancel: { method: 'POST', endpoint: (id) => `/api/proxy/tickets/${id}/status`, dialog: 'cancel', payload: { status_id: 5 } },
  reopen: { method: 'POST', endpoint: (id) => `/api/proxy/tickets/${id}/status`, dialog: 'confirm', payload: { status_id: 3 } },
  change_priority: { method: 'POST', endpoint: (id) => `/api/proxy/tickets/${id}/priority`, dialog: 'priority' },
  comment: { method: 'POST', endpoint: (id) => `/api/proxy/tickets/${id}/comments`, dialog: 'none' },
  attach: { method: 'POST', endpoint: (id) => `/api/proxy/tickets/${id}/attachments`, dialog: 'none' },
  edit: { method: 'PUT', endpoint: (id) => `/api/proxy/tickets/${id}`, dialog: 'edit' },
};
```

> **Jebakan — status_id hardcoded:** Nilai `status_id` di atas (3, 4, 5) sesuai seeder `ReferenceDataSeeder` (D-15 pinned IDs). Bila suatu saat seeder berubah, peta ini harus diperbarui. Untuk Fase 8, hardcode adalah keputusan sadar — tidak ada mekanisme resolusi dinamis.

### Detail — `MasterDataPage.tsx`
Generic CRUD page component untuk master data. Props:
```typescript
interface MasterDataConfig<T extends { id: number }> {
  title: string;
  endpoint: string; // relative API path
  queryKey: string[];
  columns: ColumnDef<T>[];
  formFields: FormFieldDef[];
  zodSchema: z.ZodObject<any>;
  deleteMessage?: string; // konfirmasi hapus
  onSuccessMessage?: string;
}
```

> **Jebakan — array polos tanpa meta:** `GET /api/departments`, `/api/ticket-categories`, `/api/knowledge-categories`, `/api/ticket-priorities` mengembalikan array langsung tanpa `meta`. `MasterDataPage` harus memakai `useQuery` biasa (bukan `useInfiniteQuery` atau `usePaginatedQuery`). Filter/search dilakukan client-side untuk data ≤ 100 baris.

### Detail — `react-markdown` + `rehype-sanitize`
Tambah ke `package.json`:
```bash
npm install react-markdown remark-gfm rehype-sanitize
```

Buat wrapper `MarkdownRenderer.tsx`:
```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

> **Peringatan:** `rehype-sanitize` menghapus HTML berbahaya. Konten artikel ditulis Technician/Manager/Admin, bukan publik — risikonya rendah, tapi tetap wajib diaudit di Fase 10.

### Step 1 — implementasi
Buat setiap berkas di atas dengan test minimal (Vitest). Jalankan:
```bash
cd apps/web && npx vitest run --reporter=verbose
```

### Step 2 — verifikasi
```bash
cd apps/web && npx tsc --noEmit && npm run lint
```

### Step 3 — Commit
```bash
git add apps/web/src/hooks/useApiMutation.ts apps/web/src/hooks/useUploadWithProgress.ts \
       apps/web/src/lib/query-keys.ts apps/web/src/lib/labels.ts \
       apps/web/src/lib/action-to-endpoint.ts apps/web/src/lib/validation.ts \
       apps/web/src/components/shared/MasterDataPage.tsx \
       apps/web/src/components/shared/MarkdownRenderer.tsx \
       apps/web/src/components/shared/index.ts
git commit -m "feat(web): add shared hooks, MasterDataPage, MarkdownRenderer, labels, and action map"
```

---

## Task 7: Playwright skeleton

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/login.spec.ts`
- Modify: `apps/web/package.json` (tambah script `test:e2e`)

**Detail:** Playwright untuk golden path Fase 8. Setup dasar: config, satu smoke test login, script.

### Step 1: Install Playwright
```bash
cd apps/web && npm install -D @playwright/test && npx playwright install chromium
```

### Step 2: `playwright.config.ts`
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // sequential for golden path
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: process.env.CI ? {
    command: 'cd ../.. && make up',
    port: 3000,
    reuseExistingServer: true,
  } : undefined,
});
```

### Step 3: `e2e/login.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test('employee can login and see dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'employee@jarvisops.test');
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Ticket')).toBeVisible();
});
```

### Step 4: `package.json` script
```json
"test:e2e": "playwright test"
```

### Step 5 — Verifikasi
```bash
cd apps/web && npm run test:e2e
```

### Step 6 — Commit
```bash
git add apps/web/playwright.config.ts apps/web/e2e/ apps/web/package.json
git commit -m "chore(web): add Playwright skeleton with login smoke test"
```

---

## Exit Criteria 8a

- [ ] 13 frame wireframe baru selesai, tidak tumpang tindih, memakai komponen reusable.
- [ ] A1: `author.name` → `full_name` — test hijau, tidak ada kolom `email` diekspos.
- [ ] A2: `GET /api/assets/categories` — distinct, terurut, gate `asset.viewAny`, test hijau.
- [ ] A3: `GET /api/users/assignable` — `id`, `full_name`, `department`, dukung `?search=`, gate `user.lookup` (A/M/T), test hijau, PERMISSION-MATRIX disinkronkan.
- [ ] A4: `GET /api/articles/{article}/edit` — tanpa `view_count++`, tanpa `related_articles`, gate `ArticlePolicy@update`, test hijau.
- [ ] `useApiMutation`, `useUploadWithProgress`, `query-keys.ts`, `labels.ts`, `action-to-endpoint.ts`, `MasterDataPage.tsx`, `MarkdownRenderer.tsx` selesai dan lulus `tsc --noEmit`.
- [ ] Playwright terpasang, smoke login hijau.
- [ ] `vendor/bin/pest` masih hijau (599 + test baru).
- [ ] `vendor/bin/pint --dirty --format agent` bersih.