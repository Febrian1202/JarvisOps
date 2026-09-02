# Fase 6a — Foundation & Query Kernel (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini membangun kernel agregasi yang dipakai seluruh endpoint dashboard — **tanpa HTTP**. Semua pengujian adalah unit test (tidak perlu `Sanctum::actingAs` atau `RefreshDatabase` untuk kalkulator murni).

**Goal:** Membangun value object `DashboardDateRange` (D-23 WIB→UTC), validasi request `IndexDashboardRequest`, dan kernel query `DashboardQueryService` beserta empat kalkulator (`SlaMetricsCalculator`, `TicketTrendQuery`, `TechnicianPerformanceQuery`, `DashboardCountsQuery`) — semuanya murni, tanpa HTTP, bisa diuji unit. Fondasi ini menjamin definisi metrik konsisten di seluruh endpoint 6b–6d.

**Branch:** `feat/phase-6a-foundation`
**Estimasi Waktu:** ~0.75 hari (6 task)
**Prasyarat:** `CACHE_STORE=array` (test) — tidak ada caching. `phpunit.xml` env `DB_CONNECTION=sqlite`. `ReferenceDataSeeder` pinned (status 1–5, priority 1–4).

---

### Task 1: `DashboardDateRange` + `IndexDashboardRequest`

**Files:**
- Create: `app/Services/Dashboard/DashboardDateRange.php`
- Create: `app/Http/Requests/Dashboard/IndexDashboardRequest.php`
- Create: `tests/Unit/DashboardDateRangeTest.php`
- Create: `tests/Unit/DashboardRequestTest.php`

**Interfaces:**
- `DashboardDateRange::fromDates(?string $dateFrom, ?string $dateTo): self` — default 30 hari terakhir WIB; parse `Y-m-d` sebagai WIB, konversi ke UTC.
- `DashboardDateRange::applyToCreated(Builder $query): Builder` — `whereBetween('created_at', [$from, $to])`
- `DashboardDateRange::applyToResolved(Builder $query): Builder` — `whereNotNull('resolved_at')->whereBetween('resolved_at', [$from, $to])`
- `DashboardDateRange::$fromUtc : CarbonImmutable` — UTC start
- `DashboardDateRange::$toUtc : CarbonImmutable` — UTC end
- `IndexDashboardRequest::rules()` — `date_from` nullable `date_format:Y-m-d`, `date_to` nullable `date_format:Y-m-d`; `sort_by` & `per_page` **tidak** ada (dashboard tidak paginated).

**Detail `DashboardDateRange`:**

```php
final class DashboardDateRange
{
    public function __construct(
        public readonly CarbonImmutable $fromUtc,
        public readonly CarbonImmutable $toUtc,
    ) {}

    public static function default(): self
    {
        $todayWib = now('Asia/Jakarta')->startOfDay();
        return new self(
            $todayWib->subDays(29)->setTimezone('UTC'),
            $todayWib->endOfDay()->setTimezone('UTC'),
        );
    }

    public static function fromDates(?string $dateFrom, ?string $dateTo): self
    {
        if ($dateFrom === null && $dateTo === null) {
            return self::default();
        }
        $tz = 'Asia/Jakarta';
        $fromWib = $dateFrom !== null
            ? CarbonImmutable::createFromFormat('Y-m-d', $dateFrom, $tz)->startOfDay()
            : self::default()->fromUtc->setTimezone($tz);
        $toWib = $dateTo !== null
            ? CarbonImmutable::createFromFormat('Y-m-d', $dateTo, $tz)->endOfDay()
            : $fromWib->endOfDay();

        return new self($fromWib->setTimezone('UTC'), $toWib->setTimezone('UTC'));
    }

    public function applyToCreated(Builder $query): Builder
    {
        return $query->whereBetween('created_at', [$this->fromUtc, $this->toUtc]);
    }

    public function applyToResolved(Builder $query): Builder
    {
        return $query->whereNotNull('resolved_at')
            ->whereBetween('resolved_at', [$this->fromUtc, $this->toUtc]);
    }
}
```

