<?php

namespace App\Rules\Ticket;

use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class AssetAssignedToReporter implements ValidationRule
{
    public function __construct(private readonly ?User $user) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value) {
            return;
        }

        $activeAssignment = AssetAssignment::query()
            ->where('asset_id', $value)
            ->where('user_id', $this->user?->id)
            ->whereNull('released_at')
            ->exists();

        $asset = Asset::whereKey($value)->first();

        if (! $activeAssignment || ! $asset || in_array($asset->status, [AssetStatus::Retired, AssetStatus::Lost], true)) {
            $fail('Asset yang dipilih tidak sedang ter-assign kepada Anda.');
        }
    }
}
