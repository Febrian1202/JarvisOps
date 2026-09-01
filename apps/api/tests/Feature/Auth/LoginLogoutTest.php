<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('user can login with valid credentials', function () {
    User::factory()->employee()->create([
        'email' => 'test@jarvisops.test',
        'password' => Hash::make('Password123!'),
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'test@jarvisops.test',
        'password' => 'Password123!',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Login successful.')
        ->assertJsonStructure([
            'success', 'message',
            'data' => ['token', 'user' => ['id', 'email', 'full_name', 'status', 'role', 'department']],
        ]);

    expect($response->json('data.token'))->toBeString()->not->toBeEmpty();
    expect(str_contains($response->json('data.token'), '|'))->toBeTrue();
});

test('login fails with wrong password', function () {
    User::factory()->employee()->create([
        'email' => 'test@jarvisops.test',
        'password' => Hash::make('Password123!'),
    ]);

    $this->postJson('/api/login', [
        'email' => 'test@jarvisops.test',
        'password' => 'wrong-password',
    ])->assertStatus(422)
        ->assertJsonPath('errors.email', ['These credentials do not match our records.']);
});

test('login fails with non-existent email with identical error', function () {
    $this->postJson('/api/login', [
        'email' => 'nonexistent@jarvisops.test',
        'password' => 'Password123!',
    ])->assertStatus(422)
        ->assertJsonPath('errors.email', ['These credentials do not match our records.']);
});

test('login fails for inactive user', function () {
    User::factory()->employee()->inactive()->create([
        'email' => 'inactive@jarvisops.test',
        'password' => Hash::make('Password123!'),
    ]);

    $this->postJson('/api/login', [
        'email' => 'inactive@jarvisops.test',
        'password' => 'Password123!',
    ])->assertStatus(422)
        ->assertJsonPath('errors.email', ['This account is inactive.']);
});

test('login fails with validation errors when fields missing', function () {
    $this->postJson('/api/login', [
        'email' => 'not-an-email',
    ])->assertStatus(422);
});

test('authenticated user can logout', function () {
    $user = User::factory()->employee()->create();
    $token = $user->createToken('auth_token', ['*'])->plainTextToken;

    $this->withHeaders(['Authorization' => 'Bearer '.$token])
        ->postJson('/api/logout')
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data', null);

    expect($user->tokens()->count())->toBe(0);
});

test('unauthenticated user cannot logout', function () {
    $this->postJson('/api/logout')->assertStatus(401);
});

test('expired token cannot be used', function () {
    $user = User::factory()->employee()->create();
    $token = $user->createToken('auth_token', ['*'])->plainTextToken;

    $this->travelTo(now()->addHours(12)->addMinute());

    $this->withHeaders(['Authorization' => 'Bearer '.$token])
        ->getJson('/api/me')
        ->assertStatus(401)
        ->assertJsonPath('message', 'Unauthenticated.');
});
