<?php

use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\TicketCategoryController;
use App\Http\Controllers\Admin\TicketPriorityController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Article\ArticleController;
use App\Http\Controllers\Article\KnowledgeCategoryController;
use App\Http\Controllers\Asset\AssetController;
use App\Http\Controllers\Asset\AssetHistoryController;
use App\Http\Controllers\Attachment\AttachmentController;
use App\Http\Controllers\Audit\AuditLogController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\Dashboard\DashboardController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\Notification\NotificationController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\Ticket\TicketCommentController;
use App\Http\Controllers\Ticket\TicketController;
use App\Http\Controllers\Ticket\TicketHistoryController;
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
    Route::get('/roles', [UserController::class, 'roles'])->name('roles.index');
    Route::post('/users/{user}/activate', [UserController::class, 'activate'])->name('users.activate');
    Route::post('/users/{user}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');
    Route::apiResource('users', UserController::class);

    Route::get('/assets/categories', [AssetController::class, 'categories'])->name('assets.categories');
    Route::get('/assets/assignable', [AssetController::class, 'assignable'])->name('asset.assignable');
    Route::get('/my-assets', [AssetController::class, 'myAssets'])->name('assets.my-assets');
    Route::post('/assets/{asset}/assign', [AssetController::class, 'assign'])->name('assets.assign');
    Route::post('/assets/{asset}/release', [AssetController::class, 'release'])->name('assets.release');
    Route::get('/assets/{asset}/history', AssetHistoryController::class)->name('assets.history');
    Route::apiResource('assets', AssetController::class);
    Route::get('/articles', [ArticleController::class, 'index'])->name('articles.index');
    Route::post('/articles', [ArticleController::class, 'store'])->name('articles.store');
    Route::get('/articles/{article:slug}', [ArticleController::class, 'show'])->name('articles.show');
    Route::put('/articles/{article}', [ArticleController::class, 'update'])->name('articles.update');
    Route::delete('/articles/{article}', [ArticleController::class, 'destroy'])->name('articles.destroy');
    Route::post('/articles/{article}/publish', [ArticleController::class, 'publish'])->name('articles.publish');
    Route::post('/articles/{article}/unpublish', [ArticleController::class, 'unpublish'])->name('articles.unpublish');
    Route::apiResource('knowledge-categories', KnowledgeCategoryController::class);
    Route::apiResource('tickets', TicketController::class);

    Route::get('/tickets/{ticket}/attachments', [AttachmentController::class, 'index'])->name('tickets.attachments.index');
    Route::post('/tickets/{ticket}/attachments', [AttachmentController::class, 'store'])
        ->middleware('throttle:upload')
        ->name('tickets.attachments.store');
    Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download'])->name('attachments.download');
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');

    Route::post('/tickets/{ticket}/status', [TicketController::class, 'transition'])->name('tickets.status');

    // Ticket Comments
    Route::get('/tickets/{ticket}/comments', [TicketCommentController::class, 'index'])->name('tickets.comments.index');
    Route::post('/tickets/{ticket}/comments', [TicketCommentController::class, 'store'])->name('tickets.comments.store');
    Route::put('/tickets/{ticket}/comments/{comment}', [TicketCommentController::class, 'update'])->name('tickets.comments.update');
    Route::delete('/tickets/{ticket}/comments/{comment}', [TicketCommentController::class, 'destroy'])->name('tickets.comments.destroy');

    // Ticket History Timeline
    Route::get('/tickets/{ticket}/histories', [TicketHistoryController::class, 'index'])->name('tickets.histories');

    Route::post('/tickets/{ticket}/assign', [TicketController::class, 'assign'])->name('tickets.assign');
    Route::post('/tickets/{ticket}/unassign', [TicketController::class, 'unassign'])->name('tickets.unassign');
    Route::post('/tickets/{ticket}/priority', [TicketController::class, 'changePriority'])->name('tickets.priority');

    Route::apiResource('departments', DepartmentController::class);
    Route::apiResource('ticket-categories', TicketCategoryController::class);
    Route::apiResource('ticket-priorities', TicketPriorityController::class);
    Route::get('/ticket-statuses', [ReferenceController::class, 'statuses'])->name('ticket-statuses.index');
    Route::get('/technicians', [ReferenceController::class, 'technicians'])->name('technicians.index');

    Route::prefix('dashboard')->name('dashboard.')->group(function () {
        Route::get('/employee', [DashboardController::class, 'employee'])->name('employee');
        Route::get('/technician', [DashboardController::class, 'technician'])->name('technician');
        Route::get('/manager', [DashboardController::class, 'manager'])->name('manager');
        Route::get('/admin', [DashboardController::class, 'admin'])->name('admin');
    });

    Route::prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('unread-count');
        Route::post('/{notification}/read', [NotificationController::class, 'read'])->name('read');
        Route::post('/read-all', [NotificationController::class, 'readAll'])->name('read-all');
    });

    Route::prefix('audit-logs')->name('audit-logs.')->group(function () {
        Route::get('/', [AuditLogController::class, 'index'])->name('index');
        Route::get('/{auditLog}', [AuditLogController::class, 'show'])->name('show');
    });
});
