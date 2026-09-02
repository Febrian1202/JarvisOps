<?php

use App\Models\Ticket;
use App\Models\User;
use App\Services\Dashboard\DashboardDateRange;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('manager dashboard returns all metrics matching manual calculation', function () {
    $manager = User::factory()->manager()->create();
    $range = DashboardDateRange::fromDates('2026-01-01', '2026-12-31');

    // 2 resolved within SLA + 1 resolved late = 3 resolved
    Ticket::factory()->resolved()->create([
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);
    Ticket::factory()->resolved()->create([
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 11:00:00',
        'sla_deadline' => '2026-06-01 14:00:00',
    ]);
    Ticket::factory()->resolved()->create([
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-02 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);
    Ticket::factory()->open()->create(['created_at' => '2026-06-01 09:00:00']);
    Ticket::factory()->closed()->create([
        'created_at' => '2026-06-01 09:00:00',
        'resolved_at' => null,
        'closed_at' => now(),
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

test('manager dashboard without date params defaults to 30 days', function () {
    $manager = User::factory()->manager()->create();
    // ticket dibuat hari ini (dalam 30 hari) → masuk default
    Ticket::factory()->open()->create(['created_at' => now()->subDays(2)]);

    Sanctum::actingAs($manager);
    $response = $this->getJson('/api/dashboard/manager');
    $response->assertStatus(200)
        ->assertJsonPath('data.total_tickets', 1);
});

test('sla metrics and trend respect the date range', function () {
    $manager = User::factory()->manager()->create();

    Ticket::factory()->resolved()->create([
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);
    Ticket::factory()->resolved()->create([
        'created_at' => '2026-07-15 08:00:00',
        'resolved_at' => '2026-07-15 10:00:00',
        'sla_deadline' => '2026-07-15 12:00:00',
    ]);

    Sanctum::actingAs($manager);
    $response = $this->getJson('/api/dashboard/manager?date_from=2026-06-01&date_to=2026-06-30');

    $response->assertStatus(200)
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

test('manager dashboard includes technician performance sorted by resolved desc', function () {
    $manager = User::factory()->manager()->create();
    $tech1 = User::factory()->technician()->create(['full_name' => 'Budi']);
    $tech2 = User::factory()->technician()->create(['full_name' => 'Citra']);

    Ticket::factory()->resolved()->create([
        'technician_id' => $tech1->id,
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);
    Ticket::factory()->resolved()->create([
        'technician_id' => $tech1->id,
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 11:00:00',
        'sla_deadline' => '2026-06-01 14:00:00',
    ]);
    Ticket::factory()->resolved()->create([
        'technician_id' => $tech2->id,
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);

    Sanctum::actingAs($manager);
    $response = $this->getJson('/api/dashboard/manager?date_from=2026-01-01&date_to=2026-12-31');
    $perf = $response->json('data.technician_performance');

    expect($perf)->toHaveCount(2)
        ->and($perf[0]['technician']['full_name'])->toBe('Budi')   // resolved 2 > Citra 1
        ->and($perf[0]['resolved'])->toBe(2)
        ->and($perf[0]['sla_compliance_percentage'])->toEqual(100.0)
        ->and($perf[1]['resolved'])->toBe(1);
});
