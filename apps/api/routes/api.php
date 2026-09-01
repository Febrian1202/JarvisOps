<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:login')
    ->name('auth.login');

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum')
    ->name('auth.logout');

Route::get('/me', [ProfileController::class, 'show'])
    ->middleware(['auth:sanctum', 'password.changed'])
    ->name('me.show');

Route::put('/me', [ProfileController::class, 'update'])
    ->middleware(['auth:sanctum', 'password.changed'])
    ->name('me.update');

Route::put('/me/password', [ProfileController::class, 'updatePassword'])
    ->middleware('auth:sanctum')
    ->name('me.password.update');
