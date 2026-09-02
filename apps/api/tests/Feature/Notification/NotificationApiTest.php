<?php

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('unauthenticated request to notification endpoints returns 401', function () {
    $this->getJson('/api/notifications')->assertStatus(401);
    $this->getJson('/api/notifications/unread-count')->assertStatus(401);
    $this->postJson('/api/notifications/1/read')->assertStatus(401);
    $this->postJson('/api/notifications/read-all')->assertStatus(401);
});

test('user sees only own notifications in paginated envelope', function () {
    $user = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();

    Notification::factory()->count(3)->create(['user_id' => $user->id]);
    Notification::factory()->count(5)->create(['user_id' => $other->id]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/notifications');

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('meta.total', 3)
        ->assertJsonCount(3, 'data');
});

test('user marking other user notification as read receives 404', function () {
    $user = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();

    $notif = Notification::factory()->create(['user_id' => $other->id, 'is_read' => false]);

    Sanctum::actingAs($user);

    $this->postJson("/api/notifications/{$notif->id}/read")
        ->assertStatus(404);

    expect($notif->refresh()->is_read)->toBeFalse();
});

test('admin marking other user notification as read also receives 404 (D-16 exception 3)', function () {
    $admin = User::factory()->admin()->create();
    $user = User::factory()->employee()->create();

    $notif = Notification::factory()->create(['user_id' => $user->id, 'is_read' => false]);

    Sanctum::actingAs($admin);

    $this->postJson("/api/notifications/{$notif->id}/read")
        ->assertStatus(404);
});

test('unread-count executes efficient single count query', function () {
    $user = User::factory()->employee()->create();
    Notification::factory()->count(3)->create(['user_id' => $user->id, 'is_read' => false]);

    Sanctum::actingAs($user);

    DB::enableQueryLog();
    $response = $this->getJson('/api/notifications/unread-count');
    $queries = DB::getQueryLog();

    $response->assertStatus(200)
        ->assertJsonPath('data.unread_count', 3);

    // Verify query count: user auth resolution + single count query on notifications
    expect(count($queries))->toBeLessThanOrEqual(2);
});

test('read-all marks only current user notifications as read', function () {
    $user = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();

    $n1 = Notification::factory()->create(['user_id' => $user->id, 'is_read' => false]);
    $n2 = Notification::factory()->create(['user_id' => $user->id, 'is_read' => false]);
    $n3 = Notification::factory()->create(['user_id' => $other->id, 'is_read' => false]);

    Sanctum::actingAs($user);

    $this->postJson('/api/notifications/read-all')
        ->assertStatus(200)
        ->assertJsonPath('data', null)
        ->assertJsonPath('message', 'All notifications marked as read.');

    expect($n1->refresh()->is_read)->toBeTrue()
        ->and($n2->refresh()->is_read)->toBeTrue()
        ->and($n3->refresh()->is_read)->toBeFalse();
});
