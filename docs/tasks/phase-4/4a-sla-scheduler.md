# Fase 4a — SLA Scheduler & Breach Detection (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini fokus pada latar belakang background scheduler, migrasi index, dan integritas transaksi saat breach terdeteksi.

**Goal:** Membangun deteksi otomatis pelanggaran SLA berbasis scheduler periodik (tiap 5 menit), menandai tiket sebagai breached secara persisten (`sla_breached = true`, `sla_breached_at = now()`), mencatat audit trail sistem (`action = 'sla_breach'`, `user_id = null`), dan mengirimkan notifikasi (`TICKET_SLA_BREACHED`) kepada teknisi terkait serta seluruh Manager aktif.

**Branch:** `feat/phase-4a-sla-scheduler`  
**Estimasi Waktu:** ~1.5 hari (8 task)  
**Prasyarat:** Fase 3a–3e selesai (model `Ticket`, `TicketPriority`, `SlaService`, `NotificationService`, `AuditLogger` sudah aktif).

---

### Task 1: Amandemen Dokumen Spec & ADR

**Files:**
- Modify: `docs/adr/DECISIONS.md`
- Modify: `docs/product/ROADMAP.md`

**Detail:**
Sinkronkan dokumen spec sebelum menulis kode agar seluruh keputusan baru (D-08 Amandemen 2, D-30, status D-01) terkunci secara formal:
1. `D-01`: Ubah status dari `CONFIRM` menjadi `DECIDED`.
2. `D-08 Amandemen 2`: Tambahkan aksi `sla_breach` pada kosakata `AuditAction` (total 17 nilai).
3. `D-27`: Konfirmasi `TICKET_SLA_BREACHED` dan tetapkan `actor_name` bernilai `"Sistem"` untuk event scheduler.
4. `D-30` (Baru): Tetapkan bahwa audit log untuk peristiwa sistem otomatis (tanpa interaksi user HTTP) menyimpan `user_id = null`, `ip_address = null`, dan `user_agent = null`.
5. `ROADMAP.md`: Koreksi baris 459 (`SLA_BREACHED` → `TICKET_SLA_BREACHED`) dan baris 484 (Manager akses audit log di luar batasnya menghasilkan 200 list kosong atau 404 pada detail, bukan 403).

- [ ] **Step 1: Edit `docs/adr/DECISIONS.md`**
  Perbarui D-01, tambahkan Amandemen 2 pada D-08, catat D-30.
- [ ] **Step 2: Edit `docs/product/ROADMAP.md`**
  Koreksi baris 459 dan 484 sesuai urutan otoritas DECISIONS.
- [ ] **Step 3: Commit amandemen spec**
  ```bash
  git add docs/adr/DECISIONS.md docs/product/ROADMAP.md
  git commit -m "docs(spec): amend D-01, D-08, D-27, D-30 and sync phase 4 roadmap"
  ```

---

### Task 2: Update Enum `NotificationType` & `AuditAction`

**Files:**
- Modify: `app/Enums/NotificationType.php`
- Modify: `app/Enums/AuditAction.php`
- Modify: `tests/Unit/EnumsPhase3Test.php` (atau buat `tests/Unit/EnumsPhase4Test.php`)

**Detail:**
Tambahkan case baru pada enum:
- `NotificationType::TicketSlaBreached = 'TICKET_SLA_BREACHED'`
- `AuditAction::SlaBreach = 'sla_breach'`

- [ ] **Step 1: Test — Unit test keberadaan case enum baru**
  Buat `tests/Unit/EnumsPhase4Test.php`:
  ```php
  <?php

  use App\Enums\AuditAction;
  use App\Enums\NotificationType;

  test('NotificationType contains TicketSlaBreached', function () {
      expect(NotificationType::TicketSlaBreached->value)->toBe('TICKET_SLA_BREACHED');
  });

  test('AuditAction contains SlaBreach', function () {
      expect(AuditAction::SlaBreach->value)->toBe('sla_breach');
  });
  ```

