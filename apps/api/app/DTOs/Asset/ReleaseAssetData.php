<?php

namespace App\DTOs\Asset;

class ReleaseAssetData
{
    public function __construct(
        public readonly ?string $notes = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            notes: $data['notes'] ?? null,
        );
    }
}
