<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TicketFactory extends Factory
{
    protected $model = Ticket::class;

    public function definition(): array
    {
        $duration = fake()->randomElement([120, 240, 480, 1440]);

        return [
            'ticket_number' => 'TCK-'.fake()->numerify('20260901-#####'),
            'title' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'category_id' => TicketCategory::factory(),
            'priority_id' => TicketPriority::factory(['sla_minutes' => $duration]),
            'status_id' => TicketStatus::factory(),
            'reporter_id' => User::factory(),
            'technician_id' => null,
            'department_id' => Department::factory(),
            'asset_id' => null,
            'sla_duration_minutes' => $duration,
            'sla_deadline' => now()->addMinutes($duration),
            'resolved_at' => null,
            'closed_at' => null,
            'sla_breached' => false,
            'sla_breached_at' => null,
        ];
    }
}
