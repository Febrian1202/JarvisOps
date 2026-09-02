<?php

namespace App\Services\Article;

use App\DTOs\Article\CreateArticleData;
use App\DTOs\Article\UpdateArticleData;
use App\Enums\ArticleStatus;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Models\KnowledgeArticle;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ArticleService
{
    public function __construct(
        protected AuditLogger $auditLogger,
    ) {}

    public function create(CreateArticleData $data, User $actor): KnowledgeArticle
    {
        return DB::transaction(function () use ($data, $actor): KnowledgeArticle {
            $status = $data->status ?? ArticleStatus::Draft->value;
            $isPublished = $status === ArticleStatus::Published->value;

            $article = KnowledgeArticle::create([
                'category_id' => $data->categoryId,
                'author_id' => $actor->id,
                'title' => $data->title,
                'slug' => $this->generateSlug($data->title),
                'content' => $data->content,
                'status' => $status,
                'published_at' => $isPublished ? now() : null,
                'view_count' => 0,
            ]);

            $this->auditLogger->log(
                $actor,
                AuditAction::Create,
                AuditModule::Article,
                $article->id,
                "Artikel {$article->title} dibuat.",
                null,
                [
                    'title' => $article->title,
                    'category_id' => $article->category_id,
                    'status' => $article->status?->value ?? (string) $article->status,
                ]
            );

            return $article->load(['category', 'author']);
        });
    }

    public function update(KnowledgeArticle $article, UpdateArticleData $data, User $actor): KnowledgeArticle
    {
        $oldData = $article->only(['title', 'content', 'category_id']);

        return DB::transaction(function () use ($article, $data, $actor, $oldData): KnowledgeArticle {
            $article->update([
                'title' => $data->title,
                'content' => $data->content,
                'category_id' => $data->categoryId,
            ]);

            $this->auditLogger->log(
                $actor,
                AuditAction::Update,
                AuditModule::Article,
                $article->id,
                "Artikel {$article->title} diperbarui.",
                $oldData,
                [
                    'title' => $data->title,
                    'content' => $data->content,
                    'category_id' => $data->categoryId,
                ]
            );

            return $article->fresh()->load(['category', 'author']);
        });
    }

    public function delete(KnowledgeArticle $article, User $actor): void
    {
        DB::transaction(function () use ($article, $actor): void {
            $article->delete();

            $this->auditLogger->log(
                $actor,
                AuditAction::Delete,
                AuditModule::Article,
                $article->id,
                "Artikel {$article->title} dihapus."
            );
        });
    }

    public function publish(KnowledgeArticle $article, User $actor): KnowledgeArticle
    {
        return DB::transaction(function () use ($article, $actor): KnowledgeArticle {
            $article->update([
                'status' => ArticleStatus::Published,
                'published_at' => now(),
            ]);

            $this->auditLogger->log(
                $actor,
                AuditAction::Publish,
                AuditModule::Article,
                $article->id,
                "Artikel {$article->title} dipublikasikan."
            );

            return $article->fresh()->load(['category', 'author']);
        });
    }

    public function unpublish(KnowledgeArticle $article, User $actor): KnowledgeArticle
    {
        return DB::transaction(function () use ($article, $actor): KnowledgeArticle {
            $article->update([
                'status' => ArticleStatus::Draft,
            ]);

            $this->auditLogger->log(
                $actor,
                AuditAction::Unpublish,
                AuditModule::Article,
                $article->id,
                "Artikel {$article->title} ditarik dari publikasi."
            );

            return $article->fresh()->load(['category', 'author']);
        });
    }

    protected function generateSlug(string $title): string
    {
        $base = Str::slug($title);

        if ($base === '') {
            $base = 'article-'.Str::lower(Str::random(6));
        }

        $slug = $base;
        $counter = 1;

        while (KnowledgeArticle::withTrashed()->where('slug', $slug)->exists()) {
            $counter++;
            $slug = "{$base}-{$counter}";
        }

        return $slug;
    }
}
