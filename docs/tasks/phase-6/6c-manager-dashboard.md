# Fase 6c — Dashboard Manager (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini membangun endpoint dashboard terberat — agregasi SLA, tren, distribusi, dan performa technician — di atas kernel 6a.

**Goal:** Mengimplementasikan `GET /api/dashboard/manager` selengkap payload API-CONTRACT §10: `total/open/resolved/closed_tickets`, objek `sla{}` (within_sla, breached, compliance §14/D-03, avg_resolution), `ticket_trend[]` (bucket harian WIB), `by_priority[]` & `by_category[]`, dan `technician_performance[]` (§21). Semua agregasi di SQL, konsisten dengan hitungan manual.

**Branch:** `feat/phase-6c-manager-dashboard`
**Estimasi Waktu:** ~1.0 hari (5 task)
**Prasyarat:** 6a & 6b selesai (kernel, controller, route). `PendingDashboardException` dari 6b dihapus untuk method manager.

---

### Task 1: `ManagerDashboardService`

**Files:**
- Create: `app/Services/Dashboard/ManagerDashboardService.php`
- Modify: `app/Http/Controllers/Dashboard/DashboardController.php`
- Create: `tests/Feature/Dashboard/ManagerDashboardTest.php`

**Interfaces:**
- `ManagerDashboardService::get(User $actor, DashboardDateRange $range): array` — payload API-CONTRACT §10:
  ```php
  [
      'total_tickets' => int,
      'open_tickets' => int,
      'resolved_tickets' => int,
      'closed_tickets' => int,
      'sla' => [
          'within_sla' => int,
          'breached' => int,
          'compliance_percentage' => ?float,
          'avg_resolution_minutes' => ?int,
      ],
      'ticket_trend' => [['date' => 'Y-m-d', 'created' => int, 'resolved' => int]],
      'by_priority' => [['priority' => string, 'count' => int]],
      'by_category' => [['category' => string, 'count' => int]],
      'technician_performance' => [],
  ]
  ```

**Detail:**

```php
class ManagerDashboardService
{
    public function __construct(
        protected DashboardCountsQuery $countsQuery,
        protected SlaMetricsCalculator $slaMetrics,
        protected TicketTrendQuery $trendQuery,
        protected TechnicianPerformanceQuery $performanceQuery,
    ) {}

    public function get(User $actor, DashboardDateRange $range): array
    {
        // Manager melihat seluruh ticket (PERMISSION §3.2 viewAny = semua)
        $tickets = Ticket::query();

        // `total_resolved` dipakai kalkulator internal (konsistensi test), dibuang sebelum payload
        $sla = $this->slaMetrics->resolvedMetrics(clone $tickets, $range);
        unset($sla['total_resolved']);

        return [
            'total_tickets' => $this->countsQuery->countTickets(clone $tickets, $range),
            'open_tickets' => $this->countsQuery->countOpenTickets(clone $tickets), // is_closed = false, snapshot
            'resolved_tickets' => $range->applyToResolved(clone $tickets)->count(), // resolved_at dalam rentang
            'closed_tickets' => $this->countsQuery->countClosed(clone $tickets), // is_final, snapshot
            'sla' => $sla,
            'ticket_trend' => $this->trendQuery->daily(clone $tickets, $range),
            'by_priority' => $this->countsQuery->countByPriority(clone $tickets, $range),
            'by_category' => $this->countsQuery->countByCategory(clone $tickets, $range),
            'technician_performance' => $this->performanceQuery->forRole(clone $tickets, $range),
        ];
    }
}
```

