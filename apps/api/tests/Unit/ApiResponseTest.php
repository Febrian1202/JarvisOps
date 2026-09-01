<?php

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

it('returns a success envelope', function () {
    $response = ApiResponse::success(['id' => 1], 'Success.', 200);

    expect($response)->toBeInstanceOf(JsonResponse::class)
        ->and($response->status())->toBe(200)
        ->and($response->getData(true))->toMatchArray([
            'success' => true,
            'message' => 'Success.',
            'data' => ['id' => 1],
        ]);
});

it('omits meta key when not paginated', function () {
    $response = ApiResponse::success(['id' => 1]);

    expect($response->getData(true))->not->toHaveKey('meta');
});

it('returns a created envelope with 201', function () {
    $response = ApiResponse::created(['id' => 42], 'Ticket created.');

    expect($response->status())->toBe(201)
        ->and($response->getData(true))->toMatchArray([
            'success' => true,
            'message' => 'Ticket created.',
            'data' => ['id' => 42],
        ]);
});

it('returns an error envelope', function () {
    $response = ApiResponse::error('Not found.', null, 404);

    expect($response->status())->toBe(404)
        ->and($response->getData(true))->toMatchArray([
            'success' => false,
            'message' => 'Not found.',
            'errors' => null,
        ]);
});

it('returns an error envelope with errors', function () {
    $response = ApiResponse::error('Validation failed.', [
        'email' => ['The email field is required.'],
    ], 422);

    expect($response->status())->toBe(422)
        ->and($response->getData(true))->toMatchArray([
            'success' => false,
            'message' => 'Validation failed.',
            'errors' => ['email' => ['The email field is required.']],
        ]);
});

it('returns a paginated envelope with exactly six meta keys and no links', function () {
    $items = collect([['id' => 1], ['id' => 2]]);
    $paginator = new LengthAwarePaginator($items, 10, 2, 1);

    $response = ApiResponse::paginated($paginator, 'Tickets retrieved.');

    $data = $response->getData(true);
    expect($response->status())->toBe(200)
        ->and($data['success'])->toBeTrue()
        ->and($data['message'])->toBe('Tickets retrieved.')
        ->and($data['data'])->toBe([['id' => 1], ['id' => 2]])
        ->and($data['meta'])->toMatchArray([
            'current_page' => 1,
            'per_page' => 2,
            'total' => 10,
            'last_page' => 5,
            'from' => 1,
            'to' => 2,
        ])
        ->and($data['meta'])->toHaveKeys(['current_page', 'per_page', 'total', 'last_page', 'from', 'to'])
        ->and($data['meta'])->not->toHaveKey('links');
});