- [ ] **Step 2: Implementasi penambahan case pada Enum**
  Ubah `app/Enums/NotificationType.php`:
  ```php
  case TicketCommented = 'TICKET_COMMENTED';
  case TicketSlaBreached = 'TICKET_SLA_BREACHED';
  ```
  Ubah `app/Enums/AuditAction.php`:
  ```php
  case PasswordReset = 'password_reset';
  case SlaBreach = 'sla_breach';
  ```

- [ ] **Step 3: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Unit/EnumsPhase4Test.php
  git add app/Enums/ tests/Unit/EnumsPhase4Test.php
  git commit -m "feat(enum): add TicketSlaBreached and SlaBreach enum cases"
  ```

---

### Task 3: Modifikasi `AuditLogger` untuk Event Sistem (Actor-less)

**Files:**
- Modify: `app/Services/Audit/AuditLogger.php`
- Modify: `tests/Unit/AuditLoggerTest.php`

**Detail:**
Scheduler berjalan di latar belakang tanpa sesi user HTTP aktif. `AuditLogger::log()` harus menerima `?User $actor = null`. Jika `$actor` null, simpan `user_id = null`. Nilai `ip_address` dan `user_agent` tetap diekstrak aman (bernilai null jika request tidak terikat).

> **Jebakan:** Jangan panggil `$actor->id` secara langsung tanpa null-safe operator (`$actor?->id`), karena akan memicu *fatal error: Call to a member function on null* saat dipanggil dari scheduler.

- [ ] **Step 1: Test — AuditLogger mencatat log dengan actor null (D-30)**
  Tambahkan test pada `tests/Unit/AuditLoggerTest.php`:
  ```php
  test('AuditLogger accepts null actor for system background events', function () {
      $logger = new \App\Services\Audit\AuditLogger();
      $log = $logger->log(
          actor: null,
          action: \App\Enums\AuditAction::SlaBreach,
          module: \App\Enums\AuditModule::Ticket,
          moduleId: 10,
          description: 'SLA tiket #TCK-0010 telah terlampaui.',
      );

      expect($log->user_id)->toBeNull()
          ->and($log->action)->toBe('sla_breach')
          ->and($log->module)->toBe('ticket')
          ->and($log->ip_address)->toBeNull()
          ->and($log->user_agent)->toBeNull();
  });
  ```

- [ ] **Step 2: Implementasi perubahan signature pada `AuditLogger`**
  Ubah `app/Services/Audit/AuditLogger.php`:
  ```php
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
      $req = $request ?? $this->request ?? (app()->bound('request') ? app('request') : null);

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
  ```

- [ ] **Step 3: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Unit/AuditLoggerTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Audit/AuditLogger.php tests/Unit/AuditLoggerTest.php
  git commit -m "feat(audit): support null actor for system background events"
  ```

---

### Task 4: Migrasi Composite Index `idx_tickets_sla`

**Files:**
- Create: `database/migrations/2026_09_02_000100_add_composite_sla_index_to_tickets_table.php`
- Modify: `tests/Feature/Schema/DatabaseSchemaTest.php` (jika ada)

**Detail:**
ERD §6 mewajibkan composite index `(sla_breached, sla_deadline)` pada tabel `tickets` untuk mengoptimalkan scanning scheduler tiap 5 menit.

- [ ] **Step 1: Buat migration composite index**
  ```bash
  php artisan make:migration add_composite_sla_index_to_tickets_table --table=tickets
  ```
  Isi file migration:
  ```php
  public function up(): void
  {
      Schema::table('tickets', function (Blueprint $table) {
          $table->index(['sla_breached', 'sla_deadline'], 'idx_tickets_sla');
      });
  }

  public function down(): void
  {
      Schema::table('tickets', function (Blueprint $table) {
          $table->dropIndex('idx_tickets_sla');
      });
  }
  ```

- [ ] **Step 2: Uji migrasi dan rollback terhadap MySQL**
  ```bash
  php artisan migrate
  php artisan migrate:rollback --step=1
  php artisan migrate
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add database/migrations/
  git commit -m "feat(database): add idx_tickets_sla composite index on tickets table"
  ```

---

### Task 5: Query Scope Kandidat Breach di `SlaService`

**Files:**
- Modify: `app/Services/Sla/SlaService.php`
- Modify: `tests/Unit/SlaServiceTest.php`

