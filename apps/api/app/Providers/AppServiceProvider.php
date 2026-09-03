<?php

namespace App\Providers;

use App\Authorization\AbilityMatrix;
use App\Enums\RoleName;
use App\Models\Notification;
use App\Models\User;
use App\Policies\NotificationPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiters();

        $this->registerGates();
    }

    /**
     * Configure rate limiters.
     */
    private function configureRateLimiters(): void
    {
        RateLimiter::for('login', fn (Request $request) => app()->environment('testing', 'local') ? Limit::none() : Limit::perMinute(5)->by($request->ip()));

        RateLimiter::for('upload', fn (Request $request) => Limit::perMinute(20)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('search', fn (Request $request) => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));
    }

    /**
     * Register Gates from the AbilityMatrix plus admin exceptions (D-16).
     */
    private function registerGates(): void
    {
        // Admin blanket bypass (D-16): grant all except blacklisted abilities.
        Gate::before(function (User $user, string $ability): ?bool {
            if (! $user->isAdmin()) {
                return null;
            }

            return in_array($ability, AbilityMatrix::adminGateExceptions(), true) ? null : true;
        });

        // Pure role-based gates from the matrix.
        foreach (AbilityMatrix::getRoleAbilities() as $ability => $roles) {
            if (in_array($ability, ['user.deactivate', 'user.delete'], true)) {
                continue; // registered target-aware below (D-16 #1)
            }

            Gate::define($ability, fn (User $user) => $user->hasRole(...$roles));
        }

        // Self-protection: admin cannot deactivate/delete own account (D-16 #1).
        Gate::define('user.deactivate', fn (User $user, ?User $target = null) => $user->hasRole(RoleName::Admin) && (! $target || $target->getKey() !== $user->getKey()));

        Gate::define('user.delete', fn (User $user, ?User $target = null) => $user->hasRole(RoleName::Admin) && (! $target || $target->getKey() !== $user->getKey()));

        // Notification isolation: ownership check via NotificationPolicy (D-16 #3).
        $notificationPolicy = new NotificationPolicy;
        Gate::define('notification.viewAny', fn (User $user) => $notificationPolicy->viewAny($user));
        Gate::define('notification.markAsRead', fn (User $user, Notification $notification) => $notificationPolicy->markAsRead($user, $notification));
        Gate::define('notification.markAllAsRead', fn (User $user) => $notificationPolicy->markAllAsRead($user));
    }
}
