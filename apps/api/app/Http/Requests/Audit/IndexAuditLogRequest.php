<?php

namespace App\Http\Requests\Audit;

use App\Enums\AuditAction;
use App\Enums\AuditModule;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexAuditLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'module' => ['nullable', 'string', Rule::enum(AuditModule::class)],
            'action' => ['nullable', 'string', Rule::enum(AuditAction::class)],
            'module_id' => ['nullable', 'integer', 'min:1'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'sort_by' => ['nullable', 'string', 'in:created_at,id,module,action'],
            'sort_dir' => ['nullable', 'string', 'in:asc,desc'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.exists' => 'User yang dipilih tidak ditemukan.',
            'module.enum' => 'Modul audit log tidak valid.',
            'action.enum' => 'Aksi audit log tidak valid.',
            'date_from.date_format' => 'Format tanggal mulai harus YYYY-MM-DD.',
            'date_to.date_format' => 'Format tanggal akhir harus YYYY-MM-DD.',
            'date_to.after_or_equal' => 'Tanggal akhir harus sama dengan atau setelah tanggal mulai.',
        ];
    }

    public function getDateFromUtc(): ?Carbon
    {
        $val = $this->input('date_from') ?? $this->query('date_from');
        if (! $val) {
            return null;
        }

        return Carbon::createFromFormat('Y-m-d H:i:s', "{$val} 00:00:00", 'Asia/Jakarta')->setTimezone('UTC');
    }

    public function getDateToUtc(): ?Carbon
    {
        $val = $this->input('date_to') ?? $this->query('date_to');
        if (! $val) {
            return null;
        }

        return Carbon::createFromFormat('Y-m-d H:i:s', "{$val} 23:59:59", 'Asia/Jakarta')->setTimezone('UTC');
    }
}
