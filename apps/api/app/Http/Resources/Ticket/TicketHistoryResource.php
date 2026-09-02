<?php

namespace App\Http\Resources\Ticket;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'field_changed' => $this->field_changed,
            'old_value' => $this->old_value,
            'new_value' => $this->new_value,
            'user' => [
                'id' => $this->user?->id ?? $this->user_id,
                'full_name' => $this->user?->full_name,
            ],
            'created_at' => $this->created_at,
        ];
    }
}
