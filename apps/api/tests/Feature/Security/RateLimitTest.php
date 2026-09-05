<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('ticket list endpoint enforces search rate limiter at 60 requests per minute', function () {
    $user = User::factory()->employee()->create();
    Sanctum::actingAs($user);

    for ($i = 0; $i < 60; $i++) {
        $response = $this->getJson('/api/tickets?search=printer');
        $response->assertStatus(200);
    }

    $response = $this->getJson('/api/tickets?search=printer');
    $response->assertStatus(429);
});

test('article list endpoint enforces search rate limiter', function () {
    $user = User::factory()->employee()->create();
    Sanctum::actingAs($user);

    for ($i = 0; $i < 60; $i++) {
        $response = $this->getJson('/api/articles?search=guide');
        $response->assertStatus(200);
    }

    $response = $this->getJson('/api/articles?search=guide');
    $response->assertStatus(429);
});

test('asset list endpoint enforces search rate limiter', function () {
    $user = User::factory()->technician()->create();
    Sanctum::actingAs($user);

    for ($i = 0; $i < 60; $i++) {
        $response = $this->getJson('/api/assets?search=laptop');
        $response->assertStatus(200);
    }

    $response = $this->getJson('/api/assets?search=laptop');
    $response->assertStatus(429);
});
