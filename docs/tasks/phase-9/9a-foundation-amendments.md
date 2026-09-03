# Sub-tahap 9a — Amandemen Backend & Komponen Bersama

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini adalah fondasi semua sub-tahap berikutnya — empat amandemen backend yang menutup lubang API dashboard, plus komponen bersama (`MetricCard`, `DashboardPanel`, `LazyChart`, `DateRangePicker`) yang dipakai 9b–9d. Kerjakan Task 1–5 (backend, TDD penuh) sebelum Task 6–10 (frontend). Verifikasi akhir: test backend + test frontend hijau.

**Goal:** (1) Backend: tambah `sla_compliance_percentage` untuk technician (B1), `unassigned_tickets` untuk manager (B2), referensi `ticket` pada aktivitas technician (B3), dan perbaiki `recent_articles` employee ke `ArticleListResource` (B4) — semuanya additive dengan test. (2) Frontend: perbaiki `types/dashboard.ts`, tambah `formatters.ts`, komponen `MetricCard`/`DashboardPanel`/`LazyChart`/`DateRangePicker`, dan label dashboard.

**Branch:** `feat/phase-9a-foundation`
**Estimasi:** ~1,0 hari
**Prasyarat:** Fase 8 selesai; `docs/design/wireframe.pen` frame 02–05 sudah dibaca via pencil MCP (referensi layout — lihat catatan di README Fase 9).

---

## Task 1: B1 — Technician `sla_compliance_percentage`

**Files:**
- Create: `tests/Feature/Dashboard/TechnicianSlaComplianceTest.php`
- Modify: `app/Services/Dashboard/SlaMetricsCalculator.php` (tambah helper all-time)
- Modify: `app/Services/Dashboard/TechnicianDashboardService.php`

**Detail:** Endpoint technician saat ini tidak mengembalikan compliance. Tambah key `sla_compliance_percentage` dengan formula persis D-03 terhadap **tiket resolved milik teknisi** (`technician_id = actor`): `resolved within SLA / total resolved × 100`, `null` bila 0 resolved.

Refactor kecil: `SlaMetricsCalculator::resolvedMetrics(Builder $q, DashboardDateRange $range)` memfilter `resolved_at` dalam rentang. Tambah method `complianceFor(Builder $query): array` yang **tidak** menerapkan rentang (all-time) dan mengembalikan `{within_sla, breached, compliance_percentage, avg_resolution_minutes}` dengan kontrak null yang sama. `resolvedMetrics` boleh di-refactor memanggil helper internal agar rumus tidak terduplikasi, **asalkan** behavior rentang tidak berubah (30 test dashboard lama harus tetap hijau).

> **Jebakan — jangan ubah kontrak lama:** `ManagerDashboardService` meng-`unset($sla['total_resolved'])`. Helper baru tidak boleh menambah key selain 4 key yang ada, dan `resolvedMetrics` harus tetap mengembalikan bentuk yang sama persis (jangan sampai `unset` jadi tidak berfungsi atau menambah key `total_resolved` yang lolos).

