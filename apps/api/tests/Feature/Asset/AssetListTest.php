<?php

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('employee cannot list assets', function () {
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs($employee);

    $this->getJson('/api/assets')->assertStatus(403);
});

test('manager and technician can list assets', function () {
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();

    Sanctum::actingAs($manager);
    $this->getJson('/api/assets')->assertStatus(200);

    Sanctum::actingAs($technician);
    $this->getJson('/api/assets')->assertStatus(200);
});

test('search matches asset_tag, serial_number, and name', function () {
    $manager = User::factory()->manager()->create();
    Asset::factory()->create(['asset_tag' => 'AST-X1-001', 'name' => 'ThinkPad', 'serial_number' => 'SN-X1']);
    Asset::factory()->create(['asset_tag' => 'AST-Y2-002', 'name' => 'MacBook Pro', 'serial_number' => 'SN-Y2']);

    Sanctum::actingAs($manager);

    $this->getJson('/api/assets?search=X1')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.asset_tag', 'AST-X1-001');

    $this->getJson('/api/assets?search=MacBook')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'MacBook Pro');

    $this->getJson('/api/assets?search=SN-Y2')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.serial_number', 'SN-Y2');
});

test('filter by status maintenance', function () {
    $manager = User::factory()->manager()->create();
    Asset::factory()->maintenance()->create();
    Asset::factory()->available()->create();

    Sanctum::actingAs($manager);

    $this->getJson('/api/assets?status=maintenance')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'maintenance');
});

test('filter by category', function () {
    $manager = User::factory()->manager()->create();
    Asset::factory()->create(['category' => 'Laptop']);
    Asset::factory()->create(['category' => 'Monitor']);

    Sanctum::actingAs($manager);

    $this->getJson('/api/assets?category=Laptop')
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.category', 'Laptop');
});

test('filter by assigned_user_id', function () {
    $manager = User::factory()->manager()->create();
    $user = User::factory()->employee()->create();
    $otherUser = User::factory()->employee()->create();

    $asset1 = Asset::factory()->assigned()->create();
    AssetAssignment::factory()->create(['asset_id' => $asset1->id, 'user_id' => $user->id, 'released_at' => null]);

    $asset2 = Asset::factory()->assigned()->create();
    AssetAssignment::factory()->create(['asset_id' => $asset2->id, 'user_id' => $otherUser->id, 'released_at' => null]);

    Sanctum::actingAs($manager);

    $this->getJson('/api/assets?assigned_user_id='.$user->id)
        ->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $asset1->id);
});

test('invalid sort_by returns 422', function () {
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->getJson('/api/assets?sort_by=password')->assertStatus(422)
        ->assertJsonValidationErrors('sort_by');
});

test('meta has six keys and no links', function () {
    Sanctum::actingAs(User::factory()->manager()->create());
    Asset::factory()->count(15)->create();

    $response = $this->getJson('/api/assets?per_page=5')
        ->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'message',
            'data',
            'meta' => ['current_page', 'per_page', 'total', 'last_page', 'from', 'to'],
        ]);

    expect($response->json('meta'))->not->toHaveKey('links');
});

test('asset list query count does not grow with volume', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    Asset::factory()->count(2)->create()->each(function ($asset) {
        $user = User::factory()->employee()->create();
        AssetAssignment::factory()->create(['asset_id' => $asset->id, 'user_id' => $user->id, 'released_at' => null]);
    });

    $active = false;
    $queries1 = [];
    $queries2 = [];
    $phase = 1;

    DB::listen(function ($query) use (&$queries1, &$queries2, &$phase, &$active) {
        if (! $active) {
            return;
        }
        if ($phase === 1) {
            $queries1[] = $query->sql;
        } else {
            $queries2[] = $query->sql;
        }
    });

    $active = true;
    $this->getJson('/api/assets');
    $active = false;

    Asset::factory()->count(10)->create()->each(function ($asset) {
        $user = User::factory()->employee()->create();
        AssetAssignment::factory()->create(['asset_id' => $asset->id, 'user_id' => $user->id, 'released_at' => null]);
    });

    $phase = 2;
    $active = true;
    $this->getJson('/api/assets');
    $active = false;

    // The query count should not grow linearly with the number of assets.
    expect(count($queries1))->toBeGreaterThan(0)
        ->and(count($queries2))->toBeLessThanOrEqual(count($queries1) + 1);
});
