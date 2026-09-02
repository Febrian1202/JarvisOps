<?php

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

uses()->group('ticket');

test('ticket categories list returns all 22 categories', function () {
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs($employee);

    $this->getJson('/api/ticket-categories')
        ->assertStatus(200)
        ->assertJsonCount(22, 'data');
});

test('ticket priorities list returns 4 priorities with sla_minutes', function () {
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs($employee);

    $response = $this->getJson('/api/ticket-priorities')
        ->assertStatus(200)
        ->assertJsonCount(4, 'data');

    $response->assertJsonStructure([
        'data' => [
            '*' => ['id', 'name', 'sla_minutes'],
        ],
    ]);
    expect($response->json('data.0'))->toHaveKeys(['id', 'name', 'sla_minutes']);
});

test('ticket statuses list is GET-only', function () {
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs($employee);

    $this->getJson('/api/ticket-statuses')
        ->assertStatus(200)
        ->assertJsonCount(5, 'data');

    $this->postJson('/api/ticket-statuses', [])
        ->assertStatus(405);
});

test('technicians list returns only active technicians', function () {
    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $technicianRoleId = Role::where('name', RoleName::Technician->value)->first()->id;

    $activeTechnician = User::factory()->create([
        'role_id' => $technicianRoleId,
        'status' => UserStatus::Active->value,
        'full_name' => 'Active Tech',
    ]);

    User::factory()->create([
        'role_id' => $technicianRoleId,
        'status' => UserStatus::Inactive->value,
        'full_name' => 'Inactive Tech',
    ]);

    User::factory()->employee()->create([
        'full_name' => 'Regular Employee',
    ]);

    $this->getJson('/api/technicians')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $activeTechnician->id)
        ->assertJsonPath('data.0.full_name', 'Active Tech');
});

test('employee cannot access technicians list', function () {
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs($employee);

    $this->getJson('/api/technicians')
        ->assertStatus(403);
});
