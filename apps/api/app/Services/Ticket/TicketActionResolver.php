<?php

namespace App\Services\Ticket;

use App\Authorization\TicketActorResolver;
use App\Enums\RoleName;
use App\Enums\TicketAction;
use App\Enums\TicketActor;
use App\Enums\TicketStatusName;
use App\Models\Ticket;
use App\Models\User;

final class TicketActionResolver
{
    public function __construct(
        private readonly TicketActorResolver $actorResolver,
    ) {}

    /**
     * @return list<string>
     */
    public function availableActions(Ticket $ticket, User $user): array
    {
        $statusId = (int) $ticket->status_id;
        $status = TicketStatusName::fromId($statusId);

        if ($status->isFinal()) { // CLOSED
            return [];
        }

        $actors = $this->actorResolver->resolve($ticket, $user);

        if (empty($actors)) {
            return [];
        }

        $isAdminOrManager = in_array(TicketActor::Admin, $actors, true) || in_array(TicketActor::Manager, $actors, true);
        $isTechnicianPemegang = in_array(TicketActor::Technician, $actors, true);
        $isTechnicianBukanPemegang = in_array(TicketActor::AnyTechnician, $actors, true) && ! $isTechnicianPemegang;
        $isReporter = in_array(TicketActor::Reporter, $actors, true);

        /** @var list<TicketAction> $actions */
        $actions = match ($status) {
            TicketStatusName::Open => match (true) {
                $isAdminOrManager => [
                    TicketAction::Assign,
                    TicketAction::Cancel,
                    TicketAction::ChangePriority,
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                $isTechnicianBukanPemegang => [
                    TicketAction::Start,
                ],
                $isReporter => [
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                default => [],
            },
            TicketStatusName::Assigned => match (true) {
                $isAdminOrManager => [
                    TicketAction::Assign,
                    TicketAction::Unassign,
                    TicketAction::Cancel,
                    TicketAction::ChangePriority,
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                $isTechnicianPemegang => [
                    TicketAction::Start,
                    TicketAction::ChangePriority,
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                $isReporter => [
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                default => [],
            },
            TicketStatusName::InProgress => match (true) {
                $isAdminOrManager => [
                    TicketAction::Assign,
                    TicketAction::Cancel,
                    TicketAction::ChangePriority,
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                $isTechnicianPemegang => [
                    TicketAction::Resolve,
                    TicketAction::ChangePriority,
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                $isReporter => [
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                default => [],
            },
            TicketStatusName::Resolved => match (true) {
                $isAdminOrManager => [
                    TicketAction::Close,
                    TicketAction::Reopen,
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                $isTechnicianPemegang => [
                    TicketAction::Reopen,
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                $isReporter => [
                    TicketAction::Close,
                    TicketAction::Reopen,
                    TicketAction::Comment,
                    TicketAction::Attach,
                    TicketAction::Edit,
                ],
                default => [],
            },
            TicketStatusName::Closed => [],
        };

        return array_values(array_map(fn (TicketAction $action) => $action->value, $actions));
    }

    /**
     * @return list<string>
     */
    public function editableFields(Ticket $ticket, User $user): array
    {
        $statusId = (int) $ticket->status_id;
        $status = TicketStatusName::fromId($statusId);

        if ($status->isFinal()) { // CLOSED
            return [];
        }

        if ($user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician)) {
            return ['title', 'description', 'category_id'];
        }

        if ($ticket->reporter_id === $user->id) {
            return ['title', 'description'];
        }

        return [];
    }
}
