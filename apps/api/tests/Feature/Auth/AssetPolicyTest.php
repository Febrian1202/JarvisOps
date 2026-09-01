<?php

use App\Models\Asset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

test('viewAssignable and viewOwn are allowed for any authenticated user', function () {
    $employee = User::factory()->employee()->create();

    expect(Gate::forUser($employee)->allows('viewAssignable', Asset::class))->toBeTrue();
    expect(Gate::forUser($employee)->allows('viewOwn', Asset::class))->toBeTrue();
});

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
