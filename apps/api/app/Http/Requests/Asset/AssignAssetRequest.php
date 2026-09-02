<?php

namespace App\Http\Requests\Asset;

use Illuminate\Foundation\Http\FormRequest;

class AssignAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'user_id.required' => 'Pegawai penerima aset wajib dipilih.',
            'user_id.integer' => 'ID pegawai harus berupa angka.',
            'user_id.exists' => 'Pegawai yang dipilih tidak ditemukan.',
        ];
    }
}
