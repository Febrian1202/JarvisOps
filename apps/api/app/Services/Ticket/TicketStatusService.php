<?php

namespace App\Services\Ticket;

use App\Authorization\TicketActorResolver;
use App\Authorization\TicketTransitionMatrix;
use App\DTOs\Ticket\AssignTicketData;
use App\DTOs\Ticket\ChangePriorityData;
use App\DTOs\Ticket\StatusTransitionData;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Enums\NotificationType;
use App\Enums\RoleName;
use App\Enums\TicketActor;
use App\Enums\TicketStatusName;
use App\Exceptions\IllegalStatusTransitionException;
use App\Exceptions\StateConflictException;
use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\TicketHistory;
use App\Models\TicketPriority;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Notification\NotificationService;
use App\Services\Sla\SlaService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class TicketStatusService
{
    private const RELOAD_RELATIONS = ['status', 'priority', 'category', 'reporter', 'technician', 'department', 'asset'];

    public function __construct(
        private readonly SlaService $slaService,
        private readonly AuditLogger $auditLogger,
        private readonly NotificationService $notificationService,
    ) {}

    public function transition(Ticket $ticket, StatusTransitionData $data, User $actor): Ticket
    {
        return DB::transaction(function () use ($ticket, $data, $actor): Ticket {
            $ticket = Ticket::query()->lockForUpdate()->findOrFail($ticket->id);

            $from = TicketStatusName::fromId($ticket->status_id);
            $to = TicketStatusName::fromId($data->statusId);

            if ($from === $to) {
                throw new IllegalStatusTransitionException(
                    "Status tidak dapat diubah dari {$from->label()} ke {$to->label()}."
                );
            }

            if ($data->expectedStatusId !== null && $ticket->status_id !== $data->expectedStatusId) {
                throw new StateConflictException('Ticket status has changed since it was loaded. Please refresh and try again.');
            }

            $legal = false;
            $isSelfAssign = false;

            foreach (app(TicketActorResolver::class)->resolve($ticket, $actor) as $role) {
                if (TicketTransitionMatrix::allows($from, $to, $role)) {
                    $legal = true;
                    $isSelfAssign = $role === TicketActor::AnyTechnician;
                    break;
                }
            }

            if (! $legal) {
                throw new IllegalStatusTransitionException(
                    "Status tidak dapat diubah dari {$from->label()} ke {$to->label()}."
                );
            }

            if ($to === TicketStatusName::Assigned || $to === TicketStatusName::Open) {
                throw new IllegalStatusTransitionException(
                    "Status tidak dapat diubah dari {$from->label()} ke {$to->label()} melalui endpoint ini."
                );
            }

            $this->applyTransition($ticket, $from, $to, $data, $actor, $isSelfAssign);

            return $ticket->fresh()->load(self::RELOAD_RELATIONS);
        });
    }

    public function assign(Ticket $ticket, AssignTicketData $data, User $actor): Ticket
    {
        return DB::transaction(function () use ($ticket, $data, $actor): Ticket {
            $ticket = Ticket::query()->lockForUpdate()->findOrFail($ticket->id);

            $from = TicketStatusName::fromId($ticket->status_id);
            if (! in_array($from, [TicketStatusName::Open, TicketStatusName::Assigned, TicketStatusName::InProgress], true)) {
                throw new IllegalStatusTransitionException(
                    "Ticket tidak dapat ditugaskan dari status {$from->label()}."
                );
            }

            if ($data->expectedStatusId !== null && $ticket->status_id !== $data->expectedStatusId) {
                throw new StateConflictException('Ticket status has changed since it was loaded. Please refresh and try again.');
            }

            $technician = User::query()->findOrFail($data->technicianId);
            $oldTechnician = $ticket->technician;
            $isReassign = $ticket->technician_id !== null;

            if ($from !== TicketStatusName::Assigned) {
                $this->writeHistory($ticket, $actor, 'status_id', $from->label(), TicketStatusName::Assigned->label());
                $ticket->status_id = TicketStatusName::Assigned->id();
            }

            $this->writeHistory($ticket, $actor, 'technician_id', $oldTechnician?->full_name, $technician->full_name);
            $ticket->technician_id = $technician->id;

            $ticket->save();
            $this->storeNote($ticket, $actor, $data->note);

            if ($isReassign) {
                $this->auditLogger->log(
                    $actor,
                    AuditAction::Reassign,
                    AuditModule::Ticket,
                    $ticket->id,
                    "Ticket #{$ticket->ticket_number} ditugaskan ulang dari {$oldTechnician->full_name} ke {$technician->full_name}.",
                    ['status_id' => $from->value, 'technician_id' => $oldTechnician->id],
                    ['status_id' => TicketStatusName::Assigned->value, 'technician_id' => $technician->id],
                );

                $this->notifyRecipients(
                    collect([$oldTechnician, $technician]),
                    NotificationType::TicketReassigned,
                    $ticket,
                    $actor,
                    "Ticket #{$ticket->ticket_number} telah ditugaskan ulang.",
                );
            } else {
                $this->auditLogger->log(
                    $actor,
                    AuditAction::Assign,
                    AuditModule::Ticket,
                    $ticket->id,
                    "Ticket #{$ticket->ticket_number} ditugaskan kepada {$technician->full_name}.",
                    ['technician_id' => null],
                    ['status_id' => TicketStatusName::Assigned->value, 'technician_id' => $technician->id],
                );

                $this->notifyRecipients(
                    collect([$technician]),
                    NotificationType::TicketAssigned,
                    $ticket,
                    $actor,
                    "Ticket #{$ticket->ticket_number} telah ditugaskan kepada Anda.",
                );
            }

            return $ticket->fresh()->load(self::RELOAD_RELATIONS);
        });
    }

    public function unassign(Ticket $ticket, User $actor): Ticket
    {
        return DB::transaction(function () use ($ticket, $actor): Ticket {
            $ticket = Ticket::query()->lockForUpdate()->findOrFail($ticket->id);

            $from = TicketStatusName::fromId($ticket->status_id);
            if ($from !== TicketStatusName::Assigned) {
                throw new IllegalStatusTransitionException(
                    "Status tidak dapat diubah dari {$from->label()} ke OPEN."
                );
            }

            $technician = $ticket->technician;

            $this->writeHistory($ticket, $actor, 'status_id', TicketStatusName::Assigned->label(), TicketStatusName::Open->label());
            $this->writeHistory($ticket, $actor, 'technician_id', $technician?->full_name, null);

            $ticket->status_id = TicketStatusName::Open->id();
            $ticket->technician_id = null;
            $ticket->save();

            $this->auditLogger->log(
                $actor,
                AuditAction::Unassign,
                AuditModule::Ticket,
                $ticket->id,
                "Ticket #{$ticket->ticket_number} dilepas dari teknisi {$technician?->full_name}.",
                ['status_id' => TicketStatusName::Assigned->value, 'technician_id' => $technician?->id],
                ['status_id' => TicketStatusName::Open->value, 'technician_id' => null],
            );

            $this->notifyRecipients(
                collect([$technician]),
                NotificationType::TicketUnassigned,
                $ticket,
                $actor,
                "Anda dilepas dari ticket #{$ticket->ticket_number}.",
            );

            return $ticket->fresh()->load(self::RELOAD_RELATIONS);
        });
    }

    public function changePriority(Ticket $ticket, ChangePriorityData $data, User $actor): Ticket
    {
        return DB::transaction(function () use ($ticket, $data, $actor): Ticket {
            $ticket = Ticket::query()->lockForUpdate()->findOrFail($ticket->id);

            if ($ticket->status?->is_closed) {
                throw new IllegalStatusTransitionException(
                    'Prioritas tidak dapat diubah pada ticket yang sudah ditutup/diresolusi.'
                );
            }

            $priority = TicketPriority::query()->findOrFail($data->priorityId);
            $oldPriority = $ticket->priority;

            $this->writeHistory($ticket, $actor, 'priority_id', $oldPriority?->name, $priority->name);

            $ticket->priority_id = $priority->id;
            $this->slaService->recalculateFromCreation($ticket, $priority);
            $ticket->save();

            $this->auditLogger->log(
                $actor,
                AuditAction::PriorityChange,
                AuditModule::Ticket,
                $ticket->id,
                "Prioritas ticket #{$ticket->ticket_number} diubah dari {$oldPriority?->name} ke {$priority->name}.",
                ['priority_id' => $oldPriority?->id],
                ['priority_id' => $priority->id, 'sla_deadline' => $ticket->sla_deadline?->toIso8601String()],
            );

            return $ticket->fresh()->load(self::RELOAD_RELATIONS);
        });
    }

    private function applyTransition(
        Ticket $ticket,
        TicketStatusName $from,
        TicketStatusName $to,
        StatusTransitionData $data,
        User $actor,
        bool $isSelfAssign,
    ): void {
        // Cancel path requires a note.
        if ($to === TicketStatusName::Closed && $from !== TicketStatusName::Resolved) {
            if ($data->note === null || trim($data->note) === '') {
                throw new IllegalStatusTransitionException(
                    "Status tidak dapat diubah dari {$from->label()} ke CLOSED tanpa alasan. Sertakan note untuk membatalkan ticket."
                );
            }
        }

        // IN_PROGRESS target: handle self-assign, reopen, and start.
        if ($to === TicketStatusName::InProgress) {
            if ($from === TicketStatusName::Open) {
                if (! $isSelfAssign) {
                    $this->failTechnicianRequired($from->label(), $to->label());
                }
                $this->writeHistory($ticket, $actor, 'technician_id', null, $actor->full_name);
                $ticket->technician_id = $actor->id;
            } elseif ($from === TicketStatusName::Resolved) {
                $this->writeHistory($ticket, $actor, 'resolved_at', $ticket->resolved_at?->toIso8601String(), null);
                $ticket->resolved_at = null;
            } elseif ($ticket->technician_id === null) {
                $this->failTechnicianRequired($from->label(), $to->label());
            }
        }

        // RESOLVED target: record resolved_at timestamp.
        if ($to === TicketStatusName::Resolved) {
            if ($ticket->technician_id === null) {
                $this->failTechnicianRequired($from->label(), $to->label());
            }
            $this->writeHistory($ticket, $actor, 'resolved_at', null, now()->toIso8601String());
            $ticket->resolved_at = now();
        }

        // CLOSED target: record closed_at timestamp.
        if ($to === TicketStatusName::Closed) {
            $this->writeHistory($ticket, $actor, 'closed_at', null, now()->toIso8601String());
            $ticket->closed_at = now();
        }

        // Always write the status_id history row.
        $this->writeHistory($ticket, $actor, 'status_id', $from->label(), $to->label());
        $ticket->status_id = $to->id();
        $ticket->save();

        $this->storeNote($ticket, $actor, $data->note);

        $this->auditLogger->log(
            $actor,
            $this->auditActionFor($from, $to),
            AuditModule::Ticket,
            $ticket->id,
            $this->auditDescription($from, $to, $ticket->ticket_number),
            ['status_id' => $from->label()],
            ['status_id' => $to->label()],
        );

        $this->notifyTransition($ticket, $from, $to, $actor);
    }

    private function failTechnicianRequired(string $fromLabel, string $toLabel): never
    {
        throw new IllegalStatusTransitionException(
            "Status tidak dapat diubah dari {$fromLabel} ke {$toLabel} karena belum ada teknisi yang ditugaskan."
        );
    }

    private function auditActionFor(TicketStatusName $from, TicketStatusName $to): AuditAction
    {
        return match (true) {
            $from === TicketStatusName::Open && $to === TicketStatusName::InProgress => AuditAction::SelfAssign,
            $from === TicketStatusName::Resolved && $to === TicketStatusName::InProgress => AuditAction::Reopen,
            $to === TicketStatusName::InProgress => AuditAction::StatusChange,
            $to === TicketStatusName::Resolved => AuditAction::Resolve,
            $from === TicketStatusName::Resolved => AuditAction::Close,
            default => AuditAction::Cancel,
        };
    }

    private function auditDescription(TicketStatusName $from, TicketStatusName $to, string $ticketNumber): string
    {
        return match (true) {
            $from === TicketStatusName::Open && $to === TicketStatusName::InProgress => "Technician mengambil alih ticket #{$ticketNumber} dari OPEN ke IN_PROGRESS.",
            $from === TicketStatusName::Resolved && $to === TicketStatusName::InProgress => "Ticket #{$ticketNumber} dibuka kembali (RESOLVED → IN_PROGRESS).",
            $to === TicketStatusName::InProgress => "Status ticket #{$ticketNumber} diubah dari {$from->label()} ke IN_PROGRESS.",
            $to === TicketStatusName::Resolved => "Ticket #{$ticketNumber} diselesaikan (IN_PROGRESS → RESOLVED).",
            $from === TicketStatusName::Resolved => "Ticket #{$ticketNumber} ditutup (RESOLVED → CLOSED).",
            default => "Ticket #{$ticketNumber} dibatalkan ({$from->label()} → CLOSED).",
        };
    }

    private function notifyTransition(Ticket $ticket, TicketStatusName $from, TicketStatusName $to, User $actor): void
    {
        match (true) {
            $from === TicketStatusName::Resolved && $to === TicketStatusName::InProgress => $this->notifyReopen($ticket, $actor),
            $from === TicketStatusName::Open && $to === TicketStatusName::InProgress => $this->notifyRecipients(
                collect([$ticket->reporter]),
                NotificationType::TicketSelfAssigned,
                $ticket,
                $actor,
                "Ticket #{$ticket->ticket_number} telah diambil oleh {$actor->full_name}.",
            ),
            $to === TicketStatusName::Resolved => $this->notifyRecipients(
                collect([$ticket->reporter]),
                NotificationType::TicketResolved,
                $ticket,
                $actor,
                "Ticket #{$ticket->ticket_number} telah diselesaikan.",
            ),
            $from === TicketStatusName::Resolved => $this->notifyRecipients(
                collect([$ticket->technician]),
                NotificationType::TicketClosed,
                $ticket,
                $actor,
                "Ticket #{$ticket->ticket_number} telah ditutup.",
            ),
            $to === TicketStatusName::Closed => $this->notifyRecipients(
                collect([$ticket->reporter, $ticket->technician]),
                NotificationType::TicketCancelled,
                $ticket,
                $actor,
                "Ticket #{$ticket->ticket_number} telah dibatalkan.",
            ),
            default => $this->notifyRecipients(
                collect([$ticket->reporter]),
                NotificationType::TicketStatusChanged,
                $ticket,
                $actor,
                "Status ticket #{$ticket->ticket_number} menjadi IN PROGRESS.",
            ),
        };
    }

    private function notifyReopen(Ticket $ticket, User $actor): void
    {
        $managers = User::query()
            ->where('status', 'active')
            ->whereHas('role', fn ($q) => $q->where('name', RoleName::Manager->value))
            ->get();

        $recipients = collect([$ticket->technician])->merge($managers);

        $this->notifyRecipients(
            $recipients,
            NotificationType::TicketReopened,
            $ticket,
            $actor,
            "Ticket #{$ticket->ticket_number} dibuka kembali.",
        );
    }

    private function notifyRecipients(
        Collection $recipients,
        NotificationType $type,
        Ticket $ticket,
        User $actor,
        string $message,
    ): void {
        $this->notificationService->notifyMany(
            $recipients->filter(fn ($user) => $user !== null),
            $type,
            [
                'ticket_id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'title' => $ticket->title,
                'actor_name' => $actor->full_name,
                'message' => $message,
                'url' => "/tickets/{$ticket->id}",
            ],
            $actor,
        );
    }

    private function writeHistory(Ticket $ticket, User $actor, string $field, ?string $old, ?string $new): void
    {
        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'user_id' => $actor->id,
            'field_changed' => $field,
            'old_value' => $old,
            'new_value' => $new,
        ]);
    }

    private function storeNote(Ticket $ticket, User $actor, ?string $note): void
    {
        if ($note === null || trim($note) === '') {
            return;
        }

        TicketComment::create([
            'ticket_id' => $ticket->id,
            'user_id' => $actor->id,
            'body' => $note,
        ]);
    }
}
