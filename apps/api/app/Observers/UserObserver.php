<?php

namespace App\Observers;

use App\Models\EmployeeProfile;
use App\Models\User;

class UserObserver
{
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        EmployeeProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['employee_code' => sprintf('EMP-%04d', $user->id)]
        );
    }
}
