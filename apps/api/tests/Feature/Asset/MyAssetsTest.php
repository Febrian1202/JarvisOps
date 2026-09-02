<?php

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('employee sees only own active assets', function () {
    $employee = User::factory()->employee()->create();
    $otherEmployee = User::factory()->employee()->create();

    $ownAsset = Asset::factory()->assigned()->create(['name' => 'Own Laptop']);
    AssetAssignment::factory()->create([
        'asset_id' => $ownAsset->id,
        'user_id' => $employee->id,
        'released_at' => null,
    ]);

    $pastAsset = Asset::factory()->available()->create(['name' => 'Past Asset']);
    AssetAssignment::factory()->create([
        'asset_id' => $pastAsset->id,
        'user_id' => $employee->id,
        'released_at' => now()->subDay(),
    ]);

    $otherAsset = Asset::factory()->assigned()->create(['name' => 'Other Laptop']);
    AssetAssignment::factory()->create([
        'asset_id' => $otherAsset->id,
        'user_id' => $otherEmployee->id,
        'released_at' => null,
    ]);

    Sanctum::actingAs($employee);

    $response = $this->getJson('/api/my-assets')
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $ownAsset->id)
        ->assertJsonPath('data.0.name', 'Own Laptop');
});

test('my-assets endpoint supports pagination', function () {
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs($employee);

    Asset::factory()->count(5)->create()->each(function ($asset) use ($employee) {
        AssetAssignment::factory()->create([
            'asset_id' => $asset->id,
            'user_id' => $employee->id,
            'released_at' => null,
        ]);
    });

    $this->getJson('/api/my-assets?per_page=2')
        ->assertStatus(200)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.per_page', 2)
        ->assertJsonPath('meta.total', 5);
});
