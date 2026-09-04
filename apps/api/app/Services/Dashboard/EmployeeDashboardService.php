<?php

namespace App\Services\Dashboard;

use App\Http\Resources\Article\ArticleListResource;
use App\Http\Resources\Asset\AssignableAssetResource;
use App\Http\Resources\Ticket\TicketListResource;
use App\Models\Asset;
use App\Models\KnowledgeArticle;
use App\Models\Ticket;
use App\Models\User;

class EmployeeDashboardService
{
    public function __construct(
        protected DashboardCountsQuery $countsQuery,
    ) {}

    public function get(User $actor): array
    {
        $tickets = Ticket::query()->where('reporter_id', $actor->id);

        return [
            'my_open_tickets' => $this->countsQuery->countOpenTickets($tickets),
            'my_in_progress_tickets' => $this->countsQuery->countOpenByStatus(clone $tickets, 3),
            'my_resolved_tickets' => (clone $tickets)->whereNotNull('resolved_at')->count(),
            'recent_tickets' => TicketListResource::collection(
                (clone $tickets)
                    ->with(['status', 'priority', 'category', 'reporter', 'technician'])
                    ->latest('created_at')
                    ->limit(5)
                    ->get()
            )->resolve(),
            'my_assets' => AssignableAssetResource::collection(
                Asset::whereHas('activeAssignment', fn ($q) => $q->where('user_id', $actor->id))
                    ->orderBy('asset_tag')
                    ->limit(5)
                    ->get()
            )->resolve(),
            'recent_articles' => ArticleListResource::collection(
                KnowledgeArticle::query()
                    ->where('status', 'published')
                    ->whereNotNull('published_at')
                    ->with(['category', 'author'])
                    ->latest('published_at')
                    ->limit(5)
                    ->get()
            )->resolve(),
        ];
    }
}
