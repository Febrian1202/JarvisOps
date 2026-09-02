<?php

namespace App\Http\Controllers\Article;

use App\DTOs\Article\CreateArticleData;
use App\DTOs\Article\UpdateArticleData;
use App\Enums\ArticleStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Article\StoreArticleRequest;
use App\Http\Requests\Article\UpdateArticleRequest;
use App\Http\Resources\Article\ArticleResource;
use App\Models\KnowledgeArticle;
use App\Services\Article\ArticleService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    public function show(KnowledgeArticle $article): JsonResponse
    {
        $this->authorize('view', $article);

        $statusValue = $article->status instanceof ArticleStatus ? $article->status->value : $article->status;
        if ($statusValue === ArticleStatus::Published->value) {
            KnowledgeArticle::withoutTimestamps(fn () => $article->increment('view_count'));
        }

        $related = KnowledgeArticle::query()
            ->where('category_id', $article->category_id)
            ->where('id', '!=', $article->id)
            ->where('status', ArticleStatus::Published->value)
            ->orderByDesc('view_count')
            ->orderByDesc('published_at')
            ->take(5)
            ->get(['id', 'title', 'slug', 'view_count']);

        $resource = new ArticleResource($article->load(['category', 'author']));
        $resource->additional(['related_articles' => $related]);

        return ApiResponse::success($resource, 'Article retrieved successfully.');
    }

    public function store(StoreArticleRequest $request, ArticleService $articleService): JsonResponse
    {
        $this->authorize('create', KnowledgeArticle::class);

        $dto = CreateArticleData::fromArray($request->validated());
        $article = $articleService->create($dto, $request->user());

        return ApiResponse::created(new ArticleResource($article), 'Article created successfully.');
    }

    public function update(UpdateArticleRequest $request, KnowledgeArticle $article, ArticleService $articleService): JsonResponse
    {
        $this->authorize('update', $article);

        $dto = UpdateArticleData::fromArray($request->validated());
        $updated = $articleService->update($article, $dto, $request->user());

        return ApiResponse::success(new ArticleResource($updated), 'Article updated successfully.');
    }

    public function destroy(Request $request, KnowledgeArticle $article, ArticleService $articleService): JsonResponse
    {
        $this->authorize('delete', $article);

        $articleService->delete($article, $request->user());

        return ApiResponse::success(null, 'Article deleted successfully.');
    }
}