### Step 1 — RED:
```php
// tests/Feature/Dashboard/TechnicianSlaComplianceTest.php
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('technician dashboard returns own SLA compliance percentage', function () {
    $tech = User::factory()->technician()->create();
    // 2 resolved within SLA, 1 resolved terlambat → compliance 66.7
    Ticket::factory()->resolved()->create([
        'technician_id' => $tech->id,
        'created_at' => now()->subDays(3),
        'resolved_at' => now()->subDays(2)->addHour(),
        'sla_deadline' => now()->subDays(2)->addHours(4),
    ]);
    Ticket::factory()->resolved()->create([
        'technician_id' => $tech->id,
        'created_at' => now()->subDays(3),
        'resolved_at' => now()->subDays(2)->addHours(2),
        'sla_deadline' => now()->subDays(2)->addHours(4),
    ]);
    Ticket::factory()->resolved()->create([
        'technician_id' => $tech->id,
        'created_at' => now()->subDays(3),
        'resolved_at' => now()->subDays(2)->addHours(6),
        'sla_deadline' => now()->subDays(2)->addHours(4), // lewat deadline
    ]);

    Sanctum::actingAs($tech);
    $response = $this->getJson('/api/dashboard/technician');

    $response->assertStatus(200)
        ->assertJsonPath('data.sla_compliance_percentage', 66.7);
});

test('technician compliance is null when no resolved tickets', function () {
    $tech = User::factory()->technician()->create();
    Ticket::factory()->inProgress()->create(['technician_id' => $tech->id]);

    Sanctum::actingAs($tech);
    $this->getJson('/api/dashboard/technician')
        ->assertStatus(200)
        ->assertJsonPath('data.sla_compliance_percentage', null);
});

test('technician compliance ignores other technicians resolved tickets', function () {
    $tech = User::factory()->technician()->create();
    $other = User::factory()->technician()->create();
    Ticket::factory()->resolved()->create([
        'technician_id' => $other->id,
        'created_at' => now()->subDays(3),
        'resolved_at' => now()->subDays(2)->addHour(),
        'sla_deadline' => now()->subDays(2)->addHours(4),
    ]);

    Sanctum::actingAs($tech);
    $this->getJson('/api/dashboard/technician')
        ->assertStatus(200)
        ->assertJsonPath('data.sla_compliance_percentage', null);
});
```

### Step 2 — GREEN:
```php
// SlaMetricsCalculator.php — tambah method (all-time, tanpa range)
public function complianceFor(Builder $query): array
{
    $resolved = (clone $query)->whereNotNull('resolved_at');
    $totalResolved = (clone $resolved)->count();

    if ($totalResolved === 0) {
        return [
            'within_sla' => 0,
            'breached' => 0,
            'compliance_percentage' => null,
            'avg_resolution_minutes' => null,
        ];
    }

    $withinSla = (clone $resolved)
        ->whereColumn('resolved_at', '<=', 'sla_deadline')
        ->count();

    return [
        'within_sla' => $withinSla,
        'breached' => $totalResolved - $withinSla,
        'compliance_percentage' => round(($withinSla / $totalResolved) * 100, 1),
        'avg_resolution_minutes' => $this->queryService->avgResolutionMinutes($resolved),
    ];
}
```
```php
// TechnicianDashboardService.php — inject SlaMetricsCalculator & tambah key
public function __construct(
    protected DashboardQueryService $queryService,
    protected SlaMetricsCalculator $slaMetrics,
) {}

// di return array, sesudah 'avg_resolution_minutes' => ...,
'sla_compliance_percentage' => $this->slaMetrics->complianceFor((clone $assigned))['compliance_percentage'],
```

Perhatikan: `$assigned` di service sudah `Ticket::query()->where('technician_id', $actor->id)` — `complianceFor` menambahkan `whereNotNull('resolved_at')`.

### Step 3 — REFACTOR & verifikasi
```bash
vendor/bin/pest tests/Feature/Dashboard/TechnicianSlaComplianceTest.php
vendor/bin/pest tests/Feature/Dashboard
vendor/bin/pint --dirty --format agent
```

### Step 4 — Commit
```bash
git add tests/Feature/Dashboard/TechnicianSlaComplianceTest.php \
        app/Services/Dashboard/SlaMetricsCalculator.php \
        app/Services/Dashboard/TechnicianDashboardService.php
git commit -m "feat(api): add sla_compliance_percentage to technician dashboard"
```

---

## Task 2: B2 — Manager `unassigned_tickets`

**Files:**
- Create: `tests/Feature/Dashboard/ManagerUnassignedTicketsTest.php`
- Modify: `app/Services/Dashboard/DashboardCountsQuery.php`
- Modify: `app/Services/Dashboard/ManagerDashboardService.php`

**Detail:** Tambah key `unassigned_tickets` = jumlah tiket yang **belum di-assign** (`technician_id IS NULL`) dan masih **OPEN** (belum diproses). Semantik: snapshot live (seperti `open_tickets`/`closed_tickets`), **tidak** mengikuti `date_from`/`date_to`.

