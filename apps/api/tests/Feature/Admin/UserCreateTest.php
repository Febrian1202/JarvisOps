<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

test('admin can create user with default profile and must_change_password true', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/users', [
        'full_name' => 'Budi Pratama',
        'email' => 'budi@jarvisops.test',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role_id' => 4,
        'department_id' => 1,
        'status' => 'active',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.email', 'budi@jarvisops.test')
        ->assertJsonPath('data.full_name', 'Budi Pratama')
        ->assertJsonPath('data.role.id', 4)
        ->assertJsonPath('data.department.id', 1);

    $user = User::where('email', 'budi@jarvisops.test')->first();
    expect($user)->not->toBeNull()
        ->and($user->must_change_password)->toBeTrue()
        ->and($user->employeeProfile)->not->toBeNull()
        ->and(Hash::check('Password123!', $user->password))->toBeTrue();
});

test('admin can create user with custom profile fields', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/users', [
        'full_name' => 'Cici Paramida',
        'email' => 'cici@jarvisops.test',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role_id' => 4,
        'department_id' => 1,
        'status' => 'active',
        'profile' => [
            'employee_code' => 'EMP-0099',
            'phone' => '08123456789',
            'position' => 'Senior Staff',
            'hire_date' => '2025-01-15',
        ],
    ]);

    $response->assertStatus(201);
    $user = User::where('email', 'cici@jarvisops.test')->first();
    expect($user->employeeProfile->employee_code)->toBe('EMP-0099')
        ->and($user->employeeProfile->phone)->toBe('08123456789')
        ->and($user->employeeProfile->position)->toBe('Senior Staff')
        ->and($user->employeeProfile->hire_date->format('Y-m-d'))->toBe('2025-01-15');
});

test('duplicate email returns 422 (BR-018)', function () {
    User::factory()->create(['email' => 'dup@jarvisops.test']);
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->postJson('/api/users', [
        'full_name' => 'Duplicate User',
        'email' => 'dup@jarvisops.test',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role_id' => 4,
        'status' => 'active',
    ])->assertStatus(422)
        ->assertJsonValidationErrors('email');
});

test('non-admin cannot create user (BR-017)', function () {
    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $this->postJson('/api/users', [
        'full_name' => 'Tester',
        'email' => 'tester@jarvisops.test',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role_id' => 4,
        'status' => 'active',
    ])->assertStatus(403);
});

test('unauthenticated user cannot create user', function () {
    $this->postJson('/api/users', [
        'full_name' => 'Tester',
        'email' => 'tester@jarvisops.test',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role_id' => 4,
        'status' => 'active',
    ])->assertStatus(401);
});
