<?php

use App\Exceptions\IllegalStatusTransitionException;
use App\Exceptions\StateConflictException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

beforeEach(function (): void {
    Route::get('/api/_test/not-found', fn () => abort(404));
    Route::get('/api/_test/forbidden', fn () => throw new AuthorizationException('You are not allowed.'));
    Route::post('/api/_test/validation-error', fn () => throw ValidationException::withMessages([
        'email' => ['The email field is required.'],
    ]));
    Route::get('/api/_test/logic-error', fn () => throw new RuntimeException('Something broke.'));
    Route::get('/api/_test/illegal-transition', fn () => throw new IllegalStatusTransitionException('OPEN -> CLOSED is not allowed.'));
    Route::get('/api/_test/state-conflict', fn () => throw new StateConflictException('Asset is already assigned.'));
    Route::get('/api/_test/too-many-requests', fn () => throw new TooManyRequestsHttpException(30, 'Too Many Requests'));
});

it('returns a 404 envelope for missing resources', function () {
    $this->getJson('/api/_test/not-found')
        ->assertStatus(404)
        ->assertExactJson([
            'success' => false,
            'message' => 'Resource not found.',
            'errors' => null,
        ]);
});

it('returns a 403 envelope for authorization failures with the original message', function () {
    $this->getJson('/api/_test/forbidden')
        ->assertStatus(403)
        ->assertExactJson([
            'success' => false,
            'message' => 'You are not allowed.',
            'errors' => null,
        ]);
});

it('returns a 422 envelope with field errors for validation failures', function () {
    $this->postJson('/api/_test/validation-error')
        ->assertStatus(422)
        ->assertExactJson([
            'success' => false,
            'message' => 'The given data was invalid.',
            'errors' => ['email' => ['The email field is required.']],
        ]);
});

it('hides exception details when debug mode is disabled', function () {
    config()->set('app.debug', false);

    $this->getJson('/api/_test/logic-error')
        ->assertStatus(500)
        ->assertExactJson([
            'success' => false,
            'message' => 'Server error.',
            'errors' => null,
        ]);
});

it('returns a 422 envelope for illegal status transitions', function () {
    $this->getJson('/api/_test/illegal-transition')
        ->assertStatus(422)
        ->assertExactJson([
            'success' => false,
            'message' => 'OPEN -> CLOSED is not allowed.',
            'errors' => null,
        ]);
});

it('returns a 409 envelope for state conflicts', function () {
    $this->getJson('/api/_test/state-conflict')
        ->assertStatus(409)
        ->assertExactJson([
            'success' => false,
            'message' => 'Asset is already assigned.',
            'errors' => null,
        ]);
});

it('returns a 429 envelope with Retry-After header for throttled requests', function () {
    $this->getJson('/api/_test/too-many-requests')
        ->assertStatus(429)
        ->assertHeader('Retry-After', '30')
        ->assertExactJson([
            'success' => false,
            'message' => 'Too many requests.',
            'errors' => null,
        ]);
});