**Detail:**
Tambahkan method `breachCandidates()` pada `SlaService` yang mengembalikan Eloquent Query Builder untuk mencari tiket aktif yang telah melewati batas deadline:
- `sla_breached = false` (idempoten)
- `sla_deadline IS NOT NULL`
- `sla_deadline < now()`
- Tiket belum closed (`whereHas('status', fn ($q) => $q->where('is_closed', false))`)

> **Jebakan:** Jangan gunakan hardcoded array status ID (misal `whereNotIn('status_id', [4, 5])`). Gunakan selalu relasi `is_closed` dari `ticket_statuses` sesuai `STATUS-TRANSITION.md §2`.

- [ ] **Step 1: Test — `SlaService::breachCandidates()` hanya menyaring tiket yang memenuhi kriteria**
  Tambahkan pada `tests/Unit/SlaServiceTest.php`:
  ```php
  test('breachCandidates query returns only active unbreached tickets past deadline', function () {
      $slaService = new \App\Services\Sla\SlaService();

      // 1. Tiket breach valid
      $t1 = Ticket::factory()->open()->create([
          'sla_breached' => false,
          'sla_deadline' => now()->subMinutes(10),
      ]);

      // 2. Tiket sudah ditandai breach sebelumnya (harus diabaikan)
      $t2 = Ticket::factory()->open()->create([
          'sla_breached' => true,
          'sla_deadline' => now()->subMinutes(10),
      ]);

      // 3. Tiket belum melewati deadline (harus diabaikan)
      $t3 = Ticket::factory()->open()->create([
          'sla_breached' => false,
          'sla_deadline' => now()->addMinutes(30),
      ]);

      // 4. Tiket resolved yang melewati deadline (harus diabaikan)
      $t4 = Ticket::factory()->resolved()->create([
          'sla_breached' => false,
          'sla_deadline' => now()->subMinutes(10),
      ]);

      $candidates = $slaService->breachCandidates()->pluck('id')->all();

      expect($candidates)->toContain($t1->id)
          ->and($candidates)->not->toContain($t2->id)
          ->and($candidates)->not->toContain($t3->id)
          ->and($candidates)->not->toContain($t4->id);
  });
  ```

- [ ] **Step 2: Implementasi method `breachCandidates` pada `SlaService`**
  Tambahkan pada `app/Services/Sla/SlaService.php`:
  ```php
  public function breachCandidates(): Builder
  {
      return Ticket::query()
          ->where('sla_breached', false)
          ->whereNotNull('sla_deadline')
          ->where('sla_deadline', '<', now())
          ->whereHas('status', function (Builder $q) {
              $q->where('is_closed', false);
          });
  }
  ```

