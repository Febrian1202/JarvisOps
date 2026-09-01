<?php

use Illuminate\Support\Facades\DB;

it('reports service healthy when the database is connected', function () {
    $response = $this->getJson('/api/health');

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Service healthy.',
            'data' => [
                'status' => 'ok',
                'db' => 'connected',
            ],
        ]);

    $data = $response->json('data');
    expect($data)
        ->toHaveKey('timestamp')
        ->and($data['timestamp'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/');
});

it('returns 503 when the database is unavailable', function () {
    DB::shouldReceive('connection->getPdo')->andThrow(new RuntimeException('Connection refused'));

    $this->getJson('/api/health')
        ->assertStatus(503)
        ->assertExactJson([
            'success' => false,
            'message' => 'Database unavailable.',
            'errors' => null,
        ]);
});
