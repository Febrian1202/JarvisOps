<?php

namespace App\DTOs\Ticket;

class ChangePriorityData
{
    public function __construct(
        public readonly int $priorityId,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            priorityId: (int) $data['priority_id'],
        );
    }
}
