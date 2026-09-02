<?php

namespace App\DTOs\Sla;

readonly class SlaScanResult
{
    public function __construct(
        public int $checkedCount,
        public int $breachedCount,
        public int $notifiedCount
    ) {}
}
