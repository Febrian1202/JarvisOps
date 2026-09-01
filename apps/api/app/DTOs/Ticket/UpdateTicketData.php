<?php

namespace App\DTOs\Ticket;

class UpdateTicketData
{
    public function __construct(
        public readonly array $fields,
        public readonly ?string $title = null,
        public readonly ?string $description = null,
        public readonly ?int $categoryId = null,
    ) {}

    public static function fromArray(array $data, array $fields): self
    {
        return new self(
            fields: $fields,
            title: in_array('title', $fields, true) ? ($data['title'] ?? null) : null,
            description: in_array('description', $fields, true) ? ($data['description'] ?? null) : null,
            categoryId: in_array('category_id', $fields, true) && isset($data['category_id']) ? (int) $data['category_id'] : null,
        );
    }
}
