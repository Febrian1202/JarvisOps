<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
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
        return [
            'full_name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')],
            'password' => ['required', 'string', Password::min(8)->letters()->numbers(), 'confirmed'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'status' => ['required', 'string', Rule::in(['active', 'inactive'])],
            'profile' => ['nullable', 'array'],
            'profile.employee_code' => ['nullable', 'string', 'max:50', Rule::unique('employee_profiles', 'employee_code')],
            'profile.phone' => ['nullable', 'string', 'max:30'],
            'profile.position' => ['nullable', 'string', 'max:100'],
            'profile.hire_date' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'full_name.required' => 'Nama lengkap wajib diisi.',
            'full_name.max' => 'Nama lengkap maksimal 150 karakter.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah terdaftar.',
            'password.required' => 'Password wajib diisi.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
            'role_id.required' => 'Role wajib dipilih.',
            'role_id.exists' => 'Role yang dipilih tidak valid.',
            'department_id.exists' => 'Departemen yang dipilih tidak valid.',
            'status.required' => 'Status user wajib diisi.',
            'status.in' => 'Status user tidak valid.',
            'profile.employee_code.unique' => 'Kode karyawan sudah digunakan.',
            'profile.hire_date.date' => 'Format tanggal bergabung tidak valid.',
        ];
    }
}
