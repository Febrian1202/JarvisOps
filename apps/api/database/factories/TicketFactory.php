<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TicketFactory extends Factory
{
    protected $model = Ticket::class;

    public function definition(): array
    {
        $duration = fake()->randomElement([120, 240, 480, 1440]);

        return [
            'ticket_number' => 'TCK-'.fake()->unique()->numerify('#####'),
            'title' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'category_id' => TicketCategory::factory(),
            'priority_id' => TicketPriority::factory(['sla_minutes' => $duration]),
            'status_id' => 1,
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

    public function open(): static
    {
        return $this->state(fn (array $attrs) => [
            'status_id' => 1,
            'technician_id' => null,
            'resolved_at' => null,
            'closed_at' => null,
        ]);
    }

    public function assigned(): static
    {
        return $this->state(fn (array $attrs) => [
            'status_id' => 2,
            'technician_id' => User::factory()->technician(),
        ]);
    }

    public function inProgress(): static
    {
        return $this->state(fn (array $attrs) => [
            'status_id' => 3,
            'technician_id' => User::factory()->technician(),
        ]);
    }

    public function resolved(): static
    {
        return $this->state(fn (array $attrs) => [
            'status_id' => 4,
            'resolved_at' => now(),
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attrs) => [
            'status_id' => 5,
            'closed_at' => now(),
        ]);
    }

    public function breached(): static
    {
        return $this->state(fn (array $attrs) => [
            'sla_breached' => true,
            'sla_breached_at' => now(),
            'sla_deadline' => now()->subHour(),
        ]);
    }

    public function withTechnician(): static
    {
        return $this->state(fn (array $attrs) => [
            'technician_id' => User::factory()->technician(),
        ]);
    }
}
