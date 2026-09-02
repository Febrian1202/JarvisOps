<?php

use App\Models\Ticket;
use App\Services\Dashboard\DashboardDateRange;
use App\Services\Dashboard\TicketTrendQuery;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('daily returns all days in range with correct counts', function () {
    $range = DashboardDateRange::fromDates('2026-08-01', '2026-08-03');

    // 2 tickets created 2026-08-01 WIB (e.g. 10:00:00 WIB = 03:00:00 UTC)
    Ticket::factory()->count(2)->create([
        'created_at' => '2026-08-01 03:00:00',
    ]);

    // 1 ticket created 2026-08-02 WIB, resolved 2026-08-02 WIB
    Ticket::factory()->resolved()->create([
        'created_at' => '2026-08-02 01:00:00',
        'resolved_at' => '2026-08-02 07:00:00',
    ]);

    $query = app(TicketTrendQuery::class);
    $trend = $query->daily(Ticket::query(), $range);

    expect($trend)->toHaveCount(3)
        ->and($trend[0])->toMatchArray(['date' => '2026-08-01', 'created' => 2, 'resolved' => 0])
        ->and($trend[1])->toMatchArray(['date' => '2026-08-02', 'created' => 1, 'resolved' => 1])
        ->and($trend[2])->toMatchArray(['date' => '2026-08-03', 'created' => 0, 'resolved' => 0]);
});
