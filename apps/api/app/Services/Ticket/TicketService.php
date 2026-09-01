<?php

namespace App\Services\Ticket;

use App\DTOs\Ticket\CreateTicketData;
use App\DTOs\Ticket\UpdateTicketData;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Enums\TicketStatusName;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketHistory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Sla\SlaService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

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

    public function update(Ticket $ticket, UpdateTicketData $data, User $actor): Ticket
    {
        // K-09/D-16 #2: no role can edit a CLOSED ticket (including admin bypassing Gate::before)
        if ((bool) ($ticket->status?->is_final ?? false)) {
            throw new AccessDeniedHttpException('This ticket is closed and cannot be edited.');
        }

        return DB::transaction(function () use ($ticket, $data, $actor): Ticket {
            $old = $ticket->only($data->fields);

            foreach ($data->fields as $field) {
                if ($field === 'category_id') {
                    $ticket->category_id = $data->categoryId;
                } elseif ($field === 'title') {
                    $ticket->title = $data->title;
                } elseif ($field === 'description') {
                    $ticket->description = $data->description;
                }
            }
            $ticket->save();

            foreach ($data->fields as $field) {
                $newValue = $ticket->getAttribute($field);
                if ((string) ($old[$field] ?? '') !== (string) ($newValue ?? '')) {
                    TicketHistory::create([
                        'ticket_id' => $ticket->id,
                        'user_id' => $actor->id,
                        'field_changed' => $field,
                        'old_value' => $this->displayValue($field, $old[$field] ?? null),
                        'new_value' => $this->displayValue($field, $newValue),
                    ]);
                }
            }

            $this->auditLogger->log($actor, AuditAction::Update, AuditModule::Ticket,
                $ticket->id, "Ticket #{$ticket->ticket_number} diperbarui.", $old, $ticket->only($data->fields));

            return $ticket->fresh()->load(['status', 'priority', 'category', 'reporter', 'technician', 'department', 'asset']);
        });
    }

    public function delete(Ticket $ticket, User $actor): void
    {
        DB::transaction(function () use ($ticket, $actor): void {
            $ticket->delete();

            $this->auditLogger->log($actor, AuditAction::Delete, AuditModule::Ticket,
                $ticket->id, "Ticket #{$ticket->ticket_number} dihapus.");
        });
    }

    private function displayValue(string $field, mixed $value): ?string
    {
        return match ($field) {
            'category_id' => TicketCategory::find($value)?->name,
            default => $value,
        };
    }
}
