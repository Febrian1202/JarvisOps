<?php

use App\Models\Asset;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('admin dashboard extends manager metrics with system counts', function () {
    $admin = User::factory()->admin()->create();

    User::factory()->count(3)->technician()->create();
    Asset::factory()->count(2)->create();
    AuditLog::factory()->count(2)->create(['user_id' => $admin->id, 'module' => 'ticket', 'action' => 'create']);

    Sanctum::actingAs($admin);
    $response = $this->getJson('/api/dashboard/admin');

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonStructure([
            'data' => [
                'total_users', 'total_technicians', 'total_departments', 'total_assets',
                'assets_by_status', 'recent_system_activity',
                // Manager fields
                'total_tickets', 'open_tickets', 'resolved_tickets', 'closed_tickets',
                'sla', 'ticket_trend', 'by_priority', 'by_category', 'technician_performance',
            ],
        ])
        ->assertJsonPath('data.total_users', 4)
        ->assertJsonPath('data.total_technicians', 3)
        ->assertJsonPath('data.total_assets', 2)
        ->assertJsonCount(2, 'data.recent_system_activity');
});

test('admin dashboard system activity shows all modules', function () {
    $admin = User::factory()->admin()->create();
    AuditLog::factory()->create(['user_id' => $admin->id, 'module' => 'user', 'action' => 'create']);
    AuditLog::factory()->create(['user_id' => $admin->id, 'module' => 'auth', 'action' => 'login']);

    Sanctum::actingAs($admin);
    $response = $this->getJson('/api/dashboard/admin');
    $activity = $response->json('data.recent_system_activity');
    expect($activity)->toHaveCount(2);
});

test('admin dashboard includes manager sla metrics', function () {
    $admin = User::factory()->admin()->create();
    Ticket::factory()->resolved()->create([
        'created_at' => '2026-06-01 08:00:00',
        'resolved_at' => '2026-06-01 10:00:00',
        'sla_deadline' => '2026-06-01 12:00:00',
    ]);

    Sanctum::actingAs($admin);
    $response = $this->getJson('/api/dashboard/admin?date_from=2026-01-01&date_to=2026-12-31');
    $response->assertStatus(200);
    expect($response->json('data.sla.compliance_percentage'))->toEqual(100.0);
});