> **Jebakan:** `CarbonImmutable::createFromFormat` mengembalikan `false` (bukan exception) bila format tidak cocok. Pastikan test memvalidasi bentuk `false` ditangani. `CarbonImmutable::parse` sudah cukup aman bila input sudah divalidasi oleh `IndexDashboardRequest`.

**`IndexDashboardRequest`:**

```php
public function rules(): array
{
    return [
        'date_from' => ['nullable', 'date_format:Y-m-d'],
        'date_to' => ['nullable', 'date_format:Y-m-d'],
    ];
}

public function messages(): array
{
    return [
        'date_from.date_format' => 'Format tanggal awal tidak valid (YYYY-MM-DD).',
        'date_to.date_format' => 'Format tanggal akhir tidak valid (YYYY-MM-DD).',
    ];
}
```

> **Jebakan:** **Jangan** tambahkan parameter `technician_id` di request ini — keputusan #8: dashboard technician selalu `self`, parameter apa pun diabaikan. Tidak perlu validasi `date_from <= date_to` di sini (serahkan ke service; bila salah, query mengembalikan 0, bukan error — menghindari 422 untuk hal yang tidak merusak).

- [ ] **Step 1: Test — `DashboardDateRange` default 30 hari, parse WIB, applyToCreated/Resolved.**
  ```php
  test('default range covers last 30 days in WIB', function () {
      $range = DashboardDateRange::default();
      $todayWib = now('Asia/Jakarta');
      $diffDays = $todayWib->diffInDays($range->fromUtc->setTimezone('Asia/Jakarta'));
      expect($diffDays)->toBe(29);
  });

  test('fromDates parses Y-m-d as WIB and converts to UTC', function () {
      $range = DashboardDateRange::fromDates('2026-08-01', '2026-08-31');
      expect($range->fromUtc->format('Y-m-d H:i'))->toBe('2026-07-31 17:00') // WIB 00:00 - 7h
          ->and($range->toUtc->format('Y-m-d H:i'))->toBe('2026-08-31 16:59'); // WIB 23:59 - 7h = 16:59
  });

  test('fromDates with null defaults returns 30 days', function () {
      $range = DashboardDateRange::fromDates(null, null);
      expect($range->fromUtc)->toBeInstanceOf(CarbonImmutable::class);
  });

  test('applyToCreated adds whereBetween clause', function () {
      $range = DashboardDateRange::fromDates('2026-08-01', '2026-08-31');
      $query = Ticket::query();
      $query = $range->applyToCreated($query);
      $wheres = $query->getQuery()->wheres;
      expect($wheres)->toHaveCount(1)
          ->and($wheres[0]['type'])->toBe('between');
  });

  test('applyToResolved adds whereNotNull + whereBetween', function () {
      $range = DashboardDateRange::fromDates('2026-08-01', '2026-08-31');
      $query = Ticket::query();
      $query = $range->applyToResolved($query);
      $wheres = $query->getQuery()->wheres;
      expect($wheres)->toHaveCount(2);
  });
  ```

- [ ] **Step 2: Implementasi `DashboardDateRange`** sesuai kode di atas.

- [ ] **Step 3: Test — `IndexDashboardRequest` validasi format tanggal.**
  ```php
  test('valid date formats pass', function () {
      $request = new IndexDashboardRequest(['date_from' => '2026-08-01', 'date_to' => '2026-08-31']);
      app()->instance(IndexDashboardRequest::class, $request);
      // Via validator langsung
      $validator = Validator::make($request->all(), (new IndexDashboardRequest())->rules());
      expect($validator->passes())->toBeTrue();
  });

  test('invalid date format fails', function () {
      $validator = Validator::make(
          ['date_from' => '01-08-2026'],
          (new IndexDashboardRequest())->rules(),
          (new IndexDashboardRequest())->messages(),
      );
      expect($validator->fails())->toBeTrue();
  });
  ```

- [ ] **Step 4: Implementasi `IndexDashboardRequest`** — sesuai kode di atas.