> **Jebakan — definisi "belum di-assign":** Jangan hanya `whereNull('technician_id')` tanpa filter status — tiket yang sudah `RESOLVED`/`CLOSED` tapi teknisi pernah dihapus/soft-delete akan ikut terhitung. Filter status OPEN (`status_id = 1` mengikuti pinned ID D-15) atau gunakan relasi `status` `is_closed = false` + `technician_id IS NULL`. Konsisten dengan arti operasional "perlu penugasan" di wireframe.

### Step 1 — RED:
```php
// tests/Feature/Dashboard/ManagerUnassignedTicketsTest.php
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('manager dashboard returns unassigned open tickets count', function () {
    $manager = User::factory()->manager()->create();
    Ticket::factory()->open()->create(['technician_id' => null]);             // 1 → dihitung
    Ticket::factory()->open()->create();                                       // 2 → dihitung (open + null)
    Ticket::factory()->inProgress()->create(['technician_id' => null]);        // tidak: sudah diproses

    Sanctum::actingAs($manager);
    $this->getJson('/api/dashboard/manager')
        ->assertStatus(200)
        ->assertJsonPath('data.unassigned_tickets', 2);
});

test('unassigned_tickets ignores the date range like open snapshot', function () {
    $manager = User::factory()->manager()->create();
    Ticket::factory()->open()->create([
        'technician_id' => null,
        'created_at' => now()->subDays(60), // di luar default 30 hari tapi masih open
    ]);

    Sanctum::actingAs($manager);
    $this->getJson('/api/dashboard/manager') // default 30 hari
        ->assertStatus(200)
        ->assertJsonPath('data.unassigned_tickets', 1);
});
```

### Step 2 — GREEN:
```php
// DashboardCountsQuery.php
public function countUnassigned(Builder $query): int
{
    return (clone $query)
        ->whereNull('technician_id')
        ->whereHas('status', fn ($q) => $q->where('is_closed', false))
        ->count();
}
```
```php
// ManagerDashboardService.php — dalam return array, sesudah 'closed_tickets' => ...,
'unassigned_tickets' => $this->countsQuery->countUnassigned(clone $tickets),
```

### Step 3 — REFACTOR & verifikasi
```bash
vendor/bin/pest tests/Feature/Dashboard/ManagerUnassignedTicketsTest.php
vendor/bin/pest tests/Feature/Dashboard
vendor/bin/pint --dirty --format agent
```

### Step 4 — Commit
```bash
git add tests/Feature/Dashboard/ManagerUnassignedTicketsTest.php \
        app/Services/Dashboard/DashboardCountsQuery.php \
        app/Services/Dashboard/ManagerDashboardService.php
git commit -m "feat(api): add unassigned_tickets to manager dashboard"
```

---

## Task 3: B3 — Technician `recent_activity` memuat referensi tiket

**Files:**
- Create: `tests/Feature/Dashboard/TechnicianRecentActivityTest.php`
- Modify: `app/Http/Resources/Ticket/TicketHistoryResource.php`

**Detail:** `TechnicianDashboardService` sudah eager-load `with(['user', 'ticket'])` tapi `TicketHistoryResource` tidak pernah memakai `ticket`. Tambah key `ticket` (saat ter-load) berisi `ticket_number` dan `title`, supaya UI bisa menautkan item aktivitas ke detail tiket.

> **Jebakan — `whenLoaded` + resource dipakai di tempat lain:** `TicketHistoryResource` juga dipakai endpoint riwayat tiket (`GET /api/tickets/{id}/histories`) di Fase 3/8, yang **tidak** eager-load `ticket`. Dengan `whenLoaded('ticket', ...)`, endpoint itu tidak berubah (key `ticket` tidak muncul) — aman. Jangan render `$this->ticket` tanpa guard.

