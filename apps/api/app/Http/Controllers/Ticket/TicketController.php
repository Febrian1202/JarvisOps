<?php

namespace App\Http\Controllers\Ticket;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ticket\StoreTicketRequest;
use App\Http\Requests\Ticket\UpdateTicketRequest;
use App\Models\Ticket;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class TicketController extends Controller
{
    public function store(StoreTicketRequest $request): JsonResponse
    {
        return ApiResponse::created(null, 'Ticket created successfully.');
    }

    public function show(Ticket $ticket): JsonResponse
    {
        return ApiResponse::error('Not implemented yet.', null, 501);
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
