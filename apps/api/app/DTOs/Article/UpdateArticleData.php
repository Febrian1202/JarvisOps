<?php

namespace App\DTOs\Article;

class UpdateArticleData
{
    public function __construct(
        public int $categoryId,
        public string $title,
        public string $content,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            categoryId: (int) $data['category_id'],
            title: (string) $data['title'],
            content: (string) $data['content'],
        );
    }
}
