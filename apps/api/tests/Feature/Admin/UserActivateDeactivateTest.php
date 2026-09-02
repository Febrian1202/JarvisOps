<?php

use App\Models\AuditLog;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('deactivating user revokes all tokens and sets status inactive', function () {
    $target = User::factory()->employee()->create(['status' => 'active']);
    $tokenObj = $target->createToken('active_token');
    $plainToken = $tokenObj->plainTextToken;

    expect($target->tokens()->count())->toBe(1);

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $response = $this->postJson("/api/users/{$target->id}/deactivate");
    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'inactive');

    $target->refresh();
    expect($target->status)->toBe('inactive')
        ->and($target->tokens()->count())->toBe(0);

    // Verify token issued before deactivation now returns 401 (clear Sanctum actingAs first)
    app('auth')->forgetGuards();
    $this->withToken($plainToken)->getJson('/api/me')->assertStatus(401);

    // Verify audit log
    $audit = AuditLog::where('module', 'user')->where('module_id', $target->id)->where('action', 'deactivate')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->description)->toBe("User {$target->full_name} dinonaktifkan.");
});

test('activating user sets status active and logs audit', function () {
    $target = User::factory()->employee()->create(['status' => 'inactive']);

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $response = $this->postJson("/api/users/{$target->id}/activate");
    $response->assertStatus(200)
        ->assertJsonPath('data.status', 'active');

    $target->refresh();
    expect($target->status)->toBe('active');

    $audit = AuditLog::where('module', 'user')->where('module_id', $target->id)->where('action', 'activate')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->description)->toBe("User {$target->full_name} diaktifkan kembali.");
});

test('admin cannot deactivate own account (403)', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->postJson("/api/users/{$admin->id}/deactivate")->assertStatus(403);
});
