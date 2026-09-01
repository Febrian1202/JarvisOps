<?php

use App\Authorization\TicketTransitionMatrix;
use App\Enums\TicketActor;
use App\Enums\TicketStatusName;

/**
 * Expected matrix cells transcribed from STATUS-TRANSITION.md §3.
 *
 * Row = source status, column = target status. Values are the TicketActor
 * values allowed for that transition. Any pair absent from the map (or
 * yielding []) is illegal — including every self-transition on the diagonal.
 *
 * T(own) from the spec is represented by TicketActor::Technician; the
 * ownership check itself is enforced elsewhere (policy/service), not here.
 */
function matrixCell(TicketStatusName $from, TicketStatusName $to): array
{
    $matrix = [
        TicketStatusName::Open->value => [
            TicketStatusName::Assigned->value => [TicketActor::Manager, TicketActor::Admin],
            TicketStatusName::InProgress->value => [TicketActor::AnyTechnician, TicketActor::Manager, TicketActor::Admin],
            TicketStatusName::Closed->value => [TicketActor::Manager, TicketActor::Admin],
        ],
        TicketStatusName::Assigned->value => [
            TicketStatusName::Open->value => [TicketActor::Manager, TicketActor::Admin],
            TicketStatusName::InProgress->value => [TicketActor::Technician, TicketActor::Manager, TicketActor::Admin],
            TicketStatusName::Closed->value => [TicketActor::Manager, TicketActor::Admin],
        ],
        TicketStatusName::InProgress->value => [
            TicketStatusName::Assigned->value => [TicketActor::Manager, TicketActor::Admin],
            TicketStatusName::Resolved->value => [TicketActor::Technician, TicketActor::Manager, TicketActor::Admin],
            TicketStatusName::Closed->value => [TicketActor::Manager, TicketActor::Admin],
        ],
        TicketStatusName::Resolved->value => [
            TicketStatusName::InProgress->value => [TicketActor::Reporter, TicketActor::Technician, TicketActor::Manager, TicketActor::Admin],
            TicketStatusName::Closed->value => [TicketActor::Reporter, TicketActor::Manager, TicketActor::Admin],
        ],
        TicketStatusName::Closed->value => [],
    ];

    return $matrix[$from->value][$to->value] ?? [];
}

dataset('statusPairs', function () {
    $pairs = [];

    foreach (TicketStatusName::cases() as $from) {
        foreach (TicketStatusName::cases() as $to) {
            $pairs[] = [$from->value, $to->value];
        }
    }

    return $pairs;
});

dataset('statusActorTriples', function () {
    $triples = [];

    foreach (TicketStatusName::cases() as $from) {
        foreach (TicketStatusName::cases() as $to) {
            foreach (TicketActor::cases() as $actor) {
                $triples[] = [$from->value, $to->value, $actor];
            }
        }
    }

    return $triples;
});

test('allowedRoles matches STATUS-TRANSITION.md matrix for every status pair', function (string $from, string $to) {
    $fromStatus = TicketStatusName::from($from);
    $toStatus = TicketStatusName::from($to);

    expect(TicketTransitionMatrix::allowedRoles($fromStatus, $toStatus))
        ->toBe(matrixCell($fromStatus, $toStatus));
})->with('statusPairs');

test('ASSIGNED to ASSIGNED is illegal and returns empty array', function () {
    expect(TicketTransitionMatrix::allowedRoles(TicketStatusName::Assigned, TicketStatusName::Assigned))
        ->toBe([]);
});

test('allows is consistent with allowedRoles for every status pair and actor', function (string $from, string $to, TicketActor $actor) {
    $fromStatus = TicketStatusName::from($from);
    $toStatus = TicketStatusName::from($to);

    $expected = in_array($actor, matrixCell($fromStatus, $toStatus), true);

    expect(TicketTransitionMatrix::allows($fromStatus, $toStatus, $actor))->toBe($expected);
})->with('statusActorTriples');

test('AnyTechnician is only allowed on OPEN to IN_PROGRESS', function () {
    expect(TicketTransitionMatrix::allows(TicketStatusName::Open, TicketStatusName::InProgress, TicketActor::AnyTechnician))
        ->toBeTrue();

    foreach (TicketStatusName::cases() as $from) {
        foreach (TicketStatusName::cases() as $to) {
            if ($from === TicketStatusName::Open && $to === TicketStatusName::InProgress) {
                continue;
            }

            expect(TicketTransitionMatrix::allows($from, $to, TicketActor::AnyTechnician))
                ->toBeFalse("AnyTechnician must not be allowed for {$from->value} -> {$to->value}");
        }
    }
});

test('TicketStatusName::fromId maps correctly', function () {
    expect(TicketStatusName::fromId(1))->toBe(TicketStatusName::Open);
    expect(TicketStatusName::fromId(2))->toBe(TicketStatusName::Assigned);
    expect(TicketStatusName::fromId(3))->toBe(TicketStatusName::InProgress);
    expect(TicketStatusName::fromId(4))->toBe(TicketStatusName::Resolved);
    expect(TicketStatusName::fromId(5))->toBe(TicketStatusName::Closed);
});

test('invalid id throws', fn () => TicketStatusName::fromId(99))
    ->throws(ValueError::class);

test('isClosed and isFinal flags', function () {
    expect(TicketStatusName::Open->isClosed())->toBeFalse();
    expect(TicketStatusName::Assigned->isClosed())->toBeFalse();
    expect(TicketStatusName::InProgress->isClosed())->toBeFalse();
    expect(TicketStatusName::Resolved->isClosed())->toBeTrue();
    expect(TicketStatusName::Closed->isClosed())->toBeTrue();

    expect(TicketStatusName::Closed->isFinal())->toBeTrue();
    expect(TicketStatusName::Resolved->isFinal())->toBeFalse();
    expect(TicketStatusName::Open->isFinal())->toBeFalse();
});

test('TicketStatusName::label equals the enum value', function () {
    foreach (TicketStatusName::cases() as $status) {
        expect($status->label())->toBe($status->value);
    }
});

test('TicketActor enum has the expected values', function () {
    expect(TicketActor::Reporter->value)->toBe('reporter')
        ->and(TicketActor::Technician->value)->toBe('technician')
        ->and(TicketActor::Manager->value)->toBe('manager')
        ->and(TicketActor::Admin->value)->toBe('admin')
        ->and(TicketActor::AnyTechnician->value)->toBe('any_technician');
});
