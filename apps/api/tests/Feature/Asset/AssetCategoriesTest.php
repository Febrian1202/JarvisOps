<?php

use App\Models\Asset;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('asset categories endpoint returns distinct categories', function () {
    Asset::factory()->create(['category' => 'Laptop']);
    Asset::factory()->create(['category' => 'Monitor']);
    Asset::factory()->create(['category' => 'Laptop']); // duplicate

    $user = User::factory()->technician()->create();
    Sanctum::actingAs($user);

    $response = $this->getJson('/api/assets/categories');
    $response->assertStatus(200)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0', 'Laptop')
        ->assertJsonPath('data.1', 'Monitor');
});

test('asset categories requires asset.viewAny', function () {
    $emp = User::factory()->employee()->create();
    Sanctum::actingAs($emp);
    $this->getJson('/api/assets/categories')->assertStatus(403);
});