- [ ] **Step 5: Verifikasi running & commit.**
  ```bash
  vendor/bin/pest tests/Unit/DashboardDateRangeTest.php
  vendor/bin/pest tests/Unit/DashboardRequestTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Dashboard/DashboardDateRange.php \
          app/Http/Requests/Dashboard/IndexDashboardRequest.php \
          tests/Unit/DashboardDateRangeTest.php \
          tests/Unit/DashboardRequestTest.php
  git commit -m "feat(dashboard): add DashboardDateRange value object and IndexDashboardRequest"
  ```

---

### Task 2: `DashboardQueryService` — SQL Helpers Driver-Aware

**Files:**
- Create: `app/Services/Dashboard/DashboardQueryService.php`
- Create: `tests/Unit/DashboardQueryServiceTest.php`

**Interfaces:**
- `DashboardQueryService::dateBucket(string $column): string` — expression SQL untuk mengelompokkan timestamp ke tanggal WIB (YYYY-MM-DD).
- `DashboardQueryService::minutesDiff(string $from, string $to): string` — expression SQL untuk selisih menit antara dua kolom datetime.
- `DashboardQueryService::avgResolutionMinutes(Builder $query): ?int` — helper langsung: `selectRaw(ROUND(AVG({$minutesDiff})))` dari query yang sudah di-scope.

**Detail:**

```php
class DashboardQueryService
{
    public function dateBucket(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m-%d', {$column}, '+7 hours')",
            default => "DATE(CONVERT_TZ({$column}, '+00:00', '+07:00'))",
        };
    }

    public function minutesDiff(string $from, string $to): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "CAST((strftime('%s', {$to}) - strftime('%s', {$from})) / 60 AS INTEGER)",
            default => "TIMESTAMPDIFF(MINUTE, {$from}, {$to})",
        };
    }

    public function avgResolutionMinutes(Builder $query): ?int
    {
        $diff = $this->minutesDiff('created_at', 'resolved_at');
        $row = (clone $query)
            ->selectRaw("ROUND(AVG({$diff})) as avg_minutes")
            ->first();

        return $row?->avg_minutes;
    }
}
```

> **Jebakan:**
> - **SQLite (test):** `strftime('%s', col)` mengembalikan Unix timestamp (detik, UTC); `strftime('%Y-%m-%d', col, '+7 hours')` mengelompokkan ke tanggal WIB. **Jangan** memakai `DATE(col)` tanpa modifikator — hasilnya tanggal UTC, bukan WIB.
> - **MySQL (prod):** `CONVERT_TZ(col, '+00:00', '+07:00')` dengan **offset numerik** (`'+00:00'`) **tidak** membutuhkan tabel timezone MySQL — tabel hanya wajib untuk zona bernama (`'Asia/Jakarta'`, `'UTC'`). Jadi `DATE(CONVERT_TZ(col, '+00:00', '+07:00'))` aman di MySQL 8.4 tanpa setup tambahan.
> - Kedua cabang `match` harus menghasilkan **`'YYYY-MM-DD'`** agar key array (`pluck('count', 'date')`) konsisten lintas driver.

- [ ] **Step 1: Test — `dateBucket` dan `minutesDiff` mengembalikan SQL yang benar untuk driver.**
  ```php
  test('dateBucket returns correct SQL for sqlite', function () {
      $service = new DashboardQueryService();
      $sql = $service->dateBucket('created_at');
      // SQLite test — driver adalah sqlite
      expect($sql)->toContain("strftime('%Y-%m-%d', created_at, '+7 hours')");
  });

  test('minutesDiff returns correct SQL for sqlite', function () {
      $service = new DashboardQueryService();
      $sql = $service->minutesDiff('created_at', 'resolved_at');
      expect($sql)->toContain('strftime');
  });

  test('avgResolutionMinutes returns null when no resolved tickets', function () {
      $service = new DashboardQueryService();
      $query = Ticket::whereRaw('1 = 0'); // empty set
      expect($service->avgResolutionMinutes($query))->toBeNull();
  });
  ```

