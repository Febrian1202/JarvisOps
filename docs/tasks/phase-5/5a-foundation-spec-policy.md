# Fase 5a — Foundation, Spec Amendment, Policy, Enum, Index, Disk (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini menyiapkan seluruh fondasi yang dipakai 5b–5e: amandemen spec, 3 Policy baru, model relation, cast, migration index, disk `private`, dan factory state. **Tidak ada endpoint baru di sub-tahap ini.**

**Goal:** Menyiapkan lapisan spec, otorisasi, dan infrastruktur bersama sehingga sub-tahap 5b–5e tinggal menulis controller/service/request/resource tanpa perlu mengubah spec, enum, policy, atau konfigurasi.

**Branch:** `feat/phase-5a-foundation-spec-policy`
**Estimasi Waktu:** ~1.0 hari (8 task)
**Prasyarat:** Fase 3 & 4 selesai. `AssetPolicy` (4 ability), `AbilityMatrix`, `AppServiceProvider`, `ApiResponse`, `HandlesPagination`, `AuditLogger`, `NotificationService`, `TicketPolicy` sudah aktif.

---

### Task 1: Amandemen Dokumen Spec & ADR

**Files:**
- Modify: `docs/adr/DECISIONS.md` (D-08 Amandemen 3, D-11 amandemen)
- Modify: `docs/product/PERMISSION-MATRIX.md` (§2.2 modul Manager, §3.3 AttachmentPolicy, §3.5 ArticlePolicy, §3.4 AssetPolicy ability baru, §6 butir self-protection)
- Modify: `docs/product/ROADMAP.md` (koreksi baris 531, 574, 577)

**Detail:**
Sinkronkan dokumen spec agar seluruh keputusan baru terkunci secara formal:

1. **D-08 Amandemen 3:** Tambah action `release`, `publish`, `unpublish`, `activate`, `deactivate` (total 22 action). Tambah module `knowledge_category` (total 11 module). Catatan: attachment dicatat sbg module `ticket` + action `create`/`delete`.
2. **D-11 amandemen:** Perjelas mekanisme reset password: server generate, `must_change_password = true`, password dikembalikan sekali, redaksi D-07 berlaku.
3. **PERMISSION-MATRIX §2.2:** Tambah `knowledge_category` ke daftar modul Manager (lihat tapi tidak bisa manage) — konsisten dengan `ticket-category` dan `ticket-priority`.
4. **PERMISSION-MATRIX §3.3–3.5:** Lengkapi ability table untuk `AttachmentPolicy`, `ArticlePolicy`, `AssetPolicy` (create, update, delete, assign, release, viewHistory).
5. **PERMISSION-MATRIX §6:** Ubah butir `"Admin mengubah role_id dirinya sendiri"` dan `"Admin menonaktifkan akunnya sendiri"` dari 422 ke **403**.
6. **ROADMARK:** Baris 531 (Technician CRUD asset → koreksi `delete` = ❌), baris 574 (422 → 422 untuk status tak layak, 409 untuk assignment aktif), baris 577 (403/404 → 404 untuk Employee draft).

- [x] **Step 1: Edit `docs/adr/DECISIONS.md`** — tambah D-08 Amandemen 3, perjelas D-11.
- [x] **Step 2: Edit `docs/product/PERMISSION-MATRIX.md`** — §2.2, §3.3–3.5, §6.
- [x] **Step 3: Edit `docs/product/ROADMAP.md`** — koreksi 3 baris.
- [x] **Step 4: Commit amandemen spec.**
  ```bash
  git add docs/adr/DECISIONS.md docs/product/PERMISSION-MATRIX.md docs/product/ROADMAP.md
  git commit -m "docs(spec): amend D-08, D-11, PERMISSION-MATRIX, and ROADMAP for phase 5"
  ```

---

### Task 2: Update Enum — `ArticleStatus`, `AssetHistoryAction`, `AuditAction`, `AuditModule`

