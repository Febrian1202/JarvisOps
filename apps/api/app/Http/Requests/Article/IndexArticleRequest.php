<?php

namespace App\Http\Requests\Article;

use App\Enums\ArticleStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:knowledge_categories,id'],
            'status' => ['nullable', 'string', Rule::in([ArticleStatus::Draft->value, ArticleStatus::Published->value])],
            'author_id' => ['nullable', 'integer', 'exists:users,id'],
            'sort_by' => ['nullable', 'string', Rule::in(['created_at', 'title', 'view_count'])],
            'sort_dir' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
