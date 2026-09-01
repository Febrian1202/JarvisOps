<?php

use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\TicketCategory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

uses()->group('ticket', 'request');

beforeEach(function () {
    $this->employee = User::factory()->employee()->create();
    Sanctum::actingAs($this->employee);
});

test('store requires title, description, category_id, priority_id', function () {
    $this->postJson('/api/tickets', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['title', 'description', 'category_id', 'priority_id']);
});

test('store rejects asset_id not assigned to reporter', function () {
    $otherUser = User::factory()->employee()->create();
    $asset = Asset::factory()->create(['status' => AssetStatus::Assigned]);
    AssetAssignment::factory()->create([
        'asset_id' => $asset->id,
        'user_id' => $otherUser->id,
        'released_at' => null,
    ]);

    $this->postJson('/api/tickets', [
        'title' => 'Test Ticket',
        'description' => 'Test Description',
        'category_id' => TicketCategory::where('name', 'Laptop')->first()->id,
        'priority_id' => 1,
        'asset_id' => $asset->id,
    ])->assertStatus(422)
        ->assertJsonPath('errors.asset_id', ['Asset yang dipilih tidak sedang ter-assign kepada Anda.']);
});

test('store accepts asset_id assigned to reporter', function () {
    $asset = Asset::factory()->create(['status' => AssetStatus::Assigned]);
    AssetAssignment::factory()->create([
        'asset_id' => $asset->id,
        'user_id' => $this->employee->id,
        'released_at' => null,
    ]);

    $this->postJson('/api/tickets', [
        'title' => 'Test Ticket',
        'description' => 'Test Description',
        'category_id' => TicketCategory::where('name', 'Laptop')->first()->id,
        'priority_id' => 1,
        'asset_id' => $asset->id,
    ])->assertStatus(201);
});
