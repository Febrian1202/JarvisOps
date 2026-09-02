<?php

namespace App\DTOs\Asset;

class UpdateAssetData
{
    public function __construct(
        public readonly string $assetTag,
        public readonly string $name,
        public readonly string $category,
        public readonly string $brand,
        public readonly string $model,
        public readonly string $serialNumber,
        public readonly string $purchaseDate,
        public readonly string $status,
        public readonly ?string $notes = null,
        public readonly ?array $oldData = null,
    ) {}

    public static function fromArray(array $data, ?array $oldData = null): self
    {
        return new self(
            assetTag: $data['asset_tag'],
            name: $data['name'],
            category: $data['category'],
            brand: $data['brand'],
            model: $data['model'],
            serialNumber: $data['serial_number'],
            purchaseDate: $data['purchase_date'],
            status: $data['status'],
            notes: $data['notes'] ?? null,
            oldData: $oldData,
        );
    }

    public function toArray(): array
    {
        return [
            'asset_tag' => $this->assetTag,
            'name' => $this->name,
            'category' => $this->category,
            'brand' => $this->brand,
            'model' => $this->model,
            'serial_number' => $this->serialNumber,
            'purchase_date' => $this->purchaseDate,
            'status' => $this->status,
            'notes' => $this->notes,
        ];
    }

    public function oldData(): ?array
    {
        return $this->oldData;
    }

    public function newData(): array
    {
        return $this->toArray();
    }
}
