<?php

use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('manager dashboard returns unassigned open tickets count', function () {
    $manager = User::factory()->manager()->create();
    Ticket::factory()->open()->create(['technician_id' => null]);             // 1 -> counted
    Ticket::factory()->open()->create();                                       // 2 -> counted (open + null)
    Ticket::factory()->assigned()->create();                                   // not counted: assigned
    Ticket::factory()->inProgress()->create(['technician_id' => null]);        // not counted: already in progress (processed)
    Ticket::factory()->resolved()->create(['technician_id' => null]);          // not counted: resolved
    Ticket::factory()->closed()->create(['technician_id' => null]);            // not counted: closed

    Sanctum::actingAs($manager);
    $this->getJson('/api/dashboard/manager')
        ->assertStatus(200)
        ->assertJsonPath('data.unassigned_tickets', 2);
});

test('unassigned_tickets ignores the date range like open snapshot', function () {
    $manager = User::factory()->manager()->create();
    Ticket::factory()->open()->create([
        'technician_id' => null,
        'created_at' => now()->subDays(60), // outside default 30 days but still open
    ]);

    Sanctum::actingAs($manager);
    $this->getJson('/api/dashboard/manager') // default 30 days
        ->assertStatus(200)
        ->assertJsonPath('data.unassigned_tickets', 1);
});
