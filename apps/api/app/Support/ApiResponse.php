<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

class ApiResponse
{
    /**
     * Success envelope.
     *
     * @param  array<mixed>|object|null  $data
     * @param  array<string, mixed>|null  $meta
     */
    public static function success(mixed $data = null, string $message = 'Success', int $status = 200, ?array $meta = null): JsonResponse
    {
        $payload = [
            'success' => true,
            'message' => $message,
            'data' => $data,
        ];

        if ($meta !== null) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    /**
     * Created resource envelope (HTTP 201, D-22).
     *
     * @param  array<mixed>|object|null  $data
     */
    public static function created(mixed $data, string $message = 'Created'): JsonResponse
    {
        return self::success($data, $message, 201);
    }

    /**
     * Error envelope.
     *
     * @param  array<string, array<int, string>>|string|null  $errors
     */
    public static function error(string $message, mixed $errors = null, int $status = 400): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }

    /**
     * Paginated collection envelope. `meta` has exactly six keys and no `links` (API-CONTRACT §2.2).
     */
    public static function paginated(LengthAwarePaginator $paginator, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ]);
    }
}
