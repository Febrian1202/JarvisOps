<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    /**
     * Report system health (status, database connectivity, timestamp).
     */
    public function __invoke(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            $db = 'connected';
        } catch (\Throwable) {
            return ApiResponse::error('Database unavailable.', status: 503);
        }

        return ApiResponse::success([
            'status' => 'ok',
            'db' => $db,
            'timestamp' => now()->utc()->format('Y-m-d\TH:i:s\Z'),
        ], 'Service healthy.');
    }
}
