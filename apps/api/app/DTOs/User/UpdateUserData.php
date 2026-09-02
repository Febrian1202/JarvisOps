<?php

namespace App\DTOs\User;

class UpdateUserData
{
    /**
     * @param  array{employee_code?: ?string, phone?: ?string, position?: ?string, hire_date?: ?string}|null  $profile
     */
    public function __construct(
        public string $fullName,
        public string $email,
        public ?int $departmentId,
        public ?int $roleId = null,
        public ?array $profile = null,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            fullName: $data['full_name'],
            email: $data['email'],
            departmentId: isset($data['department_id']) && $data['department_id'] !== null ? (int) $data['department_id'] : null,
            roleId: isset($data['role_id']) && $data['role_id'] !== null ? (int) $data['role_id'] : null,
            profile: $data['profile'] ?? null,
        );
    }
}
