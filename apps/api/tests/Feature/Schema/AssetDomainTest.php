<?php

use App\Enums\AssetStatus;
use App\Enums\RoleName;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetHistory;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('asset domain models and relations work properly', function () {
    $role = Role::create(['name' => RoleName::Employee->value]);
    $user = User::create([
        'role_id' => $role->id,
        'email' => 'asset.user@jarvisops.test',
        'password' => 'secret123',
        'full_name' => 'Asset User',
    ]);

    $asset = Asset::create([
        'asset_tag' => 'AST-001',
        'name' => 'MacBook Pro M3',
        'category' => 'Laptop',
        'brand' => 'Apple',
        'model' => 'MacBook Pro 14',
        'serial_number' => 'SN123456789',
        'purchase_date' => '2026-01-15',
        'status' => AssetStatus::Available,
    ]);

    $assignment = AssetAssignment::create([
        'asset_id' => $asset->id,
        'user_id' => $user->id,
        'assigned_at' => now(),
    ]);

    $history = AssetHistory::create([
        'asset_id' => $asset->id,
        'action' => 'ASSIGNED',
        'description' => 'Assigned to Asset User',
        'action_at' => now(),
    ]);

    expect($asset->status)->toBe(AssetStatus::Available)
        ->and($asset->assignments)->toHaveCount(1)
        ->and($asset->assignments->first()->user->id)->toBe($user->id)
        ->and($asset->histories)->toHaveCount(1)
        ->and($asset->histories->first()->action)->toBe('ASSIGNED')
        ->and($assignment->asset->id)->toBe($asset->id)
        ->and($history->asset->id)->toBe($asset->id);
});