**Files:**
- Create: `app/Enums/ArticleStatus.php`
- Create: `app/Enums/AssetHistoryAction.php`
- Modify: `app/Enums/AuditAction.php` (tambah 5 case)
- Modify: `app/Enums/AuditModule.php` (tambah 1 case)
- Create: `tests/Unit/EnumsPhase5Test.php`

**Detail:**
Tambahkan enum baru dan perluas yang ada:

**`ArticleStatus`** (backed string):
```php
enum ArticleStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
}
```

**`AssetHistoryAction`** (backed string):
```php
enum AssetHistoryAction: string
{
    case Created = 'created';
    case Assigned = 'assigned';
    case Released = 'released';
    case StatusChanged = 'status_changed';
}
```

**`AuditAction`** — tambah 5 case:
```php
case Release = 'release';
case Publish = 'publish';
case Unpublish = 'unpublish';
case Activate = 'activate';
case Deactivate = 'deactivate';
```

**`AuditModule`** — tambah 1 case:
```php
case KnowledgeCategory = 'knowledge_category';
```

> **Jebakan:** Jangan lupa menambah `AuditModule::KnowledgeCategory` di `AuditModule` enum. Tanpa ini, `AuditLogger::log()` akan menolak enum `knowledge_category` karena strict type.

- [x] **Step 1: Test — unit test keberadaan case baru.**
  Buat `tests/Unit/EnumsPhase5Test.php`:
  ```php
  <?php

  use App\Enums\ArticleStatus;
  use App\Enums\AssetHistoryAction;
  use App\Enums\AuditAction;
  use App\Enums\AuditModule;

  test('ArticleStatus enum contains draft and published', function () {
      expect(ArticleStatus::Draft->value)->toBe('draft')
          ->and(ArticleStatus::Published->value)->toBe('published');
  });

  test('AssetHistoryAction enum contains four values', function () {
      expect(AssetHistoryAction::Created->value)->toBe('created')
          ->and(AssetHistoryAction::Assigned->value)->toBe('assigned')
          ->and(AssetHistoryAction::Released->value)->toBe('released')
          ->and(AssetHistoryAction::StatusChanged->value)->toBe('status_changed');
  });

  test('AuditAction has new phase 5 cases', function () {
      expect(AuditAction::Release->value)->toBe('release')
          ->and(AuditAction::Publish->value)->toBe('publish')
          ->and(AuditAction::Unpublish->value)->toBe('unpublish')
          ->and(AuditAction::Activate->value)->toBe('activate')
          ->and(AuditAction::Deactivate->value)->toBe('deactivate');
  });

  test('AuditModule has KnowledgeCategory', function () {
      expect(AuditModule::KnowledgeCategory->value)->toBe('knowledge_category');
  });
  ```

- [x] **Step 2: Implementasi keempat enum.**
  Buat `ArticleStatus`, `AssetHistoryAction`. Edit `AuditAction`, `AuditModule` sesuai daftar di atas.

- [x] **Step 3: Jalankan test & commit.**
  ```bash
  vendor/bin/pest tests/Unit/EnumsPhase5Test.php
  vendor/bin/pint --dirty --format agent
  git add app/Enums/ tests/Unit/EnumsPhase5Test.php
  git commit -m "feat(enum): add ArticleStatus, AssetHistoryAction, extend AuditAction and AuditModule"
  ```

---

### Task 3: Tiga Policy Baru + Pelengkapan `AssetPolicy`

**Files:**
- Create: `app/Policies/Article/ArticlePolicy.php`
- Create: `app/Policies/Attachment/AttachmentPolicy.php`
- Move: `app/Policies/AssetPolicy.php` → `app/Policies/Asset/AssetPolicy.php` (restruktur domain)
- Modify: `app/Models/Asset.php` (update `#[UsePolicy]` namespace)
- Modify: `app/Models/KnowledgeArticle.php` (tambah `#[UsePolicy]`)
- Modify: `app/Models/TicketAttachment.php` (tambah `#[UsePolicy]`)
- Create: `tests/Feature/Auth/ArticlePolicyTest.php`
- Create: `tests/Feature/Auth/AttachmentPolicyTest.php`
- Modify: `tests/Feature/Auth/AssetPolicyTest.php` (perluas untuk ability baru)

