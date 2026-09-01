<?php

namespace App\Services\Sla;

use App\Models\Ticket;
use App\Models\TicketPriority;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class SlaService
{
    public function calculateDeadline(CarbonInterface $createdAt, int $durationMinutes): CarbonInterface
    {
        return $createdAt->copy()->addMinutes($durationMinutes);
    }

    public function snapshot(Ticket $ticket, TicketPriority $priority): void
    {
        $createdAt = $ticket->created_at ? Carbon::parse($ticket->created_at) : now();
        $ticket->sla_duration_minutes = (int) $priority->sla_minutes;
        $ticket->sla_deadline = $this->calculateDeadline($createdAt, (int) $priority->sla_minutes);
    }

    public function recalculateFromCreation(Ticket $ticket, TicketPriority $priority): void
    {
        $createdAt = Carbon::parse($ticket->created_at);
        $ticket->sla_duration_minutes = (int) $priority->sla_minutes;
        $ticket->sla_deadline = $this->calculateDeadline($createdAt, (int) $priority->sla_minutes);
    }

    public function markBreached(Ticket $ticket): void
    {
        $ticket->sla_breached = true;
        $ticket->sla_breached_at = now();
        $ticket->save();
    }

    public function isBreached(Ticket $ticket): bool
    {
        if ($ticket->sla_breached) {
            return true;
        }

        if (! $ticket->sla_deadline) {
            return false;
        }

        $isClosed = (bool) ($ticket->status?->is_closed ?? false);
        if ($isClosed) {
            return false;
        }

        return now()->greaterThan(Carbon::parse($ticket->sla_deadline));
    }

    public function remainingMinutes(Ticket $ticket): ?int
    {
        if ($ticket->resolved_at !== null || $ticket->closed_at !== null) {
            return null;
        }

        if (! $ticket->sla_deadline) {
            return null;
        }

        return (int) now()->diffInMinutes(Carbon::parse($ticket->sla_deadline), false);
    }

    public function scopeBreached(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->where('sla_breached', true)
                ->orWhere(function (Builder $sub) {
                    $sub->whereHas('status', fn (Builder $statusQ) => $statusQ->where('is_closed', false))
                        ->whereNotNull('sla_deadline')
                        ->where('sla_deadline', '<', now());
                });
        });
    }

    public function scopeOnTrack(Builder $query): Builder
    {
        return $query->where(function (Builder $q) {
            $q->where('sla_breached', false)
                ->where(function (Builder $sub) {
                    $sub->whereHas('status', fn (Builder $statusQ) => $statusQ->where('is_closed', true))
                        ->orWhere('sla_deadline', '>=', now())
                        ->orWhereNull('sla_deadline');
                });
        });
    }
}
