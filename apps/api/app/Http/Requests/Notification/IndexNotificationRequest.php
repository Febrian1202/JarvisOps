<?php

namespace App\Http\Requests\Notification;

use App\Enums\NotificationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'is_read' => ['nullable', 'boolean'],
            'type' => ['nullable', 'string', Rule::enum(NotificationType::class)],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'sort_by' => ['nullable', 'string', 'in:created_at,read_at,type'],
            'sort_dir' => ['nullable', 'string', 'in:asc,desc'],
        ];
    }

    public function messages(): array
    {
        return [
            'is_read.boolean' => 'Parameter is_read harus bernilai boolean (true/false).',
            'type.enum' => 'Tipe notifikasi tidak valid.',
            'sort_by.in' => 'Kolom sort_by tidak valid.',
            'sort_dir.in' => 'Arah pengurutan tidak valid.',
        ];
    }
}
