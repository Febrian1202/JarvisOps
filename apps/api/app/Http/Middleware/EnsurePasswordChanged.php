<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    /**
     * Routes the user may access while must_change_password is set (D-11).
     */
    private const ALLOWED_ROUTES = [
        'me.password.update',
        'me.show',
        'auth.logout',
    ];

    /**
     * Reject requests except for password update, profile view, and logout
     * while the user must change their password.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->must_change_password && ! in_array($request->route()?->getName(), self::ALLOWED_ROUTES, true)) {
            return ApiResponse::error('Password change required.', status: 403);
        }

        return $next($request);
    }
}
