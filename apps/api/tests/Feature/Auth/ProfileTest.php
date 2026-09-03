<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function profileUser(array $attributes = []): User
{
    return User::factory()->manager()->create(array_merge([
        'email' => 'manager@jarvisops.test',
        'password' => Hash::make('CurrentPass1'),
        'must_change_password' => false,
    ], $attributes));
}

test('profile payload returns all 66 role and policy abilities for admin', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/me')
        ->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'data' => [
                'id',
                'email',
                'full_name',
                'must_change_password',
                'role',
                'permissions',
            ],
        ]);

    $permissions = $response->json('data.permissions');
    expect($permissions)->toBeArray()->toHaveCount(67);
    expect($permissions)->toContain('ticket.create', 'article.create', 'dashboard.admin', 'asset.viewAny', 'user.lookup');
});

test('profile payload includes must_change_password flag', function () {
    $user = User::factory()->employee()->create(['must_change_password' => true]);
    Sanctum::actingAs($user);

    $this->getJson('/api/me')
        ->assertStatus(200)
        ->assertJsonPath('data.must_change_password', true);
});

test('get me returns profile with permissions', function () {
    $user = profileUser();
    Sanctum::actingAs($user);

    $response = $this->getJson('/api/me');

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonStructure([
            'success', 'message', 'data' => [
                'id', 'email', 'full_name', 'role', 'department', 'profile', 'permissions',
            ],
        ]);

    $permissions = $response->json('data.permissions');
    expect($permissions)->toBeArray()->not->toBeEmpty();
    expect(in_array('auth.logout', $permissions, true))->toBeTrue();
    expect(in_array('dashboard.manager', $permissions, true))->toBeTrue();
    expect(in_array('user.viewAny', $permissions, true))->toBeFalse();
});

test('update profile changes full_name and phone', function () {
    $user = profileUser();
    Sanctum::actingAs($user);

    $this->putJson('/api/me', [
        'full_name' => 'Updated Name',
        'phone' => '08123456789',
    ])->assertStatus(200)
        ->assertJsonPath('data.full_name', 'Updated Name');

    $user->refresh();
    expect($user->full_name)->toBe('Updated Name');
    expect($user->employeeProfile->phone)->toBe('08123456789');
});

test('update profile ignores role_id and email', function () {
    $user = profileUser();
    Sanctum::actingAs($user);
    $originalRoleId = $user->role_id;

    $this->putJson('/api/me', [
        'full_name' => 'New Name',
        'role_id' => 999,
        'email' => 'hacked@jarvisops.test',
    ])->assertStatus(200);

    $user->refresh();
    expect($user->role_id)->toBe($originalRoleId);
    expect($user->email)->toBe('manager@jarvisops.test');
});

test('change password updates password, resets flag, and revokes all other tokens', function () {
    $user = profileUser(['must_change_password' => true]);

    $currentToken = $user->createToken('current')->plainTextToken;
    $otherToken = $user->createToken('other')->plainTextToken;
    $otherTokenId = $user->tokens()->where('name', 'other')->first()->id;

    $this->withHeader('Authorization', 'Bearer '.$currentToken)
        ->putJson('/api/me/password', [
            'current_password' => 'CurrentPass1',
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ])->assertStatus(200)
        ->assertJsonPath('success', true);

    $user->refresh();
    expect($user->must_change_password)->toBeFalse();
    expect(Hash::check('NewPass123', $user->password))->toBeTrue();

    $this->assertDatabaseMissing('personal_access_tokens', ['id' => $otherTokenId]);
    expect($user->tokens()->count())->toBe(1);
});

test('change password fails with wrong current_password', function () {
    $user = profileUser();
    $currentToken = $user->createToken('current')->plainTextToken;

    $this->withHeader('Authorization', 'Bearer '.$currentToken)
        ->putJson('/api/me/password', [
            'current_password' => 'WrongPass1',
            'password' => 'NewPass123',
            'password_confirmation' => 'NewPass123',
        ])->assertStatus(422)
        ->assertJsonPath('errors.current_password', ['The current password is incorrect.']);
});

test('change password fails validation with weak password', function () {
    $user = profileUser();
    $currentToken = $user->createToken('current')->plainTextToken;

    $this->withHeader('Authorization', 'Bearer '.$currentToken)
        ->putJson('/api/me/password', [
            'current_password' => 'CurrentPass1',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertStatus(422);
});

test('unauthenticated user cannot access profile', function () {
    $this->getJson('/api/me')->assertStatus(401);
});
