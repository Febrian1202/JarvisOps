<?php

namespace Database\Factories;

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AssetAssignmentFactory extends Factory
{
    protected $model = AssetAssignment::class;

    public function definition(): array
    {
        return [
            'asset_id' => Asset::factory(),
            'user_id' => User::factory(),
            'assigned_at' => fake()->dateTimeBetween('-1 year', 'now'),
            'released_at' => null,
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
