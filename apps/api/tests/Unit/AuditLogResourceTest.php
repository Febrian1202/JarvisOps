<?php

use App\Http\Resources\Audit\AuditLogDetailResource;
use App\Http\Resources\Audit\AuditLogListResource;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('AuditLogListResource excludes old_data, new_data, and user_agent', function () {
    $user = User::factory()->manager()->create(['full_name' => 'Manager Dewi']);
    $log = AuditLog::factory()->create([
        'user_id' => $user->id,
        'action' => 'assign',
        'module' => 'ticket',
        'module_id' => 12,
        'description' => 'Menugaskan tiket TCK-0012 kepada Budi',
        'old_data' => ['technician_id' => null],
        'new_data' => ['technician_id' => 5],
        'ip_address' => '10.0.0.5',
        'user_agent' => 'Mozilla/5.0',
    ]);

    $list = (new AuditLogListResource($log))->resolve();
    expect($list)->toHaveKeys(['id', 'user', 'action', 'module', 'module_id', 'description', 'ip_address', 'created_at'])
        ->and($list)->not->toHaveKeys(['old_data', 'new_data', 'user_agent'])
        ->and($list['user']['full_name'])->toBe('Manager Dewi');

    $detail = (new AuditLogDetailResource($log))->resolve();
    expect($detail)->toHaveKeys(['id', 'user', 'action', 'module', 'module_id', 'description', 'old_data', 'new_data', 'ip_address', 'user_agent', 'created_at'])
        ->and($detail['old_data'])->toBe(['technician_id' => null])
        ->and($detail['user_agent'])->toBe('Mozilla/5.0');
});

test('Audit resources handle null user gracefully for system events', function () {
    $log = AuditLog::factory()->create([
        'user_id' => null,
        'action' => 'sla_breach',
        'module' => 'ticket',
    ]);

    $list = (new AuditLogListResource($log))->resolve();
    expect($list['user'])->toBeNull();
});
