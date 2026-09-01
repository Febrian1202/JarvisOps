<?php

namespace Database\Factories;

use App\Models\TicketPriority;
use Illuminate\Database\Eloquent\Factories\Factory;

class TicketPriorityFactory extends Factory
{
    protected $model = TicketPriority::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word(),
            'sla_minutes' => fake()->randomElement([120, 240, 480, 1440]),
            'description' => fake()->sentence(),
        ];
    }
}
