<?php

use App\Http\Requests\Audit\IndexAuditLogRequest;
use Illuminate\Support\Facades\Validator;

test('IndexAuditLogRequest validates valid query parameters', function () {
    $data = [
        'module' => 'ticket',
        'action' => 'assign',
        'module_id' => 10,
        'date_from' => '2026-09-01',
        'date_to' => '2026-09-02',
        'per_page' => 25,
        'page' => 1,
        'sort_by' => 'created_at',
        'sort_dir' => 'desc',
    ];

    $request = new IndexAuditLogRequest;
    $validator = Validator::make($data, $request->rules(), $request->messages());

    expect($validator->passes())->toBeTrue();
});

test('IndexAuditLogRequest rejects invalid parameters with Indonesian messages', function () {
    $data = [
        'module' => 'invalid_module',
        'date_from' => 'invalid-date',
        'date_to' => '2026-08-01',
    ];

    $request = new IndexAuditLogRequest;
    $validator = Validator::make($data, $request->rules(), $request->messages());

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->has('module'))->toBeTrue()
        ->and($validator->errors()->first('module'))->toBe('Modul audit log tidak valid.')
        ->and($validator->errors()->first('date_from'))->toBe('Format tanggal mulai harus YYYY-MM-DD.');
});

test('IndexAuditLogRequest converts Asia/Jakarta date_from and date_to to UTC Carbon instances', function () {
    $request = IndexAuditLogRequest::create('/api/audit-logs', 'GET', [
        'date_from' => '2026-09-01',
        'date_to' => '2026-09-01',
    ]);

    // 2026-09-01 00:00:00 WIB (UTC+7) -> 2026-08-31 17:00:00 UTC
    $fromUtc = $request->getDateFromUtc();
    expect($fromUtc)->not->toBeNull()
        ->and($fromUtc->timezoneName)->toBe('UTC')
        ->and($fromUtc->format('Y-m-d H:i:s'))->toBe('2026-08-31 17:00:00');

    // 2026-09-01 23:59:59 WIB (UTC+7) -> 2026-09-01 16:59:59 UTC
    $toUtc = $request->getDateToUtc();
    expect($toUtc)->not->toBeNull()
        ->and($toUtc->timezoneName)->toBe('UTC')
        ->and($toUtc->format('Y-m-d H:i:s'))->toBe('2026-09-01 16:59:59');
});
