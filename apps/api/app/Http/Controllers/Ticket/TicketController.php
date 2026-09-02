<?php

namespace App\Http\Controllers\Ticket;

use App\DTOs\Ticket\CreateTicketData;
use App\DTOs\Ticket\UpdateTicketData;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ticket\IndexTicketRequest;
use App\Http\Requests\Ticket\StoreTicketRequest;
use App\Http\Requests\Ticket\UpdateTicketRequest;
use App\Http\Resources\Ticket\TicketListResource;
use App\Http\Resources\Ticket\TicketResource;
use App\Models\Ticket;
use App\Services\Ticket\TicketService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    public function __construct(
        protected TicketService $ticketService,
    ) {}

    public function index(IndexTicketRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Ticket::class);

        $paginator = $this->ticketService->paginate($request, $request->user());

        return ApiResponse::paginated($paginator, 'Tickets retrieved successfully.', TicketListResource::class);
    }

    public function store(StoreTicketRequest $request): JsonResponse
    {
        $ticket = $this->ticketService->create(CreateTicketData::fromArray($request->validated()), $request->user());

        return ApiResponse::success(new TicketResource($ticket), 'Ticket created successfully.', 201);
    }

    public function show(Ticket $ticket): JsonResponse
    {
        $this->authorize('view', $ticket);
        $ticket = $this->ticketService->find($ticket->id);

        return ApiResponse::success(new TicketResource($ticket), 'Ticket retrieved successfully.');
    }

    public function update(UpdateTicketRequest $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('update', $ticket);

        $whitelist = match (true) {
            $request->user()->isAdmin(),
            $request->user()->hasRole(RoleName::Manager, RoleName::Technician) => ['title', 'description', 'category_id'],
            default => ['title', 'description'],
        };

        $fields = array_values(array_intersect($whitelist, array_keys($request->validated())));

        $ticket = $this->ticketService->update($ticket, UpdateTicketData::fromArray($request->validated(), $fields), $request->user());

        return ApiResponse::success(new TicketResource($ticket), 'Ticket updated successfully.');
    }

    public function destroy(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('delete', $ticket);
        $this->ticketService->delete($ticket, $request->user());

        return ApiResponse::success(null, 'Ticket deleted successfully.');
    }
}
