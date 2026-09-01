<?php

namespace App\DTOs\Auth;

class UpdateProfileData
{
    public function __construct(
        public readonly string $fullName,
        public readonly ?string $phone = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            fullName: $data['full_name'],
            phone: isset($data['phone']) ? (string) $data['phone'] : null,
        );
    }
}
