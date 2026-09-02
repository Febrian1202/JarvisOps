# Fase 5c — Knowledge Base (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini membangun seluruh modul Knowledge Base: artikel CRUD, publish/unpublish, slug, view_count, related articles, dan kategori.

**Goal:** Membangun artikel troubleshooting yang dapat membantu Employee menyelesaikan masalah sederhana tanpa membuat ticket (§18 PRD). Technician dapat membuat dan publish langsung (Addendum §5.1). Employee hanya melihat artikel published (draft → **404**). Artikel memiliki slug unik-immutable (D-18), view_count atomik, dan related articles.

**Branch:** `feat/phase-5c-knowledge-base`
**Estimasi Waktu:** ~1.5 hari (6 task + 1 opsional)
**Prasyarat:** 5a selesai (`ArticlePolicy`, `ArticleStatus` enum, `#[UsePolicy]` di `KnowledgeArticle`, factory state, index `knowledge_articles(title)` + `(status)`).

---

### Task 1: `ArticleService` — Create + Slug Generator

**Files:**
- Create: `app/DTOs/Article/CreateArticleData.php`
- Create: `app/DTOs/Article/UpdateArticleData.php`
- Create: `app/Services/Article/ArticleService.php`
- Create: `app/Http/Requests/Article/StoreArticleRequest.php`
- Create: `tests/Feature/Knowledge/ArticleCreateTest.php`

**Detail:**

**Slug generator** (deterministik, kolisi `-2`, `-3`, unique termasuk soft-delete):
```php
private function generateSlug(string $title): string
{
    $base = Str::slug($title);
    $slug = $base;
    $counter = 1;

    while (KnowledgeArticle::withTrashed()->where('slug', $slug)->exists()) {
        $counter++;
        $slug = $base . '-' . $counter;
    }

    return $slug;
}
```

**`StoreArticleRequest`** (API-CONTRACT §8):
```php
public function rules(): array
{
    return [
        'title' => ['required', 'string', 'max:200'],
        'category_id' => ['required', 'integer', 'exists:knowledge_categories,id'],
        'content' => ['required', 'string'],
        'status' => ['nullable', 'string', Rule::in(['draft', 'published'])],
    ];
}
```

**`ArticleService::create`**:
```php
public function create(CreateArticleData $data, User $actor): KnowledgeArticle
{
    return DB::transaction(function () use ($data, $actor): KnowledgeArticle {
        $article = KnowledgeArticle::create([
            'category_id' => $data->categoryId,
            'author_id' => $actor->id,
            'title' => $data->title,
            'slug' => $this->generateSlug($data->title),
            'content' => $data->content,
            'status' => $data->status ?? 'draft',
            'published_at' => $data->status === 'published' ? now() : null,
            'view_count' => 0,
        ]);

        $this->auditLogger->log($actor, AuditAction::Create, AuditModule::Article, $article->id,
            "Artikel {$article->title} dibuat.");

        return $article->load(['category', 'author']);
    });
}
```

> **Jebakan 1:** `Str::slug` menghasilkan string kosong untuk judul yang hanya berisi karakter non-ASCII tertentu. Jika slug kosong, gunakan fallback `untitled-{id}` atau `article-{unik}`.
> **Jebakan 2:** `withTrashed()` pada pengecekan slug — tanpa ini, slug yang sudah dipakai artikel tertrash tetap dianggap tersedia, menyebabkan error duplicate key saat artikel baru dibuat.

- [x] **Step 1: Test — create article (draft + published).**
  ```php
  test('technician can create draft article', function () {
      Sanctum::actingAs(User::factory()->technician()->create());
      $this->postJson('/api/articles', [
          'title' => 'Wi-Fi Troubleshooting',
          'category_id' => 1,
          'content' => 'Langkah-langkah...',
          'status' => 'draft',
      ])->assertStatus(201)
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonStructure(['data' => ['slug', 'author', 'category']]);
  });

  test('create published article sets published_at', function () {
      Sanctum::actingAs(User::factory()->technician()->create());
      $this->postJson('/api/articles', [
          'title' => 'VPN Setup',
          'category_id' => 1,
          'content' => 'Panduan VPN...',
          'status' => 'published',
      ])->assertStatus(201)
        ->assertJsonPath('data.status', 'published')
        ->assertNotNull('data.published_at');
  });
  ```

