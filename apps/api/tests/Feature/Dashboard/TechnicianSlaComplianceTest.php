<?php

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
