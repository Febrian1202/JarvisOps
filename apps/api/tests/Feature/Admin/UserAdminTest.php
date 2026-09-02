<?php

use App\DTOs\User\UpdateUserData;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\Department;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\Ticket;
use App\Models\User;
use App\Services\User\UserService;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

test('admin can list users with pagination, filters and search', function () {
    $dept1 = Department::factory()->create();
    $dept2 = Department::factory()->create();

    User::factory()->count(3)->create(['role_id' => 4, 'department_id' => $dept1->id, 'status' => 'active', 'full_name' => 'Staff Alpha']);
    User::factory()->count(2)->create(['role_id' => 3, 'department_id' => $dept2->id, 'status' => 'inactive', 'full_name' => 'Tech Beta']);

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $resAll = $this->getJson('/api/users');
    $resAll->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'full_name', 'email', 'status', 'role', 'department', 'employee_code', 'created_at'],
            ],
            'meta' => ['current_page', 'per_page', 'total', 'last_page', 'from', 'to'],
        ]);

    $resRole = $this->getJson('/api/users?role_id=4');
    $resRole->assertStatus(200)->assertJsonPath('meta.total', 3);

    $resDept = $this->getJson("/api/users?department_id={$dept2->id}");
    $resDept->assertStatus(200)->assertJsonPath('meta.total', 2);

    $resStatus = $this->getJson('/api/users?status=inactive');
    $resStatus->assertStatus(200)->assertJsonPath('meta.total', 2);

    $resSearch = $this->getJson('/api/users?search=Alpha');
    $resSearch->assertStatus(200)->assertJsonPath('meta.total', 3);
});

test('admin can view user detail', function () {
    $user = User::factory()->employee()->create();
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->getJson("/api/users/{$user->id}")
        ->assertStatus(200)
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonStructure(['data' => ['id', 'full_name', 'email', 'status', 'must_change_password', 'role', 'department', 'profile']]);
});

test('admin can update user and profile', function () {
    $dept = Department::factory()->create();
    $user = User::factory()->employee()->create();
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->putJson("/api/users/{$user->id}", [
        'full_name' => 'Updated Name',
        'email' => 'updated@jarvisops.test',
        'department_id' => $dept->id,
        'profile' => [
            'phone' => '0899999999',
            'position' => 'Lead Staff',
        ],
    ])->assertStatus(200)
        ->assertJsonPath('data.full_name', 'Updated Name')
        ->assertJsonPath('data.email', 'updated@jarvisops.test')
        ->assertJsonPath('data.department.id', $dept->id)
        ->assertJsonPath('data.profile.phone', '0899999999')
        ->assertJsonPath('data.profile.position', 'Lead Staff');
});

test('admin cannot change own role (403)', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $userService = app(UserService::class);
    expect(fn () => $userService->update(
        $admin,
        new UpdateUserData(fullName: 'Admin', email: $admin->email, departmentId: null, roleId: 4),
        $admin
    ))->toThrow(AccessDeniedHttpException::class, 'Admin cannot change their own role.');
});

test('admin cannot delete own account (403)', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/users/{$admin->id}")
        ->assertStatus(403);
});

test('cannot delete user who is a ticket reporter (409)', function () {
    $employee = User::factory()->employee()->create();
    Ticket::factory()->create(['reporter_id' => $employee->id]);
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/users/{$employee->id}")
        ->assertStatus(409)
        ->assertJsonPath('message', 'User masih memiliki riwayat atau rujukan aktif dan tidak dapat dihapus. Gunakan deaktivasi.');
});

test('cannot delete user who is a ticket technician (409)', function () {
    $tech = User::factory()->technician()->create();
    Ticket::factory()->create(['technician_id' => $tech->id]);
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/users/{$tech->id}")
        ->assertStatus(409);
});

test('cannot delete user who authored a knowledge article (409)', function () {
    $author = User::factory()->technician()->create();
    $category = KnowledgeCategory::factory()->create();
    KnowledgeArticle::factory()->create(['author_id' => $author->id, 'category_id' => $category->id]);
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/users/{$author->id}")
        ->assertStatus(409);
});

test('cannot delete user who has asset assignment history (409)', function () {
    $employee = User::factory()->employee()->create();
    $asset = Asset::factory()->create();
    AssetAssignment::create([
        'asset_id' => $asset->id,
        'user_id' => $employee->id,
        'assigned_at' => now(),
    ]);
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/users/{$employee->id}")
        ->assertStatus(409);
});

test('admin can delete unreferenced user', function () {
    $employee = User::factory()->employee()->create();
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/users/{$employee->id}")
        ->assertStatus(200);

    expect(User::find($employee->id))->toBeNull();
});
