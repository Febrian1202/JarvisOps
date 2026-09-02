<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class IndexTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string'],
            'status_id' => ['nullable', 'string', 'regex:/^\d+(,\d+)*$/'],
            'priority_id' => ['nullable', 'string', 'regex:/^\d+(,\d+)*$/'],
            'category_id' => ['nullable', 'string', 'regex:/^\d+(,\d+)*$/'],
            'technician_id' => ['nullable', 'string', 'regex:/^(unassigned|\d+)$/'],
            'reporter_id' => ['nullable', 'integer'],
            'department_id' => ['nullable', 'integer'],
            'asset_id' => ['nullable', 'integer'],
            'sla_status' => ['nullable', 'string', 'in:on_track,breached'],
            'created_from' => ['nullable', 'date_format:Y-m-d'],
            'created_to' => ['nullable', 'date_format:Y-m-d'],
            'sort_by' => ['nullable', 'string', 'in:created_at,updated_at,sla_deadline,priority_id,status_id,ticket_number'],
            'sort_dir' => ['nullable', 'string', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'search.string' => 'Pencarian harus berupa teks.',
            'status_id.regex' => 'Filter status tidak valid.',
            'priority_id.regex' => 'Filter prioritas tidak valid.',
            'category_id.regex' => 'Filter kategori tidak valid.',
            'technician_id.regex' => 'Filter teknisi tidak valid.',
            'reporter_id.integer' => 'Filter pelapor tidak valid.',
            'department_id.integer' => 'Filter departemen tidak valid.',
            'asset_id.integer' => 'Filter aset tidak valid.',
            'sla_status.in' => 'Filter SLA tidak valid.',
            'created_from.date_format' => 'Tanggal awal tidak valid.',
            'created_to.date_format' => 'Tanggal akhir tidak valid.',
            'sort_by.in' => 'Kolom sort_by tidak valid.',
            'sort_dir.in' => 'Arah pengurutan tidak valid.',
            'per_page.integer' => 'Per halaman harus berupa angka.',
            'per_page.min' => 'Per halaman minimal 1.',
        ];
    }
}
