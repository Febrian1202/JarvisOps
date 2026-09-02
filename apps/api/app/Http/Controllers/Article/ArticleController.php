<?php

namespace App\Http\Controllers\Article;

use App\DTOs\Article\CreateArticleData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Article\StoreArticleRequest;
use App\Http\Resources\Article\ArticleResource;
use App\Models\KnowledgeArticle;
use App\Services\Article\ArticleService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ArticleController extends Controller
{
    public function store(StoreArticleRequest $request, ArticleService $articleService): JsonResponse
    {
        $this->authorize('create', KnowledgeArticle::class);

        $dto = CreateArticleData::fromArray($request->validated());
        $article = $articleService->create($dto, $request->user());

        return ApiResponse::created(new ArticleResource($article), 'Article created successfully.');
    }
}
