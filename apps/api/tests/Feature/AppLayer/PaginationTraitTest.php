<?php

use App\Models\User;
use App\Support\HandlesPagination;
use Illuminate\Validation\ValidationException;

class PaginationTraitTestWrapper
{
    use HandlesPagination;
}

beforeEach(function (): void {
    $this->wrapper = new PaginationTraitTestWrapper;
    $this->request = request();
});

it('defaults to 10 per page', function () {
    $perPage = $this->wrapper->getPerPage($this->request);

    expect($perPage)->toBe(10);
});

it('caps per_page at 100', function () {
    $this->request->merge(['per_page' => '500']);
    $perPage = $this->wrapper->getPerPage($this->request);

    expect($perPage)->toBe(100);
});

it('floors per_page at 1', function () {
    $this->request->merge(['per_page' => '0']);
    $perPage = $this->wrapper->getPerPage($this->request);

    expect($perPage)->toBe(1);
});

it('throws ValidationException for invalid sort_by column', function () {
    $this->request->merge(['sort_by' => 'malicious_column']);

    $this->wrapper->applySorting(User::query(), $this->request, ['created_at', 'title']);
})->throws(ValidationException::class, 'selected sort_by is invalid');

it('throws ValidationException for invalid sort_dir', function () {
    $this->request->merge(['sort_dir' => 'invalid']);

    $this->wrapper->applySorting(User::query(), $this->request, ['created_at']);
})->throws(ValidationException::class, 'selected sort_dir is invalid');

it('applies valid sorting to the query', function () {
    $this->request->merge(['sort_by' => 'title', 'sort_dir' => 'asc']);

    $query = $this->wrapper->applySorting(User::query(), $this->request, ['created_at', 'title']);

    expect($query->toSql())->toContain('order by "title" asc');
});
