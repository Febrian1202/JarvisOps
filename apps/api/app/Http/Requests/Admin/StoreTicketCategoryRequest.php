<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketCategoryRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100', Rule::unique('ticket_categories', 'name')],
            'description' => ['nullable', 'string', 'max:500'],
            'parent_id' => ['nullable', 'integer', 'exists:ticket_categories,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama kategori tiket wajib diisi.',
            'name.unique' => 'Nama kategori tiket sudah digunakan.',
            'parent_id.exists' => 'Kategori induk tidak valid.',
        ];
    }
}
