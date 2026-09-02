<?php

namespace App\Services\Asset;

use App\DTOs\Asset\CreateAssetData;
use App\DTOs\Asset\UpdateAssetData;
use App\Enums\AssetHistoryAction;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Exceptions\StateConflictException;
use App\Models\Asset;
use App\Models\AssetHistory;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

class AssetService
{
    public function __construct(
        protected AuditLogger $auditLogger
    ) {}

    public function create(CreateAssetData $data, User $actor): Asset
    {
        return DB::transaction(function () use ($data, $actor): Asset {
            $asset = Asset::create($data->toArray());

            $this->recordHistory($asset, AssetHistoryAction::Created, 'Aset dibuat.');
            $this->auditLogger->log(
                $actor,
                AuditAction::Create,
                AuditModule::Asset,
                $asset->id,
                "Aset {$asset->asset_tag} dibuat."
            );

            return $asset;
        });
    }

    public function update(Asset $asset, UpdateAssetData $data, User $actor): Asset
    {
        $oldStatus = $asset->status?->value;

        return DB::transaction(function () use ($asset, $data, $actor, $oldStatus): Asset {
            $asset->update($data->toArray());

            $newStatus = $asset->status?->value;
            if ($oldStatus !== $newStatus) {
                $this->recordHistory(
                    $asset,
                    AssetHistoryAction::StatusChanged,
                    "Status diubah dari {$oldStatus} menjadi {$newStatus}."
                );
            }

            $this->auditLogger->log(
                $actor,
                AuditAction::Update,
                AuditModule::Asset,
                $asset->id,
                "Aset {$asset->asset_tag} diperbarui.",
                $data->oldData(),
                $data->newData()
            );

            return $asset->fresh();
        });
    }

    public function delete(Asset $asset, User $actor): void
    {
        DB::transaction(function () use ($asset, $actor): void {
            if ($asset->activeAssignment()->exists()) {
                throw new StateConflictException('Aset masih memiliki pemegang aktif dan tidak dapat dihapus.');
            }

            $asset->delete();
            $this->auditLogger->log(
                $actor,
                AuditAction::Delete,
                AuditModule::Asset,
                $asset->id,
                "Aset {$asset->asset_tag} dihapus."
            );
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
