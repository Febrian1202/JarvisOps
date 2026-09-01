<?php

namespace App\Http\Controllers\Ticket;

use App\DTOs\Ticket\CreateTicketData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ticket\StoreTicketRequest;
use App\Http\Requests\Ticket\UpdateTicketRequest;
use App\Http\Resources\Ticket\TicketResource;
use App\Models\Ticket;
use App\Services\Ticket\TicketService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class TicketController extends Controller
{
    public function __construct(
        protected TicketService $ticketService,
    ) {}

    public function store(StoreTicketRequest $request): JsonResponse
    {
        $ticket = $this->ticketService->create(CreateTicketData::fromArray($request->validated()), $request->user());

        return ApiResponse::created($ticket, 'Ticket created successfully.');
    }

    public function show(Ticket $ticket): JsonResponse
    {
        $this->authorize('view', $ticket);
        $ticket = $this->ticketService->find($ticket->id);

        return ApiResponse::success(new TicketResource($ticket), 'Ticket retrieved successfully.');
    }

    public function update(UpdateTicketRequest $request, Ticket $ticket): JsonResponse
    {
        return ApiResponse::error('Not implemented yet.', null, 501);
    }

    public function destroy(Ticket $ticket): JsonResponse
    {
        return ApiResponse::error('Not implemented yet.', null, 501);
    }
}
