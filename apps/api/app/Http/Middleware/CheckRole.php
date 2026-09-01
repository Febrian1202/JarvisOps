<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Reject requests when the authenticated user lacks any of the given roles.
     *
     * @param  string  ...$roles  One or more role names (e.g. `role:manager,admin`)
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user && $user->hasRole(...$roles)) {
            return $next($request);
        }

        return ApiResponse::error('Forbidden.', status: 403);
    }
}
