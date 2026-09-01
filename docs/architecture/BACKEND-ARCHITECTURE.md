# BACKEND ARCHITECTURE (SERVICE LAYER, DTO & REQUEST PIPELINE)

## JARVIS OPS — IT Service Management System

**Version:** 1.4
**Status:** Derived — tidak memperkenalkan keputusan baru; mengkonsolidasikan pola yang tersebar
**Sumber:** `docs/product/PRD.md` §35, `docs/product/PERMISSION-MATRIX.md` §1, `docs/product/ROADMAP.md`, `docs/adr/DECISIONS.md`
**Dokumen terkait:** `docs/architecture/CONTEXT-DIAGRAM.md`, `docs/architecture/DFD.md`, `docs/architecture/ERD.md`, `docs/api/API-CONTRACT.md`, `docs/product/STATUS-TRANSITION.md`
**Perubahan v1.4 (awal Fase 3):** contoh `title` dikoreksi dari `max:255` ke `max:200`; folder `app/Rules/<Domain>/` ditambahkan ke struktur; aturan bahasa pesan validasi dirujuk ke D-29.

---

## 1. Tujuan Dokumen

Dokumen ini menjelaskan pola arsitektur aplikasi backend (Laravel API): bagaimana request diproses berlapis, di mana business logic ditempatkan, dan bagaimana data berpindah antar lapisan. Ia adalah **panduan implementasi** — bukan dokumen keputusan.

**Aturan utamanya: controller tipis. Business logic hidup di service layer, bukan di controller. Data lintas lapisan dikemas dalam DTO. Setiap layer dikelompokkan ke subfolder domain (Auth, Ticket, Asset, dst).**

Konten di sini dikonsolidasikan dari PRD §35, PERMISSION-MATRIX §1, dan ROADMAP agar agentic tooling maupun developer punya satu acuan pola yang sama. Saat dokumen sumber dan dokumen ini bertentangan, otoritas tetap mengikuti urutan di `docs/adr/DECISIONS.md` §2.

> **Catatan penamaan:** Nama `BACKEND-ARCHITECTURE` dipilih karena ada dokumen pola arsitektur frontend yang terpisah: `docs/architecture/FRONTEND-ARCHITECTURE.md`.

> **Transisi Phase 2:** Endpoint auth & profil sudah di-retrofit ke pola lengkap — DTO, service layer, API Resource, dan pengelompokan folder domain (`Auth/`). `HealthController` tetap di root `app/Http/Controllers/` karena tidak punya domain business logic. Untuk **Phase 3 ke atas** (Ticket CRUD, Notifikasi, Audit, dan seterusnya), wajib mengikuti pola di dokumen ini: DTO + service + resource + subfolder domain. Saat menambahkan endpoint baru, ikuti pola di sini; saat mengubah endpoint lama, retrofit DTO opsional tapi tidak diwajibkan.

---

## 2. Lapisan Aplikasi Laravel

Arsitektur aplikasi Laravel mengikuti lapisan berikut (diperluas dari PRD §35):

```text
Request
  ↓
[1] Middleware auth:sanctum       → 401 jika tidak terautentikasi
  ↓
[2] Middleware role:              → 403, penjagaan kasar per grup route
  ↓
[3] Policy / Gate                 → 403, penjagaan sebenarnya per resource
  ↓
[4] FormRequest                   → 422, validasi field + custom error message (mutasi saja)
  ↓
[5] DTO                           → pemetaan data tervalidasi ke objek bertipe (mutasi saja)
  ↓
[6] Service                       → 422/409, business rule
  ↓
[7] API Resource                  → bentuk JSON yang dikembalikan
```

Lapisan 3 adalah penjaga keamanan sebenarnya. Lapisan 2 hanya mempersingkat — dan tidak boleh menjadi satu-satunya penjaga, karena middleware tidak tahu apa-apa tentang kepemilikan resource (PERMISSION-MATRIX §1).

**Presedensi error:** otorisasi (403/404) dievaluasi **sebelum** validasi transisi status (422) — sesuai `DECISIONS.md` D-17.

---

## 3. FormRequest Pattern (Validasi + Custom Error Message)

Setiap input dari client **wajib** divalidasi lewat FormRequest (`app/Http/Requests/<Domain>/`) — bukan validasi inline di controller.

