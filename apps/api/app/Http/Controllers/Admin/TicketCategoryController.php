<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTicketCategoryRequest;
use App\Http\Requests\Admin\UpdateTicketCategoryRequest;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Services\Admin\ReferentialIntegrityGuard;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketCategoryController extends Controller
{
    public function __construct(
        protected AuditLogger $auditLogger,
        protected ReferentialIntegrityGuard $guard,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('ticket-category.viewAny');

        $categories = TicketCategory::with('parent')->orderBy('name')->get();

        return ApiResponse::success($categories, 'Ticket categories retrieved.');
    }

    public function show(TicketCategory $ticketCategory): JsonResponse
    {
        $this->authorize('ticket-category.viewAny');

        return ApiResponse::success($ticketCategory->load('parent'), 'Ticket category retrieved.');
    }

    public function store(StoreTicketCategoryRequest $request): JsonResponse
    {
        $this->authorize('ticket-category.manage');

        $category = TicketCategory::create($request->validated());

        $this->auditLogger->log(
            $request->user(),
            AuditAction::Create,
            AuditModule::TicketCategory,
            $category->id,
            "Kategori tiket {$category->name} dibuat.",
            null,
            $category->only(['name', 'description', 'parent_id'])
        );

        return ApiResponse::created($category, 'Ticket category created successfully.');
    }

    public function update(UpdateTicketCategoryRequest $request, TicketCategory $ticketCategory): JsonResponse
    {
        $this->authorize('ticket-category.manage');

        $old = $ticketCategory->only(['name', 'description', 'parent_id']);
        $ticketCategory->update($request->validated());

        $this->auditLogger->log(
            $request->user(),
            AuditAction::Update,
            AuditModule::TicketCategory,
            $ticketCategory->id,
            "Kategori tiket {$ticketCategory->name} diperbarui.",
            $old,
            $ticketCategory->only(['name', 'description', 'parent_id'])
        );

        return ApiResponse::success($ticketCategory->fresh()->load('parent'), 'Ticket category updated successfully.');
    }

    public function destroy(TicketCategory $ticketCategory, Request $request): JsonResponse
    {
        $this->authorize('ticket-category.manage');

        $this->guard->assertUnreferenced([
            'Kategori tiket' => Ticket::where('category_id', $ticketCategory->id),
            'Kategori tiket (induk)' => TicketCategory::where('parent_id', $ticketCategory->id),
        ]);

        $categoryName = $ticketCategory->name;
        $categoryId = $ticketCategory->id;

        $ticketCategory->delete();

        $this->auditLogger->log(
            $request->user(),
            AuditAction::Delete,
            AuditModule::TicketCategory,
            $categoryId,
            "Kategori tiket {$categoryName} dihapus."
        );

        return ApiResponse::success(null, 'Ticket category deleted successfully.');
    }
}
