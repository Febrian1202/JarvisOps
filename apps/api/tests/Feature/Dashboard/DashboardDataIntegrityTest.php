<?php

use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('within_sla plus breached equals total resolved', function () {
    $manager = User::factory()->manager()->create();
    $tech = User::factory()->technician()->create();

    Ticket::factory()->resolved()->create([
        'technician_id' => $tech->id,
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);
    Ticket::factory()->resolved()->create([
        'technician_id' => $tech->id,
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-02 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
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

    DB::disableQueryLog();
    Ticket::factory()->count(40)->open()->create();
    Ticket::factory()->count(10)->resolved()->create();
    DB::enableQueryLog();
    $this->getJson('/api/dashboard/manager')->assertStatus(200);
    $growth = count(DB::getQueryLog());

    expect($growth)->toBeLessThanOrEqual($base);
});
