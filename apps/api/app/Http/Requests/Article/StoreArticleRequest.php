<?php

namespace App\Http\Requests\Article;

use App\Enums\ArticleStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreArticleRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:200'],
            'category_id' => ['required', 'integer', 'exists:knowledge_categories,id'],
            'content' => ['required', 'string'],
            'status' => ['nullable', 'string', Rule::in([ArticleStatus::Draft->value, ArticleStatus::Published->value])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Judul artikel wajib diisi.',
            'title.max' => 'Judul artikel maksimal 200 karakter.',
            'category_id.required' => 'Kategori artikel wajib dipilih.',
            'category_id.exists' => 'Kategori artikel tidak valid.',
            'content.required' => 'Konten artikel wajib diisi.',
            'status.in' => 'Status artikel harus bernilai draft atau published.',
        ];
    }
}