- [ ] **Step 2: Implementasi `DashboardQueryService`** — sesuai kode di atas.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Unit/DashboardQueryServiceTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Dashboard/DashboardQueryService.php tests/Unit/
  git commit -m "feat(dashboard): add DashboardQueryService with driver-aware SQL helpers"
  ```

---

### Task 3: `SlaMetricsCalculator`

**Files:**
- Create: `app/Services/Dashboard/SlaMetricsCalculator.php`
- Create: `tests/Unit/SlaMetricsCalculatorTest.php`

**Interfaces:**
- `SlaMetricsCalculator::resolvedMetrics(Builder $ticketQuery, DashboardDateRange $range): array` — mengembalikan `['within_sla' => int, 'breached' => int, 'compliance_percentage' => ?float, 'avg_resolution_minutes' => ?int, 'total_resolved' => int]`.

**Detail:**

```php
class SlaMetricsCalculator
{
    public function __construct(
        protected DashboardQueryService $queryService,
    ) {}

    public function resolvedMetrics(Builder $ticketQuery, DashboardDateRange $range): array
    {
        $resolved = (clone $ticketQuery)
            ->whereNotNull('resolved_at')
            ->whereBetween('resolved_at', [$range->fromUtc, $range->toUtc]);

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

        $breached = $totalResolved - $withinSla;
        $compliance = round(($withinSla / $totalResolved) * 100, 1);
        $avg = $this->queryService->avgResolutionMinutes($resolved);

        return [
            'within_sla' => $withinSla,
            'breached' => $breached,
            'compliance_percentage' => $compliance,
            'avg_resolution_minutes' => $avg,
        ];
    }
}
```

> **Jebakan:** `$resolved` di-clone dari `$ticketQuery` yang sudah di-scope role. Pastikan `clone $query` — bukan `$query` langsung — karena method compose beberapa clone. `whereColumn` membandingkan dua kolom (lintas-driver aman). `compliance_percentage` dibulatkan 1 desimal (`87.0`).

- [ ] **Step 1: Test — Skenario terkontrol, hitung manual.**
  ```php
  uses(RefreshDatabase::class);

  beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

  test('resolvedMetrics matches manual calculation', function () {
      $range = DashboardDateRange::fromDates('2026-01-01', '2026-12-31');
      // 3 tickets resolved dalam rentang: 2 within SLA, 1 breached
      Ticket::factory()->resolved()->create([
          'created_at' => '2026-06-01 08:00:00',
          'resolved_at' => '2026-06-01 10:00:00',
          'sla_deadline' => '2026-06-01 12:00:00', // within (2h < 4h)
      ]);
      Ticket::factory()->resolved()->create([
          'created_at' => '2026-06-01 08:00:00',
          'resolved_at' => '2026-06-02 10:00:00',
          'sla_deadline' => '2026-06-01 12:00:00', // breached (26h > 4h)
      ]);
      Ticket::factory()->resolved()->create([
          'created_at' => '2026-06-01 08:00:00',
          'resolved_at' => '2026-06-01 11:00:00',
          'sla_deadline' => '2026-06-01 14:00:00', // within
      ]);
      // 1 cancelled ticket (resolved_at null, CLOSED) — excluded
      Ticket::factory()->closed()->create(['resolved_at' => null, 'sla_deadline' => '2026-06-01 12:00:00']);

      $calculator = app(SlaMetricsCalculator::class);
      $result = $calculator->resolvedMetrics(Ticket::query(), $range);

      expect($result['total_resolved'])->toBe(3)
          ->and($result['within_sla'])->toBe(2)
          ->and($result['breached'])->toBe(1)
          ->and($result['compliance_percentage'])->toBe(66.7)
          ->and($result['avg_resolution_minutes'])->toBeGreaterThan(0);
  });

  test('resolvedMetrics returns null compliance when no resolved tickets', function () {
      $range = DashboardDateRange::fromDates('2026-01-01', '2026-12-31');
      $calculator = app(SlaMetricsCalculator::class);
      $result = $calculator->resolvedMetrics(Ticket::query(), $range);
      expect($result['compliance_percentage'])->toBeNull()
          ->and($result['avg_resolution_minutes'])->toBeNull();
  });
  ```

- [ ] **Step 2: Implementasi `SlaMetricsCalculator`** — sesuai kode di atas.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Unit/SlaMetricsCalculatorTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Dashboard/SlaMetricsCalculator.php tests/Unit/
  git commit -m "feat(dashboard): add SlaMetricsCalculator for compliance §14 / D-03"
  ```