**Detail:**

**`ArticlePolicy`** (PERMISSION §3.5):
```php
<?php

namespace App\Policies\Article;

use App\Enums\RoleName;
use App\Models\KnowledgeArticle;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ArticlePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, KnowledgeArticle $article): Response|bool
    {
        // Employee hanya melihat published
        if (! $user->isAdmin() && ! $user->hasRole(RoleName::Manager, RoleName::Technician)) {
            return $article->status === 'published'
                ? true
                : Response::denyAsNotFound();
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function update(User $user, KnowledgeArticle $article): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function publish(User $user, KnowledgeArticle $article): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function unpublish(User $user, KnowledgeArticle $article): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function delete(User $user, KnowledgeArticle $article): bool
    {
        if ($user->isAdmin() || $user->hasRole(RoleName::Manager)) {
            return true;
        }

        // Technician hanya boleh delete miliknya sendiri
        return $article->author_id === $user->id;
    }
}
```

**`AttachmentPolicy`** (PERMISSION §3.3):
```php
<?php

namespace App\Policies\Attachment;

use App\Models\TicketAttachment;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AttachmentPolicy
{
    public function view(User $user, TicketAttachment $attachment): Response|bool
    {
        // Delegasi ke TicketPolicy@view
        return $user->can('view', $attachment->ticket)
            ? true
            : Response::denyAsNotFound();
    }

    public function download(User $user, TicketAttachment $attachment): Response|bool
    {
        return $this->view($user, $attachment);
    }

    public function create(User $user, TicketAttachment $attachment): bool
    {
        // Dijaga oleh TicketPolicy@attach — tidak perlu duplikasi
        return true;
    }

    public function delete(User $user, TicketAttachment $attachment): bool
    {
        if ($user->isAdmin() || $user->hasRole(\App\Enums\RoleName::Manager)) {
            return true;
        }

        return $attachment->uploaded_by === $user->id;
    }
}
```

**`AssetPolicy`** — lengkapi ability yang masih kurang:
```php
public function create(User $user): bool
{
    return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
}

public function update(User $user, Asset $asset): bool
{
    return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
}

public function delete(User $user, Asset $asset): bool
{
    return $user->isAdmin() || $user->hasRole(RoleName::Manager);
}

public function assign(User $user, Asset $asset): bool
{
    return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
}

public function release(User $user, Asset $asset): bool
{
    return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
}

public function viewHistory(User $user, Asset $asset): bool
{
    return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
}
```

> **Jebakan:** Setelah `git mv` `AssetPolicy.php` ke `app/Policies/Asset/`, perbarui namespace di model `Asset` (`#[UsePolicy(AssetPolicy::class)]` → `#[UsePolicy(\App\Policies\Asset\AssetPolicy::class)]`). Juga perbarui import di `tests/Feature/Auth/AssetPolicyTest.php`.

- [x] **Step 1: Test — ArticlePolicy ability positif & negatif.**
  Buat `tests/Feature/Auth/ArticlePolicyTest.php` dengan dataset role:
  ```php
  test('employee cannot create article', function () {
      $user = User::factory()->employee()->create();
      expect(Gate::forUser($user)->allows('create', KnowledgeArticle::class))->toBeFalse();
  });
  test('technician can create article', function () {
      $user = User::factory()->technician()->create();
      expect(Gate::forUser($user)->allows('create', KnowledgeArticle::class))->toBeTrue();
  });
  // dst untuk view, update, publish, unpublish, delete
  ```

