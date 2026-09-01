<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AuditLogFactory extends Factory
{
    protected $model = AuditLog::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'action' => fake()->randomElement(['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE']),
            'module' => fake()->randomElement(['ticket', 'asset', 'user', 'article']),
            'module_id' => fake()->numberBetween(1, 100),
            'description' => fake()->sentence(),
            'old_data' => null,
            'new_data' => ['key' => 'value'],
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
        ];
    }
}
