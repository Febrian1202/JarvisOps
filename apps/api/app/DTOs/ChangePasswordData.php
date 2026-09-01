<?php

namespace App\DTOs;

class ChangePasswordData
{
    public function __construct(
        public readonly string $currentPassword,
        public readonly string $password,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            currentPassword: $data['current_password'],
            password: $data['password'],
        );
    }
}