> **Jebakan:**
> - **Metrik snapshot vs rentang (keputusan #6):** `open_tickets` (is_closed=false, snapshot) & `closed_tickets` (is_final, snapshot) tidak terfilter rentang — menggambarkan kondisi saat ini. `total_tickets`, `by_*`, `ticket_trend` terfilter ke `created_at`. `resolved_tickets` & `sla{}` terfilter ke `resolved_at` — sehingga `within_sla + breached = resolved_tickets` selalu konsisten.
> - Setiap metrik memakai `clone $tickets` — **jangan** memakai query yang sama tanpa clone (mengubah state builder).
> - `sla` dihitung dari `resolvedMetrics` yang sudah menerapkan rentang `resolved_at` (keputusan #6).

- [ ] **Step 1: Test — payload manager lengkap, angka sesuai hitungan manual.**
  ```php
  uses(RefreshDatabase::class);

  beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

  test('manager dashboard returns all metrics matching manual calculation', function () {
      $manager = User::factory()->manager()->create();
      $range = DashboardDateRange::fromDates('2026-01-01', '2026-12-31');

      // 2 resolved within SLA + 1 resolved late = 3 resolved
      Ticket::factory()->resolved()->create([
          'created_at' => '2026-06-01 08:00:00', 'resolved_at' => '2026-06-01 10:00:00',
          'sla_deadline' => '2026-06-01 12:00:00',
      ]);
      Ticket::factory()->resolved()->create([
          'created_at' => '2026-06-01 08:00:00', 'resolved_at' => '2026-06-01 11:00:00',
          'sla_deadline' => '2026-06-01 14:00:00',
      ]);
      Ticket::factory()->resolved()->create([
          'created_at' => '2026-06-01 08:00:00', 'resolved_at' => '2026-06-02 10:00:00',
          'sla_deadline' => '2026-06-01 12:00:00',
      ]);
      Ticket::factory()->open()->create(['created_at' => '2026-06-01 09:00:00']);
      Ticket::factory()->closed()->create([
          'created_at' => '2026-06-01 09:00:00', 'resolved_at' => null, 'closed_at' => now(),
      ]);

      Sanctum::actingAs($manager);
      $response = $this->getJson('/api/dashboard/manager?date_from=2026-01-01&date_to=2026-12-31');

      $response->assertStatus(200)
          ->assertJsonPath('success', true)
          ->assertJsonPath('data.total_tickets', 5)
          ->assertJsonPath('data.open_tickets', 1)      // hanya 1 status is_closed=false
          ->assertJsonPath('data.resolved_tickets', 3)  // resolved_at not null
          ->assertJsonPath('data.sla.within_sla', 2)
          ->assertJsonPath('data.sla.breached', 1)
          ->assertJsonPath('data.sla.compliance_percentage', 66.7)
          ->assertJsonStructure(['data' => ['ticket_trend', 'by_priority', 'by_category', 'technician_performance']]);
  });

  test('manager dashboard compliance is null when no resolved tickets', function () {
      $manager = User::factory()->manager()->create();
      Ticket::factory()->open()->create();

      Sanctum::actingAs($manager);
      $response = $this->getJson('/api/dashboard/manager');
      $response->assertStatus(200)
          ->assertJsonPath('data.sla.compliance_percentage', null)
          ->assertJsonPath('data.sla.avg_resolution_minutes', null);
  });
  ```

- [ ] **Step 2: Implementasi `ManagerDashboardService`** — hapus `PendingDashboardException` untuk method manager di controller, injeksi service.

- [ ] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/ManagerDashboardTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Dashboard/ManagerDashboardService.php app/Http/Controllers/Dashboard/ tests/Feature/Dashboard/
  git commit -m "feat(dashboard): implement manager dashboard with SLA, trend, and distributions"
  ```

---

### Task 2: Otorisasi Manager + Rentang Tanggal Default

**Files:**
- Modify: `tests/Feature/Dashboard/DashboardAuthorizationTest.php`
- Modify: `tests/Feature/Dashboard/ManagerDashboardTest.php`

**Detail:**
Pastikan gate `dashboard.manager` (Manager/Admin) benar: Employee & Technician → 403. Juga pastikan `date_from`/`date_to` kosong → default 30 hari (tidak error).

- [ ] **Step 1: Test — matriks role untuk manager; default range.**
  ```php
  test('manager dashboard: manager and admin ok, employee and technician 403', function () {
      $manager = User::factory()->manager()->create();
      $admin = User::factory()->admin()->create();
      $employee = User::factory()->employee()->create();
      $technician = User::factory()->technician()->create();

      Sanctum::actingAs($manager);
      $this->getJson('/api/dashboard/manager')->assertStatus(200);

      Sanctum::actingAs($admin);
      $this->getJson('/api/dashboard/manager')->assertStatus(200);

      Sanctum::actingAs($employee);
      $this->getJson('/api/dashboard/manager')->assertStatus(403);

      Sanctum::actingAs($technician);
      $this->getJson('/api/dashboard/manager')->assertStatus(403);
  });

  test('manager dashboard without date params defaults to 30 days', function () {
      $manager = User::factory()->manager()->create();
      // ticket dibuat hari ini (dalam 30 hari) → masuk default
      Ticket::factory()->open()->create(['created_at' => now()->subDays(2)]);

      Sanctum::actingAs($manager);
      $response = $this->getJson('/api/dashboard/manager');
      $response->assertStatus(200)
          ->assertJsonPath('data.total_tickets', 1);
  });
  ```

- [ ] **Step 2: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Dashboard/
  git commit -m "test(dashboard): assert manager gate matrix and default 30-day range"
  ```

---

### Task 3: Rentang Tanggal pada SLA Metrics & Trend

**Files:**
- Modify: `tests/Feature/Dashboard/ManagerDashboardTest.php`

**Detail:**
Verifikasi bahwa `date_from`/`date_to` membatasi: `resolvedMetrics` menghitung hanya resolved dalam rentang; `ticket_trend` hanya hari dalam rentang (dengan nol untuk hari kosong).

- [ ] **Step 1: Test — resolved di luar rentang tidak dihitung; trend mengisi semua hari.**
  ```php
  test('sla metrics and trend respect the date range', function () {
      $manager = User::factory()->manager()->create();

      // Resolved dalam rentang
      Ticket::factory()->resolved()->create([
          'created_at' => '2026-06-01 08:00:00', 'resolved_at' => '2026-06-01 10:00:00',
          'sla_deadline' => '2026-06-01 12:00:00',
      ]);
      // Resolved DI LUAR rentang (Juli) — tidak boleh dihitung
      Ticket::factory()->resolved()->create([
          'created_at' => '2026-07-15 08:00:00', 'resolved_at' => '2026-07-15 10:00:00',
          'sla_deadline' => '2026-07-15 12:00:00',
      ]);

      Sanctum::actingAs($manager);
      $response = $this->getJson('/api/dashboard/manager?date_from=2026-06-01&date_to=2026-06-30');

      $response->assertStatus(200)
          ->assertJsonPath('data.sla.within_sla', 1)
          // resolved_tickets & sla{} terfilter resolved_at dalam rentang → hanya ticket Juni
          ->assertJsonPath('data.resolved_tickets', 1)
          ->assertJsonPath('data.sla.within_sla', 1)
          ->assertJsonPath('data.sla.breached', 0);
  });

  test('trend fills every day in range including zeros', function () {
      $manager = User::factory()->manager()->create();
      Ticket::factory()->open()->create(['created_at' => '2026-06-01 10:00:00']);

      Sanctum::actingAs($manager);
      $response = $this->getJson('/api/dashboard/manager?date_from=2026-06-01&date_to=2026-06-03');
      $trend = $response->json('data.ticket_trend');

      expect($trend)->toHaveCount(3)
          ->and($trend[0]['date'])->toBe('2026-06-01')
          ->and($trend[0]['created'])->toBe(1)
          ->and($trend[2]['date'])->toBe('2026-06-03')
          ->and($trend[2]['created'])->toBe(0)
          ->and($trend[2]['resolved'])->toBe(0);
  });
  ```

- [ ] **Step 2: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/ManagerDashboardTest.php
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Dashboard/ManagerDashboardTest.php
  git commit -m "test(dashboard): verify manager dashboard respects date range and fills trend days"
  ```

---

### Task 4: Technician Performance di Manager Dashboard

**Files:**
- Modify: `tests/Feature/Dashboard/ManagerDashboardTest.php`

**Detail:**
Verifikasi `technician_performance[]` muncul di payload manager dengan field lengkap §21 dan urut `resolved DESC`.

- [ ] **Step 1: Test — performance array terisi, urut resolved desc, null compliance.**
  ```php
  test('manager dashboard includes technician performance sorted by resolved desc', function () {
      $manager = User::factory()->manager()->create();
      $tech1 = User::factory()->technician()->create(['full_name' => 'Budi']);
      $tech2 = User::factory()->technician()->create(['full_name' => 'Citra']);

      Ticket::factory()->resolved()->create([
          'technician_id' => $tech1->id, 'created_at' => '2026-06-01 08:00:00',
          'resolved_at' => '2026-06-01 10:00:00', 'sla_deadline' => '2026-06-01 12:00:00',
      ]);
      Ticket::factory()->resolved()->create([
          'technician_id' => $tech1->id, 'created_at' => '2026-06-01 08:00:00',
          'resolved_at' => '2026-06-01 11:00:00', 'sla_deadline' => '2026-06-01 14:00:00',
      ]);
      Ticket::factory()->resolved()->create([
          'technician_id' => $tech2->id, 'created_at' => '2026-06-01 08:00:00',
          'resolved_at' => '2026-06-01 10:00:00', 'sla_deadline' => '2026-06-01 12:00:00',
      ]);

      Sanctum::actingAs($manager);
      $response = $this->getJson('/api/dashboard/manager?date_from=2026-01-01&date_to=2026-12-31');
      $perf = $response->json('data.technician_performance');

      expect($perf)->toHaveCount(2)
          ->and($perf[0]['technician']['full_name'])->toBe('Budi')   // resolved 2 > Citra 1
          ->and($perf[0]['resolved'])->toBe(2)
          ->and($perf[0]['sla_compliance_percentage'])->toBe(100.0)
          ->and($perf[1]['resolved'])->toBe(1);
  });
  ```

- [ ] **Step 2: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/ManagerDashboardTest.php
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Dashboard/ManagerDashboardTest.php
  git commit -m "test(dashboard): verify technician performance table in manager dashboard"
  ```

---

### Task 5: Kebocoran Data & Integritas Angka

**Files:**
- Create: `tests/Feature/Dashboard/DashboardDataIntegrityTest.php`

**Detail:**
Verifikasi konsistensi `within_sla + breached = total resolved` (dari `resolvedMetrics`) dan tidak ada N+1 pada manager dashboard.

- [ ] **Step 1: Test — SLA konsistensi; query count stabil.**
  ```php
  test('within_sla plus breached equals total resolved', function () {
      $manager = User::factory()->manager()->create();
      $tech = User::factory()->technician()->create();

      Ticket::factory()->resolved()->create([
          'technician_id' => $tech->id, 'created_at' => '2026-06-01 08:00:00',
          'resolved_at' => '2026-06-01 10:00:00', 'sla_deadline' => '2026-06-01 12:00:00',
      ]);
      Ticket::factory()->resolved()->create([
          'technician_id' => $tech->id, 'created_at' => '2026-06-01 08:00:00',
          'resolved_at' => '2026-06-02 10:00:00', 'sla_deadline' => '2026-06-01 12:00:00',
      ]);

      Sanctum::actingAs($manager);
      $response = $this->getJson('/api/dashboard/manager?date_from=2026-01-01&date_to=2026-12-31');
      $sla = $response->json('data.sla');

      expect($sla['within_sla'] + $sla['breached'])->toBe($response->json('data.resolved_tickets'));
  });

  test('manager dashboard query count is constant under data growth', function () {
      $manager = User::factory()->manager()->create();
      Ticket::factory()->count(40)->open()->create();
      Ticket::factory()->count(10)->resolved()->create();

      DB::enableQueryLog();
      Sanctum::actingAs($manager);
      $this->getJson('/api/dashboard/manager')->assertStatus(200);
      $base = count(DB::getQueryLog());
      DB::flushQueryLog();

      Ticket::factory()->count(40)->open()->create();
      Ticket::factory()->count(10)->resolved()->create();
      DB::enableQueryLog();
      $this->getJson('/api/dashboard/manager')->assertStatus(200);
      $growth = count(DB::getQueryLog());

      expect($growth)->toBeLessThanOrEqual($base);
  });
  ```

- [ ] **Step 2: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Dashboard/DashboardDataIntegrityTest.php
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Dashboard/DashboardDataIntegrityTest.php
  git commit -m "test(dashboard): verify SLA consistency and constant query count for manager"
  ```

---

## Exit Criteria 6c

- [ ] `GET /api/dashboard/manager` — 401 tanpa token; 200 Manager/Admin; 403 Employee/Technician.
- [ ] Payload lengkap: `total/open/resolved/closed_tickets`, `sla{}`, `ticket_trend[]`, `by_priority[]`, `by_category[]`, `technician_performance[]`.
- [ ] `sla.compliance_percentage` persis §14/D-03; `null` bila tidak ada resolved; `within_sla + breached = resolved_tickets`.
- [ ] `avg_resolution_minutes` dari `created_at`→`resolved_at`; `null` bila tak ada resolved.
- [ ] `ticket_trend` bucket WIB, semua hari terisi termasuk nol; `date_from`/`date_to` membatasi metrik sesuai keputusan #6.
- [ ] `technician_performance` field lengkap §21, urut `resolved DESC`, `sla_compliance_percentage` null bila 0 resolved.
- [ ] Query count stabil saat volume data naik.
- [ ] `PendingDashboardException` untuk method manager sudah dihapus.
- [ ] `php artisan test` hijau; `vendor/bin/pint --test` bersih.
- [ ] Payload manager persis mengikuti `API-CONTRACT.md §10`.