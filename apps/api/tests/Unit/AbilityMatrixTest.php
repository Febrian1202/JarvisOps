<?php

use App\Authorization\AbilityMatrix;
use App\Enums\RoleName;

test('getRoleAbilities returns a map of ability strings to valid RoleName arrays', function () {
    $abilities = AbilityMatrix::getRoleAbilities();

    expect($abilities)->toBeArray()
        ->and($abilities)->not->toBeEmpty();

    $validRoles = RoleName::cases();

    foreach ($abilities as $ability => $roles) {
        expect($ability)->toBeString();
        expect($roles)->toBeArray()->not->toBeEmpty();
        foreach ($roles as $role) {
            expect($role)->toBeInstanceOf(RoleName::class);
            expect(in_array($role, $validRoles, true))->toBeTrue();
        }
    }
});

dataset('roleForPermissions', [
    RoleName::Employee,
    RoleName::Technician,
    RoleName::Manager,
    RoleName::Admin,
]);

test('permissionsFor returns correct abilities for each role', function (RoleName $role) {
    $permissions = AbilityMatrix::permissionsFor($role);

    expect($permissions)->toBeArray();

    $allAbilities = AbilityMatrix::getRoleAbilities();

    foreach ($allAbilities as $ability => $roles) {
        $expected = in_array($role, $roles, true);
        $actual = in_array($ability, $permissions, true);

        expect($actual)->toBe($expected);
    }
})->with('roleForPermissions');

test('policyAbilities returns a list of ownership-dependent abilities pending Policy', function () {
    $policyAbilities = AbilityMatrix::getPolicyAbilities();

    expect($policyAbilities)->toBeArray()->not->toBeEmpty();

    foreach ($policyAbilities as $ability) {
        expect($ability)->toBeString();
    }

    $roleAbilities = AbilityMatrix::getRoleAbilities();
    $intersection = array_intersect($policyAbilities, array_keys($roleAbilities));
    expect($intersection)->toBeEmpty('Policy abilities should not overlap with role abilities');
});

test('adminGateExceptions returns a list of ability names excluded from admin Gate::before', function () {
    $exceptions = AbilityMatrix::adminGateExceptions();

    expect($exceptions)->toBeArray()->not->toBeEmpty();

    foreach ($exceptions as $ability) {
        expect($ability)->toBeString();
    }
});
