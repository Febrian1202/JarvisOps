<?php

namespace App\Http\Requests\Admin;

use App\Models\TicketCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketCategoryRequest extends FormRequest
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
        $catId = $this->route('ticket_category') instanceof TicketCategory
            ? $this->route('ticket_category')->id
            : $this->route('ticket_category');

        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('ticket_categories', 'name')->ignore($catId)],
            'description' => ['nullable', 'string', 'max:500'],
            'parent_id' => ['nullable', 'integer', 'exists:ticket_categories,id', Rule::notIn([$catId])],
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
            'parent_id.not_in' => 'Kategori tidak dapat menjadi induk bagi dirinya sendiri.',
        ];
    }
}
