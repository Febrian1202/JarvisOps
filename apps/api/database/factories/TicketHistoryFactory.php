<?php

namespace Database\Factories;

use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TicketHistoryFactory extends Factory
{
    protected $model = TicketHistory::class;

    public function definition(): array
    {
        return [
            'ticket_id' => Ticket::factory(),
            'user_id' => User::factory(),
            'field_changed' => 'status',
            'old_value' => 'OPEN',
            'new_value' => 'IN_PROGRESS',
        ];
    }
}
