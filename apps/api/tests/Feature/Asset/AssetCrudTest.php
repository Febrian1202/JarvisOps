<?php

use App\Enums\AssetHistoryAction;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetHistory;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('manager can create asset and returns 201', function () {
    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $payload = [
        'asset_tag' => 'AST-NEW-001',
        'name' => 'New Device',
        'category' => 'Laptop',
        'brand' => 'Lenovo',
        'model' => 'X1 Carbon',
        'serial_number' => 'SN-NEW-001',
        'purchase_date' => '2025-03-15',
        'status' => 'available',
        'notes' => 'Catatan aset baru',
    ];

    $response = $this->postJson('/api/assets', $payload)
        ->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.asset_tag', 'AST-NEW-001')
        ->assertJsonPath('data.name', 'New Device')
        ->assertJsonPath('data.status', 'available');

    $assetId = $response->json('data.id');

    expect(AssetHistory::where('asset_id', $assetId)->where('action', AssetHistoryAction::Created->value)->count())->toBe(1);
    expect(AuditLog::where('module_id', $assetId)->where('module', 'asset')->where('action', 'create')->count())->toBe(1);
});

test('duplicate asset_tag and serial_number returns 422', function () {
    Asset::factory()->create([
        'asset_tag' => 'AST-DUP-001',
        'serial_number' => 'SN-DUP-001',
    ]);

    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $this->postJson('/api/assets', [
        'asset_tag' => 'AST-DUP-001',
        'name' => 'Duplicate Tag Device',
        'category' => 'Laptop',
        'brand' => 'Lenovo',
        'model' => 'X1',
        'serial_number' => 'SN-UNIQUE-001',
        'purchase_date' => '2025-03-15',
        'status' => 'available',
    ])->assertStatus(422)
        ->assertJsonValidationErrors('asset_tag');

    $this->postJson('/api/assets', [
        'asset_tag' => 'AST-UNIQUE-001',
        'name' => 'Duplicate SN Device',
        'category' => 'Laptop',
        'brand' => 'Lenovo',
        'model' => 'X1',
        'serial_number' => 'SN-DUP-001',
        'purchase_date' => '2025-03-15',
        'status' => 'available',
    ])->assertStatus(422)
        ->assertJsonValidationErrors('serial_number');
});

test('manager can update asset and status change records history and audit', function () {
    $asset = Asset::factory()->available()->create([
        'name' => 'Old Name',
    ]);

    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $payload = [
        'asset_tag' => $asset->asset_tag,
        'name' => 'Updated Name',
        'category' => $asset->category,
        'brand' => $asset->brand,
        'model' => $asset->model,
        'serial_number' => $asset->serial_number,
        'purchase_date' => $asset->purchase_date->format('Y-m-d'),
        'status' => 'maintenance',
        'notes' => 'Under maintenance',
    ];

    $this->putJson("/api/assets/{$asset->id}", $payload)
        ->assertStatus(200)
        ->assertJsonPath('data.name', 'Updated Name')
        ->assertJsonPath('data.status', 'maintenance');

    expect(AssetHistory::where('asset_id', $asset->id)->where('action', AssetHistoryAction::StatusChanged->value)->count())->toBe(1);
    expect(AuditLog::where('module_id', $asset->id)->where('module', 'asset')->where('action', 'update')->count())->toBe(1);
});

test('technician cannot delete asset', function () {
    $asset = Asset::factory()->create();
    $technician = User::factory()->technician()->create();

    Sanctum::actingAs($technician);
    $this->deleteJson("/api/assets/{$asset->id}")->assertStatus(403);
});

test('cannot delete asset with active assignment', function () {
    $asset = Asset::factory()->assigned()->create();
    $employee = User::factory()->employee()->create();
    AssetAssignment::factory()->create(['asset_id' => $asset->id, 'user_id' => $employee->id, 'released_at' => null]);

    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $this->deleteJson("/api/assets/{$asset->id}")
        ->assertStatus(409);
});

test('soft delete asset keeps ticket history intact', function () {
    $asset = Asset::factory()->create();
    $ticket = Ticket::factory()->create(['asset_id' => $asset->id]);

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/assets/{$asset->id}")
        ->assertStatus(200);

    expect(Asset::find($asset->id))->toBeNull();
    expect(Asset::withTrashed()->find($asset->id))->not->toBeNull();
    expect($ticket->fresh()->asset_id)->toBe($asset->id);
    expect(AuditLog::where('module_id', $asset->id)->where('module', 'asset')->where('action', 'delete')->count())->toBe(1);
});
