<?php

namespace App\DTOs\Asset;

class AssignAssetData
{
    public function __construct(
        public readonly int $userId,
        public readonly ?string $notes = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            userId: (int) $data['user_id'],
            notes: $data['notes'] ?? null,
        );
    }
}
