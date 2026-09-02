<?php

namespace App\Http\Requests\User;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
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
        $userId = $this->route('user') instanceof User ? $this->route('user')->id : $this->route('user');

        return [
            'full_name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($userId)],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'role_id' => ['nullable', 'integer', 'exists:roles,id'],
            'profile' => ['nullable', 'array'],
            'profile.employee_code' => ['nullable', 'string', 'max:50', Rule::unique('employee_profiles', 'employee_code')->ignore($userId, 'user_id')],
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
            'department_id.exists' => 'Departemen yang dipilih tidak valid.',
            'role_id.exists' => 'Role yang dipilih tidak valid.',
            'profile.employee_code.unique' => 'Kode karyawan sudah digunakan.',
            'profile.hire_date.date' => 'Format tanggal bergabung tidak valid.',
        ];
    }
}
