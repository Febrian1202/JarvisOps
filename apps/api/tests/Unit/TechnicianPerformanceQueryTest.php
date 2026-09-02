<?php

use App\Models\Ticket;
use App\Models\User;
use App\Services\Dashboard\DashboardDateRange;
use App\Services\Dashboard\TechnicianPerformanceQuery;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('technician performance returns correct metrics per technician', function () {
    $range = DashboardDateRange::fromDates('2026-01-01', '2026-12-31');
    $tech1 = User::factory()->technician()->create(['full_name' => 'Budi']);
    $tech2 = User::factory()->technician()->create(['full_name' => 'Citra']);

    // Tech1: 2 resolved (1 within, 1 late), 1 open
    Ticket::factory()->resolved()->create([
        'technician_id' => $tech1->id,
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);
    Ticket::factory()->resolved()->create([
        'technician_id' => $tech1->id,
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-02 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);
    Ticket::factory()->open()->create(['technician_id' => $tech1->id]);

    // Tech2: 0 resolved, 1 open
    Ticket::factory()->open()->create(['technician_id' => $tech2->id]);

    $query = app(TechnicianPerformanceQuery::class);
    $result = $query->forRole(Ticket::query(), $range);

    expect($result)->toHaveCount(2)
        ->and($result[0]['technician']['full_name'])->toBe('Budi')
        ->and($result[0]['handled'])->toBe(3)
        ->and($result[0]['resolved'])->toBe(2)
        ->and($result[0]['sla_compliance_percentage'])->toBe(50.0)
        ->and($result[1]['resolved'])->toBe(0)
        ->and($result[1]['sla_compliance_percentage'])->toBeNull();
});