- [x] **Step 2: Test — AttachmentPolicy ability.**
  Buat `tests/Feature/Auth/AttachmentPolicyTest.php`:
  ```php
  test('employee cannot download attachment of non-participant ticket', function () {
      // Buat ticket + attachment milik user lain
      $employee = User::factory()->employee()->create();
      $other = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $other->id]);
      $attachment = TicketAttachment::factory()->create(['ticket_id' => $ticket->id]);
      expect(Gate::forUser($employee)->allows('download', $attachment))->toBeFalse();
  });
  ```

- [x] **Step 3: Test — AssetPolicy ability baru.**
  Perluas `tests/Feature/Auth/AssetPolicyTest.php`:
  ```php
  test('technician cannot delete asset', function () {
      $tech = User::factory()->technician()->create();
      $asset = Asset::factory()->create();
      expect(Gate::forUser($tech)->allows('delete', $asset))->toBeFalse();
  });
  test('manager can delete asset', function () {
      $manager = User::factory()->manager()->create();
      $asset = Asset::factory()->create();
      expect(Gate::forUser($manager)->allows('delete', $asset))->toBeTrue();
  });
  // dst untuk assign, release, viewHistory
  ```

- [x] **Step 4: Implementasi** — tulis `ArticlePolicy`, `AttachmentPolicy`, lengkapi `AssetPolicy`, `git mv` AssetPolicy, update `#[UsePolicy]` di model.

- [x] **Step 5: Jalankan seluruh test auth & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Auth/
  vendor/bin/pint --dirty --format agent
  git add app/Policies/ app/Models/ tests/Feature/Auth/
  git commit -m "feat(policy): add ArticlePolicy, AttachmentPolicy, complete AssetPolicy, restructure to domain subfolders"
  ```

---

### Task 4: Model Relation, Cast, Route-Key

**Files:**
- Modify: `app/Models/Asset.php` (tambah `activeAssignment`, `currentHolder`)
- Modify: `app/Models/AssetAssignment.php` (tambah `scopeActive`)
- Modify: `app/Models/KnowledgeArticle.php` (tambah `#[UsePolicy]`, cast `status`, route-key)
- Modify: `app/Models/TicketAttachment.php` (tambah `#[UsePolicy]`, cast `file_size`)
- Modify: `app/Models/User.php` (tambah `assetAssignments`, `activeAssignments`)
- Create: `app/Models/Asset/AssetScopes.php` (opsional, atau cukup di model)

**Detail:**

**`Asset.php`** — tambah relasi:
```php
public function activeAssignment(): HasOne
{
    return $this->hasOne(AssetAssignment::class)->whereNull('released_at');
}

public function currentHolder(): BelongsTo
{
    return $this->activeAssignment()->user();
}
```

**`AssetAssignment.php`** — tambah scope:
```php
public function scopeActive(Builder $query): Builder
{
    return $query->whereNull('released_at');
}
```

**`KnowledgeArticle.php`** — tambah:
```php
use App\Enums\ArticleStatus;
use App\Policies\Article\ArticlePolicy;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;

#[UsePolicy(ArticlePolicy::class)]
class KnowledgeArticle extends Model
{
    // ...existing code...

    protected function casts(): array
    {
        return array_merge(parent::casts(), [
            'status' => ArticleStatus::class,
            'view_count' => 'integer',
            'published_at' => 'datetime',
        ]);
    }
}
```

**`TicketAttachment.php`**:
```php
use App\Policies\Attachment\AttachmentPolicy;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;

#[UsePolicy(AttachmentPolicy::class)]
class TicketAttachment extends Model
{
    // ...existing code...
}
```

**`User.php`** — tambah relasi:
```php
public function assetAssignments(): HasMany
{
    return $this->hasMany(AssetAssignment::class);
}

public function activeAssignments(): HasMany
{
    return $this->hasMany(AssetAssignment::class)->whereNull('released_at');
}
```

> **Jebakan:** Jangan menimpa `getRouteKeyName()` di `KnowledgeArticle` dengan `'slug'` — itu akan memecah route `PUT /api/articles/{id}`. Gunakan binding eksplisit di route: `Route::get('/articles/{article:slug}', ...)`.

