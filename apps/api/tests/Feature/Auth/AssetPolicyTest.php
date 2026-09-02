<?php

use App\Models\Asset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

test('view and viewAny allow technician manager admin but deny employee', function () {
    $employee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $asset = Asset::factory()->create();

    expect(Gate::forUser($technician)->allows('view', $asset))->toBeTrue();
    expect(Gate::forUser($manager)->allows('view', $asset))->toBeTrue();
    expect(Gate::forUser($admin)->allows('view', $asset))->toBeTrue();
    expect(Gate::forUser($employee)->allows('view', $asset))->toBeFalse();

    expect(Gate::forUser($technician)->allows('viewAny', Asset::class))->toBeTrue();
    expect(Gate::forUser($employee)->allows('viewAny', Asset::class))->toBeFalse();
});

test('viewAssignable and viewOwn are allowed for any authenticated user', function () {
    $employee = User::factory()->employee()->create();

    expect(Gate::forUser($employee)->allows('viewAssignable', Asset::class))->toBeTrue();
    expect(Gate::forUser($employee)->allows('viewOwn', Asset::class))->toBeTrue();
});

test('create update assign release viewHistory allow technician manager admin but deny employee', function () {
    $employee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $asset = Asset::factory()->create();

    expect(Gate::forUser($technician)->allows('create', Asset::class))->toBeTrue()
        ->and(Gate::forUser($manager)->allows('create', Asset::class))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('create', Asset::class))->toBeTrue()
        ->and(Gate::forUser($employee)->allows('create', Asset::class))->toBeFalse();

    expect(Gate::forUser($technician)->allows('update', $asset))->toBeTrue()
        ->and(Gate::forUser($manager)->allows('update', $asset))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('update', $asset))->toBeTrue()
        ->and(Gate::forUser($employee)->allows('update', $asset))->toBeFalse();

    expect(Gate::forUser($technician)->allows('assign', $asset))->toBeTrue()
        ->and(Gate::forUser($manager)->allows('assign', $asset))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('assign', $asset))->toBeTrue()
        ->and(Gate::forUser($employee)->allows('assign', $asset))->toBeFalse();

    expect(Gate::forUser($technician)->allows('release', $asset))->toBeTrue()
        ->and(Gate::forUser($manager)->allows('release', $asset))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('release', $asset))->toBeTrue()
        ->and(Gate::forUser($employee)->allows('release', $asset))->toBeFalse();

    expect(Gate::forUser($technician)->allows('viewHistory', $asset))->toBeTrue()
        ->and(Gate::forUser($manager)->allows('viewHistory', $asset))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('viewHistory', $asset))->toBeTrue()
        ->and(Gate::forUser($employee)->allows('viewHistory', $asset))->toBeFalse();
});

test('delete allows manager admin but denies technician and employee', function () {
    $employee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $asset = Asset::factory()->create();

    expect(Gate::forUser($technician)->allows('delete', $asset))->toBeFalse()
        ->and(Gate::forUser($employee)->allows('delete', $asset))->toBeFalse()
        ->and(Gate::forUser($manager)->allows('delete', $asset))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('delete', $asset))->toBeTrue();
});
