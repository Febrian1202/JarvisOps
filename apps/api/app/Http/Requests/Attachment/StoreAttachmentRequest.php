<?php

namespace App\Http\Requests\Attachment;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:5120',
                'mimetypes:image/jpeg,image/png,application/pdf',
                'mimes:jpg,jpeg,png,pdf',
                'extensions:jpg,jpeg,png,pdf',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'File wajib diunggah.',
            'file.file' => 'Kolom file harus berupa berkas.',
            'file.max' => 'Ukuran file tidak boleh melebihi 5 MB.',
            'file.mimetypes' => 'Tipe file tidak diizinkan. Hanya JPG, JPEG, PNG, atau PDF.',
            'file.extensions' => 'Ekstensi file tidak diizinkan. Hanya jpg, jpeg, png, atau pdf.',
        ];
    }
}
