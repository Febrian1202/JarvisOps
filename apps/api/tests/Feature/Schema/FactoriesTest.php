<?php

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetHistory;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\Notification;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketCategory;
use App\Models\TicketComment;
use App\Models\TicketHistory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('all 18 models have working factories and user factory states work', function () {
    $admin = User::factory()->admin()->create();
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();
    $employee = User::factory()->employee()->inactive()->create();

    expect($admin->role->name)->toBe('administrator')
        ->and($manager->role->name)->toBe('manager')
        ->and($technician->role->name)->toBe('technician')
        ->and($employee->role->name)->toBe('employee')
        ->and($employee->status)->toBe('inactive')
        ->and($admin->employeeProfile)->not->toBeNull();

    $testAsset = Asset::factory()->create(['status' => 'assigned']);
    AssetAssignment::factory()->create(['asset_id' => $testAsset->id, 'user_id' => $admin->id, 'released_at' => null]);
    expect($testAsset->activeAssignment)->not->toBeNull()
        ->and($admin->activeAssignments)->toHaveCount(1)
        ->and($admin->assetAssignments)->toHaveCount(1);

    expect(Role::factory()->create())->toBeInstanceOf(Role::class)
        ->and(Department::factory()->create())->toBeInstanceOf(Department::class)
        ->and(EmployeeProfile::factory()->create())->toBeInstanceOf(EmployeeProfile::class)
        ->and(Asset::factory()->create())->toBeInstanceOf(Asset::class)
        ->and(AssetAssignment::factory()->create())->toBeInstanceOf(AssetAssignment::class)
        ->and(AssetHistory::factory()->create())->toBeInstanceOf(AssetHistory::class)
        ->and(TicketCategory::factory()->create())->toBeInstanceOf(TicketCategory::class)
        ->and(TicketPriority::factory()->create())->toBeInstanceOf(TicketPriority::class)
        ->and(TicketStatus::factory()->create())->toBeInstanceOf(TicketStatus::class)
        ->and(Ticket::factory()->create())->toBeInstanceOf(Ticket::class)
        ->and(TicketComment::factory()->create())->toBeInstanceOf(TicketComment::class)
        ->and(TicketAttachment::factory()->create())->toBeInstanceOf(TicketAttachment::class)
        ->and(TicketHistory::factory()->create())->toBeInstanceOf(TicketHistory::class)
        ->and(KnowledgeCategory::factory()->create())->toBeInstanceOf(KnowledgeCategory::class)
        ->and(KnowledgeArticle::factory()->create())->toBeInstanceOf(KnowledgeArticle::class)
        ->and(Notification::factory()->create())->toBeInstanceOf(Notification::class)
        ->and(AuditLog::factory()->create())->toBeInstanceOf(AuditLog::class);
});
