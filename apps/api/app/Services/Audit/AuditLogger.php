<?php

namespace App\Services\Audit;

use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;

class AuditLogger
{
    public const REDACTED_KEYS = [
        'password',
        'remember_token',
        'token',
        'secret',
        'api_token',
    ];

    public function __construct(
        protected ?Request $request = null
    ) {}

    public function log(
        ?User $actor,
        AuditAction $action,
        AuditModule $module,
        ?int $moduleId = null,
        ?string $description = null,
        ?array $oldData = null,
        ?array $newData = null,
        ?Request $request = null
    ): AuditLog {
        $req = $request ?? $this->request ?? (app()->runningInConsole() ? null : (app()->bound('request') ? app('request') : null));

        return AuditLog::create([
            'user_id' => $actor?->id,
            'action' => $action->value,
            'module' => $module->value,
            'module_id' => $moduleId,
            'description' => $description,
            'old_data' => $oldData !== null ? $this->redact($oldData) : null,
            'new_data' => $newData !== null ? $this->redact($newData) : null,
            'ip_address' => $req?->ip(),
            'user_agent' => $req?->userAgent(),
        ]);
    }

    protected function redact(array $data): array
    {
        $sanitized = $data;

        foreach (self::REDACTED_KEYS as $key) {
            unset($sanitized[$key]);
        }

        return $sanitized;
    }
}
