<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class ChangePriorityRequest extends FormRequest
{
    public function authorize(): bool
    {
        Gate::authorize('changePriority', $this->route('ticket'));

        return true;
    }

    public function rules(): array
    {
        return [
            'priority_id' => ['required', 'integer', 'exists:ticket_priorities,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'priority_id.required' => 'Prioritas wajib dipilih.',
            'priority_id.integer' => 'Prioritas harus berupa angka.',
            'priority_id.exists' => 'Prioritas yang dipilih tidak valid.',
        ];
    }
}
