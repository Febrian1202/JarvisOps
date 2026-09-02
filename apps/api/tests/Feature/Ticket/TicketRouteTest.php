<?php

use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

uses()->group('ticket', 'route');

beforeEach(function () {
    $this->employee = User::factory()->employee()->create();
    Sanctum::actingAs($this->employee);
});

test('ticket index route is registered', function () {
    $this->getJson('/api/tickets')->assertStatus(200);
});

test('assignable returns only assets assigned to current user', function () {
    $otherUser = User::factory()->employee()->create();

    $myAsset = Asset::factory()->create(['status' => AssetStatus::Assigned]);
    AssetAssignment::factory()->create([
        'asset_id' => $myAsset->id,
        'user_id' => $this->employee->id,
        'released_at' => null,
    ]);

    $otherAsset = Asset::factory()->create(['status' => AssetStatus::Assigned]);
    AssetAssignment::factory()->create([
        'asset_id' => $otherAsset->id,
        'user_id' => $otherUser->id,
        'released_at' => null,
    ]);

    $this->getJson('/api/assets/assignable')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $myAsset->id);
});

test('assignable excludes retired and lost assets', function () {
    $retiredAsset = Asset::factory()->create(['status' => AssetStatus::Retired]);
    AssetAssignment::factory()->create([
        'asset_id' => $retiredAsset->id,
        'user_id' => $this->employee->id,
        'released_at' => null,
    ]);

    $this->getJson('/api/assets/assignable')
        ->assertStatus(200)
        ->assertJsonCount(0, 'data');
});
