<?php

namespace Database\Factories;

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class KnowledgeArticleFactory extends Factory
{
    protected $model = KnowledgeArticle::class;

    public function definition(): array
    {
        $title = fake()->sentence();

        return [
            'category_id' => KnowledgeCategory::factory(),
            'author_id' => User::factory(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.fake()->unique()->numerify('####'),
            'content' => fake()->paragraphs(3, true),
            'status' => 'published',
            'view_count' => fake()->numberBetween(0, 100),
            'published_at' => now(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attrs) => [
            'status' => 'draft',
            'published_at' => null,
        ]);
    }
}
