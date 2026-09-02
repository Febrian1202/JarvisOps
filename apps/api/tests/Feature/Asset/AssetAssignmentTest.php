<?php

use App\Enums\AssetHistoryAction;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetHistory;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('cannot assign maintenance asset', function () {
    $asset = Asset::factory()->maintenance()->create();
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs(User::factory()->manager()->create());

    $this->postJson("/api/assets/{$asset->id}/assign", [
        'user_id' => $employee->id,
    ])->assertStatus(422)
        ->assertJsonValidationErrors('status');
});

test('cannot assign retired or lost asset', function () {
    $retired = Asset::factory()->retired()->create();
    $lost = Asset::factory()->lost()->create();
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs(User::factory()->manager()->create());

    $this->postJson("/api/assets/{$retired->id}/assign", ['user_id' => $employee->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('status');

    $this->postJson("/api/assets/{$lost->id}/assign", ['user_id' => $employee->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('status');
});

test('cannot assign asset with active assignment', function () {
    $asset = Asset::factory()->assigned()->create();
    $user1 = User::factory()->employee()->create();
    $user2 = User::factory()->employee()->create();
    AssetAssignment::factory()->create(['asset_id' => $asset->id, 'user_id' => $user1->id, 'released_at' => null]);

    Sanctum::actingAs(User::factory()->manager()->create());

    $this->postJson("/api/assets/{$asset->id}/assign", [
        'user_id' => $user2->id,
    ])->assertStatus(409);
});

test('cannot assign to non-existent or inactive user', function () {
    $asset = Asset::factory()->available()->create();
    $inactive = User::factory()->inactive()->create();
    Sanctum::actingAs(User::factory()->manager()->create());

    $this->postJson("/api/assets/{$asset->id}/assign", [
        'user_id' => 99999,
    ])->assertStatus(422)
        ->assertJsonValidationErrors('user_id');

    $this->postJson("/api/assets/{$asset->id}/assign", [
        'user_id' => $inactive->id,
    ])->assertStatus(422)
        ->assertJsonValidationErrors('user_id');
});

test('assign marks asset assigned and records history and audit', function () {
    $manager = User::factory()->manager()->create();
    $employee = User::factory()->employee()->create();
    $asset = Asset::factory()->available()->create();

    Sanctum::actingAs($manager);

    $this->postJson("/api/assets/{$asset->id}/assign", [
        'user_id' => $employee->id,
        'notes' => 'Unit baru untuk karyawan baru',
    ])->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.status', 'assigned');

    expect(AssetHistory::where('asset_id', $asset->id)->where('action', AssetHistoryAction::Assigned->value)->count())->toBe(1);
    expect(AssetAssignment::where('asset_id', $asset->id)->where('user_id', $employee->id)->whereNull('released_at')->count())->toBe(1);
    expect(AuditLog::where('module_id', $asset->id)->where('module', 'asset')->where('action', 'assign')->count())->toBe(1);
});

test('release returns asset to available and records history and audit', function () {
    $asset = Asset::factory()->assigned()->create();
    $employee = User::factory()->employee()->create();
    $assignment = AssetAssignment::factory()->create([
        'asset_id' => $asset->id,
        'user_id' => $employee->id,
        'released_at' => null,
    ]);

    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $this->postJson("/api/assets/{$asset->id}/release", [
        'notes' => 'Dikembalikan dalam kondisi baik',
    ])->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.status', 'available');

    expect($assignment->fresh()->released_at)->not->toBeNull();
    expect($asset->fresh()->status->value)->toBe('available');
    expect(AssetHistory::where('asset_id', $asset->id)->where('action', AssetHistoryAction::Released->value)->count())->toBe(1);
    expect(AuditLog::where('module_id', $asset->id)->where('module', 'asset')->where('action', 'release')->count())->toBe(1);
});

test('release without active assignment returns 409', function () {
    $asset = Asset::factory()->available()->create();
    Sanctum::actingAs(User::factory()->manager()->create());

    $this->postJson("/api/assets/{$asset->id}/release", [])
        ->assertStatus(409);
});
