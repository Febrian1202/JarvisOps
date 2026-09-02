<?php

use App\Http\Controllers\Asset\AssetController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\Ticket\TicketController;
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

Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
    Route::get('/assets/assignable', [AssetController::class, 'assignable'])->name('asset.assignable');
    Route::apiResource('tickets', TicketController::class);

    Route::post('/tickets/{ticket}/status', [TicketController::class, 'transition'])->name('tickets.status');
    Route::post('/tickets/{ticket}/assign', [TicketController::class, 'assign'])->name('tickets.assign');
    Route::post('/tickets/{ticket}/unassign', [TicketController::class, 'unassign'])->name('tickets.unassign');
    Route::post('/tickets/{ticket}/priority', [TicketController::class, 'changePriority'])->name('tickets.priority');

    Route::get('/ticket-categories', [ReferenceController::class, 'categories'])->name('ticket-categories.index');
    Route::get('/ticket-priorities', [ReferenceController::class, 'priorities'])->name('ticket-priorities.index');
    Route::get('/ticket-statuses', [ReferenceController::class, 'statuses'])->name('ticket-statuses.index');
    Route::get('/technicians', [ReferenceController::class, 'technicians'])->name('technicians.index');
});
