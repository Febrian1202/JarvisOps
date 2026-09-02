<?php

namespace App\Http\Controllers;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ReferenceController extends Controller
{
    /**
     * List all ticket categories.
     */
    public function categories(): JsonResponse
    {
        $this->authorize('ticket-category.viewAny');

        return ApiResponse::success(TicketCategory::all(['id', 'name']), 'Ticket categories retrieved.');
    }

    /**
     * List all ticket priorities including SLA.
     */
    public function priorities(): JsonResponse
    {
        $this->authorize('ticket-priority.viewAny');

        return ApiResponse::success(TicketPriority::all(['id', 'name', 'sla_minutes']), 'Ticket priorities retrieved.');
    }

    /**
     * List all ticket statuses.
     */
    public function statuses(): JsonResponse
    {
        $this->authorize('ticket-status.viewAny');

        return ApiResponse::success(TicketStatus::all(['id', 'name']), 'Ticket statuses retrieved.');
    }

    /**
     * List active technicians (Manager/Admin only).
     */
    public function technicians(): JsonResponse
    {
        $this->authorize('technician.list');

        $technicianRoleId = Role::where('name', RoleName::Technician->value)->value('id');

        $users = User::where('role_id', $technicianRoleId)
            ->where('status', UserStatus::Active->value)
            ->get(['id', 'full_name']);

        return ApiResponse::success($users, 'Technicians retrieved.');
    }
}
