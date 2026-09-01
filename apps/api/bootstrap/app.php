<?php

use App\Exceptions\IllegalStatusTransitionException;
use App\Exceptions\StateConflictException;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(append: [
            'throttle:api',
        ]);

        $middleware->alias([
            'role' => CheckRole::class,
            'password.changed' => EnsurePasswordChanged::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            return match (true) {
                $e instanceof AuthenticationException => ApiResponse::error('Unauthenticated.', status: 401),
                $e instanceof AuthorizationException, $e instanceof AccessDeniedHttpException => $e instanceof AuthorizationException && $e->hasStatus() && $e->status() === 404
                    ? ApiResponse::error('Resource not found.', status: 404)
                    : ApiResponse::error($e->getMessage() ?: 'Forbidden.', status: 403),
                $e instanceof NotFoundHttpException, $e instanceof ModelNotFoundException => ApiResponse::error('Resource not found.', status: 404),
                $e instanceof MethodNotAllowedHttpException => ApiResponse::error('Method not allowed.', status: 405),
                $e instanceof HttpException && $e->getStatusCode() === 404 => ApiResponse::error('Resource not found.', status: 404),
                $e instanceof ValidationException => ApiResponse::error('The given data was invalid.', errors: $e->errors(), status: 422),
                $e instanceof TooManyRequestsHttpException => tap(ApiResponse::error('Too many requests.', status: 429), function (JsonResponse $response) use ($e): void {
                    $response->header('Retry-After', $e->getHeaders()['Retry-After'] ?? 60);
                }),
                $e instanceof IllegalStatusTransitionException => ApiResponse::error(
                    'The given data was invalid.',
                    errors: ['status_id' => [$e->getMessage()]],
                    status: 422,
                ),
                $e instanceof StateConflictException => ApiResponse::error($e->getMessage() ?: 'State conflict.', status: 409),
                default => ApiResponse::error(
                    app()->hasDebugModeEnabled() ? $e->getMessage() : 'Server error.',
                    status: 500
                ),
            };
        });
    })->create();
