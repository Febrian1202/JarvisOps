<?php

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('asset history merges assignments and history ordered by occurred_at', function () {
    $asset = Asset::factory()->create();
    $employee = User::factory()->employee()->create(['full_name' => 'Andi']);

    AssetHistory::factory()->create([
        'asset_id' => $asset->id,
        'action' => 'created',
        'description' => 'Aset dibuat.',
        'action_at' => now()->subDays(5),
    ]);

    AssetAssignment::factory()->create([
        'asset_id' => $asset->id,
        'user_id' => $employee->id,
        'assigned_at' => now()->subDays(3),
        'released_at' => now()->subDay(),
        'notes' => 'Catatan peminjaman',
    ]);

    AssetHistory::factory()->create([
        'asset_id' => $asset->id,
        'action' => 'released',
        'description' => 'Aset dilepaskan.',
        'action_at' => now()->subDay(),
    ]);

    Sanctum::actingAs(User::factory()->manager()->create());

    $response = $this->getJson("/api/assets/{$asset->id}/history")
        ->assertStatus(200)
        ->assertJsonPath('success', true);

    $types = collect($response->json('data'))->pluck('type')->all();
    expect($types)->toContain('assignment', 'history');

    $assignmentItem = collect($response->json('data'))->firstWhere('type', 'assignment');
    expect($assignmentItem)->toHaveKeys(['type', 'action', 'user', 'notes', 'occurred_at'])
        ->and($assignmentItem['user']['id'])->toBe($employee->id);
});

test('technician can view asset history', function () {
    $asset = Asset::factory()->create();
    $technician = User::factory()->technician()->create();

    Sanctum::actingAs($technician);
    $this->getJson("/api/assets/{$asset->id}/history")->assertStatus(200);
});

test('employee cannot view asset history', function () {
    $asset = Asset::factory()->create();
    $employee = User::factory()->employee()->create();

    Sanctum::actingAs($employee);
    $this->getJson("/api/assets/{$asset->id}/history")->assertStatus(403);
});
