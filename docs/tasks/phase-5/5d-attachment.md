# Fase 5d — File Attachment (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Ikuti alur TDD di setiap task. Sub-tahap ini menutup penanganan file: validasi multi-lapis, disk privat, download terotorisasi, dan penghapusan yang menghapus file fisik.

**Goal:** Menyelesaikan modul attachment sesuai Addendum §6: file disimpan di disk **private** (`storage/app/private`), tidak pernah diakses lewat URL publik, validasi MIME + ekstensi + ukuran di backend, download selalu lewat controller yang menjalankan Policy ticket induk, dan penghapusan record juga menghapus file fisik (D-13).

**Branch:** `feat/phase-5d-attachment`
**Estimasi Waktu:** ~1.5 hari (6 task)
**Prasyarat:** 5a selesai (`AttachmentPolicy`, `TicketAttachment` `#[UsePolicy]`, disk `private` di config). 5b/5c boleh paralel — sub-tahap ini hanya bergantung pada Fase 3 (`TicketPolicy@attach`, route ticket) dan 5a.

---

### Task 1: `StoreAttachmentRequest` — Validasi Multi-Lapis

**Files:**
- Create: `app/Http/Requests/Attachment/StoreAttachmentRequest.php`
- Create: `tests/Feature/Attachment/AttachmentValidationTest.php`

**Detail:**
Addendum §6.2–6.3 + ROADMAP:557-558. Validasi **backend** wajib:

1. `file` required, maks 5 MB (`max:5120` KB)
2. MIME type (konten): `image/jpeg`, `image/png`, `application/pdf`
3. Ekstensi (nama file): `jpg`, `jpeg`, `png`, `pdf`
4. Tolak eksplisit `exe`, `sh`, `bat`
5. MIME yang tidak cocok dengan ekstensi ditolak (kombinasi `mimetypes` + `extensions`)

```php
class StoreAttachmentRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:5120',
                'mimetypes:image/jpeg,image/png,application/pdf',
                'extensions:jpg,jpeg,png,pdf',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'File wajib diunggah.',
            'file.file' => 'Kolom file harus berupa berkas.',
            'file.max' => 'Ukuran file tidak boleh melebihi 5 MB.',
            'file.mimetypes' => 'Tipe file tidak diizinkan. Hanya JPG, JPEG, PNG, atau PDF.',
            'file.extensions' => 'Ekstensi file tidak diizinkan. Hanya jpg, jpeg, png, atau pdf.',
        ];
    }
}
```

> **Jebakan 1 — ekstensi ganda & spoofing:** Aturan `mimetypes` memvalidasi **konten** file (via `getMimeType`), sedangkan `extensions` memvalidasi ekstensi. Gabungan keduanya menangkap file `.exe` yang di-rename jadi `.pdf` (mimetypes gagal) **dan** file PDF yang ekstensinya salah (extensions gagal).
> **Jebakan 2 — batas PHP:** Jika `upload_max_filesize`/`post_max_size` di PHP lebih kecil dari 5 MB, request upload > batas tiba sebagai request **kosong** → `file` required gagal dengan pesan menyesatkan. Periksa `php -i | grep upload_max_filesize`. Di container dev, pastikan `upload_max_filesize=6M` dan `post_max_size=6M` (dokumentasikan di README Phase 5).
> **Jebakan 3 — satuan:** Laravel `max` pada file menggunakan **kilobyte**. 5 MB = **5120** KB (bukan 5). Kolom `file_size` disimpan dalam **byte** (`$file->getSize()`).

- [x] **Step 1: Test — upload valid → 201, upload oversized → 422, .exe → 422, MIME mismatch → 422.**
  ```php
  test('participant can upload valid pdf', function () {
      $reporter = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
      Sanctum::actingAs($reporter);

      Storage::fake('private');
      $this->postJson("/api/tickets/{$ticket->id}/attachments", [
          'file' => UploadedFile::fake()->create('screenshot.pdf', 100, 'application/pdf'),
      ])->assertStatus(201)
        ->assertJsonStructure(['data' => ['id', 'original_filename', 'mime_type', 'file_size', 'download_url', 'uploaded_by']]);
  });

  test('upload over 5MB returns 422', function () {
      $reporter = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
      Sanctum::actingAs($reporter);
      $this->postJson("/api/tickets/{$ticket->id}/attachments", [
          'file' => UploadedFile::fake()->create('big.pdf', 6000, 'application/pdf'), // 6MB
      ])->assertStatus(422)->assertJsonValidationErrors('file');
  });

  test('exe file rejected', function () {
      $reporter = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
      Sanctum::actingAs($reporter);
      $this->postJson("/api/tickets/{$ticket->id}/attachments", [
          'file' => UploadedFile::fake()->create('malware.exe', 100, 'application/x-msdownload'),
      ])->assertStatus(422)->assertJsonValidationErrors('file');
  });

  test('mime type mismatch with extension rejected', function () {
      // File dengan ekstensi .pdf tapi MIME executable
      $reporter = User::factory()->employee()->create();
      $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
      Sanctum::actingAs($reporter);
      $this->postJson("/api/tickets/{$ticket->id}/attachments", [
          'file' => UploadedFile::fake()->createWithContent('fake.pdf', 'MZ...exe-binary'),
      ])->assertStatus(422)->assertJsonValidationErrors('file');
  });
  ```