### Step 1 — RED:
```php
// tests/Feature/Dashboard/TechnicianRecentActivityTest.php
use App\Models\Ticket;
use App\Models\User;
use App\Models\TicketHistory;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('technician recent activity includes ticket number and title', function () {
    $tech = User::factory()->technician()->create();
    $ticket = Ticket::factory()->inProgress()->create(['technician_id' => $tech->id]);
    TicketHistory::factory()->create([
        'ticket_id' => $ticket->id,
        'user_id' => $tech->id,
        'field_changed' => 'status_id',
        'new_value' => '3',
    ]);

    Sanctum::actingAs($tech);
    $response = $this->getJson('/api/dashboard/technician');
    $activity = $response->json('data.recent_activity');

    expect($activity)->toHaveCount(1)
        ->and($activity[0]['ticket']['ticket_number'])->toBe($ticket->ticket_number)
        ->and($activity[0]['ticket']['title'])->toBe($ticket->title);
});

test('ticket history endpoint without ticket relation stays unchanged', function () {
    // GET /api/tickets/{id}/histories TIDAK boleh memuat key 'ticket'
    // (verifikasi tidak regresi — lihat test Fase 8 bila sudah ada; tambahkan jika belum)
});
```

> Cek apakah `TicketHistory::factory()` dan route `ticket histories` test sudah ada; sesuaikan nama factory/route bila berbeda.

### Step 2 — GREEN:
```php
// TicketHistoryResource.php — tambah di array return, sebelum 'created_at'
'ticket' => $this->whenLoaded('ticket', fn () => [
    'ticket_number' => $this->ticket->ticket_number,
    'title' => $this->ticket->title,
]),
```

### Step 3 — REFACTOR & verifikasi
```bash
vendor/bin/pest tests/Feature/Dashboard/TechnicianRecentActivityTest.php
vendor/bin/pest tests/Feature/Dashboard tests/Feature/Ticket
vendor/bin/pint --dirty --format agent
```

### Step 4 — Commit
```bash
git add tests/Feature/Dashboard/TechnicianRecentActivityTest.php \
        app/Http/Resources/Ticket/TicketHistoryResource.php
git commit -m "feat(api): add ticket reference to technician recent activity"
```

---

## Task 4: B4 — Employee `recent_articles` → `ArticleListResource`

**Files:**
- Create: `tests/Feature/Dashboard/EmployeeRecentArticlesTest.php`
- Modify: `app/Services/Dashboard/EmployeeDashboardService.php`

**Detail:** `EmployeeDashboardService` memakai `ArticleResource` untuk `recent_articles` tetapi **tanpa** eager-load `category`/`author`, sehingga payload membawa `content` penuh (berat) dan kehilangan `category`/`author` (yang dibutuhkan kartu artikel). Ganti ke `ArticleListResource` dengan eager load `category,author`. Bentuk hasil: `{id, title, slug, category, author, status, view_count, published_at, created_at}` — tanpa `content`.

> **Jebakan — resource lain ikut berubah:** `ArticleListResource` hanya berubah bila eager-load berubah. Employee dashboard wajib `->with(['category', 'author'])`. Jangan ubah `ArticleListResource` itu sendiri (dipakai list artikel KB).

### Step 1 — RED:
```php
// tests/Feature/Dashboard/EmployeeRecentArticlesTest.php
use App\Models\KnowledgeArticle;
use App\Models\User;
use App\Models\KnowledgeCategory;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('employee recent articles include category and author without content', function () {
    $emp = User::factory()->employee()->create();
    $author = User::factory()->technician()->create(['full_name' => 'Budi Santoso']);
    $cat = KnowledgeCategory::factory()->create(['name' => 'Network']);
    $article = KnowledgeArticle::factory()->published()->create([
        'author_id' => $author->id,
        'category_id' => $cat->id,
        'content' => 'Isi panjang yang tidak boleh ikut terkirim ke dashboard',
    ]);

    Sanctum::actingAs($emp);
    $response = $this->getJson('/api/dashboard/employee');
    $articles = $response->json('data.recent_articles');

    expect($articles)->toHaveCount(1)
        ->and($articles[0]['title'])->toBe($article->title)
        ->and($articles[0]['category']['name'])->toBe('Network')
        ->and($articles[0]['author']['full_name'])->toBe('Budi Santoso')
        ->and($articles[0])->not->toHaveKey('content');
});
```

