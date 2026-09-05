<?php

use Illuminate\Support\Facades\Route;

test('cors configuration restricts allowed origins to frontend URL and disallows wildcards with credentials', function () {
    $cors = config('cors');

    expect($cors)->toBeArray();
    expect($cors['paths'])->toContain('api/*');
    expect($cors['supports_credentials'])->toBeTrue();
    expect($cors['allowed_origins'])->not->toContain('*');
    expect($cors['allowed_origins'])->toContain('http://localhost:3000');
});

test('production error response hides internal exception details, trace, file, and line when debug mode is disabled', function () {
    Route::get('/api/test-production-error', function () {
        throw new RuntimeException('Sensitive database connection string leaked in error.');
    });

    config()->set('app.debug', false);

    $response = $this->getJson('/api/test-production-error');

    $response->assertStatus(500);
    $response->assertExactJson([
        'success' => false,
        'message' => 'Server error.',
        'errors' => null,
    ]);

    // Ensure no sensitive stack trace or debug information leaked in body
    $content = $response->getContent();
    expect($content)->not->toContain('Sensitive database connection');
    expect($content)->not->toContain('trace');
    expect($content)->not->toContain('file');
    expect($content)->not->toContain('line');
});

test('git does not track sensitive .env files', function () {
    $output = shell_exec('git ls-files .. | grep -E "(^|/)\.env$" || true');
    expect(trim((string) $output))->toBeEmpty('No .env file should be tracked by git.');
});
