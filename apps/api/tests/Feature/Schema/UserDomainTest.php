<?php

use App\Enums\RoleName;
use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('user creation triggers observer to create employee profile automatically with format EMP-000X', function () {
    $role = Role::create([
        'name' => RoleName::Employee->value,
        'description' => 'Employee role',
    ]);

    $department = Department::create([
        'name' => 'IT Department',
        'description' => 'Information Technology',
    ]);

    $user = User::create([
        'role_id' => $role->id,
        'department_id' => $department->id,
        'email' => 'john.doe@jarvisops.test',
        'password' => 'Password123!',
        'full_name' => 'John Doe',
        'status' => 'active',
        'must_change_password' => false,
    ]);

    expect($user->role)->not->toBeNull()
        ->and($user->role->id)->toBe($role->id)
        ->and($user->department)->not->toBeNull()
        ->and($user->department->id)->toBe($department->id)
        ->and($user->employeeProfile)->not->toBeNull()
        ->and($user->employeeProfile->employee_code)->toBe(sprintf('EMP-%04d', $user->id));

    $profile = EmployeeProfile::where('user_id', $user->id)->first();
    expect($profile)->not->toBeNull()
        ->and($profile->user->id)->toBe($user->id);
});
