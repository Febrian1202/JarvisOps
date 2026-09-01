<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Route::middleware(['auth:sanctum', 'role:manager'])->get('/_test/role-single', function () {
        return response()->json(['ok' => true]);
    });

    Route::middleware(['auth:sanctum', 'role:manager,administrator'])->get('/_test/role-multi', function () {
        return response()->json(['ok' => true]);
    });

    Route::middleware(['auth:sanctum', 'password.changed'])->get('/_test/guarded', function () {
        return response()->json(['ok' => true]);
    })->name('test.guarded');

    Route::middleware(['auth:sanctum', 'password.changed'])->get('/_test/me-show', function () {
        return response()->json(['ok' => true]);
    })->name('me.show');

    Route::middleware(['auth:sanctum', 'password.changed'])->put('/_test/me-password', function () {
        return response()->json(['ok' => true]);
    })->name('me.password.update');

    Route::middleware(['auth:sanctum', 'password.changed'])->post('/_test/logout', function () {
        return response()->json(['ok' => true]);
    })->name('auth.logout');
});

test('user with wrong role gets 403', function () {
    Sanctum::actingAs(User::factory()->employee()->create());

    $this->getJson('/_test/role-single')->assertStatus(403);
});

test('user with matching single role passes', function () {
    Sanctum::actingAs(User::factory()->manager()->create());

    $this->getJson('/_test/role-single')->assertOk();
});

test('user matching any of the multiple roles passes', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $this->getJson('/_test/role-multi')->assertOk();
});

test('user matching none of the multiple roles gets 403', function () {
    Sanctum::actingAs(User::factory()->employee()->create());

    $this->getJson('/_test/role-multi')->assertStatus(403);
});

test('user with must_change_password is blocked on normal route with special message', function () {
    Sanctum::actingAs(User::factory()->manager()->create(['must_change_password' => true]));

    $this->getJson('/_test/guarded')
        ->assertStatus(403)
        ->assertJsonPath('message', 'Password change required.');
});

test('user with must_change_password can access allowed routes', function () {
    Sanctum::actingAs(User::factory()->manager()->create(['must_change_password' => true]));

    $this->getJson('/_test/me-show')->assertOk();
    $this->putJson('/_test/me-password')->assertOk();
    $this->postJson('/_test/logout')->assertOk();
});

test('user without must_change_password passes normal routes', function () {
    Sanctum::actingAs(User::factory()->manager()->create(['must_change_password' => false]));

    $this->getJson('/_test/guarded')->assertOk();
});