- [ ] **Step 3: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Unit/SlaServiceTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Sla/SlaService.php tests/Unit/SlaServiceTest.php
  git commit -m "feat(sla): add breachCandidates query helper in SlaService"
  ```

---

### Task 6: `SlaBreachDetector` Service (Chunked & Atomic)

**Files:**
- Create: `app/Services/Sla/SlaBreachDetector.php`
- Create: `app/DTOs/Sla/SlaScanResult.php` (opsional / DTO return value)
- Create: `tests/Feature/Sla/SlaBreachDetectorTest.php`

**Detail:**
Buat service terdedikasi untuk memproses kandidat breach.
Alur per tiket di dalam `DB::transaction()`:
1. `lockForUpdate()` pada baris tiket untuk mencegah race condition.
2. Cek ulang apakah tiket masih memenuhi syarat breach (defensif terhadap perubahan status bersamaan).
3. Panggil `SlaService::markBreached($ticket)`.
4. Ambil penerima notifikasi:
   - Teknisi yang di-assign (`$ticket->technician`) jika ada.
   - Seluruh user dengan role `Manager` yang berstatus `active`.
5. Kirim notifikasi via `NotificationService::notifyMany()` dengan tipe `NotificationType::TicketSlaBreached`, `actor = null`, dan payload 6 key standar D-27:
   - `ticket_id`: `$ticket->id`
   - `ticket_number`: `$ticket->ticket_number`
   - `title`: `$ticket->title`
   - `actor_name`: `"Sistem"`
   - `message`: `"SLA tiket #{$ticket->ticket_number} telah terlampaui."`
   - `url`: `"/tickets/{$ticket->id}"`
6. Catat audit log via `AuditLogger::log()`:
   - `actor`: `null`
   - `action`: `AuditAction::SlaBreach`
   - `module`: `AuditModule::Ticket`
   - `moduleId`: `$ticket->id`
   - `description`: `"SLA tiket #{$ticket->ticket_number} terlampaui dan ditandai oleh sistem."`
7. Kembalikan ringkasan eksekusi: `checked_count`, `breached_count`, `notified_users_count` (sesuai CONTEXT-DIAGRAM §4.5).
8. Gunakan `chunkById(250)` agar tidak membebani memori server saat volume tiket besar.

> **Jebakan:** Jika tiket belum memiliki teknisi (`technician_id === null`), jangan biarkan collection penerima crash. Filter penerima agar hanya menyertakan objek `User` yang valid.

- [ ] **Step 1: Test — `SlaBreachDetector` mengeksekusi breach, notifikasi, dan audit secara atomik**
  Buat `tests/Feature/Sla/SlaBreachDetectorTest.php`:
  ```php
  <?php

  use App\Enums\NotificationType;
  use App\Models\AuditLog;
  use App\Models\Notification;
  use App\Models\Role;
  use App\Models\Ticket;
  use App\Models\User;
  use App\Services\Sla\SlaBreachDetector;

  test('scan processes candidate, marks breached, notifies technician and all managers, and logs audit', function () {
      $manager1 = User::factory()->manager()->create();
      $manager2 = User::factory()->manager()->create();
      $technician = User::factory()->technician()->create();

      $ticket = Ticket::factory()->assigned($technician)->create([
          'sla_breached' => false,
          'sla_deadline' => now()->subMinutes(15),
      ]);

      $detector = app(SlaBreachDetector::class);
      $result = $detector->scan();

      expect($result->breachedCount)->toBe(1);

      // Verifikasi tiket ter-update di database
      $ticket->refresh();
      expect($ticket->sla_breached)->toBeTrue()
          ->and($ticket->sla_breached_at)->not->toBeNull();

      // Verifikasi notifikasi sampai ke teknisi + 2 manager (total 3 notifikasi)
      $notifs = Notification::where('type', NotificationType::TicketSlaBreached->value)->get();
      expect($notifs)->toHaveCount(3)
          ->and($notifs->pluck('user_id')->all())->toContain($technician->id, $manager1->id, $manager2->id);

      $payload = $notifs->first()->data;
      expect($payload['actor_name'])->toBe('Sistem')
          ->and($payload['ticket_number'])->toBe($ticket->ticket_number)
          ->and($payload['url'])->toBe("/tickets/{$ticket->id}");

      // Verifikasi audit log tercatat dengan user_id null
      $audit = AuditLog::where('action', 'sla_breach')->first();
      expect($audit)->not->toBeNull()
          ->and($audit->user_id)->toBeNull()
          ->and($audit->module)->toBe('ticket')
          ->and($audit->module_id)->toBe($ticket->id);
  });

  test('scan on unassigned ticket notifies only managers without error', function () {
      $manager = User::factory()->manager()->create();
      $ticket = Ticket::factory()->open()->create([
          'technician_id' => null,
          'sla_breached' => false,
          'sla_deadline' => now()->subMinutes(5),
      ]);

      $detector = app(SlaBreachDetector::class);
      $result = $detector->scan();

      expect($result->breachedCount)->toBe(1);

      $notifs = Notification::where('type', NotificationType::TicketSlaBreached->value)->get();
      expect($notifs)->toHaveCount(1)
          ->and($notifs->first()->user_id)->toBe($manager->id);
  });
  ```

- [ ] **Step 2: Implementasi `SlaScanResult` DTO**
  Buat `app/DTOs/Sla/SlaScanResult.php`:
  ```php
  <?php

  namespace App\DTOs\Sla;

  readonly class SlaScanResult
  {
      public function __construct(
          public int $checkedCount,
          public int $breachedCount,
          public int $notifiedCount
      ) {}
  }
  ```

- [ ] **Step 3: Implementasi `SlaBreachDetector` Service**
  Buat `app/Services/Sla/SlaBreachDetector.php`:
  ```php
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
          $managers = User::where('role_id', RoleName::Manager->id())
              ->where('status', UserStatus::Active->value)
              ->get();

          $this->slaService->breachCandidates()
              ->with(['technician', 'status'])
              ->chunkById($chunkSize, function ($tickets) use (&$checked, &$breached, &$notified, $managers) {
                  foreach ($tickets as $ticket) {
                      $checked++;

                      DB::transaction(function () use ($ticket, &$breached, &$notified, $managers) {
                          /** @var Ticket $lockedTicket */
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
  ```

- [ ] **Step 4: Jalankan test & commit**
  ```bash
  vendor/bin/pest tests/Feature/Sla/SlaBreachDetectorTest.php
  vendor/bin/pint --dirty --format agent
  git add app/DTOs/Sla/ app/Services/Sla/SlaBreachDetector.php tests/Feature/Sla/SlaBreachDetectorTest.php
  git commit -m "feat(sla): implement SlaBreachDetector with chunked processing and notifications"
  ```

---

### Task 7: Command `tickets:check-sla` & Registrasi Jadwal di `routes/console.php`

**Files:**
- Create: `app/Console/Commands/CheckTicketSlaCommand.php`
- Modify: `routes/console.php`

**Detail:**
Buat Artisan Command `tickets:check-sla` yang bertindak sebagai adaptor tipis pemanggil `SlaBreachDetector::scan()`.
Daftarkan command di `routes/console.php` agar berjalan tiap 5 menit (`everyFiveMinutes()`) dengan `withoutOverlapping()`.

- [ ] **Step 1: Buat Artisan command**
  ```bash
  php artisan make:command CheckTicketSlaCommand --command=tickets:check-sla
  ```
  Ubah `app/Console/Commands/CheckTicketSlaCommand.php`:
  ```php
  <?php

  namespace App\Console\Commands;

  use App\Services\Sla\SlaBreachDetector;
  use Illuminate\Console\Command;

  class CheckTicketSlaCommand extends Command
  {
      protected $signature = 'tickets:check-sla {--chunk=250 : Number of tickets per chunk}';
      protected $description = 'Scan active tickets past SLA deadline, mark them as breached, and trigger notifications.';

      public function handle(SlaBreachDetector $detector): int
      {
          $this->info('Starting SLA breach scan...');

          $chunk = (int) $this->option('chunk');
          $result = $detector->scan($chunk);

          $this->info(sprintf(
              'SLA check completed: %d checked, %d marked breached, %d notifications created.',
              $result->checkedCount,
              $result->breachedCount,
              $result->notifiedCount
          ));

          return self::SUCCESS;
      }
  }
  ```

- [ ] **Step 2: Daftarkan jadwal di `routes/console.php`**
  Modifikasi `routes/console.php`:
  ```php
  use Illuminate\Support\Facades\Schedule;

  Schedule::command('sanctum:prune-expired --hours=24')->daily();
  Schedule::command('tickets:check-sla')->everyFiveMinutes()->withoutOverlapping();
  ```

- [ ] **Step 3: Uji eksekusi command via Artisan**
  ```bash
  php artisan tickets:check-sla
  php artisan schedule:list
  ```

- [ ] **Step 4: Commit**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add app/Console/Commands/CheckTicketSlaCommand.php routes/console.php
  git commit -m "feat(console): register tickets:check-sla command running every 5 minutes"
  ```

---

### Task 8: Comprehensive Feature Test Suite & Verifikasi Container

**Files:**
- Create: `tests/Feature/Sla/SlaSchedulerTest.php`

**Detail:**
Buat suite pengujian end-to-end yang mencakup seluruh skenario acceptance criteria ROADMAP §4:
1. **Time Travel Breach:** Menggunakan `travel()` melewati deadline → tiket ditandai breached, notifikasi terkirim, audit tercatat.
2. **Resolved Ticket Safety:** Tiket resolved yang melewati deadline tidak ditandai breached.
3. **Idempotency:** Command dijalankan dua kali berturut-turut → tidak ada duplikasi notifikasi atau log audit.
4. **Defensive API Reliability:** Perhitungan `sla_status` di query/model tetap menghasilkan `breached` saat scheduler dimatikan.

- [ ] **Step 1: Tulis feature test lengkap di `tests/Feature/Sla/SlaSchedulerTest.php`**
  ```php
  <?php

  use App\Enums\NotificationType;
  use App\Models\Notification;
  use App\Models\Ticket;
  use App\Models\User;
  use Illuminate\Support\Facades\Artisan;

  test('artisan tickets:check-sla marks breached tickets with time travel', function () {
      $manager = User::factory()->manager()->create();
      $technician = User::factory()->technician()->create();

      // Buat tiket dengan SLA deadline 2 jam dari sekarang
      $ticket = Ticket::factory()->assigned($technician)->create([
          'sla_duration_minutes' => 120,
          'sla_deadline' => now()->addMinutes(120),
          'sla_breached' => false,
      ]);

      // Majukan waktu 3 jam ke masa depan (melewati deadline)
      $this->travel(3)->hours();

      Artisan::call('tickets:check-sla');

      $ticket->refresh();
      expect($ticket->sla_breached)->toBeTrue()
          ->and($ticket->sla_breached_at)->not->toBeNull();

      expect(Notification::where('type', NotificationType::TicketSlaBreached->value)->count())
          ->toBe(2); // 1 technician + 1 manager
  });

  test('artisan tickets:check-sla is idempotent and does not send duplicate notifications on second run', function () {
      $manager = User::factory()->manager()->create();
      $ticket = Ticket::factory()->open()->create([
          'sla_deadline' => now()->subMinutes(10),
          'sla_breached' => false,
      ]);

      Artisan::call('tickets:check-sla');
      expect(Notification::where('type', NotificationType::TicketSlaBreached->value)->count())->toBe(1);

      // Jalankan kedua kali
      Artisan::call('tickets:check-sla');
      expect(Notification::where('type', NotificationType::TicketSlaBreached->value)->count())->toBe(1);
  });

  test('resolved ticket past deadline is never marked breached by scheduler', function () {
      $manager = User::factory()->manager()->create();
      $ticket = Ticket::factory()->resolved()->create([
          'sla_deadline' => now()->subMinutes(10),
          'sla_breached' => false,
      ]);

      Artisan::call('tickets:check-sla');

      $ticket->refresh();
      expect($ticket->sla_breached)->toBeFalse();
      expect(Notification::where('type', NotificationType::TicketSlaBreached->value)->count())->toBe(0);
  });
  ```

- [ ] **Step 2: Jalankan seluruh test suite SLA**
  ```bash
  vendor/bin/pest tests/Feature/Sla/ tests/Unit/SlaServiceTest.php
  ```

- [ ] **Step 3: Verifikasi container scheduler (jika Docker aktif)**
  ```bash
  docker compose exec scheduler php artisan schedule:list
  ```

- [ ] **Step 4: Formatting & Commit**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add tests/Feature/Sla/SlaSchedulerTest.php
  git commit -m "test(sla): add comprehensive feature tests for SLA scheduler and idempotency"
  ```

---

## Exit Criteria 4a

- [ ] `php artisan tickets:check-sla` berhasil dieksekusi tanpa error.
- [ ] Jadwal `everyFiveMinutes()->withoutOverlapping()` terdaftar di `php artisan schedule:list`.
- [ ] Tiket aktif yang melewati deadline ditandai `sla_breached = true` dan `sla_breached_at` terisi.
- [ ] Notifikasi `TICKET_SLA_BREACHED` terkirim ke teknisi pemegang dan seluruh Manager aktif dengan `actor_name = "Sistem"`.
- [ ] Audit log `sla_breach` tercatat dengan `user_id = null`.
- [ ] Pengujian time travel dengan `travel()` lulus.
- [ ] Eksekusi kedua kali terbukti idempoten tanpa duplikasi notifikasi.
- [ ] Seluruh test di `tests/Feature/Sla/` dan `tests/Unit/` hijau.
- [ ] Linter Pint bersih (`vendor/bin/pint --test`).
