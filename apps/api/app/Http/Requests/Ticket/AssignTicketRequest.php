<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class AssignTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        Gate::authorize('assign', $this->route('ticket'));

        return true;
    }

    public function rules(): array
    {
        return [
            'technician_id' => ['required', 'integer',
                Rule::exists('users', 'id')->where(function ($q) {
                    $q->where('role_id', 3)->where('status', 'active');
                }),
            ],
            'note' => ['nullable', 'string', 'max:2000'],
            'expected_status_id' => ['nullable', 'integer', 'exists:ticket_statuses,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'technician_id.required' => 'Teknisi wajib dipilih.',
            'technician_id.exists' => 'Teknisi yang dipilih tidak valid atau tidak aktif.',
            'note.string' => 'Catatan harus berupa teks.',
            'note.max' => 'Catatan tidak boleh lebih dari 2000 karakter.',
            'expected_status_id.integer' => 'Expected status harus berupa angka.',
            'expected_status_id.exists' => 'Expected status yang dipilih tidak valid.',
        ];
    }
}
