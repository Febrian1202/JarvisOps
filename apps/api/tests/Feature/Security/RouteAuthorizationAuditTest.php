<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('public endpoints are accessible without authentication', function () {
    $this->getJson('/api/health')->assertStatus(200);
});

test('protected endpoints reject unauthenticated access with 401', function (string $method, string $uri) {
    $this->json($method, $uri)->assertStatus(401);
})->with([
    ['GET', '/api/me'],
    ['GET', '/api/tickets'],
    ['GET', '/api/assets'],
    ['GET', '/api/my-assets'],
    ['GET', '/api/articles'],
    ['GET', '/api/notifications'],
    ['GET', '/api/audit-logs'],
    ['GET', '/api/users'],
    ['GET', '/api/roles'],
    ['GET', '/api/technicians'],
    ['GET', '/api/dashboard/employee'],
    ['GET', '/api/dashboard/technician'],
    ['GET', '/api/dashboard/manager'],
    ['GET', '/api/dashboard/admin'],
]);

test('role-restricted administrative endpoints reject unauthorized roles with 403', function (string $roleMethod, string $httpMethod, string $uri, array $payload = []) {
    $user = User::factory()->{$roleMethod}()->create();
    Sanctum::actingAs($user);

    $this->json($httpMethod, $uri, $payload)->assertStatus(403);
})->with([
    // Employee forbidden from user admin
    ['employee', 'GET', '/api/users'],
    ['employee', 'GET', '/api/roles'],
    ['employee', 'GET', '/api/users/assignable'],
    ['employee', 'POST', '/api/users', [
        'full_name' => 'Bad User',
        'email' => 'bad@test.com',
        'password' => 'Secret123!',
        'password_confirmation' => 'Secret123!',
        'role_id' => 1,
        'status' => 'active',
    ]],

    // Employee forbidden from technician list & asset catalog
    ['employee', 'GET', '/api/technicians'],
    ['employee', 'GET', '/api/assets'],
    ['employee', 'POST', '/api/assets', [
        'asset_tag' => 'AST-9999',
        'name' => 'Test Asset',
        'category' => 'Laptop',
        'brand' => 'Dell',
        'model' => 'Latitude',
        'serial_number' => 'SN9999',
        'purchase_date' => '2025-01-01',
        'status' => 'available',
    ]],

    // Employee & Technician forbidden from dashboards of higher roles
    ['employee', 'GET', '/api/dashboard/technician'],
    ['employee', 'GET', '/api/dashboard/manager'],
    ['employee', 'GET', '/api/dashboard/admin'],
    ['technician', 'GET', '/api/dashboard/manager'],
    ['technician', 'GET', '/api/dashboard/admin'],
    ['manager', 'GET', '/api/dashboard/admin'],

    // Non-admin forbidden from master data modifications
    ['manager', 'POST', '/api/departments', ['name' => 'IT']],
    ['manager', 'POST', '/api/ticket-categories', ['name' => 'Bug']],
    ['manager', 'POST', '/api/ticket-priorities', ['name' => 'Urgent', 'level' => 5, 'sla_minutes' => 60]],
    ['manager', 'POST', '/api/knowledge-categories', ['name' => 'Guides']],

    // Non-manager/admin forbidden from audit logs
    ['employee', 'GET', '/api/audit-logs'],
    ['technician', 'GET', '/api/audit-logs'],
]);
