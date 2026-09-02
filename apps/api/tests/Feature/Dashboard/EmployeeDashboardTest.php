<?php

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\KnowledgeArticle;
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('employee dashboard contains only own data', function () {
    $employee = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();

    Ticket::factory()->open()->create(['reporter_id' => $employee->id]);
    Ticket::factory()->inProgress()->create(['reporter_id' => $employee->id]);
    Ticket::factory()->resolved()->create(['reporter_id' => $employee->id]);
    // Data milik user lain — tidak boleh muncul
    Ticket::factory()->open()->create(['reporter_id' => $other->id]);
    Ticket::factory()->resolved()->create(['reporter_id' => $other->id]);

    Sanctum::actingAs($employee);
    $response = $this->getJson('/api/dashboard/employee');

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.my_open_tickets', 2)
        ->assertJsonPath('data.my_in_progress_tickets', 1)
        ->assertJsonPath('data.my_resolved_tickets', 1);
});

test('recent_tickets limited to 5 and includes ticket_number', function () {
    $employee = User::factory()->employee()->create();
    Ticket::factory()->count(7)->open()->create(['reporter_id' => $employee->id]);

    Sanctum::actingAs($employee);
    $response = $this->getJson('/api/dashboard/employee');
    $response->assertStatus(200)
        ->assertJsonCount(5, 'data.recent_tickets')
        ->assertJsonStructure([
            'data' => [
                'recent_tickets' => [
                    '*' => ['ticket_number', 'title'],
                ],
            ],
        ]);
});

test('recent_articles only published, never draft', function () {
    $employee = User::factory()->employee()->create();
    KnowledgeArticle::factory()->create(['status' => 'published', 'published_at' => now()->subDay()]);
    KnowledgeArticle::factory()->create(['status' => 'draft', 'published_at' => null]);

    Sanctum::actingAs($employee);
    $response = $this->getJson('/api/dashboard/employee');
    $response->assertStatus(200);
    $articles = $response->json('data.recent_articles');
    expect(count($articles))->toBe(1);
});

test('my_assets returns only active assignments', function () {
    $employee = User::factory()->employee()->create();
    $asset1 = Asset::factory()->create();
    $asset2 = Asset::factory()->create();
    AssetAssignment::factory()->create(['asset_id' => $asset1->id, 'user_id' => $employee->id, 'released_at' => null]);
    AssetAssignment::factory()->create(['asset_id' => $asset2->id, 'user_id' => $employee->id, 'released_at' => now()->subDay()]);

    Sanctum::actingAs($employee);
    $response = $this->getJson('/api/dashboard/employee');
    $response->assertStatus(200)
        ->assertJsonCount(1, 'data.my_assets');
});

test('employee dashboard query count is constant under data growth', function () {
    $employee = User::factory()->employee()->create();
    Ticket::factory()->count(10)->open()->create(['reporter_id' => $employee->id]);

    Sanctum::actingAs($employee);
    DB::enableQueryLog();
    $this->getJson('/api/dashboard/employee')->assertStatus(200);
    $countBaseline = count(DB::getQueryLog());
    DB::disableQueryLog();

    Ticket::factory()->count(20)->open()->create(['reporter_id' => $employee->id]);

    DB::flushQueryLog();
    DB::enableQueryLog();
    $this->getJson('/api/dashboard/employee')->assertStatus(200);
    $countGrowth = count(DB::getQueryLog());
    DB::disableQueryLog();

    expect($countGrowth)->toBeLessThanOrEqual($countBaseline);
});
