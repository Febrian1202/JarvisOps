<?php

namespace App\Services\Asset;

use App\DTOs\Asset\AssignAssetData;
use App\DTOs\Asset\ReleaseAssetData;
use App\Enums\AssetHistoryAction;
use App\Enums\AssetStatus;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Exceptions\StateConflictException;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetHistory;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssetAssignmentService
{
    public function __construct(
        protected AuditLogger $auditLogger
    ) {}

    public function assign(Asset $asset, AssignAssetData $data, User $actor): Asset
    {
        return DB::transaction(function () use ($asset, $data, $actor): Asset {
            /** @var Asset $locked */
            $locked = Asset::whereKey($asset->getKey())->lockForUpdate()->firstOrFail();

            if (in_array($locked->status?->value, ['maintenance', 'retired', 'lost'], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Aset berstatus '.$locked->status?->value.' tidak dapat ditugaskan.'],
                ]);
            }

            if ($locked->activeAssignment()->exists()) {
                throw new StateConflictException('Aset masih memiliki pemegang aktif.');
            }

            $user = User::where('id', $data->userId)->where('status', 'active')->first();
            if (! $user) {
                throw ValidationException::withMessages([
                    'user_id' => ['Pegawai yang dipilih tidak valid atau tidak aktif.'],
                ]);
            }

            AssetAssignment::create([
                'asset_id' => $locked->id,
                'user_id' => $user->id,
                'assigned_at' => now(),
                'released_at' => null,
                'notes' => $data->notes,
            ]);

            $locked->update(['status' => AssetStatus::Assigned]);

            $this->recordHistory(
                $locked,
                AssetHistoryAction::Assigned,
                "Aset ditugaskan kepada {$user->full_name}."
            );

            $this->auditLogger->log(
                $actor,
                AuditAction::Assign,
                AuditModule::Asset,
                $locked->id,
                "Aset {$locked->asset_tag} ditugaskan kepada {$user->full_name}."
            );

            return $locked->fresh(['activeAssignment.user']);
        });
    }

    public function release(Asset $asset, ReleaseAssetData $data, User $actor): Asset
    {
        return DB::transaction(function () use ($asset, $data, $actor): Asset {
            /** @var Asset $locked */
            $locked = Asset::whereKey($asset->getKey())->lockForUpdate()->firstOrFail();

            $assignment = $locked->activeAssignment()->first();
            if (! $assignment) {
                throw new StateConflictException('Aset tidak memiliki pemegang aktif.');
            }

            $assignment->update([
                'released_at' => now(),
                'notes' => $data->notes ?? $assignment->notes,
            ]);
            $locked->update(['status' => AssetStatus::Available]);

            $this->recordHistory(
                $locked,
                AssetHistoryAction::Released,
                'Aset dilepaskan dari pemegang aktif.'
            );

            $this->auditLogger->log(
                $actor,
                AuditAction::Release,
                AuditModule::Asset,
                $locked->id,
                "Aset {$locked->asset_tag} dilepaskan."
            );

            return $locked->fresh();
        });
    }

    protected function recordHistory(Asset $asset, AssetHistoryAction $action, string $description): AssetHistory
    {
        return AssetHistory::create([
            'asset_id' => $asset->id,
            'action' => $action->value,
            'description' => $description,
            'action_at' => now(),
        ]);
    }
}
