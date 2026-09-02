<?php

namespace App\Http\Requests\Admin;

use App\Models\TicketPriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketPriorityRequest extends FormRequest
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
        $priorityId = $this->route('ticket_priority') instanceof TicketPriority
            ? $this->route('ticket_priority')->id
            : $this->route('ticket_priority');

        return [
            'name' => ['required', 'string', 'max:50', Rule::unique('ticket_priorities', 'name')->ignore($priorityId)],
            'level' => ['required', 'integer', 'min:1', Rule::unique('ticket_priorities', 'level')->ignore($priorityId)],
            'sla_minutes' => ['required', 'integer', 'min:1'],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama prioritas tiket wajib diisi.',
            'name.unique' => 'Nama prioritas tiket sudah digunakan.',
            'level.required' => 'Level prioritas wajib diisi.',
            'level.unique' => 'Level prioritas sudah digunakan.',
            'sla_minutes.required' => 'Durasi SLA (menit) wajib diisi.',
            'sla_minutes.min' => 'Durasi SLA minimal 1 menit.',
        ];
    }
}
