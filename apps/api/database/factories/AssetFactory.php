<?php

namespace Database\Factories;

use App\Enums\AssetStatus;
use App\Models\Asset;
use Illuminate\Database\Eloquent\Factories\Factory;

class AssetFactory extends Factory
{
    protected $model = Asset::class;

    public function definition(): array
    {
        return [
            'asset_tag' => 'AST-'.fake()->unique()->numerify('#####'),
            'name' => fake()->word().' Device',
            'category' => fake()->randomElement(['Laptop', 'Monitor', 'Printer', 'Server', 'Network']),
            'brand' => fake()->company(),
            'model' => fake()->word().' Pro',
            'serial_number' => fake()->unique()->bothify('SN-####-????'),
            'purchase_date' => fake()->date(),
            'status' => AssetStatus::Available,
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function available(): static
    {
        return $this->state(fn (array $attrs) => ['status' => AssetStatus::Available]);
    }

    public function assigned(): static
    {
        return $this->state(fn (array $attrs) => ['status' => AssetStatus::Assigned]);
    }

    public function maintenance(): static
    {
        return $this->state(fn (array $attrs) => ['status' => AssetStatus::Maintenance]);
    }

    public function retired(): static
    {
        return $this->state(fn (array $attrs) => ['status' => AssetStatus::Retired]);
    }

    public function lost(): static
    {
        return $this->state(fn (array $attrs) => ['status' => AssetStatus::Lost]);
    }
}