> Cek nama kolom FK & factory `KnowledgeArticle`/`KnowledgeCategory` di test Fase 5; sesuaikan bila kolom relasi berbeda. Kolom FK artikel → `category_id` (bukan `knowledge_category_id`).

### Step 2 — GREEN:
```php
// EmployeeDashboardService.php
use App\Http\Resources\Article\ArticleListResource; // ganti ArticleResource

'recent_articles' => ArticleListResource::collection(
    KnowledgeArticle::query()
        ->where('status', 'published')
        ->whereNotNull('published_at')
        ->with(['category', 'author'])
        ->latest('published_at')
        ->limit(5)
        ->get()
)->resolve(),
```

### Step 3 — REFACTOR & verifikasi
```bash
vendor/bin/pest tests/Feature/Dashboard/EmployeeRecentArticlesTest.php
vendor/bin/pest tests/Feature/Dashboard tests/Feature/Knowledge
vendor/bin/pint --dirty --format agent
```

### Step 4 — Commit
```bash
git add tests/Feature/Dashboard/EmployeeRecentArticlesTest.php \
        app/Services/Dashboard/EmployeeDashboardService.php
git commit -m "fix(api): employee dashboard recent articles use ArticleListResource with category and author"
```

---

## Task 5: Verifikasi backend keseluruhan

**Files:** tidak ada perubahan.

### Step 1 — Jalankan seluruh suite dashboard + smoke:
```bash
vendor/bin/pest tests/Feature/Dashboard
vendor/bin/pest tests/Feature
vendor/bin/pint --dirty --format agent
```

### Step 2 — Konfirmasi payload nyata (manual, MySQL):
Login sebagai tiap role (via Postman/curl), panggil endpoint masing-masing, pastikan key baru muncul:
- `data.sla_compliance_percentage` (technician)
- `data.unassigned_tickets` (manager)
- `data.recent_activity[0].ticket.ticket_number` (technician)
- `data.recent_articles[0].category.name` + tidak ada `content` (employee)

### Step 3 — Commit (bila ada sisa kecil)
```bash
git commit -am "chore(api): verify Phase 9 dashboard amendments payloads"
```

---

## Task 6: Frontend — perbaiki `types/dashboard.ts`

**Files:**
- Modify: `apps/web/src/types/dashboard.ts`

**Detail:** Sinkronkan tipe dengan payload nyata + amandemen B1–B4:
- `EmployeeDashboardData.recent_articles` — tipe `KnowledgeArticleListItem` di `types/articles.ts` **belum cocok** dengan `ArticleListResource` (hasil B4). `ArticleListResource` mengembalikan `{id, title, slug, category: {id,name}|null, author: {id, full_name}|null, status, view_count, published_at, created_at, updated_at}` — **tanpa `content`**. Perbaiki `KnowledgeArticleListItem` bila perlu: `author` menjadi `{ id: number; full_name: string } | null` (bukan `{name, email}` yang sudah usang sejak amandemen A1 Fase 8), `category` tetap `{ id: number; name: string } | null`, dan pastikan tidak ada `content` di tipe list item.
- `EmployeeDashboardData.recent_tickets` bertipe `TicketListItem[]` — perbaiki `TicketListItem.technician` menjadi **opsional** (`technician?: {...} | null`) karena key bisa hilang saat teknisi soft-deleted (C17).
- `TechnicianDashboardData` — tambah `sla_compliance_percentage: number | null`; `recent_activity` item kini punya `ticket?: { ticket_number: string; title: string } | null` → tambah ke tipe `TicketHistoryItem` di `types/tickets.ts` sebagai field opsional.
- `ManagerDashboardData` — tambah `unassigned_tickets: number`.
- `AdminDashboardData` — sudah extend `ManagerDashboardData`; tidak berubah.
- Perhatikan: timestamp `ISO 8601` dengan mikro-detik (`.000000Z`) — tipe `string` sudah benar; jangan asumsikan presisi detik.

