<?php

namespace App\Http\Controllers\Ticket;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ticket\TicketHistoryResource;
use App\Models\Ticket;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketHistoryController extends Controller
{
    public function index(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('viewHistory', $ticket);

        $histories = $ticket->histories()
            ->with('user:id,full_name')
            ->orderBy('created_at', 'asc')
            ->get();

        return ApiResponse::success(TicketHistoryResource::collection($histories), 'Histories retrieved successfully.');
    }
}