### 3.1 Custom error message

Setiap FormRequest **wajib** menimpa error message bawaan Laravel dengan `messages()`:

```php
namespace App\Http\Requests\Ticket;

class StoreTicketRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string'],
            'priority_id' => ['required', 'integer', 'exists:ticket_priorities,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Judul tiket wajib diisi.',
            'title.max' => 'Judul tiket tidak boleh lebih dari 200 karakter.',
            'description.required' => 'Deskripsi wajib diisi.',
            'priority_id.required' => 'Prioritas wajib dipilih.',
            'priority_id.exists' => 'Prioritas yang dipilih tidak valid.',
        ];
    }
}
```

Aturan:
- Bahasa pesan validasi **bahasa Indonesia** (sesuai `DECISIONS.md` D-24 dan D-29 — seluruh isi `errors.<field>` berbahasa Indonesia, termasuk yang dilempar service layer). API envelope message tetap bahasa Inggris (`"Ticket created successfully."`).
- Pesan harus **spesifik per field + rule** (`title.required`), bukan generik.
- Jangan mengandalkan `:attribute` bawaan untuk teks user-facing; tulis pesan utuh agar konsisten dan mudah diterjemahkan.
- Batas `title` ticket adalah **200** karakter (`API-CONTRACT.md §6`), bukan 255. Contoh di atas dikoreksi pada v1.4; versi sebelumnya menulis 255 dan bertentangan dengan kontrak API serta lebar kolomnya.
- Validasi yang butuh query ke database — mis. "asset ini benar-benar ter-assign ke reporter" (BR-014) — ditulis sebagai **Rule object** di `app/Rules/<Domain>/`, dipasang dari `rules()`, bukan sebagai closure inline. Alasannya sama dengan alasan service layer ada: aturan yang punya nama sendiri bisa diuji sendiri.

---

## 4. DTO Layer

### 4.1 Mengapa DTO

FormRequest hanya menjamin validitas input, bukan bentuk datanya. Mengirim `$request->validated()` (array asosiatif) langsung ke service membuat service bergantung pada bentuk array yang tidak diketik — rawan salah baca kolom dan sulit direfactor. DTO mengemas data tervalidasi ke **objek bertipe** sehingga kontrak antar lapisan eksplisit.

### 4.2 Cakupan: DTO khusus operasi mutasi

DTO **hanya** dipakai untuk operasi mutasi (create/update/assign/transisi status/komentar, dst). Endpoint **baca (GET)** tidak memakai DTO — service cukup menerima scalar (id) atau array filter, tanpa lapisan objek perantara. Ini menjaga DTO dari keramik pada jalur yang hanya menampilkan data.

### 4.3 Letak & bentuk

DTO diletakkan di `app/DTOs/<Domain>/`, satu file per use case, berupa **readonly class**. Kontrak intinya adalah **`fromArray()`** (bebas dari lapisan HTTP), sedangkan `fromRequest()` hanyalah kemudahan opsional di sisi controller:

```php
namespace App\DTOs\Ticket;

class CreateTicketData
{
    public function __construct(
        public readonly string $title,
        public readonly string $description,
        public readonly int $priorityId,
        public readonly ?int $assetId = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            title: $data['title'],
            description: $data['description'],
            priorityId: (int) $data['priority_id'],
            assetId: isset($data['asset_id']) ? (int) $data['asset_id'] : null,
        );
    }
}
```

`fromArray()` sebagai kontrak inti membuat DTO tetap bisa dibangun dari **entry point non-HTTP** — mis. command scheduler (SLA check) atau seeder — yang tidak punya FormRequest. Kebutuhan ini nyata: `SlaService`, `NotificationService`, dan `AuditLogger` dipanggil dari scheduler (container terpisah) yang tidak lewat request.

Controller boleh menambahkan konversi dari request, tetapi **dengan memakai `validated()` + `fromArray()`, bukan mengikat DTO ke kelas FormRequest**:

```php
// di controller
$data = CreateTicketData::fromArray($request->validated());
```

Alasan: `fromRequest()` yang mengetik `StoreTicketRequest` mengikat DTO ke lapisan HTTP. Memakai `fromArray()` di controller memberi hasil yang sama tanpa coupling itu, dan satu-satunya jalur konstruksi DTO yang perlu dirawat.