- [x] **Step 1: Test — relasi model berfungsi.**
  ```php
  test('asset has activeAssignment relation', function () {
      $asset = Asset::factory()->create(['status' => 'assigned']);
      AssetAssignment::factory()->create(['asset_id' => $asset->id, 'released_at' => null]);
      expect($asset->activeAssignment)->not->toBeNull()
          ->and($asset->activeAssignment->released_at)->toBeNull();
  });

  test('user has activeAssignments relation', function () {
      $user = User::factory()->create();
      AssetAssignment::factory()->create(['user_id' => $user->id, 'released_at' => null]);
      expect($user->activeAssignments)->toHaveCount(1);
  });
  ```

- [x] **Step 2: Implementasi** — tambah relasi, cast, `#[UsePolicy]` di model.

- [x] **Step 3: Jalankan test & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Schema/
  vendor/bin/pint --dirty --format agent
  git add app/Models/
  git commit -m "feat(model): add activeAssignment, asset assignments relations, cast ArticleStatus, UsePolicy annotations"
  ```

---

### Task 5: Migrasi Index — `knowledge_articles(title)`, `knowledge_articles(status)`, `assets(status)`

**Files:**
- Create: `database/migrations/2026_09_02_000200_add_phase5_indexes.php`

**Detail:**
D-10 dan ERD §6 meminta tiga index yang tidak ada di migration:

| Index | Tabel & Kolom | Kegunaan |
| --- | --- | --- |
| `idx_knowledge_articles_title` | `knowledge_articles(title)` | LIKE search artikel (D-10) |
| `idx_knowledge_articles_status` | `knowledge_articles(status)` | Filter Employee: published-only |
| `idx_assets_status` | `assets(status)` | Filter asset available/maintenance |

```php
public function up(): void
{
    Schema::table('knowledge_articles', function (Blueprint $table) {
        $table->index('title', 'idx_knowledge_articles_title');
        $table->index('status', 'idx_knowledge_articles_status');
    });

    Schema::table('assets', function (Blueprint $table) {
        $table->index('status', 'idx_assets_status');
    });
}

public function down(): void
{
    Schema::table('knowledge_articles', function (Blueprint $table) {
        $table->dropIndex('idx_knowledge_articles_title');
        $table->dropIndex('idx_knowledge_articles_status');
    });

    Schema::table('assets', function (Blueprint $table) {
        $table->dropIndex('idx_assets_status');
    });
}
```

- [x] **Step 1: Buat migration.**
  ```bash
  php artisan make:migration add_phase5_indexes --table=knowledge_articles
  ```

- [x] **Step 2: Isi migration sesuai kode di atas.**

- [x] **Step 3: Uji migrasi dan rollback terhadap MySQL.**
  ```bash
  php artisan migrate
  php artisan migrate:rollback --step=1
  php artisan migrate
  ```

- [x] **Step 4: Commit.**
  ```bash
  git add database/migrations/
  git commit -m "feat(database): add idx_knowledge_articles_title, idx_knowledge_articles_status, idx_assets_status"
  ```

---

### Task 6: Konfigurasi Disk `private` di `config/filesystems.php`

**Files:**
- Modify: `config/filesystems.php`

**Detail:**
Dua langkah agar **tidak ada** route `/storage/{path}` yang bisa melayani file attachment:

1. **Matikan `serve => false` pada disk `local`.** Disk `local` bawaan (root `storage/app/private`) memakai `serve => true`, yang membuat Laravel mendaftarkan route `GET /storage/{path}` (terverifikasi di `route:list`). Ini jalur akses kedua yang tidak melewati `TicketPolicy`, bertentangan dengan Addendum §6.5. Karena tidak ada kode aplikasi yang memakai `Storage::url()` atau route serve (terverifikasi: tidak ada pemakaian `Storage::` di `app/`), mematikan `serve` aman.
2. **Tambahkan disk `private`** dengan `serve => false`, `visibility => private`, `throw => true`. **PENTING:** root kedua disk ini sama (`storage_path('app/private')`) — karena itu langkah 1 wajib; kalau `local` masih `serve => true`, file yang disimpan lewat `private` tetap bisa diakses lewat route serve karena berbagi root yang sama.

```php
'local' => [
    'driver' => 'local',
    'root' => storage_path('app/private'),
    'serve' => false,          // ← ubah dari true
    'throw' => false,
    'report' => false,
],

