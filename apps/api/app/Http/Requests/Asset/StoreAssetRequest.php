<?php

namespace App\Http\Requests\Asset;

use App\Enums\AssetStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'asset_tag' => ['required', 'string', 'max:50', Rule::unique('assets', 'asset_tag')->whereNull('deleted_at')],
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:100'],
            'brand' => ['required', 'string', 'max:100'],
            'model' => ['required', 'string', 'max:100'],
            'serial_number' => ['required', 'string', 'max:150', Rule::unique('assets', 'serial_number')->whereNull('deleted_at')],
            'purchase_date' => ['required', 'date', 'before_or_equal:today'],
            'status' => ['required', Rule::enum(AssetStatus::class)],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'asset_tag.required' => 'Tag aset wajib diisi.',
            'asset_tag.unique' => 'Tag aset sudah digunakan.',
            'name.required' => 'Nama aset wajib diisi.',
            'category.required' => 'Kategori aset wajib diisi.',
            'brand.required' => 'Merek aset wajib diisi.',
            'model.required' => 'Model aset wajib diisi.',
            'serial_number.required' => 'Nomor seri wajib diisi.',
            'serial_number.unique' => 'Nomor seri sudah digunakan.',
            'purchase_date.required' => 'Tanggal pembelian wajib diisi.',
            'purchase_date.before_or_equal' => 'Tanggal pembelian tidak boleh di masa depan.',
            'status.required' => 'Status aset wajib diisi.',
            'status.enum' => 'Status aset tidak valid.',
        ];
    }
}
