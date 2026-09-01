<?php

namespace App\Authorization;

use App\Enums\RoleName;

/**
 * Single source of truth for role-based authorization.
 *
 * Translates PERMISSION-MATRIX.md §3 exactly. Role abilities are decidable
 * purely from the user's role and are registered as Gates. Ownership-dependent
 * abilities are listed separately (getPolicyAbilities) and are enforced by
 * Policies (pending). adminGateExceptions implements DECISIONS D-16: abilities
 * where the admin blanket Gate::before must not short-circuit.
 */
class AbilityMatrix
{
    /**
     * Role-based abilities mapped to the roles allowed to perform them.
     *
     * @var array<string, list<RoleName>>
     */
    private const ROLE_ABILITIES = [
        // §3.1 Autentikasi & profil
        'auth.login' => [RoleName::Admin, RoleName::Manager, RoleName::Technician, RoleName::Employee],
        'auth.logout' => [RoleName::Admin, RoleName::Manager, RoleName::Technician, RoleName::Employee],
        'profile.view-own' => [RoleName::Admin, RoleName::Manager, RoleName::Technician, RoleName::Employee],
        'profile.change-password' => [RoleName::Admin, RoleName::Manager, RoleName::Technician, RoleName::Employee],

        // §3.7 Dashboard
        'dashboard.employee' => [RoleName::Admin, RoleName::Manager, RoleName::Technician, RoleName::Employee],
        'dashboard.technician' => [RoleName::Admin, RoleName::Manager, RoleName::Technician],
        'dashboard.manager' => [RoleName::Admin, RoleName::Manager],
        'dashboard.admin' => [RoleName::Admin],
        'analytics.technician-performance' => [RoleName::Admin, RoleName::Manager],

        // §3.8 Administrasi
        'user.viewAny' => [RoleName::Admin],
        'user.view' => [RoleName::Admin],
        'user.create' => [RoleName::Admin],
        'user.update' => [RoleName::Admin],
        'user.delete' => [RoleName::Admin],
        'user.activate' => [RoleName::Admin],
        'user.deactivate' => [RoleName::Admin],
        'user.reset-password' => [RoleName::Admin],
        'technician.list' => [RoleName::Admin, RoleName::Manager],
        'department.viewAny' => [RoleName::Admin, RoleName::Manager, RoleName::Technician, RoleName::Employee],
        'department.manage' => [RoleName::Admin],
        'ticket-category.viewAny' => [RoleName::Admin, RoleName::Manager, RoleName::Technician, RoleName::Employee],
        'ticket-category.manage' => [RoleName::Admin],
        'ticket-priority.viewAny' => [RoleName::Admin, RoleName::Manager, RoleName::Technician, RoleName::Employee],
        'ticket-priority.manage' => [RoleName::Admin],
        'ticket-status.viewAny' => [RoleName::Admin, RoleName::Manager, RoleName::Technician, RoleName::Employee],
        'knowledge-category.viewAny' => [RoleName::Admin, RoleName::Manager, RoleName::Technician, RoleName::Employee],
        'knowledge-category.manage' => [RoleName::Admin],
        'audit-log.viewAny' => [RoleName::Admin, RoleName::Manager],
        'audit-log.view' => [RoleName::Admin, RoleName::Manager],
    ];

    /**
     * Ownership-dependent abilities (own / assigned / scoped). Enforced by
     * Policies (TicketPolicy, AttachmentPolicy, AssetPolicy, ArticlePolicy,
     * NotificationPolicy). Status: pending.
     *
     * @var list<string>
     */
    private const POLICY_ABILITIES = [
        // §3.2 Ticket — TicketPolicy
        'ticket.viewAny',
        'ticket.view',
        'ticket.create',
        'ticket.update',
        'ticket.delete',
        'ticket.assign',
        'ticket.unassign',
        'ticket.changeStatus',
        'ticket.selfAssign',
        'ticket.changePriority',
        'ticket.comment',
        'ticket.viewHistory',
        'ticket.attach',
        // §3.3 Attachment — AttachmentPolicy
        'attachment.view',
        'attachment.download',
        'attachment.create',
        'attachment.delete',
        // §3.4 Asset — AssetPolicy
        'asset.viewAny',
        'asset.view',
        'asset.viewOwn',
        'asset.viewAssignable',
        'asset.create',
        'asset.update',
        'asset.delete',
        'asset.assign',
        'asset.release',
        'asset.viewHistory',
        // §3.5 Knowledge base — ArticlePolicy
        'article.viewAny',
        'article.view',
        'article.create',
        'article.update',
        'article.publish',
        'article.unpublish',
        'article.delete',
        // §3.6 Notification — NotificationPolicy
        'notification.viewAny',
        'notification.markAsRead',
        'notification.markAllAsRead',
    ];

    /**
     * Abilities excluded from the admin Gate::before blanket grant (D-16):
     * notifications are isolated per user; admin cannot deactivate/delete self.
     *
     * @var list<string>
     */
    private const ADMIN_GATE_EXCEPTIONS = [
        'notification.viewAny',
        'notification.markAsRead',
        'notification.markAllAsRead',
        'user.deactivate',
        'user.delete',
    ];

    /**
     * Get the role-based ability matrix (ability => allowed roles).
     *
     * @return array<string, list<RoleName>>
     */
    public static function getRoleAbilities(): array
    {
        return self::ROLE_ABILITIES;
    }

    /**
     * Get the ownership-dependent abilities pending Policy enforcement.
     *
     * @return list<string>
     */
    public static function getPolicyAbilities(): array
    {
        return self::POLICY_ABILITIES;
    }

    /**
     * Get the ability names excluded from the admin Gate::before (D-16).
     *
     * @return list<string>
     */
    public static function adminGateExceptions(): array
    {
        return self::ADMIN_GATE_EXCEPTIONS;
    }

    /**
     * Resolve the abilities a role is allowed to perform.
     *
     * @return list<string>
     */
    public static function permissionsFor(RoleName $role): array
    {
        $permissions = [];

        foreach (self::ROLE_ABILITIES as $ability => $roles) {
            if (in_array($role, $roles, true)) {
                $permissions[] = $ability;
            }
        }

        return $permissions;
    }
}
