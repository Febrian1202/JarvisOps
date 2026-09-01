<?php

use App\Authorization\AbilityMatrix;
use App\Enums\RoleName;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

test('gate allows abilities according to the matrix for every role', function () {
    $admin = User::factory()->admin()->create();
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();
    $employee = User::factory()->employee()->create();

    $users = [
        RoleName::Admin->value => $admin,
        RoleName::Manager->value => $manager,
        RoleName::Technician->value => $technician,
        RoleName::Employee->value => $employee,
    ];

    $abilities = AbilityMatrix::getRoleAbilities();

    foreach ($abilities as $ability => $roles) {
        foreach ($users as $roleName => $user) {
            $expected = in_array(RoleName::tryFrom($roleName), $roles, true);
            expect(Gate::forUser($user)->allows($ability))->toBe($expected);
        }
    }
});

test('admin cannot deactivate or delete own account', function () {
    $admin = User::factory()->admin()->create();
    $other = User::factory()->admin()->create();

    expect(Gate::forUser($admin)->allows('user.deactivate', $admin))->toBeFalse();
    expect(Gate::forUser($admin)->allows('user.deactivate', $other))->toBeTrue();
    expect(Gate::forUser($admin)->allows('user.delete', $admin))->toBeFalse();
    expect(Gate::forUser($admin)->allows('user.delete', $other))->toBeTrue();
});

test('admin cannot read another users notification', function () {
    $admin = User::factory()->admin()->create();
    $other = User::factory()->employee()->create();

    $ownNotification = Notification::factory()->create(['user_id' => $admin->id]);
    $otherNotification = Notification::factory()->create(['user_id' => $other->id]);

    expect(Gate::forUser($admin)->allows('notification.markAsRead', $ownNotification))->toBeTrue();
    expect(Gate::forUser($admin)->allows('notification.markAsRead', $otherNotification))->toBeFalse();
});