- [x] **Step 2: Implementasi** — buat `StoreAttachmentRequest`.

- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Attachment/AttachmentValidationTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Requests/Attachment/ tests/Feature/Attachment/
  git commit -m "feat(attachment): add multi-layer upload validation (mime, extension, size)"
  ```

---

### Task 2: `AttachmentService` — Store (ULID + Disk Private)

**Files:**
- Create: `app/Services/Attachment/AttachmentService.php`
- Create: `app/Http/Controllers/Attachment/AttachmentController.php`
- Create: `tests/Feature/Attachment/AttachmentStoreTest.php`

**Detail:**

**Path (D-13):** `tickets/{ticket_id}/{ulid}.{ext}` — simpan **relatif** (tanpa disk root) di kolom `storage_path`. Nama file asli TIDAK dipakai sebagai stored filename.

```php
public function store(Ticket $ticket, UploadedFile $file, User $actor): TicketAttachment
{
    $ulid = (string) Str::ulid();
    $extension = strtolower($file->getClientOriginalExtension());
    $path = "tickets/{$ticket->id}/{$ulid}.{$extension}";

    // Simpan file fisik di disk private
    Storage::disk('private')->put($path, $file->get());

    return DB::transaction(function () use ($ticket, $file, $actor, $path): TicketAttachment {
        $attachment = TicketAttachment::create([
            'ticket_id' => $ticket->id,
            'uploaded_by' => $actor->id,
            'original_filename' => $file->getClientOriginalName(),
            'stored_filename' => basename($path),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'storage_path' => $path,
        ]);

        $this->auditLogger->log($actor, AuditAction::Create, AuditModule::Ticket, $ticket->id,
            "File {$file->getClientOriginalName()} ditambahkan ke ticket #{$ticket->ticket_number}.");

        return $attachment;
    });
}
```

**Controller `store`:**
```php
public function store(StoreAttachmentRequest $request, Ticket $ticket): JsonResponse
{
    $this->authorize('attach', $ticket);

    $attachment = $this->attachmentService->store($ticket, $request->file('file'), $request->user());

    return ApiResponse::success(
        new AttachmentResource($attachment),
        'Attachment uploaded successfully.',
        status: 201,
    );
}
```

> **Jebakan 1:** Tulis file fisik **sebelum** transaksi DB agar kalau transaksi gagal tidak menyisakan record yang menunjuk file yang tidak ada. Namun jika file ditulis lalu transaksi rollback, file menjadi yatim. Solusi terbaik: tulis file, simpan record; jika transaksi gagal, hapus file di `catch` — atau tulis di `afterCommit`. Untuk MVP cukup: tulis file, lalu `DB::transaction` untuk record; kalau record gagal, `Storage::delete` di blok catch.
> **Jebakan 2:** `$file->getClientOriginalExtension()` berasal dari nama file client — jangan dipakai untuk keamanan (sudah divalidasi `extensions` di FormRequest). Gunakan `$file->getMimeType()` (dari konten) untuk `mime_type`.

- [x] **Step 1: Test — store menyimpan file + metadata (di 5d StoreAttachmentRequest).**
- [x] **Step 2: Implementasi** — service, controller, resource.
- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Attachment/AttachmentStoreTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Services/Attachment/ app/Http/Controllers/Attachment/ app/Http/Resources/Attachment/ tests/Feature/Attachment/
  git commit -m "feat(attachment): add store with ULID naming on private disk and audit"
  ```

---

### Task 3: `GET /api/attachments/{id}/download` — Stream Terotorisasi

**Files:**
- Modify: `app/Http/Controllers/Attachment/AttachmentController.php`
- Create: `tests/Feature/Attachment/AttachmentDownloadTest.php`

