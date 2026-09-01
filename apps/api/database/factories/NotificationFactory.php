<?php

namespace Database\Factories;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => 'ticket_assigned',
            'data' => [
                'ticket_id' => fake()->numberBetween(1, 100),
                'ticket_number' => 'TCK-'.fake()->numerify('20260901-#####'),
            ],
            'is_read' => false,
            'read_at' => null,
        ];
    }
}
