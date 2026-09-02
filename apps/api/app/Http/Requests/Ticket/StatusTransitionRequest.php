<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StatusTransitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        Gate::authorize('changeStatus', $this->route('ticket'));

        return true;
    }

    public function rules(): array
    {
        return [
            'status_id' => ['required', 'integer', 'exists:ticket_statuses,id'],
            'note' => ['nullable', 'string', 'max:2000'],
            'expected_status_id' => ['nullable', 'integer', 'exists:ticket_statuses,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'status_id.required' => 'Status wajib dipilih.',
            'status_id.integer' => 'Status harus berupa angka.',
            'status_id.exists' => 'Status yang dipilih tidak valid.',
            'note.string' => 'Catatan harus berupa teks.',
            'note.max' => 'Catatan tidak boleh lebih dari 2000 karakter.',
            'expected_status_id.integer' => 'Expected status harus berupa angka.',
            'expected_status_id.exists' => 'Expected status yang dipilih tidak valid.',
        ];
    }
}
