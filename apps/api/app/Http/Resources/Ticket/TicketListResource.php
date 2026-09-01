<?php

namespace App\Http\Resources\Ticket;

use App\Services\Sla\SlaService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $sla = app(SlaService::class);

        return [
            'id' => $this->id,
            'ticket_number' => $this->ticket_number,
            'title' => $this->title,
            'status' => $this->whenLoaded('status', fn () => $this->status->only('id', 'name')),
            'priority' => $this->whenLoaded('priority', fn () => $this->priority->only('id', 'name', 'sla_minutes')),
            'category' => $this->whenLoaded('category', fn () => $this->category->only('id', 'name')),
            'reporter' => $this->whenLoaded('reporter', fn () => $this->reporter->only('id', 'full_name')),
            'technician' => $this->whenLoaded('technician', fn () => $this->technician->only('id', 'full_name')),
            'sla_deadline' => $this->sla_deadline,
            'sla_breached' => $this->sla_breached,
            'sla_status' => $sla->isBreached($this->resource) ? 'breached' : 'on_track',
            'created_at' => $this->created_at,
        ];
    }
}
