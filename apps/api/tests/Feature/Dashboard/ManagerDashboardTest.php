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