- [x] **Step 2: Test — slug unique dan immutable.**
  ```php
  test('duplicate slug gets -2 suffix', function () {
      Sanctum::actingAs(User::factory()->technician()->create());
      $this->postJson('/api/articles', ['title' => 'Troubleshooting', 'category_id' => 1, 'content' => 'a']);
      $this->postJson('/api/articles', ['title' => 'Troubleshooting', 'category_id' => 1, 'content' => 'b'])
          ->assertJsonPath('data.slug', 'troubleshooting-2');
  });
  ```

- [x] **Step 3: Test — employee cannot create article (403).**
  ```php
  test('employee cannot create article', function () {
      Sanctum::actingAs(User::factory()->employee()->create());
      $this->postJson('/api/articles', [...])->assertStatus(403);
  });
  ```

- [x] **Step 4: Implementasi** — DTO, service, request, slug generator.

- [x] **Step 5: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Knowledge/ArticleCreateTest.php
  vendor/bin/pint --dirty --format agent
  git add app/DTOs/Article/ app/Services/Article/ app/Http/Requests/Article/ tests/Feature/Knowledge/
  git commit -m "feat(kb): add article create with slug generation and audit logging"
  ```

---

### Task 2: Article Read, Update, Delete

**Files:**
- Create: `app/Http/Requests/Article/UpdateArticleRequest.php`
- Create: `app/Http/Controllers/Article/ArticleController.php`
- Create: `app/Http/Resources/Article/ArticleListResource.php`
- Create: `app/Http/Resources/Article/ArticleResource.php`
- Create: `tests/Feature/Knowledge/ArticleCrudTest.php`

**Detail:**

**Route binding eksplisit** (resolusi konflik #7):
- `GET /api/articles/{article:slug}` — show by slug
- `PUT /api/articles/{article}` — update by id
- `DELETE /api/articles/{article}` — delete by id

**`ArticleResource`** (API-CONTRACT §8 baris 532–534):
```php
return [
    'id' => $this->id,
    'title' => $this->title,
    'slug' => $this->slug,
    'content' => $this->when($this->relationLoaded('author'), $this->content),
    'category' => $this->whenLoaded('category', fn () => $this->category->only('id', 'name')),
    'author' => $this->whenLoaded('author', fn () => $this->author->only('id', 'full_name')),
    'status' => $this->status?->value,
    'view_count' => $this->view_count,
    'published_at' => $this->published_at,
    'created_at' => $this->created_at,
    'updated_at' => $this->updated_at,
];
```

**Update** — slug immutable (D-18):
```php
public function update(KnowledgeArticle $article, UpdateArticleData $data, User $actor): KnowledgeArticle
{
    $oldData = $article->only(['title', 'content', 'category_id']);

    return DB::transaction(function () use ($article, $data, $actor, $oldData): KnowledgeArticle {
        $article->update([
            'title' => $data->title,
            'content' => $data->content,
            'category_id' => $data->categoryId,
        ]);

        $this->auditLogger->log($actor, AuditAction::Update, AuditModule::Article, $article->id,
            "Artikel {$article->title} diperbarui.",
            $oldData, ['title' => $data->title, 'content' => '...', 'category_id' => $data->categoryId]);

        return $article->fresh()->load(['category', 'author']);
    });
}
```

**Delete** — Technician hanya miliknya sendiri (`ArticlePolicy@delete`):
```php
public function delete(KnowledgeArticle $article, User $actor): void
{
    DB::transaction(function () use ($article, $actor): void {
        $article->delete();
        $this->auditLogger->log($actor, AuditAction::Delete, AuditModule::Article, $article->id,
            "Artikel {$article->title} dihapus.");
    });
}
```

- [x] **Step 1: Test — show by slug, update, delete.**
  ```php
  test('article can be retrieved by slug', function () {
      $article = KnowledgeArticle::factory()->create(['slug' => 'my-unique-article']);
      Sanctum::actingAs(User::factory()->employee()->create());
      $this->getJson('/api/articles/my-unique-article')->assertStatus(200)
          ->assertJsonPath('data.slug', 'my-unique-article');
  });

  test('technician can update own article', function () {
      $tech = User::factory()->technician()->create();
      $article = KnowledgeArticle::factory()->create(['author_id' => $tech->id]);
      Sanctum::actingAs($tech);
      $this->putJson("/api/articles/{$article->id}", ['title' => 'Updated Title', 'content' => 'new', 'category_id' => 1])
          ->assertStatus(200)->assertJsonPath('data.title', 'Updated Title');
      // Slug tidak berubah
      expect($article->fresh()->slug)->toBe($article->slug);
  });

  test('technician cannot delete another technician article', function () {
      $tech1 = User::factory()->technician()->create();
      $tech2 = User::factory()->technician()->create();
      $article = KnowledgeArticle::factory()->create(['author_id' => $tech1->id]);
      Sanctum::actingAs($tech2);
      $this->deleteJson("/api/articles/{$article->id}")->assertStatus(403);
  });
  ```

- [x] **Step 2: Implementasi** — controller, resource, route.

- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Knowledge/ArticleCrudTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Controllers/Article/ app/Http/Resources/Article/ app/Http/Requests/Article/ routes/api.php tests/Feature/Knowledge/
  git commit -m "feat(kb): add article read, update, delete with route binding and policy"
  ```

