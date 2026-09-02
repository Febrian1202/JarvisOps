<?php

namespace App\Http\Controllers\Article;

use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Http\Controllers\Controller;
use App\Http\Requests\Article\StoreKnowledgeCategoryRequest;
use App\Http\Requests\Article\UpdateKnowledgeCategoryRequest;
use App\Http\Resources\Article\KnowledgeCategoryResource;
use App\Models\KnowledgeCategory;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KnowledgeCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('knowledge-category.viewAny');

        $categories = KnowledgeCategory::query()
            ->withCount('articles')
            ->orderBy('name')
            ->get();

        return ApiResponse::success(
            KnowledgeCategoryResource::collection($categories),
            'Knowledge categories retrieved successfully.'
        );
    }

    public function show(KnowledgeCategory $knowledgeCategory): JsonResponse
    {
        $this->authorize('knowledge-category.viewAny');

        return ApiResponse::success(
            new KnowledgeCategoryResource($knowledgeCategory->loadCount('articles')),
            'Knowledge category retrieved successfully.'
        );
    }

    public function store(StoreKnowledgeCategoryRequest $request, AuditLogger $auditLogger): JsonResponse
    {
        $this->authorize('knowledge-category.manage');

        $category = KnowledgeCategory::create($request->validated());

        $auditLogger->log(
            $request->user(),
            AuditAction::Create,
            AuditModule::KnowledgeCategory,
            $category->id,
            "Kategori artikel {$category->name} dibuat.",
            null,
            $category->only(['name', 'description'])
        );

        return ApiResponse::created(
            new KnowledgeCategoryResource($category),
            'Knowledge category created successfully.'
        );
    }

    public function update(UpdateKnowledgeCategoryRequest $request, KnowledgeCategory $knowledgeCategory, AuditLogger $auditLogger): JsonResponse
    {
        $this->authorize('knowledge-category.manage');

        $oldData = $knowledgeCategory->only(['name', 'description']);

        $knowledgeCategory->update($request->validated());

        $auditLogger->log(
            $request->user(),
            AuditAction::Update,
            AuditModule::KnowledgeCategory,
            $knowledgeCategory->id,
            "Kategori artikel {$knowledgeCategory->name} diperbarui.",
            $oldData,
            $knowledgeCategory->only(['name', 'description'])
        );

        return ApiResponse::success(
            new KnowledgeCategoryResource($knowledgeCategory->fresh()),
            'Knowledge category updated successfully.'
        );
    }

    public function destroy(Request $request, KnowledgeCategory $knowledgeCategory, AuditLogger $auditLogger): JsonResponse
    {
        $this->authorize('knowledge-category.manage');

        if ($knowledgeCategory->articles()->count() > 0) {
            return ApiResponse::error('Kategori masih memiliki artikel dan tidak dapat dihapus.', status: 409);
        }

        $categoryName = $knowledgeCategory->name;
        $categoryId = $knowledgeCategory->id;

        $knowledgeCategory->delete();

        $auditLogger->log(
            $request->user(),
            AuditAction::Delete,
            AuditModule::KnowledgeCategory,
            $categoryId,
            "Kategori artikel {$categoryName} dihapus."
        );

        return ApiResponse::success(null, 'Knowledge category deleted.');
    }
}
