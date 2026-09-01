<?php

namespace Database\Factories;

use App\Models\KnowledgeCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class KnowledgeCategoryFactory extends Factory
{
    protected $model = KnowledgeCategory::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true),
            'description' => fake()->sentence(),
        ];
    }
}