---

### Task 3: Publish / Unpublish + View Count

**Files:**
- Modify: `app/Http/Controllers/Article/ArticleController.php`
- Create: `tests/Feature/Knowledge/ArticlePublishTest.php`

**Detail:**

**Publish** (Addendum §5.1):
```php
public function publish(KnowledgeArticle $article, Request $request): JsonResponse
{
    $this->authorize('publish', $article);

    $article->update([
        'status' => ArticleStatus::Published,
        'published_at' => now(), // selalu diisi ulang saat publish (resolusi #8)
    ]);

    $this->auditLogger->log($request->user(), AuditAction::Publish, AuditModule::Article,
        $article->id, "Artikel {$article->title} dipublikasikan.");

    return ApiResponse::success(new ArticleResource($article->load('category', 'author')), 'Article published successfully.');
}
```

**Unpublish:**
```php
public function unpublish(KnowledgeArticle $article, Request $request): JsonResponse
{
    $this->authorize('unpublish', $article);

    $article->update(['status' => ArticleStatus::Draft]); // published_at TIDAK direset (keputusan #8)

    $this->auditLogger->log($request->user(), AuditAction::Unpublish, AuditModule::Article,
        $article->id, "Artikel {$article->title} ditarik dari publikasi.");

    return ApiResponse::success(new ArticleResource($article->load('category', 'author')), 'Article unpublished.');
}
```

**View count** — increment atomik pada `GET /articles/{slug}`:
```php
public function show(KnowledgeArticle $article, Request $request): JsonResponse
{
    $this->authorize('view', $article);

    // Increment view_count atomik jika published
    if ($article->status?->value === 'published') {
        KnowledgeArticle::withoutTimestamps(fn () => $article->increment('view_count'));
    }

    // Load related articles
    $related = KnowledgeArticle::query()
        ->where('category_id', $article->category_id)
        ->where('id', '!=', $article->id)
        ->where('status', 'published') // selalu published, terlepas role
        ->orderByDesc('view_count')
        ->orderByDesc('published_at')
        ->take(5)
        ->get(['id', 'title', 'slug', 'view_count']);

    $articleResource = new ArticleResource($article->load('category', 'author'));
    $articleResource->additional(['related_articles' => $related]);

    return ApiResponse::success($articleResource, 'Article retrieved successfully.');
}
```

> **Jebakan:** `increment()` menyentuh `updated_at`. Gunakan `withoutTimestamps()` (Laravel 10+) atau update kolom langsung (`DB::raw('view_count + 1')`) untuk menghindari perubahan `updated_at` yang menyesatkan.

- [x] **Step 1: Test — publish, unpublish, view_count.**
  ```php
  test('technician can publish article', function () {
      $tech = User::factory()->technician()->create();
      $article = KnowledgeArticle::factory()->draft()->create(['author_id' => $tech->id]);
      Sanctum::actingAs($tech);
      $this->postJson("/api/articles/{$article->id}/publish")->assertStatus(200)
          ->assertJsonPath('data.status', 'published');
      expect($article->fresh()->published_at)->not->toBeNull();
  });

  test('view_count increments on show', function () {
      $article = KnowledgeArticle::factory()->create(['status' => 'published', 'view_count' => 5]);
      Sanctum::actingAs(User::factory()->employee()->create());
      $this->getJson("/api/articles/{$article->slug}");
      expect($article->fresh()->view_count)->toBe(6);
  });

  test('unpublish sets status to draft, preserves published_at', function () {
      $article = KnowledgeArticle::factory()->create(['status' => 'published', 'published_at' => now()]);
      Sanctum::actingAs(User::factory()->manager()->create());
      $this->postJson("/api/articles/{$article->id}/unpublish")->assertStatus(200)
          ->assertJsonPath('data.status', 'draft');
      expect($article->fresh()->published_at)->not->toBeNull();
  });
  ```

- [x] **Step 2: Implementasi** — controller method, route.

- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Knowledge/ArticlePublishTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Controllers/Article/ routes/api.php tests/Feature/Knowledge/
  git commit -m "feat(kb): add publish/unpublish endpoints and atomic view_count increment"
  ```

---

### Task 4: Article List, Search, Filter, Employee Scoping

**Files:**
- Create: `app/Http/Requests/Article/IndexArticleRequest.php`
- Create: `app/Services/Article/ArticleQueryService.php`
- Modify: `app/Http/Controllers/Article/ArticleController.php`
- Create: `tests/Feature/Knowledge/ArticleListTest.php`

**Detail:**
API-CONTRACT §8 baris 524–530:

| Parameter | Keterangan |
| --- | --- |
| `search` | `title` dan `content` |
| `category_id` | |
| `status` | `draft` \| `published` — **diabaikan untuk Employee** (scoping di query) |
| `author_id` | |
| `sort_by` | `created_at`, `title`, `view_count` |

**Scoping:** Employee `->where('status', 'published')` diterapkan **sebelum** filter client. Filter `status` dari client diabaikan untuk Employee (tidak error, tidak diperluas).

```php
public function paginate(Request $request, User $actor): LengthAwarePaginator
{
    $query = KnowledgeArticle::with(['category', 'author']);

    // Scoping: Employee hanya published
    $isEmployee = ! $actor->isAdmin() && ! $actor->hasRole(RoleName::Manager, RoleName::Technician);
    if ($isEmployee) {
        $query->where('status', 'published');
    }

    // Search
    if ($search = $request->query('search')) {
        $term = str_replace(['%', '_'], ['\\%', '\\_'], $search);
        $query->where(function ($q) use ($term) {
            $q->where('title', 'LIKE', "%{$term}%")
                ->orWhere('content', 'LIKE', "%{$term}%");
        });
    }

    // Filter
    if ($categoryId = $request->query('category_id')) {
        $query->where('category_id', (int) $categoryId);
    }
    if (! $isEmployee && $status = $request->query('status')) {
        $query->where('status', $status);
    }
    if ($authorId = $request->query('author_id')) {
        $query->where('author_id', (int) $authorId);
    }

    return $this->applySorting($query, $request, ['created_at', 'title', 'view_count'])
        ->paginate($this->getPerPage($request));
}
```

- [x] **Step 1: Test — Employee scoping, search, filter.**
  ```php
  test('employee sees only published articles', function () {
      KnowledgeArticle::factory()->create(['status' => 'published']);
      KnowledgeArticle::factory()->draft()->create();
      Sanctum::actingAs(User::factory()->employee()->create());
      $this->getJson('/api/articles')->assertJsonCount(1, 'data');
  });

  test('employee filter by status draft is ignored', function () {
      KnowledgeArticle::factory()->create(['status' => 'published']);
      KnowledgeArticle::factory()->draft()->create();
      Sanctum::actingAs(User::factory()->employee()->create());
      $this->getJson('/api/articles?status=draft')->assertJsonCount(1, 'data');
  });

  test('search matches title', function () {
      KnowledgeArticle::factory()->create(['title' => 'VPN Troubleshooting', 'status' => 'published']);
      Sanctum::actingAs(User::factory()->employee()->create());
      $this->getJson('/api/articles?search=VPN')->assertJsonCount(1, 'data');
  });
  ```

- [x] **Step 2: Implementasi** — request, query service, controller.

- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Knowledge/ArticleListTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Requests/Article/ app/Services/Article/ app/Http/Controllers/Article/ tests/Feature/Knowledge/
  git commit -m "feat(kb): add article list with search, filter, employee scoping"
  ```

---

### Task 5: Knowledge Category CRUD + `GET /api/knowledge-categories`

**Files:**
- Create: `app/Http/Controllers/Article/KnowledgeCategoryController.php`
- Create: `app/Http/Requests/Article/StoreKnowledgeCategoryRequest.php`
- Create: `app/Http/Requests/Article/UpdateKnowledgeCategoryRequest.php`
- Create: `tests/Feature/Knowledge/KnowledgeCategoryTest.php`

**Detail:**
CRUD knowledge_categories — Admin only (PERMISSION §3.8 `knowledge-category.manage`). Delete diblokir 409 jika kategori masih memiliki artikel.

**Route** (API-CONTRACT §8 baris 553–555):
```php
Route::get('/knowledge-categories', [KnowledgeCategoryController::class, 'index'])->name('knowledge-categories.index');
Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
    Route::apiResource('knowledge-categories', KnowledgeCategoryController::class)->except(['index']);
});
```

