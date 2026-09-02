<?php

namespace App\Policies\Article;

use App\Enums\ArticleStatus;
use App\Enums\RoleName;
use App\Models\KnowledgeArticle;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ArticlePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, KnowledgeArticle $article): Response|bool
    {
        if (! $user->isAdmin() && ! $user->hasRole(RoleName::Manager, RoleName::Technician)) {
            $status = $article->status instanceof ArticleStatus ? $article->status->value : $article->status;

            return $status === ArticleStatus::Published->value
                ? true
                : Response::denyAsNotFound();
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function update(User $user, KnowledgeArticle $article): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function publish(User $user, KnowledgeArticle $article): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function unpublish(User $user, KnowledgeArticle $article): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function delete(User $user, KnowledgeArticle $article): bool
    {
        if ($user->isAdmin() || $user->hasRole(RoleName::Manager)) {
            return true;
        }

        return $article->author_id === $user->id;
    }
}