**Detail:**
Addendum §6.5: download hanya jika user punya permission mengakses ticket induk. `AttachmentPolicy@download` mendelegasikan ke `TicketPolicy@view` (5a).

```php
public function download(TicketAttachment $attachment): BinaryFileResponse
{
    $this->authorize('download', $attachment);

    $filePath = $attachment->storage_path;

    if (! Storage::disk('private')->exists($filePath)) {
        throw new NotFoundHttpException('Attachment file not found.');
    }

    return Storage::disk('private')->download($filePath, $attachment->original_filename, [
        'Content-Type' => $attachment->mime_type,
    ]);
}
```

> **Jebakan 1:** Response ini **bukan JSON** — ini pengecualian envelope yang sudah didokumentasikan. Jangan bungkus dengan `ApiResponse::success`.
> **Jebakan 2:** `AttachmentPolicy@view/download` memakai `$attachment->ticket` relasi. Pastikan relasi `ticket` di model `TicketAttachment` ada (sudah ada di Fase 2).
> **Jebakan 3:** Employee non-partisipan mengunduh attachment dari ticket orang lain → `TicketPolicy@view` mengembalikan `denyAsNotFound` → **404** (PERMISSION §5), bukan 403.

- [x] **Step 1: Test — download oleh partisipan, 404 non-partisipan.**
- [x] **Step 2: Implementasi** — controller method.
- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Attachment/AttachmentDownloadTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Controllers/Attachment/ tests/Feature/Attachment/
  git commit -m "feat(attachment): add policy-guarded download stream endpoint"
  ```

---

### Task 4: `TicketAttachmentObserver` — Hapus File Setelah DB Commit

**Files:**
- Create: `app/Observers/TicketAttachmentObserver.php`
- Modify: `app/Models/TicketAttachment.php` (register `#[ObservedBy]`)
- Create: `tests/Feature/Attachment/AttachmentDeleteTest.php`

**Detail:**
D-13: saat baris `ticket_attachments` di-hard-delete, file fisik terkait ikut dihapus. Gunakan observer (bukan dipanggil manual di controller) karena penghapusan bisa terjadi lewat beberapa jalur. Pakai `$afterCommit` agar file tidak terhapus kalau transaksi DB rollback.

```php
class TicketAttachmentObserver
{
    public $afterCommit = true;

    public function deleted(TicketAttachment $attachment): void
    {
        if ($attachment->storage_path && Storage::disk('private')->exists($attachment->storage_path)) {
            Storage::disk('private')->delete($attachment->storage_path);
        }
    }
}
```

Daftarkan di model:
```php
use App\Observers\TicketAttachmentObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;

#[ObservedBy([TicketAttachmentObserver::class])]
class TicketAttachment extends Model { /* ... */ }
```

**Delete endpoint** (PERMISSION §3.3: uploader atau Manager/Admin):
```php
public function destroy(TicketAttachment $attachment, Request $request): JsonResponse
{
    $this->authorize('delete', $attachment);

    $attachment->delete(); // observer menghapus file fisik

    $this->auditLogger->log($request->user(), AuditAction::Delete, AuditModule::Ticket,
        $attachment->ticket_id, "File {$attachment->original_filename} dihapus dari ticket.");

    return ApiResponse::success(null, 'Attachment deleted.');
}
```

> **Jebakan 1:** Gunakan `$afterCommit = true` — tanpa ini, jika `DB::transaction` membungkus delete dan kemudian rollback, file sudah terlanjur terhapus padahal record kembali ada.
> **Jebakan 2:** Jangan gunakan `forceDelete`/event `restoring` — attachment tidak soft-delete.

