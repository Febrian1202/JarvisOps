<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('assignable users returns active users with limited fields', function () {
    User::factory()->employee()->create(['full_name' => 'Andi Pratama']);
    User::factory()->technician()->create(['full_name' => 'Budi Santoso']);

    $tech = User::factory()->technician()->create();
    Sanctum::actingAs($tech);

    $response = $this->getJson('/api/users/assignable');
    $response->assertStatus(200);
    $response->assertJsonStructure([
        'data' => [['id', 'full_name', 'department']],
    ]);
});

test('assignable users returns only active users', function () {
    User::factory()->employee()->create(['full_name' => 'Active User', 'status' => 'active']);
    User::factory()->employee()->create(['full_name' => 'Inactive User', 'status' => 'inactive']);

    $tech = User::factory()->technician()->create(['status' => 'active']);
    Sanctum::actingAs($tech);

    $response = $this->getJson('/api/users/assignable');
    $response->assertStatus(200);
    // There are 2 active users: Active User and $tech
    $response->assertJsonCount(2, 'data');
});

test('assignable users supports search', function () {
    User::factory()->employee()->create(['full_name' => 'Andi Pratama']);
    User::factory()->employee()->create(['full_name' => 'Budi Santoso']);

    $tech = User::factory()->technician()->create();
    Sanctum::actingAs($tech);

    $response = $this->getJson('/api/users/assignable?search=andi');
    $response->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.full_name', 'Andi Pratama');
});

test('employee cannot access assignable users', function () {
    $emp = User::factory()->employee()->create();
    Sanctum::actingAs($emp);
    $this->getJson('/api/users/assignable')->assertStatus(403);
});
