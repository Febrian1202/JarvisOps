<?php

use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('technician dashboard returns own metrics and ignores technician_id param', function () {
    $tech = User::factory()->technician()->create();
    $other = User::factory()->technician()->create();

    Ticket::factory()->inProgress()->create(['technician_id' => $tech->id]);
    Ticket::factory()->inProgress()->create(['technician_id' => $tech->id]);
    Ticket::factory()->resolved()->create(['technician_id' => $tech->id]);
    // Data milik teknisi lain
    Ticket::factory()->inProgress()->create(['technician_id' => $other->id]);

    Sanctum::actingAs($tech);
    $response = $this->getJson('/api/dashboard/technician?technician_id='.$other->id);

    $response->assertStatus(200)
        ->assertJsonPath('data.in_progress_tickets', 2)
        ->assertJsonPath('data.assigned_tickets', 2);
});

test('open_tickets counts global OPEN queue', function () {
    $tech = User::factory()->technician()->create();
    Ticket::factory()->open()->create(); // antrean OPEN, belum di-assign
    Ticket::factory()->open()->create(['technician_id' => $tech->id]);

    Sanctum::actingAs($tech);
    $response = $this->getJson('/api/dashboard/technician');
    $response->assertStatus(200)
        ->assertJsonPath('data.open_tickets', 2);
});

test('sla_breached counts defensive breach on own open tickets', function () {
    $tech = User::factory()->technician()->create();
    // Breach: deadline lewat, masih is_closed = false
    Ticket::factory()->create([
        'technician_id' => $tech->id,
        'status_id' => 3, // IN_PROGRESS
        'sla_deadline' => now()->subHour(),
        'sla_breached' => false,
    ]);
    // Resolved on time — tidak breach
    Ticket::factory()->resolved()->create([
        'technician_id' => $tech->id,
        'resolved_at' => now()->subMinutes(30),
    ]);

    Sanctum::actingAs($tech);
    $response = $this->getJson('/api/dashboard/technician');
    $response->assertStatus(200)
        ->assertJsonPath('data.sla_breached', 1);
});

test('avg_resolution_minutes null when technician has no resolved tickets', function () {
    $tech = User::factory()->technician()->create();
    Ticket::factory()->inProgress()->create(['technician_id' => $tech->id]);

    Sanctum::actingAs($tech);
    $response = $this->getJson('/api/dashboard/technician');
    $response->assertStatus(200)
        ->assertJsonPath('data.avg_resolution_minutes', null);
});

test('technician dashboard query count is constant under data growth', function () {
    $tech = User::factory()->technician()->create();
    Ticket::factory()->count(10)->inProgress()->create(['technician_id' => $tech->id]);

    Sanctum::actingAs($tech);
    DB::enableQueryLog();
    $this->getJson('/api/dashboard/technician')->assertStatus(200);
    $countBaseline = count(DB::getQueryLog());
    DB::disableQueryLog();

    Ticket::factory()->count(20)->inProgress()->create(['technician_id' => $tech->id]);

    DB::flushQueryLog();
    DB::enableQueryLog();
    $this->getJson('/api/dashboard/technician')->assertStatus(200);
    $countGrowth = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect($countGrowth)->toBeLessThanOrEqual($countBaseline);
});
