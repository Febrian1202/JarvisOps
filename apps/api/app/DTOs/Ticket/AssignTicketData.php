<?php

namespace App\DTOs\Ticket;

class AssignTicketData
{
    public function __construct(
        public readonly int $technicianId,
        public readonly ?string $note = null,
        public readonly ?int $expectedStatusId = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            technicianId: (int) $data['technician_id'],
            note: $data['note'] ?? null,
            expectedStatusId: isset($data['expected_status_id']) ? (int) $data['expected_status_id'] : null,
        );
    }
}
