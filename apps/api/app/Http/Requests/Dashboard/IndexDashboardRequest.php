<?php

namespace App\Http\Requests\Dashboard;

use Illuminate\Foundation\Http\FormRequest;

class IndexDashboardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
        ];
    }

    public function messages(): array
    {
        return [
            'date_from.date_format' => 'Format tanggal awal tidak valid (YYYY-MM-DD).',
            'date_to.date_format' => 'Format tanggal akhir tidak valid (YYYY-MM-DD).',
        ];
    }
}
