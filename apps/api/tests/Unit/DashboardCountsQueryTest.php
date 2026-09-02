<?php

use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Services\Dashboard\DashboardCountsQuery;
use App\Services\Dashboard\DashboardDateRange;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

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
    $cat = TicketCategory::first();
    Ticket::factory()->count(4)->create(['category_id' => $cat->id]);

    $query = app(DashboardCountsQuery::class);
    $result = $query->countByCategory(Ticket::query(), $range);

    expect($result)->toBeArray()
        ->and($result[0]['category'])->toBe($cat->name)
        ->and($result[0]['count'])->toBe(4);
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