> **Jebakan — jangan hanya salin tipe lama:** `technician` pada `TicketListItem` bukan `null`-saja; **key-nya bisa absen**. Gunakan `technician?: {...} | null` dan handle di komponen.

### Step 1 — tulis/update tipe
```typescript
// types/tickets.ts
export interface TicketHistoryItem {
  id: number;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  user: { id: number; full_name?: string | null } | null;
  ticket?: { ticket_number: string; title: string } | null; // B3
  created_at: string;
}
```

### Step 2 — verifikasi
```bash
cd apps/web && npx tsc --noEmit
```

### Step 3 — Commit
```bash
git add apps/web/src/types/dashboard.ts apps/web/src/types/tickets.ts
git commit -m "feat(web): sync dashboard types with SLA compliance, unassigned, activity ticket, and optional technician"
```

---

## Task 7: Frontend — `formatters.ts` (durasi & SLA)

**Files:**
- Create: `apps/web/src/lib/formatters.ts`

**Detail:** Tidak ada file formatter saat ini. Tambah util murni (diuji di Vitest):
- `formatDuration(minutes: number | null): string` — `null` → `"—"`; `< 60` → `"45m"`; `< 60*24` → `"3j 15m"` (jam+menit bila sisa > 0, selain itu `"3j"`); `>= 1440` → `"2h 5j"`? Gunakan format Indonesia konsisten dengan wireframe (`3j 15m`). Putuskan & kunci: `>= 1 hari` → `"Xh Ym"` (hari+jam).
- `formatSlaRemaining(signedMinutes: number | null, finished: boolean): string` — untuk kolom sisa SLA (D-28): `finished` (RESOLVED/CLOSED) → `"Selesai"`; `null` → `"—"`; `signedMinutes >= 0` → `formatDuration`; `< 0` → `"Terlambat " + formatDuration(abs)`.
- (Opsional) `formatWibHour`/greeting helper bisa menyusul di 9b.

> **Jebakan — konsistensi format:** jangan mencampur `"3h 15m"` (Inggris) dengan wireframe Indonesia. Gunakan `j`/`m`/`h`; tulis unit test yang mengunci format persis.

### Step 1 — RED (Vitest):
```typescript
// test/formatters.test.ts
import { describe, expect, it } from 'vitest';
import { formatDuration, formatSlaRemaining } from '@/lib/formatters';

describe('formatDuration', () => {
  it('formats minutes to Indonesian duration', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(195)).toBe('3j 15m');
    expect(formatDuration(180)).toBe('3j');
  });
});

describe('formatSlaRemaining', () => {
  it('shows Selesai for finished tickets', () => {
    expect(formatSlaRemaining(-18, true)).toBe('Selesai');
  });
  it('formats remaining and overdue signed minutes', () => {
    expect(formatSlaRemaining(134, false)).toBe('2j 14m');
    expect(formatSlaRemaining(-18, false)).toBe('Terlambat 18m');
  });
});
```

### Step 2 — GREEN: implementasi + `vitest run`.

