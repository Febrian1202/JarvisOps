<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

trait HandlesPagination
{
    /**
     * Resolve the page size from the request, defaulting to 10 and capping at 100.
     */
    public function getPerPage(Request $request): int
    {
        $perPage = (int) $request->query('per_page', 10);

        return max(1, min($perPage, 100));
    }

    /**
     * Apply whitelisted sorting to the query. Unknown `sort_by` columns are
     * rejected with 422 to prevent information leakage (API-CONTRACT §4).
     *
     * @param  array<int, string>  $allowedColumns
     */
    public function applySorting(Builder $query, Request $request, array $allowedColumns): Builder
    {
        $sortBy = $request->query('sort_by', 'created_at');
        $sortDir = strtolower((string) $request->query('sort_dir', 'desc'));

        if (! in_array($sortBy, $allowedColumns, true)) {
            throw ValidationException::withMessages([
                'sort_by' => ['Kolom sort_by tidak valid.'],
            ]);
        }

        if (! in_array($sortDir, ['asc', 'desc'], true)) {
            throw ValidationException::withMessages([
                'sort_dir' => ['Arah pengurutan tidak valid.'],
            ]);
        }

        return $query->orderBy($sortBy, $sortDir);
    }
}
