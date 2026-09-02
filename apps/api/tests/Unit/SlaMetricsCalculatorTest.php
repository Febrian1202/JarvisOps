<?php

use App\Models\Ticket;
use App\Services\Dashboard\DashboardDateRange;
use App\Services\Dashboard\SlaMetricsCalculator;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('resolvedMetrics matches manual calculation', function () {
    $range = DashboardDateRange::fromDates('2026-01-01', '2026-12-31');

    Ticket::factory()->resolved()->create([
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);
    Ticket::factory()->resolved()->create([
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-02 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);
    Ticket::factory()->resolved()->create([
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 11:00:00',
        'sla_deadline' => '2026-06-01 14:00:00',
    ]);
    Ticket::factory()->closed()->create([
        'resolved_at' => null,
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);

    $calculator = app(SlaMetricsCalculator::class);
    $result = $calculator->resolvedMetrics(Ticket::query(), $range);

    expect($result['within_sla'])->toBe(2)
        ->and($result['breached'])->toBe(1)
        ->and($result['compliance_percentage'])->toBe(66.7)
        ->and($result['avg_resolution_minutes'])->toBeGreaterThan(0);
});

test('resolvedMetrics returns null compliance when no resolved tickets', function () {
    $range = DashboardDateRange::fromDates('2026-01-01', '2026-12-31');
    $calculator = app(SlaMetricsCalculator::class);
    $result = $calculator->resolvedMetrics(Ticket::query(), $range);

    expect($result['compliance_percentage'])->toBeNull()
        ->and($result['avg_resolution_minutes'])->toBeNull()
        ->and($result['within_sla'])->toBe(0)
        ->and($result['breached'])->toBe(0);
});