---

### Task 4: `TicketTrendQuery`

**Files:**
- Create: `app/Services/Dashboard/TicketTrendQuery.php`
- Create: `tests/Unit/TicketTrendQueryTest.php`

**Interfaces:**
- `TicketTrendQuery::daily(Builder $ticketQuery, DashboardDateRange $range): array` — array `[['date' => 'YYYY-MM-DD', 'created' => int, 'resolved' => int], ...]` untuk setiap hari dalam rentang, termasuk hari dengan 0 created & 0 resolved.

**Detail:**

```php
class TicketTrendQuery
{
    public function __construct(
        protected DashboardQueryService $queryService,
    ) {}

    public function daily(Builder $ticketQuery, DashboardDateRange $range): array
    {
        $bucket = $this->queryService->dateBucket('created_at');
        $resolvedBucket = $this->queryService->dateBucket('resolved_at');

        // Created counts per day
        $created = (clone $ticketQuery)
            ->selectRaw("{$bucket} as date, COUNT(*) as count")
            ->whereBetween('created_at', [$range->fromUtc, $range->toUtc])
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date')
            ->toArray();

        // Resolved counts per day
        $resolved = (clone $ticketQuery)
            ->whereNotNull('resolved_at')
            ->selectRaw("{$resolvedBucket} as date, COUNT(*) as count")
            ->whereBetween('resolved_at', [$range->fromUtc, $range->toUtc])
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('count', 'date')
            ->toArray();

        // Fill all days in range
        $current = $range->fromUtc->setTimezone('Asia/Jakarta')->startOfDay();
        $end = $range->toUtc->setTimezone('Asia/Jakarta')->startOfDay();
        $result = [];
        while ($current->lte($end)) {
            $date = $current->format('Y-m-d');
            $result[] = [
                'date' => $date,
                'created' => (int) ($created[$date] ?? 0),
                'resolved' => (int) ($resolved[$date] ?? 0),
            ];
            $current = $current->addDay();
        }
        return $result;
    }
}
```

> **Jebakan:** `pluck(count, date)` — urutan parameter `pluck($value, $key)`. GroupBy `date` dengan alias `date`; SQLite mengembalikan alias tanpa masalah. Pastikan `$range->toUtc` dikonversi ke WIB untuk iterasi perbandingan `$current->lte($end)`.

- [ ] **Step 1: Test — created & resolved counts per day, all days filled.**
  ```php
  uses(RefreshDatabase::class);

  beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

  test('daily returns all days in range with correct counts', function () {
      $range = DashboardDateRange::fromDates('2026-08-01', '2026-08-03');
      // 2 tickets created 2026-08-01, 1 resolved 2026-08-02
      Ticket::factory()->count(2)->create(['created_at' => '2026-08-01 10:00:00']);
      Ticket::factory()->resolved()->create([
          'created_at' => '2026-08-02 08:00:00',
          'resolved_at' => '2026-08-02 14:00:00',
      ]);

      $query = app(TicketTrendQuery::class);
      $trend = $query->daily(Ticket::query(), $range);

      expect($trend)->toHaveCount(3); // 3 days
      expect($trend[0])->toMatchArray(['date' => '2026-08-01', 'created' => 2, 'resolved' => 0]);
      expect($trend[1])->toMatchArray(['date' => '2026-08-02', 'created' => 1, 'resolved' => 1]);
      expect($trend[2])->toMatchArray(['date' => '2026-08-03', 'created' => 0, 'resolved' => 0]);
  });
  ```

