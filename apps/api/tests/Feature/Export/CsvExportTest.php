<?php

namespace Tests\Feature\Export;

use App\Models\Asset;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\TicketStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CsvExportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_ticket_export_returns_csv_with_bom_and_expected_columns(): void
    {
        $manager = User::factory()->manager()->create();
        Ticket::factory()->count(3)->create();

        Sanctum::actingAs($manager);
        $response = $this->get('/api/export/tickets');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->assertHeader('Content-Disposition', 'attachment; filename="tickets-export-'.now()->format('Ymd').'.csv"');

        $content = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $content, 'Output must start with UTF-8 BOM');
        $this->assertStringContainsString('ticket_number,title,status,priority,category,reporter,technician,sla_deadline,sla_status,created_at,resolved_at', $content);
    }

    public function test_employee_cannot_export_tickets(): void
    {
        $employee = User::factory()->employee()->create();
        Sanctum::actingAs($employee);

        $response = $this->get('/api/export/tickets');
        $response->assertStatus(403);
    }

    public function test_technician_can_export_tickets_with_filters(): void
    {
        $tech = User::factory()->technician()->create();
        $openStatus = TicketStatus::where('name', 'OPEN')->first();
        $resolvedStatus = TicketStatus::where('name', 'RESOLVED')->first();

        Ticket::factory()->create([
            'title' => 'Alpha Open Issue',
            'status_id' => $openStatus->id,
        ]);
        Ticket::factory()->create([
            'title' => 'Beta Resolved Issue',
            'status_id' => $resolvedStatus->id,
        ]);

        Sanctum::actingAs($tech);
        $response = $this->get('/api/export/tickets?status_id='.$openStatus->id);

        $response->assertOk();
        $content = $response->streamedContent();

        $this->assertStringContainsString('Alpha Open Issue', $content);
        $this->assertStringNotContainsString('Beta Resolved Issue', $content);
    }

    public function test_asset_export_returns_csv_with_expected_columns(): void
    {
        $manager = User::factory()->manager()->create();
        Asset::factory()->count(2)->create();

        Sanctum::actingAs($manager);
        $response = $this->get('/api/export/assets');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('asset_tag,name,category,brand,model,serial_number,status,assigned_to,purchase_date,created_at', $content);
    }

    public function test_employee_cannot_export_assets(): void
    {
        $employee = User::factory()->employee()->create();
        Sanctum::actingAs($employee);

        $response = $this->get('/api/export/assets');
        $response->assertStatus(403);
    }

    public function test_audit_log_export_respects_manager_scope(): void
    {
        $manager = User::factory()->manager()->create();
        $admin = User::factory()->admin()->create();

        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'created',
            'module' => 'ticket',
            'module_id' => 101,
            'description' => 'Created ticket 101',
            'ip_address' => '127.0.0.1',
        ]);

        AuditLog::create([
            'user_id' => $admin->id,
            'action' => 'deleted',
            'module' => 'user',
            'module_id' => 202,
            'description' => 'Deleted user 202',
            'ip_address' => '127.0.0.1',
        ]);

        Sanctum::actingAs($manager);
        $response = $this->get('/api/export/audit-logs');

        $response->assertOk();
        $content = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('id,created_at,user,action,module,module_id,ip_address,description', $content);
        $this->assertStringContainsString('Created ticket 101', $content);
        // Manager must not see user module audit logs
        $this->assertStringNotContainsString('Deleted user 202', $content);
    }

    public function test_export_is_rate_limited(): void
    {
        $manager = User::factory()->manager()->create();
        Sanctum::actingAs($manager);

        // Rate limiter throttle:export is 10/min
        for ($i = 0; $i < 10; $i++) {
            $this->get('/api/export/tickets')->assertOk();
        }

        $this->get('/api/export/tickets')->assertStatus(429);
    }
}
