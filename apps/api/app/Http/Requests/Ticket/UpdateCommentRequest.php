<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'Isi komentar wajib diisi.',
            'body.string' => 'Isi komentar harus berupa teks.',
        ];
    }
}