- [x] **Step 1: Test — delete record menghapus file fisik; uploader-only.**
- [x] **Step 2: Implementasi** — observer, model annotation, controller.
- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Attachment/AttachmentDeleteTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Observers/ app/Models/TicketAttachment.php app/Http/Controllers/Attachment/ tests/Feature/Attachment/
  git commit -m "feat(attachment): delete removes record and physical file via observer"
  ```

---

### Task 5: `GET /api/tickets/{id}/attachments` — Daftar Attachment

**Files:**
- Modify: `app/Http/Controllers/Attachment/AttachmentController.php`
- Create: `app/Http/Resources/Attachment/AttachmentResource.php`
- Create: `tests/Feature/Attachment/AttachmentListTest.php`

**Detail:**
API-CONTRACT §6 (baris 403–419): daftar attachment milik ticket. **Tanpa pagination** — jumlah attachment per ticket di MVP kecil; return array polos. Dijaga `TicketPolicy@view`.

```php
public function index(Ticket $ticket, Request $request): JsonResponse
{
    $this->authorize('view', $ticket);

    $attachments = $ticket->attachments()
        ->with('uploader')
        ->orderBy('created_at')
        ->get();

    return ApiResponse::success(AttachmentResource::collection($attachments), 'Attachments retrieved.');
}
```

**`AttachmentResource`** — **tidak** membocorkan `storage_path`/`stored_filename` (API-CONTRACT:419):
```php
return [
    'id' => $this->id,
    'original_filename' => $this->original_filename,
    'mime_type' => $this->mime_type,
    'file_size' => $this->file_size,
    'uploaded_by' => $this->whenLoaded('uploader', fn () => $this->uploader->only('id', 'full_name')),
    'download_url' => "/api/attachments/{$this->id}/download",
    'created_at' => $this->created_at,
];
```

> **Jebakan:** `download_url` di sini adalah path relatif API (bukan URL absolut dari backend) — konsisten dengan D-27 `url` notifikasi dan komentar "frontend memakai BFF proxy".

- [x] **Step 1: Test — list attachment + tidak membocorkan storage_path.**
- [x] **Step 2: Implementasi** — controller, resource, route.
- [x] **Step 3: Verifikasi & commit.**
  ```bash
  vendor/bin/pest tests/Feature/Attachment/AttachmentListTest.php
  vendor/bin/pint --dirty --format agent
  git add app/Http/Controllers/Attachment/ app/Http/Resources/Attachment/ routes/api.php tests/Feature/Attachment/
  git commit -m "feat(attachment): add attachment list without leaking storage metadata"
  ```

---

### Task 6: Route + Throttle + Verifikasi Keamanan

**Files:**
- Modify: `routes/api.php`
- Modify: `app/Http/Controllers/Attachment/AttachmentController.php` (bila perlu)

**Detail:**

Daftarkan route attachment + pasang `throttle:upload` (20/mnt per user, sudah didefinisikan di `AppServiceProvider`):

```php
Route::middleware(['auth:sanctum', 'password.changed'])->group(function () {
    Route::get('/tickets/{ticket}/attachments', [AttachmentController::class, 'index'])->name('tickets.attachments.index');
    Route::post('/tickets/{ticket}/attachments', [AttachmentController::class, 'store'])
        ->middleware('throttle:upload')
        ->name('tickets.attachments.store');
    Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download'])->name('attachments.download');
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');
});
```

> **Jebakan:** Route `GET /tickets/{ticket}/attachments` dan `POST` harus dideklarasikan di luar `apiResource('tickets', ...)` (atau ditambahkan setelahnya dengan method eksplisit) — route apiResource Fase 3 tidak mencakup sub-resource ini.

- [x] **Step 1: Uji route terdaftar.**
  ```bash
  php artisan route:list --path=api
  ```

- [x] **Step 2: Test keamanan menyeluruh.**
- [x] **Step 3: Verifikasi seluruh test attachment + regresi.**
  ```bash
  vendor/bin/pest tests/Feature/Attachment/
  vendor/bin/pest
  ```

- [x] **Step 4: Formatting & commit.**
  ```bash
  vendor/bin/pint --dirty --format agent
  git add routes/api.php tests/Feature/Attachment/
  git commit -m "feat(attachment): register routes with upload throttle and security tests"
  ```

---

## Exit Criteria 5d

- [x] Upload: hanya partisipan ticket (`TicketPolicy@attach`); validasi MIME + ekstensi + 5 MB; tolak `.exe`/`.sh`/`.bat` dan mismatch MIME → 422.
- [x] File disimpan di disk `private` (`storage_path('app/private')`), nama file ULID, metadata lengkap di `ticket_attachments`.
- [x] Download: selalu lewat controller + `AttachmentPolicy@download` (delegasi ke `TicketPolicy@view`); Employee non-partisipan → **404**.
- [x] Delete: uploader atau Manager/Admin; menghapus record **dan** file fisik (observer `$afterCommit`).
- [x] `GET /api/tickets/{id}/attachments` — metadata tanpa `storage_path`/`stored_filename`.
- [x] `throttle:upload` (20/mnt) aktif pada POST.
- [x] Tidak ada route `storage/{path}` yang melayani file attachment (`serve=false` di disk `local` dan `private`).
- [x] `attachments_count` di `TicketResource` kini bernilai > 0 saat ada file (verifikasi respons detail ticket).
- [x] `php artisan test` hijau, `pint --test` bersih.
- [x] Route baru terdaftar di `docs/product/PERMISSION-MATRIX.md §4`.