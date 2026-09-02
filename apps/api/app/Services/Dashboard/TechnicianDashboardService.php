<?php

namespace App\Services\Dashboard;

use App\Http\Resources\Ticket\TicketHistoryResource;
use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\User;

class TechnicianDashboardService
{
    public function __construct(
        protected DashboardQueryService $queryService,
    ) {}

    public function get(User $actor): array
    {
        $assigned = Ticket::query()->where('technician_id', $actor->id);

        $openForTech = (clone $assigned)->whereHas('status', fn ($q) => $q->where('is_closed', false));

        return [
            'assigned_tickets' => (clone $openForTech)->count(),
            'open_tickets' => Ticket::query()->where('status_id', 1)->count(),
            'in_progress_tickets' => (clone $assigned)->where('status_id', 3)->count(),
            'sla_breached' => (clone $openForTech)
                ->where(function ($q) {
                    $q->where('sla_breached', true)
                        ->orWhere(function ($sub) {
                            $sub->whereNotNull('sla_deadline')
                                ->where('sla_deadline', '<', now());
                        });
                })
                ->count(),
            'avg_resolution_minutes' => $this->queryService->avgResolutionMinutes(
                (clone $assigned)->whereNotNull('resolved_at')
            ),
            'recent_activity' => TicketHistoryResource::collection(
                TicketHistory::query()
                    ->whereIn('ticket_id', (clone $assigned)->pluck('id'))
                    ->with(['user', 'ticket'])
                    ->latest('created_at')
                    ->limit(5)
                    ->get()
            )->resolve(),
        ];
    }
}
