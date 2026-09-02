<?php

namespace App\Http\Requests\Asset;

use App\Enums\AssetStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', Rule::enum(AssetStatus::class)],
            'category' => ['nullable', 'string', 'max:100'],
            'assigned_user_id' => ['nullable', 'integer'],
            'sort_by' => ['nullable', 'string', 'in:asset_tag,name,status,purchase_date,created_at'],
            'sort_dir' => ['nullable', 'string', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'search.max' => 'Kata kunci pencarian maksimal 100 karakter.',
            'status.enum' => 'Status aset tidak valid.',
            'category.max' => 'Kategori maksimal 100 karakter.',
            'assigned_user_id.integer' => 'ID pemegang aset harus berupa angka.',
            'sort_by.in' => 'Kolom sort_by tidak valid.',
            'sort_dir.in' => 'Arah pengurutan tidak valid.',
            'per_page.integer' => 'Jumlah item per halaman harus berupa angka.',
            'per_page.min' => 'Jumlah item per halaman minimal 1.',
        ];
    }
}