Aturan:
- Constructor **readonly + typed properties** — DTO immutable.
- Factory static `fromArray(array $data): self` adalah **kontrak inti**; ia melakukan mapping + casting tipe.
- Satu DTO satu use case (mis. `CreateTicketData`, `UpdateProfileData`, `AssignTicketData`).
- DTO **tidak** berisi logic bisnis — hanya data + mapping (transformasi bentuk, bukan aturan).
- Server-set fields (D-18, mis. `technician_id`, `status_id`, reporter) **tidak** masuk DTO dari request; ditentukan service.

### 4.4 Alur pemakaian

```
FormRequest (validasi) → DTO::fromArray($request->validated()) → Service method (terima DTO) → kembalikan model
```

---

## 5. Service Layer Pattern

### 5.1 Letak business logic

Business logic **wajib** berada di service layer (`app/Services/<Domain>/`), bukan di controller. Contoh pola yang dikunci di ROADMAP:

- `TicketService::create(CreateTicketData $data)` — pembuatan ticket dalam transaksi database, generate `ticket_number`, snapshot SLA, catat history + audit log (ROADMAP `Ticket CRUD`)
- `TicketStatusService` — validasi transisi terhadap matriks `docs/product/STATUS-TRANSITION.md`, transisi ilegal → 422 (ROADMAP `Status transition`)
- `NotificationService` — menulis ke tabel `notifications` kustom, **bukan** `Illuminate\Notifications\Notifiable` (ROADMAP `Notification`)
- `SlaService` — penambahan integer menit ke `created_at` (DECISIONS D-01)
- `AuditLogger` — mencatat audit log, **dipanggil eksplisit dari service layer**, bukan lewat model observer (ROADMAP `Audit log`)

### 5.2 Kontrak service

- Method service yang menerima data **menerima DTO**, bukan `$request->validated()` maupun `$request` itu sendiri.
- Setiap operasi write yang menyentuh banyak tabel dibungkus **transaksi database**.
- Service **tidak** mengembalikan response HTTP — ia mengembalikan model/collection, atau melempar exception. Controller yang mengemasnya ke `ApiResponse`.
- Audit log dan notifikasi ditulis **secara eksplisit oleh service**, tidak oleh observer. Alasannya: pemanggilan eksplisit lebih mudah ditest, jelas terbaca reviewer, dan tidak ikut tercatat saat seeding/factory berjalan (ROADMAP:459).
- Validasi field terjadi di FormRequest (lapisan 4); service hanya menangani **business rule** (lapisan 6).

### 5.3 Struktur folder

Deklarasi struktur dari ROADMAP (`Lapisan aplikasi`), dengan **pengelompokan per domain**:

```
app/
├── Services/                 ← business logic per domain
│   ├── Ticket/               ← TicketService, TicketStatusService
│   ├── Auth/                 ← AuthService
│   ├── Notification/         ← NotificationService
│   ├── Sla/                  ← SlaService
│   └── Audit/                ← AuditLogger
├── DTOs/                     ← data transfer object per domain
│   ├── Ticket/               ← CreateTicketData, UpdateTicketData
│   └── Auth/                 ← UpdateProfileData
├── Http/
│   ├── Controllers/          ← tipis, hanya delegasi ke service + ApiResponse
│   │   ├── Auth/             ← AuthController, ProfileController
│   │   └── Ticket/           ← TicketController
│   ├── Requests/             ← FormRequest per domain: validasi field + custom messages()
│   │   ├── Auth/             ← LoginRequest, ChangePasswordRequest, UpdateProfileRequest
│   │   └── Ticket/           ← StoreTicketRequest, UpdateTicketRequest
│   ├── Middleware/           ← auth:sanctum, role:
│   └── Resources/            ← API Resource per domain (Ticket/TicketResource, ...)
├── Policies/                 ← otorisasi per resource (Ticket/TicketPolicy, ...)
├── Rules/                    ← Rule object validasi yang butuh query (Ticket/AssetAssignedToReporter)
├── Enums/                    ← RoleName, TicketStatusName, dll
├── Exceptions/               ← exception yang dipetakan ke 401/403/404/409/422
├── Authorization/            ← AbilityMatrix (sumber tunggal role → ability)
└── Support/                  ← ApiResponse, HandlesPagination
```