'private' => [
    'driver' => 'local',
    'root' => storage_path('app/private'),
    'serve' => false,
    'visibility' => 'private',
    'throw' => true,
    'report' => false,
],
```

> **Jebakan 1:** Jangan lupa mematikan `serve` pada `local`. Kalau hanya menambah disk `private` dengan root yang sama, route `/storage/{path}` dari `local` tetap bisa mengakses file attachment.
> **Jebakan 2:** Jangan set `FILESYSTEM_DISK` ke `private` di `.env` — biarkan `local` tetap default. Framework Laravel sendiri tidak memakai disk `private` untuk hal lain. Fase 5d memanggil `Storage::disk('private')` secara eksplisit.

- [x] **Step 1: Edit `config/filesystems.php`** — ubah `local.serve` → `false`, tambah disk `private` di array `disks`.

- [x] **Step 2: Verifikasi dengan tinker.**
  ```bash
  php artisan tinker --execute 'Storage::disk("private")->put("test.txt", "hello"); echo Storage::disk("private")->get("test.txt"); Storage::disk("private")->delete("test.txt");'
  ```

- [x] **Step 3: Commit.**
  ```bash
  git add config/filesystems.php
  git commit -m "feat(config): add private disk with serve=false for attachment storage"
  ```

---

### Task 7: Factory State — Asset Status & Knowledge Article Status

**Files:**
- Modify: `database/factories/AssetFactory.php` (tambah state: `available`, `assigned`, `maintenance`, `retired`, `lost`)
- Modify: `database/factories/KnowledgeArticleFactory.php` (tambah state: `draft`)
- Modify: `tests/Feature/Schema/FactoriesTest.php` (verifikasi state baru)

**Detail:**

**`AssetFactory`** — tambah state:
```php
public function available(): static
{
    return $this->state(fn (array $attrs) => ['status' => AssetStatus::Available]);
}

public function assigned(): static
{
    return $this->state(fn (array $attrs) => ['status' => AssetStatus::Assigned]);
}

public function maintenance(): static
{
    return $this->state(fn (array $attrs) => ['status' => AssetStatus::Maintenance]);
}

public function retired(): static
{
    return $this->state(fn (array $attrs) => ['status' => AssetStatus::Retired]);
}

public function lost(): static
{
    return $this->state(fn (array $attrs) => ['status' => AssetStatus::Lost]);
}
```

**`KnowledgeArticleFactory`** — tambah state:
```php
public function draft(): static
{
    return $this->state(fn (array $attrs) => [
        'status' => 'draft',
        'published_at' => null,
    ]);
}
```

- [x] **Step 1: Test — state factory berfungsi.**
  ```php
  test('asset factory states produce correct statuses', function () {
      expect(Asset::factory()->available()->create()->status->value)->toBe('available');
      expect(Asset::factory()->assigned()->create()->status->value)->toBe('assigned');
      expect(Asset::factory()->maintenance()->create()->status->value)->toBe('maintenance');
  });

  test('knowledge article factory draft state', function () {
      $article = KnowledgeArticle::factory()->draft()->create();
      expect($article->status->value)->toBe('draft')
          ->and($article->published_at)->toBeNull();
  });
  ```

- [x] **Step 2: Implementasi** — tambah state di kedua factory.

- [x] **Step 3: Jalankan test & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Schema/FactoriesTest.php
  vendor/bin/pint --dirty --format agent
  git add database/factories/ tests/Feature/Schema/FactoriesTest.php
  git commit -m "feat(factory): add asset status states and knowledge article draft state"
  ```

