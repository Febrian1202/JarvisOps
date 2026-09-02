<?php

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

test('admin can reset user password, revokes tokens, and forces change on next login', function () {
    $employee = User::factory()->employee()->create(['must_change_password' => false]);
    $employee->createToken('test_token');
    expect($employee->tokens()->count())->toBe(1);

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $response = $this->postJson("/api/users/{$employee->id}/reset-password");
    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['temporary_password']]);

    $tempPass = $response->json('data.temporary_password');
    expect(strlen($tempPass))->toBeGreaterThanOrEqual(8);

    $employee->refresh();
    expect($employee->must_change_password)->toBeTrue()
        ->and($employee->tokens()->count())->toBe(0)
        ->and(Hash::check($tempPass, $employee->password))->toBeTrue();

    // Verify password is NOT in audit logs (D-07)
    $audit = AuditLog::where('module', 'user')->where('module_id', $employee->id)->where('action', 'password_reset')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->description)->not->toContain($tempPass);
});

test('admin cannot reset own password (403)', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->postJson("/api/users/{$admin->id}/reset-password")
        ->assertStatus(403);
});

test('roles list only accessible for admin', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->getJson('/api/roles')
        ->assertStatus(200)
        ->assertJsonCount(4, 'data')
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name'],
            ],
        ]);

    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $this->getJson('/api/roles')
        ->assertStatus(403);
});
