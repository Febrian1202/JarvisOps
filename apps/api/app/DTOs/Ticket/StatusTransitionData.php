<?php

namespace App\DTOs\Ticket;

class StatusTransitionData
{
    public function __construct(
        public readonly int $statusId,
        public readonly ?string $note = null,
        public readonly ?int $expectedStatusId = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            statusId: (int) $data['status_id'],
            note: $data['note'] ?? null,
            expectedStatusId: isset($data['expected_status_id']) ? (int) $data['expected_status_id'] : null,
        );
    }
}
