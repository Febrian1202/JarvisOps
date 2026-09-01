<?php

namespace App\Enums;

enum TicketStatusName: string
{
    case Open = 'OPEN';
    case Assigned = 'ASSIGNED';
    case InProgress = 'IN_PROGRESS';
    case Resolved = 'RESOLVED';
    case Closed = 'CLOSED';

    public static function fromId(int $id): self
    {
        return match ($id) {
            1 => self::Open,
            2 => self::Assigned,
            3 => self::InProgress,
            4 => self::Resolved,
            5 => self::Closed,
            default => throw new \ValueError("Invalid status ID: {$id}"),
        };
    }

    public function id(): int
    {
        return match ($this) {
            self::Open => 1,
            self::Assigned => 2,
            self::InProgress => 3,
            self::Resolved => 4,
            self::Closed => 5,
        };
    }

    public function isClosed(): bool
    {
        return match ($this) {
            self::Resolved, self::Closed => true,
            default => false,
        };
    }

    public function isFinal(): bool
    {
        return $this === self::Closed;
    }

    public function label(): string
    {
        return $this->value;
    }
}
