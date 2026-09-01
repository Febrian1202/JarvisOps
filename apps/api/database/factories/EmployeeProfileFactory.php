<?php

namespace Database\Factories;

use App\Models\EmployeeProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeProfileFactory extends Factory
{
    protected $model = EmployeeProfile::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->createQuietly(),
            'employee_code' => 'EMP-'.fake()->unique()->numerify('####'),
            'phone' => fake()->phoneNumber(),
            'position' => fake()->jobTitle(),
            'hire_date' => fake()->date(),
        ];
    }
}
