<?php

namespace App\Http\Requests\Ticket;

use App\Rules\Ticket\AssetAssignedToReporter;
use Illuminate\Foundation\Http\FormRequest;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string'],
            'category_id' => ['required', 'integer', 'exists:ticket_categories,id'],
            'priority_id' => ['required', 'integer', 'exists:ticket_priorities,id'],
            'asset_id' => ['nullable', 'integer', 'exists:assets,id', new AssetAssignedToReporter($this->user())],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Judul tiket wajib diisi.',
            'title.string' => 'Judul tiket harus berupa teks.',
            'title.max' => 'Judul tiket tidak boleh lebih dari 200 karakter.',
            'description.required' => 'Deskripsi wajib diisi.',
            'description.string' => 'Deskripsi harus berupa teks.',
            'category_id.required' => 'Kategori wajib dipilih.',
            'category_id.integer' => 'Kategori harus berupa angka.',
            'category_id.exists' => 'Kategori yang dipilih tidak valid.',
            'priority_id.required' => 'Prioritas wajib dipilih.',
            'priority_id.integer' => 'Prioritas harus berupa angka.',
            'priority_id.exists' => 'Prioritas yang dipilih tidak valid.',
            'asset_id.integer' => 'Asset harus berupa angka.',
            'asset_id.exists' => 'Asset yang dipilih tidak valid.',
        ];
    }
}