### Step 3 — verifikasi
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint
```

### Step 4 — Commit
```bash
git add apps/web/src/lib/formatters.ts apps/web/src/test/formatters.test.ts
git commit -m "feat(web): add duration and signed SLA formatters"
```

---

## Task 8: Frontend — `MetricCard` & `DashboardPanel`

**Files:**
- Create: `apps/web/src/components/dashboard/metric-card.tsx`
- Create: `apps/web/src/components/dashboard/dashboard-panel.tsx`
- Create: `apps/web/src/components/dashboard/index.ts`
- Create: `apps/web/src/test/dashboard-components.test.tsx`

**Detail:**

`MetricCard` (wireframe "C / Metric Card": label + ikon di atas, value besar, footer kecil). Props:
```tsx
interface MetricCardProps {
  label: string;
  value: string | number | null;
  icon?: LucideIcon;
  footer?: ReactNode;
  tone?: 'default' | 'danger';
  isLoading?: boolean;
}
```
- `value` `null` → `"—"` (K6). `isLoading` → `<Skeleton className="h-8 w-16" />`.
- `tone: 'danger'` → ikon + value memakai warna bahaya yang lolos kontras ≥ 3:1 di atas cream (cek palet DESIGN.md; bila perlu gunakan warna status yang sudah dipakai `StatusBadge`/`SlaIndicator` breached — jangan invent warna baru di luar token). Teks value tetap charcoal bila hanya ikon yang berwarna.
- Struktur: `<div className="rounded-card border border-cream-border bg-cream p-4">` — **tanpa box-shadow** (DESIGN.md).

`DashboardPanel`:
```tsx
interface DashboardPanelProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  actionIcon?: LucideIcon;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}
```
- Header: judul (600) + link aksi (kanan, `actionHref`) → `EmptyState` bila `isEmpty`.
- Body children. `isLoading` → skeleton baris (bukan satu blok besar).

> **Jebakan — ikon dari `lucide-react`:** ukuran `size-4`/`size-5`, `strokeWidth={1.5}` (FRONTEND-ARCHITECTURE §3.7). Ikon map untuk status/aktivitas disediakan label di Task 10.

### Step 1 — RED (Vitest, `test-utils.tsx` dari Fase 7):
Test: value null render "—"; isLoading render skeleton; tone danger memberi class; panel isEmpty menampilkan EmptyState.

### Step 2 — GREEN: implementasi komponen.

### Step 3 — verifikasi
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint
```

### Step 4 — Commit
```bash
git add apps/web/src/components/dashboard apps/web/src/test/dashboard-components.test.tsx
git commit -m "feat(web): add MetricCard and DashboardPanel shared components"
```

---

## Task 9: Frontend — `LazyChart` & `DateRangePicker`

**Files:**
- Create: `apps/web/src/components/dashboard/lazy-chart.tsx`
- Create: `apps/web/src/components/dashboard/date-range-picker.tsx`
- Create: `apps/web/src/test/date-range-picker.test.tsx` (util + render dasar)

**Detail — `LazyChart`:** bungkus `next/dynamic`:
```tsx
import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function lazyChart<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
) {
  return dynamic(loader, {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <Skeleton className="h-56 w-full" />
      </div>
    ),
  });
}
```
Dipakai 9c untuk chart trend. Tidak perlu export komponen chart spesifik di sini.

**Detail — `DateRangePicker`:** install dulu `react-day-picker` + tambah komponen shadcn `calendar.tsx`:
```bash
cd apps/web && npx shadcn@latest add calendar popover
```
(atau `npm install react-day-picker date-fns` bila `@radix-ui/react-popover` sudah ada — popover sudah terinstall; shadcn `calendar` butuh `react-day-picker`.)

Komponen:
```tsx
interface DateRangePickerProps {
  from?: string; // YYYY-MM-DD (WIB) dari URL
  to?: string;
  onChange: (range: { from?: string; to?: string } | null) => void;
}
```
- Preset cepat: "7 hari", "30 hari", "90 hari", "Sesuaikan…". Pilih preset → `onChange` dengan `{from, to}` dihitung dari **hari ini Asia/Jakarta** (`Intl`/`date-fns-tz` tidak wajib; gunakan pendekatan yang konsisten dengan server: tanggal lokal WIB).
- Kalender 2-bulan / mode range dari shadcn. Kirim `{from, to}` dalam `YYYY-MM-DD`.
- **Aturan C11**: `onChange(null)` untuk reset → hapus kedua param URL. Jangan pernah emit hanya `from` atau hanya `to`.

> **Jebakan — timezone:** hitung "hari ini WIB" bukan `new Date().toISOString().slice(0,10)` (itu UTC, bisa selisih 1 hari setelah pukul 17.00 WIB). Konversi: `new Date(Date.now() + 7*3600e3).toISOString().slice(0,10)` — atau pakai `toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })`.

