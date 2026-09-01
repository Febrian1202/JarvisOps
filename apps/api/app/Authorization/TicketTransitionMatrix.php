<?php

namespace App\Authorization;

use App\Enums\TicketActor;
use App\Enums\TicketStatusName;

/**
 * Reifies the ticket status transition matrix from STATUS-TRANSITION.md §3.
 *
 * Row = source status, column = target status. Each cell lists the
 * TicketActor values permitted for that transition; an absent cell (or the
 * empty CLOSED row) is illegal. T(own) from the spec is TicketActor::Technician
 * — ownership is enforced by the policy/service, not here. T* (self-assign)
 * is TicketActor::AnyTechnician and only exists on OPEN -> IN_PROGRESS.
 */
class TicketTransitionMatrix
{
    /**
     * @var array<string, array<string, list<TicketActor>>>
     */
    private const TRANSITIONS = [
        'OPEN' => [
            'ASSIGNED' => [TicketActor::Manager, TicketActor::Admin],
            'IN_PROGRESS' => [TicketActor::AnyTechnician, TicketActor::Manager, TicketActor::Admin],
            'CLOSED' => [TicketActor::Manager, TicketActor::Admin],
        ],
        'ASSIGNED' => [
            'OPEN' => [TicketActor::Manager, TicketActor::Admin],
            'IN_PROGRESS' => [TicketActor::Technician, TicketActor::Manager, TicketActor::Admin],
            'CLOSED' => [TicketActor::Manager, TicketActor::Admin],
        ],
        'IN_PROGRESS' => [
            'ASSIGNED' => [TicketActor::Manager, TicketActor::Admin],
            'RESOLVED' => [TicketActor::Technician, TicketActor::Manager, TicketActor::Admin],
            'CLOSED' => [TicketActor::Manager, TicketActor::Admin],
        ],
        'RESOLVED' => [
            'IN_PROGRESS' => [TicketActor::Reporter, TicketActor::Technician, TicketActor::Manager, TicketActor::Admin],
            'CLOSED' => [TicketActor::Reporter, TicketActor::Manager, TicketActor::Admin],
        ],
        'CLOSED' => [],
    ];

    /**
     * Get the actors allowed for a transition, or [] when illegal.
     *
     * @return list<TicketActor>
     */
    public static function allowedRoles(TicketStatusName $from, TicketStatusName $to): array
    {
        return self::TRANSITIONS[$from->value][$to->value] ?? [];
    }

    public static function allows(TicketStatusName $from, TicketStatusName $to, TicketActor $actor): bool
    {
        if ($from === $to) {
            return false;
        }

        return in_array($actor, self::allowedRoles($from, $to), true);
    }
}