Aturan pengelompokan:
- Subfolder domain diberi nama **singular PascalCase** (`Auth`, `Ticket`, `Asset`, `Article`, `Notification`, `Sla`, `Audit`, `User`, `Department`) sesuai modul di D-08.
- Domain `Auth` sudah aktif untuk file auth & profil (controller, request, service, DTO, resource). `HealthController` tetap di root `app/Http/Controllers/` karena tanpa domain business logic. Untuk Phase 3 ke atas, semua file baru wajib masuk subfolder domain.
- Namespace mengikuti folder: `App\Services\Ticket\TicketService`, `App\DTOs\Ticket\CreateTicketData`, `App\Http\Requests\Ticket\StoreTicketRequest`, dst.

---

## 6. Controller Pattern (Thin Controller)

Controller diletakkan di `app/Http/Controllers/<Domain>/` dan hanya melakukan empat hal:

1. Menerima request (termasuk hasil validasi FormRequest).
2. Memetakan request ke DTO (`XxxData::fromArray($request->validated())`).
3. Memanggil method service dengan DTO.
4. Mengembalikan `ApiResponse` dengan envelope yang konsisten (lihat `docs/api/API-CONTRACT.md`).

```php
namespace App\Http\Controllers\Ticket;

use App\DTOs\Ticket\CreateTicketData;
use App\Http\Requests\Ticket\StoreTicketRequest;
use App\Http\Resources\Ticket\TicketResource;
use App\Services\Ticket\TicketService;

class TicketController extends Controller
{
    public function __construct(
        protected TicketService $ticketService,
    ) {}

    public function store(StoreTicketRequest $request): JsonResponse
    {
        $data = CreateTicketData::fromArray($request->validated());
        $ticket = $this->ticketService->create($data);

        return ApiResponse::success(
            data: new TicketResource($ticket),
            message: 'Ticket created successfully.',
            status: 201,
        );
    }
}
```

Controller **tidak** berisi:

- logic transisi status / perhitungan SLA / aturan bisnis lain;
- query Eloquent yang berdiri sendiri untuk operasi bisnis (bukan sekadar read sederhana);
- penulisan audit log atau notifikasi secara manual;
- pembentukan DTO secara manual selain lewat factory `fromArray()`.

---

## 7. Pola yang Sengaja Tidak Dipakai

| Pola | Alasan |
| --- | --- |
| Repository / DAO | Tidak disebutkan di dokumen mana pun; Eloquent + Service sudah cukup |
| Action classes | Tidak disebutkan; Service method menampung use case |
| Interface service per modul | Tidak dipakai — controller type-hint concrete class (`protected TicketService $ticketService`). Laravel bisa mock concrete class di test, dan tiap service cuma punya satu implementasi. Interface hanya ditambahkan bila benar-benar muncul implementasi kedua (port/adapter ke dependency eksternal). |
| `spatie/laravel-permission` | Satu role per user lewat `users.role_id`; paket menambah 5 tabel & permission-per-user yang tidak dipakai (PERMISSION-MATRIX §1) |
| `spatie/laravel-data` | Tidak dipakai; DTO ditulis manual sebagai readonly class (lihat §4) |
| Observer untuk audit/notifikasi | `AuditLogger` dipanggil eksplisit dari service (ROADMAP:459) |

---

## 8. Referensi Keputusan

Dokumen ini adalah dokumen turunan dan **tidak** mengubah urutan otoritas `DECISIONS.md` §2. Keputusan arsitektural terkait yang wajib dipegang:

| Keputusan | Isi singkat |
| --- | --- |
| D-16 | `Gate::before` Admin dengan pengecualian eksplisit (lock-out diri, CLOSED ticket, isolasi notifikasi) |
| D-17 | Otorisasi (403/404) dievaluasi sebelum transisi status (422) |
| D-18 | Server-set fields (`technician_id`, `status_id`, dll) ditentukan service, bukan dari request |
| D-21 | Optimistic locking transisi status: `expected_status_id` opsional, mismatch → 409 |
| D-22 | Semua create → 201; 200 hanya untuk GET/PUT/PATCH dan POST non-create |
| D-24 | Bahasa pesan: envelope API dalam bahasa Inggris; validation errors (custom `messages()`) serta notifikasi & audit dalam bahasa Indonesia |
