<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'string'],
            'category_id' => ['sometimes', 'integer', 'exists:ticket_categories,id'],
            'status_id' => ['prohibited'],
            'technician_id' => ['prohibited'],
            'reporter_id' => ['prohibited'],
            'ticket_number' => ['prohibited'],
            'sla_duration_minutes' => ['prohibited'],
            'sla_deadline' => ['prohibited'],
            'sla_breached' => ['prohibited'],
            'sla_breached_at' => ['prohibited'],
            'resolved_at' => ['prohibited'],
            'closed_at' => ['prohibited'],
            'department_id' => ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.string' => 'Judul tiket harus berupa teks.',
            'title.max' => 'Judul tiket tidak boleh lebih dari 200 karakter.',
            'description.string' => 'Deskripsi harus berupa teks.',
            'category_id.integer' => 'Kategori harus berupa angka.',
            'category_id.exists' => 'Kategori yang dipilih tidak valid.',
            'status_id.prohibited' => 'Status tiket tidak dapat diubah lewat update umum.',
            'technician_id.prohibited' => 'Teknisi tiket tidak dapat diubah lewat update umum.',
            'reporter_id.prohibited' => 'Pelapor tiket tidak dapat diubah.',
            'ticket_number.prohibited' => 'Nomor tiket tidak dapat diubah.',
            'sla_duration_minutes.prohibited' => 'Durasi SLA tidak dapat diubah.',
            'sla_deadline.prohibited' => 'Batas waktu SLA tidak dapat diubah.',
            'sla_breached.prohibited' => 'Status SLA tidak dapat diubah.',
            'sla_breached_at.prohibited' => 'Waktu breach SLA tidak dapat diubah.',
            'resolved_at.prohibited' => 'Waktu resolusi tidak dapat diubah.',
            'closed_at.prohibited' => 'Waktu penutupan tidak dapat diubah.',
            'department_id.prohibited' => 'Departemen tidak dapat diubah.',
        ];
    }
}
