<?php

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('manager and technician can view asset detail with assignment and specifications', function () {
    $asset = Asset::factory()->create([
        'asset_tag' => 'AST-DETAIL-001',
        'name' => 'Dell Latitude 7420',
        'category' => 'Laptop',
        'brand' => 'Dell',
        'model' => 'Latitude 7420',
        'serial_number' => 'SN-DELL-7420',
        'purchase_date' => '2024-01-15',
        'status' => 'assigned',
        'notes' => 'Catatan khusus unit',
    ]);

    $employee = User::factory()->employee()->create(['full_name' => 'Budi Santoso']);
    AssetAssignment::factory()->create([
        'asset_id' => $asset->id,
        'user_id' => $employee->id,
        'assigned_at' => now()->subDays(10),
        'released_at' => null,
    ]);

    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $this->getJson("/api/assets/{$asset->id}")
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.id', $asset->id)
        ->assertJsonPath('data.asset_tag', 'AST-DETAIL-001')
        ->assertJsonPath('data.brand', 'Dell')
        ->assertJsonPath('data.model', 'Latitude 7420')
        ->assertJsonPath('data.serial_number', 'SN-DELL-7420')
        ->assertJsonPath('data.notes', 'Catatan khusus unit')
        ->assertJsonPath('data.current_assignment.user_id', $employee->id)
        ->assertJsonPath('data.current_assignment.full_name', 'Budi Santoso');
});

test('employee cannot view asset detail', function () {
    $asset = Asset::factory()->create();
    $employee = User::factory()->employee()->create();

    Sanctum::actingAs($employee);
    $this->getJson("/api/assets/{$asset->id}")
        ->assertStatus(403);
});