### Step 1 — install & RED test (util tanggal `getWibDateString`, `shiftDays`)
Tulis util murni dulu di `date-range-picker.tsx` (atau `formatters.ts`) dan uji: `getWibDateString()`, `presetRange('7d')`.

### Step 2 — GREEN: implementasi komponen + render test memakai `@testing-library/user-event`.

### Step 3 — verifikasi
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint && npm run build
```

### Step 4 — Commit
```bash
git add apps/web/package.json apps/web/package-lock.json \
        apps/web/src/components/ui/calendar.tsx \
        apps/web/src/components/dashboard/lazy-chart.tsx \
        apps/web/src/components/dashboard/date-range-picker.tsx \
        apps/web/src/test/date-range-picker.test.tsx
git commit -m "feat(web): add LazyChart and calendar-based DateRangePicker with presets"
```

---

## Task 10: Frontend — label dashboard & peta ikon aktivitas

**Files:**
- Modify: `apps/web/src/lib/labels.ts`
- Create: `apps/web/src/test/labels.test.ts` (tambahan)

**Detail:** Tambah label Indonesia terpusat:
- `dashboardMetricLabels`: dipakai 9b–9d bila label lebih dari sekali (tidak wajib untuk label sekali-pakai).
- `activityFieldLabels` — label `field_changed` untuk aktivitas technician (9b): `status_id` → "Mengubah status", `technician_id` → "Penugasan teknisi", `priority_id` → "Mengubah prioritas", `category_id` → "Mengubah kategori", default → "Memperbarui tiket".
- `chartSeriesLabels`: `{ created: 'Ticket Dibuat', resolved: 'Ticket Selesai' }` (wireframe 04 legenda).
- `emptyStateLabels` bila perlu: `dashboardActivity: 'Belum ada aktivitas.'`, `dashboardTicket: 'Belum ada tiket.'`, dst.

Periksa konvensi ekspor di `labels.ts` (fungsi + objek konstanta) dan ikuti pola yang ada (`auditModuleLabels`, `auditActionLabels`, `errorMessages`). Tambahkan test yang memastikan label kunci ada (mencegah typo).

> **Jebakan — D-24:** semua teks UI Indonesia. Jangan render nama enum `field_changed` mentah (`status_id`) ke UI — selalu lewat `activityFieldLabels` dengan fallback.

### Step 1 — RED/implementasi label + test.
### Step 2 — verifikasi: `npm run test && npx tsc --noEmit && npm run lint`.
### Step 3 — Commit:
```bash
git add apps/web/src/lib/labels.ts apps/web/src/test/labels.test.ts
git commit -m "feat(web): add dashboard activity, chart series, and empty state labels"
```

---

## Exit Criteria 9a

- [ ] B1: `data.sla_compliance_percentage` hadir di `/api/dashboard/technician`, formula D-03, `null` saat 0 resolved; test hijau.
- [ ] B2: `data.unassigned_tickets` hadir di `/api/dashboard/manager`, snapshot live tanpa range; test hijau.
- [ ] B3: `recent_activity[].ticket.{ticket_number,title}` hadir; endpoint riwayat tiket lama tidak berubah; test hijau.
- [ ] B4: `recent_articles[]` employee tanpa `content`, dengan `category` & `author`; test hijau.
- [ ] `vendor/bin/pest tests/Feature/Dashboard` + `vendor/bin/pest tests/Feature` hijau; `vendor/bin/pint --dirty --format agent` bersih.
- [ ] `types/dashboard.ts` & `types/tickets.ts` sinkron payload nyata (B1–B4, `technician?` opsional, `ticket?` pada history).
- [ ] `formatters.ts` (`formatDuration`, `formatSlaRemaining`) + test hijau.
- [ ] `MetricCard`, `DashboardPanel`, `LazyChart`, `DateRangePicker` (shadcn calendar + preset + aturan dua-param) ada, `tsc` + lint + test hijau.
- [ ] Label dashboard di `labels.ts` + test hijau.
- [ ] Commit atomik per task; branch `feat/phase-9a-foundation` siap PR ke `main`.
