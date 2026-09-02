<?php

namespace App\DTOs\User;

class CreateUserData
{
    /**
     * @param  array{employee_code?: ?string, phone?: ?string, position?: ?string, hire_date?: ?string}|null  $profile
     */
    public function __construct(
        public string $fullName,
        public string $email,
        public string $password,
        public int $roleId,
        public ?int $departmentId,
        public string $status,
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
            password: $data['password'],
            roleId: (int) $data['role_id'],
            departmentId: isset($data['department_id']) && $data['department_id'] !== null ? (int) $data['department_id'] : null,
            status: $data['status'],
            profile: $data['profile'] ?? null,
        );
    }
}
