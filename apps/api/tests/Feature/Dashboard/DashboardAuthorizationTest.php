<?php

use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('dashboard endpoints require authentication', function () {
    $this->getJson('/api/dashboard/employee')->assertStatus(401);
    $this->getJson('/api/dashboard/technician')->assertStatus(401);
    $this->getJson('/api/dashboard/manager')->assertStatus(401);
    $this->getJson('/api/dashboard/admin')->assertStatus(401);
});

test('employee dashboard returns 200 for all roles', function () {
    $employee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    Sanctum::actingAs($employee);
    $this->getJson('/api/dashboard/employee')->assertStatus(200);

    Sanctum::actingAs($technician);
    $this->getJson('/api/dashboard/employee')->assertStatus(200);

    Sanctum::actingAs($manager);
    $this->getJson('/api/dashboard/employee')->assertStatus(200);

    Sanctum::actingAs($admin);
    $this->getJson('/api/dashboard/employee')->assertStatus(200);
});

test('technician dashboard: technician, manager, admin ok, employee 403', function () {
    $employee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    Sanctum::actingAs($technician);
    $this->getJson('/api/dashboard/technician')->assertStatus(200);

    Sanctum::actingAs($manager);
    $this->getJson('/api/dashboard/technician')->assertStatus(200);

    Sanctum::actingAs($admin);
    $this->getJson('/api/dashboard/technician')->assertStatus(200);

    Sanctum::actingAs($employee);
    $this->getJson('/api/dashboard/technician')->assertStatus(403);
});
