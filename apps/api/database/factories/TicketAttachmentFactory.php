<?php

namespace Database\Factories;

use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TicketAttachmentFactory extends Factory
{
    protected $model = TicketAttachment::class;

    public function definition(): array
    {
        $filename = fake()->word().'.pdf';

        return [
            'ticket_id' => Ticket::factory(),
            'uploaded_by' => User::factory(),
            'original_filename' => $filename,
            'stored_filename' => fake()->uuid().'.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => fake()->numberBetween(1024, 5242880),
            'storage_path' => 'attachments/'.fake()->uuid().'.pdf',
        ];
    }
}