- [ ] **Step 2: Implementasi `TicketTrendQuery`** — sesuai kode di atas.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Unit/TicketTrendQueryTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Dashboard/TicketTrendQuery.php tests/Unit/
  git commit -m "feat(dashboard): add TicketTrendQuery for daily buckets"
  ```

---

### Task 5: `TechnicianPerformanceQuery`

**Files:**
- Create: `app/Services/Dashboard/TechnicianPerformanceQuery.php`
- Create: `tests/Unit/TechnicianPerformanceQueryTest.php`

**Interfaces:**
- `TechnicianPerformanceQuery::forRole(Builder $ticketQuery, DashboardDateRange $range): array` — array `[['technician' => ['id' => int, 'full_name' => string], 'handled' => int, 'resolved' => int, 'open' => int, 'breached' => int, 'avg_resolution_minutes' => ?int, 'sla_compliance_percentage' => ?float], ...]` — urut `resolved DESC`.

**Detail:**

```php
class TechnicianPerformanceQuery
{
    public function __construct(
        protected DashboardQueryService $queryService,
    ) {}

    public function forRole(Builder $ticketQuery, DashboardDateRange $range): array
    {
        $diff = $this->queryService->minutesDiff('created_at', 'resolved_at');

        // Base: tickets with a technician assigned
        $base = (clone $ticketQuery)->whereNotNull('technician_id');

        // Resolved metrics per technician (resolved within range)
        $resolvedStats = (clone $base)
            ->whereNotNull('resolved_at')
            ->whereBetween('resolved_at', [$range->fromUtc, $range->toUtc])
            ->selectRaw("
                technician_id,
                COUNT(*) as resolved,
                SUM(CASE WHEN resolved_at <= sla_deadline THEN 1 ELSE 0 END) as within_sla,
                ROUND(AVG({$diff})) as avg_minutes
            ")
            ->groupBy('technician_id')
            ->get()
            ->keyBy('technician_id');

        // Open counts per technician (current snapshot, no range)
        $open = (clone $base)
            ->whereHas('status', fn ($q) => $q->where('is_closed', false))
            ->selectRaw('technician_id, COUNT(*) as open_count')
            ->groupBy('technician_id')
            ->pluck('open_count', 'technician_id');

        // Breached (defensive) per technician — current snapshot, open only
        $breached = (clone $base)
            ->whereHas('status', fn ($q) => $q->where('is_closed', false))
            ->where(function ($q) {
                $q->where('sla_breached', true)
                    ->orWhere(function ($sub) {
                        $sub->whereNotNull('sla_deadline')
                            ->where('sla_deadline', '<', now());
                    });
            })
            ->selectRaw('technician_id, COUNT(*) as breached_count')
            ->groupBy('technician_id')
            ->pluck('breached_count', 'technician_id');

        // Handled = current technician_id ticket count (all statuses)
        $handled = (clone $base)
            ->selectRaw('technician_id, COUNT(*) as total')
            ->groupBy('technician_id')
            ->pluck('total', 'technician_id');

        // Build result
        $techIds = collect($handled->keys())
            ->merge($resolvedStats->keys())
            ->unique()
            ->sort();

        $users = User::whereIn('id', $techIds)->pluck('full_name', 'id');

        $result = [];
        foreach ($techIds as $techId) {
            $res = $resolvedStats->get($techId);
            $totalResolved = $res ? (int) $res->resolved : 0;
            $withinSla = $res ? (int) $res->within_sla : 0;
            $compliance = $totalResolved > 0
                ? round(($withinSla / $totalResolved) * 100, 1)
                : null;

            $result[] = [
                'technician' => [
                    'id' => (int) $techId,
                    'full_name' => $users->get($techId) ?? 'Unknown',
                ],
                'handled' => (int) ($handled->get($techId) ?? 0),
                'resolved' => $totalResolved,
                'open' => (int) ($open->get($techId) ?? 0),
                'breached' => (int) ($breached->get($techId) ?? 0),
                'avg_resolution_minutes' => $res?->avg_minutes ?? null,
                'sla_compliance_percentage' => $compliance,
            ];
        }

        // Sort resolved DESC
        usort($result, fn ($a, $b) => $b['resolved'] <=> $a['resolved']);

        return $result;
    }
}
```

> **Jebakan:** `SUM(CASE WHEN ...)` adalah sintaks SQL lintas-driver (MySQL & SQLite mendukung). Pastikan `CASE WHEN resolved_at <= sla_deadline THEN 1 ELSE 0 END` — operator `<=` membandingkan dua kolom timestamp, driver-agnostic. Urutan hasil: `resolved DESC` (keputusan #16). `$resolvedStats` di-key `technician_id` untuk lookup cepat.

- [ ] **Step 1: Test — dua teknisi dengan data terkontrol, zero-resolved → null compliance.**
  ```php
  uses(RefreshDatabase::class);

  beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

  test('technician performance returns correct metrics per technician', function () {
      $range = DashboardDateRange::fromDates('2026-01-01', '2026-12-31');
      $tech1 = User::factory()->technician()->create(['full_name' => 'Budi']);
      $tech2 = User::factory()->technician()->create(['full_name' => 'Citra']);

      // Tech1: 2 resolved (1 within, 1 late), 1 open, 1 breached
      Ticket::factory()->resolved()->create([
          'technician_id' => $tech1->id, 'created_at' => '2026-06-01 08:00:00',
          'resolved_at' => '2026-06-01 10:00:00', 'sla_deadline' => '2026-06-01 12:00:00',
      ]);
      Ticket::factory()->resolved()->create([
          'technician_id' => $tech1->id, 'created_at' => '2026-06-01 08:00:00',
          'resolved_at' => '2026-06-02 10:00:00', 'sla_deadline' => '2026-06-01 12:00:00',
      ]);
      Ticket::factory()->open()->create(['technician_id' => $tech1->id]);

      // Tech2: 0 resolved, 1 open
      Ticket::factory()->open()->create(['technician_id' => $tech2->id]);

      $query = app(TechnicianPerformanceQuery::class);
      $result = $query->forRole(Ticket::query(), $range);

      expect($result)->toHaveCount(2);
      expect($result[0]['technician']['full_name'])->toBe('Budi');
      expect($result[0]['handled'])->toBe(3);
      expect($result[0]['resolved'])->toBe(2);
      expect($result[0]['sla_compliance_percentage'])->toBe(50.0);
      expect($result[1]['resolved'])->toBe(0);
      expect($result[1]['sla_compliance_percentage'])->toBeNull();
  });
  ```

- [ ] **Step 2: Implementasi `TechnicianPerformanceQuery`** — sesuai kode di atas.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Unit/TechnicianPerformanceQueryTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Dashboard/TechnicianPerformanceQuery.php tests/Unit/
  git commit -m "feat(dashboard): add TechnicianPerformanceQuery for §21 table"
  ```

---

### Task 6: `DashboardCountsQuery`

**Files:**
- Create: `app/Services/Dashboard/DashboardCountsQuery.php`
- Create: `tests/Unit/DashboardCountsQueryTest.php`

**Interfaces:**

Method helper untuk menghitung counts:

```php
class DashboardCountsQuery
{
    public function countTickets(Builder $query, DashboardDateRange $range): int
    {
        return (clone $query)->whereBetween('created_at', [$range->fromUtc, $range->toUtc])->count();
    }

    public function countClosed(Builder $query): int
    {
        return (clone $query)
            ->whereHas('status', fn ($q) => $q->where('is_final', true))
            ->count();
    }

    public function countOpenByStatus(Builder $query, int $statusId): int
    {
        return (clone $query)->where('status_id', $statusId)->count();
    }

    public function countOpenTickets(Builder $query): int
    {
        return (clone $query)->whereHas('status', fn ($q) => $q->where('is_closed', false))->count();
    }

    public function countByPriority(Builder $query, DashboardDateRange $range): array
    {
        return (clone $query)
            ->whereBetween('created_at', [$range->fromUtc, $range->toUtc])
            ->join('ticket_priorities', 'tickets.priority_id', '=', 'ticket_priorities.id')
            ->selectRaw('ticket_priorities.name as priority, COUNT(*) as count')
            ->groupBy('ticket_priorities.name', 'ticket_priorities.id')
            ->orderBy('ticket_priorities.id')
            ->get()
            ->map(fn ($row) => ['priority' => $row->priority, 'count' => (int) $row->count])
            ->toArray();
    }

    public function countByCategory(Builder $query, DashboardDateRange $range): array
    {
        return (clone $query)
            ->whereBetween('created_at', [$range->fromUtc, $range->toUtc])
            ->join('ticket_categories', 'tickets.category_id', '=', 'ticket_categories.id')
            ->selectRaw('ticket_categories.name as category, COUNT(*) as count')
            ->groupBy('ticket_categories.name', 'ticket_categories.id')
            ->orderBy('ticket_categories.id')
            ->get()
            ->map(fn ($row) => ['category' => $row->category, 'count' => (int) $row->count])
            ->toArray();
    }
}
```

> **Jebakan:** `countByPriority` dan `countByCategory` memakai `join` — pastikan tidak ada nama kolom ambigu (`id`). GroupBy di SQLite mewajibkan semua kolom yang bukan agregat di GROUP BY — `ticket_priorities.id` dan `ticket_priorities.name` keduanya di-GROUP BY agar aman. `orderBy('ticket_priorities.id')` menjamin urutan deterministik (Critical → High → Medium → Low).

- [ ] **Step 1: Test — countByPriority, countByCategory, counts per role.**
  ```php
  uses(RefreshDatabase::class);

  beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

  test('countByPriority returns all priorities with correct counts', function () {
      $range = DashboardDateRange::fromDates('2026-01-01', '2026-12-31');
      Ticket::factory()->count(2)->create(['priority_id' => 1]); // Critical
      Ticket::factory()->count(3)->create(['priority_id' => 2]); // High

      $query = app(DashboardCountsQuery::class);
      $result = $query->countByPriority(Ticket::query(), $range);

      expect($result)->toHaveCount(2)
          ->and($result[0]['priority'])->toBe('Critical')
          ->and($result[0]['count'])->toBe(2);
  });

  test('countByCategory returns categories with counts', function () {
      $range = DashboardDateRange::fromDates('2026-01-01', '2026-12-31');
      Ticket::factory()->count(4)->create(['category_id' => TicketCategory::first()->id]);

      $query = app(DashboardCountsQuery::class);
      $result = $query->countByCategory(Ticket::query(), $range);
      expect($result)->toBeArray();
  });

  test('countOpenByStatus counts only the specified status', function () {
      Ticket::factory()->open()->create(); // status 1
      Ticket::factory()->assigned()->create(); // status 2
      Ticket::factory()->inProgress()->create(); // status 3

      $query = app(DashboardCountsQuery::class);
      expect($query->countOpenByStatus(Ticket::query(), 1))->toBe(1)
          ->and($query->countOpenByStatus(Ticket::query(), 2))->toBe(1)
          ->and($query->countOpenByStatus(Ticket::query(), 3))->toBe(1);
  });
  ```

- [ ] **Step 2: Implementasi `DashboardCountsQuery`** — sesuai kode di atas.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Unit/DashboardCountsQueryTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Dashboard/DashboardCountsQuery.php tests/Unit/
  git commit -m "feat(dashboard): add DashboardCountsQuery for aggregate counts"
  ```

---

## Exit Criteria 6a

- [ ] `DashboardDateRange` — default 30 hari; parse dari/form `Y-m-d`; WIB→UTC; applyToCreated/Resolved.
- [ ] `IndexDashboardRequest` — validasi `date_from`/`date_to` format `Y-m-d`; pesan error Indonesia.
- [ ] `DashboardQueryService` — `dateBucket()` & `minutesDiff()` menghasilkan SQL driver-aware; `avgResolutionMinutes` mengembalikan null bila set kosong.
- [ ] `SlaMetricsCalculator` — `resolvedMetrics` output cocok hitung manual; ticket cancel keluar; compliance null bila 0 resolved.
- [ ] `TicketTrendQuery` — bucket harian WIB; semua hari dalam rentang terisi, termasuk nol; created & resolved per hari.
- [ ] `TechnicianPerformanceQuery` — handled/resolved/open/breached/avg/compliance per teknisi; urut resolved DESC; null compliance bila 0 resolved.
- [ ] `DashboardCountsQuery` — countByPriority, countByCategory mencakup join ke tabel referensi; countOpenByStatus akurat.
- [ ] `php artisan test` hijau (semua unit test baru); `vendor/bin/pint --test` bersih.
- [ ] Tidak ada HTTP endpoint baru di fase ini — semua pengujian via unit test.