<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTicketPriorityRequest;
use App\Http\Requests\Admin\UpdateTicketPriorityRequest;
use App\Models\Ticket;
use App\Models\TicketPriority;
use App\Services\Admin\ReferentialIntegrityGuard;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketPriorityController extends Controller
{
    public function __construct(
        protected AuditLogger $auditLogger,
        protected ReferentialIntegrityGuard $guard,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('ticket-priority.viewAny');

        $priorities = TicketPriority::orderBy('level')->get();

        return ApiResponse::success($priorities, 'Ticket priorities retrieved.');
    }

    public function show(TicketPriority $ticketPriority): JsonResponse
    {
        $this->authorize('ticket-priority.viewAny');

        return ApiResponse::success($ticketPriority, 'Ticket priority retrieved.');
    }

    public function store(StoreTicketPriorityRequest $request): JsonResponse
    {
        $this->authorize('ticket-priority.manage');

        $priority = TicketPriority::create($request->validated());

        $this->auditLogger->log(
            $request->user(),
            AuditAction::Create,
            AuditModule::TicketPriority,
            $priority->id,
            "Prioritas tiket {$priority->name} dibuat.",
            null,
            $priority->only(['name', 'level', 'sla_minutes', 'description'])
        );

        return ApiResponse::created($priority, 'Ticket priority created successfully.');
    }

    public function update(UpdateTicketPriorityRequest $request, TicketPriority $ticketPriority): JsonResponse
    {
        $this->authorize('ticket-priority.manage');

        $old = $ticketPriority->only(['name', 'level', 'sla_minutes', 'description']);
        $ticketPriority->update($request->validated());

        $this->auditLogger->log(
            $request->user(),
            AuditAction::Update,
            AuditModule::TicketPriority,
            $ticketPriority->id,
            "Prioritas tiket {$ticketPriority->name} diperbarui.",
            $old,
            $ticketPriority->only(['name', 'level', 'sla_minutes', 'description'])
        );

        return ApiResponse::success($ticketPriority->fresh(), 'Ticket priority updated successfully.');
    }

    public function destroy(TicketPriority $ticketPriority, Request $request): JsonResponse
    {
        $this->authorize('ticket-priority.manage');

        $this->guard->assertUnreferenced([
            'Prioritas tiket' => Ticket::where('priority_id', $ticketPriority->id),
        ]);

        $priorityName = $ticketPriority->name;
        $priorityId = $ticketPriority->id;

        $ticketPriority->delete();

        $this->auditLogger->log(
            $request->user(),
            AuditAction::Delete,
            AuditModule::TicketPriority,
            $priorityId,
            "Prioritas tiket {$priorityName} dihapus."
        );

        return ApiResponse::success(null, 'Ticket priority deleted successfully.');
    }
}
