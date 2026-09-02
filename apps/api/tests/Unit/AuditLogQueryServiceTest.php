<?php

use App\Models\AuditLog;
use App\Models\User;
use App\Services\Audit\AuditLogQueryService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('manager is scoped to ticket, asset, and article modules only', function () {
    $manager = User::factory()->manager()->create();

    AuditLog::factory()->create(['module' => 'ticket']);
    AuditLog::factory()->create(['module' => 'asset']);
    AuditLog::factory()->create(['module' => 'article']);
    AuditLog::factory()->create(['module' => 'user']);
    AuditLog::factory()->create(['module' => 'auth']);

    $service = new AuditLogQueryService;
    $result = $service->paginate($manager, []);

    expect($result->total())->toBe(3);
});

test('manager filtering for forbidden module returns empty paginator', function () {
    $manager = User::factory()->manager()->create();
    AuditLog::factory()->create(['module' => 'user']);

    $service = new AuditLogQueryService;
    $result = $service->paginate($manager, ['module' => 'user']);

    expect($result->total())->toBe(0);
});

test('admin has full access to all audit log modules', function () {
    $admin = User::factory()->admin()->create();

    AuditLog::factory()->create(['module' => 'ticket']);
    AuditLog::factory()->create(['module' => 'user']);
    AuditLog::factory()->create(['module' => 'auth']);

    $service = new AuditLogQueryService;
    $result = $service->paginate($admin, []);

    expect($result->total())->toBe(3);
});

test('isVisibleTo returns true for manager on allowed modules and false for forbidden modules', function () {
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();
    $employee = User::factory()->employee()->create();

    $ticketLog = AuditLog::factory()->create(['module' => 'ticket']);
    $userLog = AuditLog::factory()->create(['module' => 'user']);

    $service = new AuditLogQueryService;

    expect($service->isVisibleTo($ticketLog, $admin))->toBeTrue()
        ->and($service->isVisibleTo($userLog, $admin))->toBeTrue()
        ->and($service->isVisibleTo($ticketLog, $manager))->toBeTrue()
        ->and($service->isVisibleTo($userLog, $manager))->toBeFalse()
        ->and($service->isVisibleTo($ticketLog, $employee))->toBeFalse();
});
