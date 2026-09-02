<?php

namespace App\Services\Sla;

use App\DTOs\Sla\SlaScanResult;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Enums\NotificationType;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Notification\NotificationService;
use Illuminate\Support\Facades\DB;

class SlaBreachDetector
{
    public function __construct(
        protected SlaService $slaService,
        protected NotificationService $notificationService,
        protected AuditLogger $auditLogger
    ) {}

    public function scan(int $chunkSize = 250): SlaScanResult
    {
        $checked = 0;
        $breached = 0;
        $notified = 0;

        // Ambil seluruh manager aktif
        $managers = User::query()
            ->where('status', UserStatus::Active->value)
            ->whereHas('role', fn ($q) => $q->where('name', RoleName::Manager->value))
            ->get();

        $this->slaService->breachCandidates()
            ->with(['technician', 'status'])
            ->chunkById($chunkSize, function ($tickets) use (&$checked, &$breached, &$notified, $managers) {
                foreach ($tickets as $ticket) {
                    $checked++;

                    DB::transaction(function () use ($ticket, &$breached, &$notified, $managers) {
                        /** @var Ticket|null $lockedTicket */
                        $lockedTicket = Ticket::where('id', $ticket->id)
                            ->lockForUpdate()
                            ->first();

                        if (! $lockedTicket || $lockedTicket->sla_breached) {
                            return;
                        }

                        if ($lockedTicket->status && $lockedTicket->status->is_closed) {
                            return;
                        }

                        // 1. Tandai Breach
                        $this->slaService->markBreached($lockedTicket);
                        $breached++;

                        // 2. Kumpulkan Penerima Notifikasi
                        $recipients = collect();
                        if ($lockedTicket->technician && $lockedTicket->technician->status === UserStatus::Active->value) {
                            $recipients->push($lockedTicket->technician);
                        }
                        $recipients = $recipients->merge($managers)->unique('id');

                        // 3. Kirim Notifikasi
                        $notifData = [
                            'ticket_id' => $lockedTicket->id,
                            'ticket_number' => $lockedTicket->ticket_number,
                            'title' => $lockedTicket->title,
                            'actor_name' => 'Sistem',
                            'message' => "SLA tiket #{$lockedTicket->ticket_number} telah terlampaui.",
                            'url' => "/tickets/{$lockedTicket->id}",
                        ];

                        $this->notificationService->notifyMany(
                            recipients: $recipients,
                            type: NotificationType::TicketSlaBreached,
                            data: $notifData,
                            actor: null
                        );
                        $notified += $recipients->count();

                        // 4. Catat Audit Log
                        $this->auditLogger->log(
                            actor: null,
                            action: AuditAction::SlaBreach,
                            module: AuditModule::Ticket,
                            moduleId: $lockedTicket->id,
                            description: "SLA tiket #{$lockedTicket->ticket_number} terlampaui dan ditandai oleh sistem."
                        );
                    });
                }
            });

        return new SlaScanResult($checked, $breached, $notified);
    }
}