---

### Task 8: Feature Test Suite & Verifikasi Gabungan

**Files:**
- Create: `tests/Feature/Phase5/FoundationTest.php`

**Detail:**
Buat suite pengujian end-to-end yang memverifikasi seluruh fondasi 5a berfungsi bersama.

- [x] **Step 1: Tulis test suite.**
  ```php
  <?php

  use App\Enums\ArticleStatus;
  use App\Enums\AssetHistoryAction;
  use App\Enums\AuditAction;
  use App\Enums\AuditModule;

  test('all phase 5 enums are accessible', function () {
      expect(ArticleStatus::cases())->toHaveCount(2);
      expect(AssetHistoryAction::cases())->toHaveCount(4);
      expect(AuditAction::Release)->not->toBeNull();
      expect(AuditModule::KnowledgeCategory)->not->toBeNull();
  });

  test('private disk is configured and writable', function () {
      Storage::disk('private')->put('test.txt', 'hello');
      expect(Storage::disk('private')->exists('test.txt'))->toBeTrue();
      Storage::disk('private')->delete('test.txt');
  });

  test('article policy gates are registered', function () {
      $admin = User::factory()->admin()->create();
      $employee = User::factory()->employee()->create();
      $article = KnowledgeArticle::factory()->create(['author_id' => $admin->id]);

      expect(Gate::forUser($admin)->allows('create', KnowledgeArticle::class))->toBeTrue();
      expect(Gate::forUser($employee)->allows('create', KnowledgeArticle::class))->toBeFalse();
  });

  test('asset policy new abilities are registered', function () {
      $manager = User::factory()->manager()->create();
      $tech = User::factory()->technician()->create();
      $asset = Asset::factory()->create();

      expect(Gate::forUser($manager)->allows('delete', $asset))->toBeTrue();
      expect(Gate::forUser($tech)->allows('delete', $asset))->toBeFalse();
      expect(Gate::forUser($manager)->allows('assign', $asset))->toBeTrue();
      expect(Gate::forUser($tech)->allows('assign', $asset))->toBeTrue();
  });
  ```

- [x] **Step 2: Jalankan seluruh test suite.**
  ```bash
  vendor/bin/pest tests/Feature/Phase5/
  vendor/bin/pest  # full suite untuk cek regresi
  ```

- [x] **Step 3: Formatting & Commit.**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Phase5/
  git commit -m "test(phase5): add foundation verification suite for enums, disk, policies"
  ```

---

## Exit Criteria 5a

- [x] D-08 Amandemen 3, D-11 amandemen, PERMISSION-MATRIX §2.2/3.3–3.5/§6, ROADMAP 3 baris — semua diamandemen.
- [x] `ArticleStatus`, `AssetHistoryAction` enum baru; `AuditAction` +5, `AuditModule` +1.
- [x] `ArticlePolicy`, `AttachmentPolicy` — semua ability punya test positif & negatif.
- [x] `AssetPolicy` lengkap 10 ability; `git mv` ke subfolder `Asset/`; `#[UsePolicy]` diperbarui.
- [x] Model: `Asset.activeAssignment`, `User.assetAssignments`/`.activeAssignments`, `User.activeAssignments`; cast `ArticleStatus`; `#[UsePolicy]` di `KnowledgeArticle` & `TicketAttachment`.
- [x] Migrasi 3 index: `knowledge_articles(title)`, `knowledge_articles(status)`, `assets(status)`.
- [x] Disk `private` (serve=false, root sesuai Addendum §6.1) terverifikasi lewat tinker.
- [x] Factory state: `AssetFactory::available/assigned/maintenance/retired/lost`, `KnowledgeArticleFactory::draft`.
- [x] Seluruh test suite hijau (`vendor/bin/pest`).
- [x] Linter Pint bersih (`vendor/bin/pint --test`).