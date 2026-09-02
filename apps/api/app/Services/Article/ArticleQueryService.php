<?php

namespace App\Services\Article;

use App\Enums\ArticleStatus;
use App\Enums\RoleName;
use App\Http\Requests\Article\IndexArticleRequest;
use App\Models\KnowledgeArticle;
use App\Models\User;
use App\Support\HandlesPagination;
use Illuminate\Pagination\LengthAwarePaginator;

class ArticleQueryService
{
    use HandlesPagination;

    public function paginate(IndexArticleRequest $request, User $actor): LengthAwarePaginator
    {
        $query = KnowledgeArticle::with(['category', 'author']);

        $isEmployee = ! $actor->isAdmin() && ! $actor->hasRole(RoleName::Manager, RoleName::Technician);
        if ($isEmployee) {
            $query->where('status', ArticleStatus::Published->value);
        }

        if ($search = $request->query('search')) {
            $term = str_replace(['%', '_'], ['\\%', '\\_'], $search);
            $query->where(function ($q) use ($term) {
                $q->whereRaw('title LIKE ? ESCAPE ?', ["%{$term}%", '\\'])
                    ->orWhereRaw('content LIKE ? ESCAPE ?', ["%{$term}%", '\\']);
            });
        }

        if ($categoryId = $request->query('category_id')) {
            $query->where('category_id', (int) $categoryId);
        }

        if (! $isEmployee && $status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($authorId = $request->query('author_id')) {
            $query->where('author_id', (int) $authorId);
        }

        return $this->applySorting($query, $request, ['created_at', 'title', 'view_count'])
            ->paginate($this->getPerPage($request));
    }
}
