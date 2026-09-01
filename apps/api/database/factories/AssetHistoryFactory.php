<?php

namespace Database\Factories;

use App\Models\Asset;
use App\Models\AssetHistory;
use Illuminate\Database\Eloquent\Factories\Factory;

class AssetHistoryFactory extends Factory
{
    protected $model = AssetHistory::class;

    public function definition(): array
    {
        return [
            'asset_id' => Asset::factory(),
            'action' => fake()->randomElement(['CREATED', 'ASSIGNED', 'RELEASED', 'MAINTENANCE', 'RETIRED']),
            'description' => fake()->sentence(),
            'action_at' => now(),
        ];
    }
}
