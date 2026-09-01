<?php

namespace App\Services\Ticket;

use App\DTOs\Ticket\CreateTicketData;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Enums\TicketStatusName;
use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Sla\SlaService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TicketService
{
    public function __construct(
        private readonly SlaService $slaService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function create(CreateTicketData $data, User $actor): Ticket
    {
        return DB::transaction(function () use ($data, $actor): Ticket {
            $priority = TicketPriority::findOrFail($data->priorityId);
            $status = TicketStatus::find(TicketStatusName::Open->id());

            $ticket = Ticket::create([
                'ticket_number' => 'TMP-'.Str::ulid(), // placeholder, diisi di bawah (D-05)
                'title' => $data->title,
                'description' => $data->description,
                'category_id' => $data->categoryId,
                'priority_id' => $priority->id,
                'status_id' => $status->id,
                'reporter_id' => $actor->id,
                'department_id' => $actor->department_id,
                'asset_id' => $data->assetId,
                'sla_duration_minutes' => (int) $priority->sla_minutes,
            ]);

            // D-05: format dari ID auto-increment
            $ticket->forceFill(['ticket_number' => sprintf('TCK-%04d', $ticket->id)])->save();

            // snapshot SLA (D-01)
            $this->slaService->snapshot($ticket, $priority);
            $ticket->save();

            // history + audit
            TicketHistory::create([
                'ticket_id' => $ticket->id,
                'user_id' => $actor->id,
                'field_changed' => 'status_id',
                'old_value' => null,
                'new_value' => TicketStatusName::Open->label(),
            ]);

            $this->auditLogger->log($actor, AuditAction::Create, AuditModule::Ticket, $ticket->id,
                "Ticket #{$ticket->ticket_number} dibuat.");

            return $ticket->load(['status', 'priority', 'category', 'reporter', 'technician', 'department', 'asset']);
        });
    }

    public function find(int $id): Ticket
    {
        $ticket = Ticket::query()
            ->with([
                'status',
                'priority',
                'category',
                'reporter.department',
                'technician',
                'department',
                'asset' => fn ($q) => $q->withTrashed(),
                'comments',
                'attachments',
            ])
            ->findOrFail($id);

        $ticket->setAttribute('available_actions', []);
        $ticket->setAttribute('editable_fields', []);

        return $ticket;
    }
}
