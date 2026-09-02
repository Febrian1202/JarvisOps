<?php

namespace App\DTOs\Ticket;

class UpdateCommentData
{
    public function __construct(
        public readonly string $body,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            body: $data['body'],
        );
    }
}
