<?php

namespace App\Authorization;

use App\Enums\RoleName;
use App\Enums\TicketActor;
use App\Models\Ticket;
use App\Models\User;

/**
 * Resolves the set of TicketActor values a user holds for a given ticket.
 *
 * A user may hold several actors at once (e.g. an assigned technician also
 * holds AnyTechnician). Reporter is only granted to plain employees so that
 * admin/manager/technician do not accidentally gain extra permissions
 * because they happen to be the ticket reporter.
 */
final class TicketActorResolver
{
    /**
     * @return list<TicketActor>
     */
    public function resolve(Ticket $ticket, User $user): array
    {
        $roles = [];

        if ($user->isAdmin()) {
            $roles[] = TicketActor::Admin;
        }

        if ($user->hasRole(RoleName::Manager)) {
            $roles[] = TicketActor::Manager;
        }

        if ($user->hasRole(RoleName::Technician) && $ticket->technician_id === $user->id) {
            $roles[] = TicketActor::Technician;
        }

        if ($user->hasRole(RoleName::Technician)) {
            $roles[] = TicketActor::AnyTechnician;
        }

        if ($ticket->reporter_id === $user->id
            && ! $user->isAdmin()
            && ! $user->hasRole(RoleName::Manager, RoleName::Technician)) {
            $roles[] = TicketActor::Reporter;
        }

        return $roles;
    }
}
