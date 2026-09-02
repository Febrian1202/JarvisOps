<?php

namespace App\Policies\Asset;

use App\Enums\RoleName;
use App\Models\Asset;
use App\Models\User;

class AssetPolicy
{
    public function viewAssignable(User $user): bool
    {
        return true;
    }

    public function viewOwn(User $user): bool
    {
        return true;
    }

    public function view(User $user, Asset $asset): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function viewAny(User $user): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function update(User $user, Asset $asset): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function delete(User $user, Asset $asset): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager);
    }

    public function assign(User $user, Asset $asset): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function release(User $user, Asset $asset): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }

    public function viewHistory(User $user, Asset $asset): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician);
    }
}
