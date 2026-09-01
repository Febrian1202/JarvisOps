<?php

use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('log writes a row with all core fields', function () {
    $user = User::factory()->admin()->create();
    $logger = app(AuditLogger::class);

    $log = $logger->log(
        actor: $user,
        action: AuditAction::Create,
        module: AuditModule::Ticket,
        moduleId: 1,
        description: 'Ticket #TCK-0001 dibuat.'
    );

    expect($log->exists)->toBeTrue();
    expect($log->user_id)->toBe($user->id);
    expect($log->action)->toBe('create');
    expect($log->module)->toBe('ticket');
    expect($log->module_id)->toBe(1);
    expect($log->description)->toBe('Ticket #TCK-0001 dibuat.');
});

test('redaction strips sensitive blacklist keys from old_data and new_data', function () {
    $user = User::factory()->admin()->create();
    $logger = app(AuditLogger::class);

    $old = [
        'password' => 'secret123',
        'remember_token' => 'rem123',
        'token' => 'tok123',
        'secret' => 'sec123',
        'api_token' => 'api123',
        'email' => 'old@test.com',
    ];

    $new = [
        'password' => 'newpassword',
        'email' => 'new@test.com',
    ];

    $log = $logger->log(
        actor: $user,
        action: AuditAction::Update,
        module: AuditModule::User,
        moduleId: $user->id,
        description: 'User updated',
        oldData: $old,
        newData: $new
    );

    expect($log->old_data)->not->toHaveKey('password');
    expect($log->old_data)->not->toHaveKey('remember_token');
    expect($log->old_data)->not->toHaveKey('token');
    expect($log->old_data)->not->toHaveKey('secret');
    expect($log->old_data)->not->toHaveKey('api_token');
    expect($log->old_data)->toHaveKey('email');
    expect($log->old_data['email'])->toBe('old@test.com');

    expect($log->new_data)->not->toHaveKey('password');
    expect($log->new_data)->toHaveKey('email');
    expect($log->new_data['email'])->toBe('new@test.com');
});
