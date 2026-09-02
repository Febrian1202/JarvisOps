<?php

use App\Http\Requests\Dashboard\IndexDashboardRequest;
use Illuminate\Support\Facades\Validator;

test('valid date formats pass', function () {
    $request = new IndexDashboardRequest;
    $validator = Validator::make(
        ['date_from' => '2026-08-01', 'date_to' => '2026-08-31'],
        $request->rules(),
        $request->messages()
    );
    expect($validator->passes())->toBeTrue();
});

test('invalid date format fails with custom message', function () {
    $request = new IndexDashboardRequest;
    $validator = Validator::make(
        ['date_from' => '01-08-2026'],
        $request->rules(),
        $request->messages()
    );
    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->first('date_from'))->toBe('Format tanggal awal tidak valid (YYYY-MM-DD).');
});
