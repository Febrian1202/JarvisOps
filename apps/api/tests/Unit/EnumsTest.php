<?php

use App\Enums\AssetStatus;
use App\Enums\RoleName;
use App\Enums\TicketStatusName;
use App\Enums\UserStatus;
use App\Models\Concerns\SerializesDatesAsIso8601;
use Illuminate\Database\Eloquent\Model;

test('enums have expected values', function () {
    expect(RoleName::Admin->value)->toBe('administrator')
        ->and(RoleName::Manager->value)->toBe('manager')
        ->and(RoleName::Technician->value)->toBe('technician')
        ->and(RoleName::Employee->value)->toBe('employee')
        ->and(UserStatus::Active->value)->toBe('active')
        ->and(UserStatus::Inactive->value)->toBe('inactive')
        ->and(TicketStatusName::Open->value)->toBe('OPEN')
        ->and(TicketStatusName::Assigned->value)->toBe('ASSIGNED')
        ->and(TicketStatusName::InProgress->value)->toBe('IN_PROGRESS')
        ->and(TicketStatusName::Resolved->value)->toBe('RESOLVED')
        ->and(TicketStatusName::Closed->value)->toBe('CLOSED')
        ->and(AssetStatus::Available->value)->toBe('available')
        ->and(AssetStatus::Assigned->value)->toBe('assigned')
        ->and(AssetStatus::Maintenance->value)->toBe('maintenance')
        ->and(AssetStatus::Retired->value)->toBe('retired')
        ->and(AssetStatus::Lost->value)->toBe('lost');
});

test('SerializesDatesAsIso8601 serializes dates in UTC ISO 8601 format with trailing Z', function () {
    $model = new class extends Model
    {
        use SerializesDatesAsIso8601;

        public function serializeDatePublic(DateTimeInterface $date): string
        {
            return $this->serializeDate($date);
        }
    };

    $dateTime = new DateTimeImmutable('2026-09-01 17:00:00', new DateTimeZone('Asia/Jakarta'));
    expect($model->serializeDatePublic($dateTime))->toBe('2026-09-01T10:00:00Z');
});
