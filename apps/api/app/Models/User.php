<?php

namespace App\Models;

use App\Enums\RoleName;
use App\Models\Concerns\SerializesDatesAsIso8601;
use App\Observers\UserObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

#[ObservedBy([UserObserver::class])]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, SerializesDatesAsIso8601, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'role_id',
        'department_id',
        'email',
        'password',
        'full_name',
        'status',
        'must_change_password',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'role_id',
        'department_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * Get the role associated with the user.
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Get the department associated with the user.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the employee profile associated with the user.
     */
    public function employeeProfile(): HasOne
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    /**
     * Get the asset assignments for the user.
     */
    public function assetAssignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class);
    }

    /**
     * Get the active asset assignments for the user.
     */
    public function activeAssignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class)->whereNull('released_at');
    }

    /**
     * Check whether the user has one of the given roles.
     */
    public function hasRole(RoleName|string ...$roles): bool
    {
        $roleName = $this->role?->name;

        foreach ($roles as $role) {
            $expected = $role instanceof RoleName ? $role->value : $role;
            if ($roleName === $expected) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check whether the user is an administrator.
     */
    public function isAdmin(): bool
    {
        return $this->hasRole(RoleName::Admin);
    }
}
