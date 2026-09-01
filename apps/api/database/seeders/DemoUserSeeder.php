<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $itDept = Department::where('name', 'Information Technology')->first();
        $hrDept = Department::where('name', 'Human Resources')->first();

        $adminRole = Role::where('name', 'administrator')->first();
        $managerRole = Role::where('name', 'manager')->first();
        $technicianRole = Role::where('name', 'technician')->first();
        $employeeRole = Role::where('name', 'employee')->first();

        $password = Hash::make('Password123!');

        $users = [
            [
                'email' => 'admin@jarvisops.test',
                'full_name' => 'Demo Administrator',
                'role_id' => $adminRole->id,
                'department_id' => $itDept?->id,
                'password' => $password,
                'status' => 'active',
                'must_change_password' => false,
            ],
            [
                'email' => 'manager@jarvisops.test',
                'full_name' => 'Demo Manager',
                'role_id' => $managerRole->id,
                'department_id' => $itDept?->id,
                'password' => $password,
                'status' => 'active',
                'must_change_password' => false,
            ],
            [
                'email' => 'technician@jarvisops.test',
                'full_name' => 'Demo Technician',
                'role_id' => $technicianRole->id,
                'department_id' => $itDept?->id,
                'password' => $password,
                'status' => 'active',
                'must_change_password' => false,
            ],
            [
                'email' => 'employee@jarvisops.test',
                'full_name' => 'Demo Employee',
                'role_id' => $employeeRole->id,
                'department_id' => $hrDept?->id,
                'password' => $password,
                'status' => 'active',
                'must_change_password' => false,
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }
    }
}
