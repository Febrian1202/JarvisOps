<?php

namespace App\DTOs\Ticket;

class CreateTicketData
{
    public function __construct(
        public readonly string $title,
        public readonly string $description,
        public readonly int $categoryId,
        public readonly int $priorityId,
        public readonly ?int $assetId = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            title: $data['title'],
            description: $data['description'],
            categoryId: (int) $data['category_id'],
            priorityId: (int) $data['priority_id'],
            assetId: isset($data['asset_id']) ? (int) $data['asset_id'] : null,
        );
    }
}