**Delete guard:**
```php
public function destroy(KnowledgeCategory $category, Request $request): JsonResponse
{
    $this->authorize('knowledge-category.manage');

    if ($category->articles()->count() > 0) {
        return ApiResponse::error('Kategori masih memiliki artikel dan tidak dapat dihapus.', status: 409);
    }

    $category->delete();
    return ApiResponse::success(null, 'Knowledge category deleted.');
}
```

- [x] **Step 1: Test — CRUD + delete guard.**
  ```php
  test('admin can create knowledge category', function () {
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->postJson('/api/knowledge-categories', ['name' => 'Network', 'description' => 'Network issues'])
          ->assertStatus(201);
  });

  test('cannot delete knowledge category with articles', function () {
      $cat = KnowledgeCategory::factory()->hasArticles(1)->create();
      Sanctum::actingAs(User::factory()->admin()->create());
      $this->deleteJson("/api/knowledge-categories/{$cat->id}")->assertStatus(409);
  });

  test('employee can view knowledge-categories list', function () {
      KnowledgeCategory::factory()->count(3)->create();
      Sanctum::actingAs(User::factory()->employee()->create());
      $this->getJson('/api/knowledge-categories')->assertJsonCount(3, 'data');
  });
  ```

- [x] **Step 2: Implementasi** — controller, request, route.

- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Knowledge/KnowledgeCategoryTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Controllers/Article/ app/Http/Requests/Article/ routes/api.php tests/Feature/Knowledge/
  git commit -m "feat(kb): add knowledge-category CRUD with delete guard"
  ```

---

### Task 6: Route Lengkap Article + Verifikasi

**Files:**
- Modify: `routes/api.php`

**Detail:**
Pastikan route literal (`publish`, `unpublish`) dideklarasikan sebelum apiResource, dan `{article:slug}` dipakai untuk show.

```php
Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
    Route::get('/articles', [ArticleController::class, 'index'])->name('articles.index');
    Route::post('/articles', [ArticleController::class, 'store'])->name('articles.store');
    Route::get('/articles/{article:slug}', [ArticleController::class, 'show'])->name('articles.show');
    Route::put('/articles/{article}', [ArticleController::class, 'update'])->name('articles.update');
    Route::delete('/articles/{article}', [ArticleController::class, 'destroy'])->name('articles.destroy');
    Route::post('/articles/{article}/publish', [ArticleController::class, 'publish'])->name('articles.publish');
    Route::post('/articles/{article}/unpublish', [ArticleController::class, 'unpublish'])->name('articles.unpublish');
    Route::apiResource('knowledge-categories', KnowledgeCategoryController::class);
});
```

> **Jebakan:** Route `{article:slug}` hanya untuk `show`. `update`, `destroy`, `publish`, `unpublish` memakai `{article}` (default id) — karena `PUT /articles/{slug}`, `DELETE /articles/{slug}` ambigu secara semantik (slug bukan milik resource yang di-mutate oleh user).

- [x] **Step 1: Uji seluruh route terdaftar.**
  ```bash
  php artisan route:list --path=api
  ```

- [x] **Step 2: Jalankan seluruh test KB.**
  ```bash
  vendor/bin/pest tests/Feature/Knowledge/
  ```

- [x] **Step 3: Formatting & commit.**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add routes/api.php
  git commit -m "feat(kb): register full knowledge-base route set with explicit slug binding"
  ```

---

### Task 7 (Opsional): Perkaya DemoDataSeeder dengan Artikel

**Files:**
- Modify: `database/seeders/DemoDataSeeder.php`

**Detail:**
Tambahkan minimal 1 artikel draft dan 1 assignment aktif untuk employee demo agar `GET /api/my-assets` dan fitur search KB langsung bisa diuji manual.

---

## Exit Criteria 5c

- [x] Artikel CRUD: create (201), show by slug, update (slug immutable), delete (T hanya own).
- [x] Publish/unpublish: T boleh publish langsung (Addendum §5.1), `published_at` diisi, tidak direset saat unpublish.
- [x] `view_count` increment atomik pada `GET /articles/{slug}` (published only).
- [x] Related articles: kategori sama, ≤5, published, exclude diri.
- [x] List: Employee scoped published-only, filter `status` diabaikan untuk Employee.
- [x] Search: `title` + `content` LIKE, sanitasi wildcard.
- [x] Knowledge category CRUD (Admin), delete diblokir 409 jika masih punya artikel.
- [x] `GET /api/knowledge-categories` — semua role terautentikasi.
- [x] Route binding: `{article:slug}` untuk show, `{article}` (id) untuk mutasi.
- [x] `php artisan test` hijau, `pint --test` bersih.