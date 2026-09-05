<?php

namespace Database\Seeders;

use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetHistory;
use App\Models\Department;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    /**
     * Ticket categories by slug keyword used for deterministic lookup.
     *
     * @var array<string, string>
     */
    private const TICKET_TEMPLATES = [
        'hardware' => [
            'Kendala Laptop Mati Total Setelah Sleep Mode',
            'Layar Monitor Berkedip Saat Menggunakan Docking Station',
            'Keyboard Laptop Tidak Merespons Sebagian Tombol',
            'Printer Kantor Macet Saat Mencetak Dokumen Besar',
            'Trackpad Tidak Akurat Setelah Update Sistem',
        ],
        'software' => [
            'Aplikasi Microsoft Office Minta Aktivasi Ulang',
            'Aplikasi Akuntansi Crash Saat Generate Laporan',
            'Gagal Instalasi Update Windows 11 di Workstation',
            'License Adobe Creative Cloud Kedaluwarsa',
            'Browser Sering Not Responding Saat Buka Tab Banyak',
        ],
        'network' => [
            'Koneksi Wi-Fi Terputus Berulang di Lantai 3',
            'VPN Gagal Terhubung Sejak Pagi',
            'Internet Lambat Saat Video Conference',
            'Port LAN di Ruang Rapat Tidak Aktif',
            'Email Tidak Bisa Diakses dari Jaringan Kantor',
        ],
        'account' => [
            'Reset Password Akun Email Perusahaan',
            'Request Akses Folder Shared Documents',
            'Akun Sistem HR Terkunci Setelah 5x Percobaan Login',
            'Request Pembuatan Akun untuk Karyawan Baru',
            'Ganti Nomor HP Autentikasi Dua Faktor',
        ],
    ];

    /**
     * Deterministic view counts for knowledge base articles (matched by slug order).
     *
     * @var list<int>
     */
    private const ARTICLE_VIEW_COUNTS = [245, 182, 156, 143, 121, 98, 87, 76, 64, 52, 0];

    public function run(): void
    {
        $admin = User::where('email', 'admin@jarvisops.test')->first()
            ?? User::factory()->admin()->create();

        $this->seedAssets();
        $this->seedKnowledgeArticles($admin);
        $this->seedSupportingUsers();
        $this->seedTickets();
        $this->seedAssetOwnershipHistory();
    }

    private function seedAssets(): void
    {
        $assetData = [
            ['tag' => 'AST-00001', 'name' => 'MacBook Pro 16 M3 Max', 'cat' => 'Laptop', 'brand' => 'Apple', 'model' => 'MacBook Pro 16', 'sn' => 'SN-MBP16-001', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00002', 'name' => 'MacBook Pro 14 M3 Pro', 'cat' => 'Laptop', 'brand' => 'Apple', 'model' => 'MacBook Pro 14', 'sn' => 'SN-MBP14-002', 'status' => AssetStatus::Assigned],
            ['tag' => 'AST-00003', 'name' => 'ThinkPad X1 Carbon Gen 11', 'cat' => 'Laptop', 'brand' => 'Lenovo', 'model' => 'X1 Carbon', 'sn' => 'SN-TPX1-003', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00004', 'name' => 'Dell UltraSharp 27 4K', 'cat' => 'Monitor', 'brand' => 'Dell', 'model' => 'U2723QE', 'sn' => 'SN-DEL27-004', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00005', 'name' => 'Dell UltraSharp 32 4K', 'cat' => 'Monitor', 'brand' => 'Dell', 'model' => 'U3223QE', 'sn' => 'SN-DEL32-005', 'status' => AssetStatus::Assigned],
            ['tag' => 'AST-00006', 'name' => 'HP LaserJet Pro MFP', 'cat' => 'Printer', 'brand' => 'HP', 'model' => 'M428fdw', 'sn' => 'SN-HPLJ-006', 'status' => AssetStatus::Maintenance],
            ['tag' => 'AST-00007', 'name' => 'Cisco Catalyst 2960-X', 'cat' => 'Network', 'brand' => 'Cisco', 'model' => 'WS-C2960X-48TD-L', 'sn' => 'SN-CSC29-007', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00008', 'name' => 'Ubiquiti UniFi U6-Pro', 'cat' => 'Network', 'brand' => 'Ubiquiti', 'model' => 'U6-Pro', 'sn' => 'SN-UBNT-008', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00009', 'name' => 'Dell PowerEdge R750', 'cat' => 'Server', 'brand' => 'Dell', 'model' => 'R750', 'sn' => 'SN-PER7-009', 'status' => AssetStatus::Maintenance],
            ['tag' => 'AST-00010', 'name' => 'Logitech MX Master 3S', 'cat' => 'Peripheral', 'brand' => 'Logitech', 'model' => 'MX Master 3S', 'sn' => 'SN-LGMX-010', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00011', 'name' => 'ThinkPad T480 (Unit Lama)', 'cat' => 'Laptop', 'brand' => 'Lenovo', 'model' => 'T480', 'sn' => 'SN-TPX480-011', 'status' => AssetStatus::Retired],
        ];

        foreach ($assetData as $item) {
            Asset::updateOrCreate(
                ['asset_tag' => $item['tag']],
                [
                    'name' => $item['name'],
                    'category' => $item['cat'],
                    'brand' => $item['brand'],
                    'model' => $item['model'],
                    'serial_number' => $item['sn'],
                    'purchase_date' => now()->subMonths(6)->toDateString(),
                    'status' => $item['status'],
                    'notes' => 'Initial asset inventory batch',
                ]
            );
        }
    }

    private function seedKnowledgeArticles(User $admin): void
    {
        $categories = [
            'hw' => KnowledgeCategory::where('name', 'Hardware Troubleshooting')->first(),
            'net' => KnowledgeCategory::where('name', 'Network & Connectivity')->first(),
            'sw' => KnowledgeCategory::where('name', 'Software & OS')->first(),
            'acc' => KnowledgeCategory::where('name', 'Access & Account')->first(),
            'off' => KnowledgeCategory::where('name', 'Office Facility')->first(),
        ];

        $articles = [
            ['cat' => 'hw', 'title' => 'Mengatasi Laptop Tidak Mau Menyala (Hard Reset)', 'slug' => 'mengatasi-laptop-tidak-mau-menyala', 'status' => 'published'],
            ['cat' => 'hw', 'title' => 'Panduan Menghubungkan Dual Monitor di macOS dan Windows', 'slug' => 'panduan-menghubungkan-dual-monitor', 'status' => 'published'],
            ['cat' => 'net', 'title' => 'Cara Menghubungkan ke Wi-Fi Perusahaan (WPA2/WPA3 Enterprise)', 'slug' => 'cara-menghubungkan-ke-wifi-perusahaan', 'status' => 'published'],
            ['cat' => 'net', 'title' => 'Setup dan Troubleshooting Koneksi VPN Kantor', 'slug' => 'setup-troubleshooting-vpn-kantor', 'status' => 'published'],
            ['cat' => 'sw', 'title' => 'Aktivasi dan Instalasi Microsoft 365 Enterprise', 'slug' => 'aktivasi-instalasi-microsoft-365', 'status' => 'published'],
            ['cat' => 'sw', 'title' => 'Prosedur Request Instalasi Software Berlisensi', 'slug' => 'prosedur-request-software-berlisensi', 'status' => 'published'],
            ['cat' => 'acc', 'title' => 'Kebijakan Standar Password dan Masa Berlaku Kredensial', 'slug' => 'kebijakan-standar-password', 'status' => 'published'],
            ['cat' => 'acc', 'title' => 'Cara Mengaktifkan Autentikasi Dua Faktor (2FA)', 'slug' => 'cara-mengaktifkan-autentikasi-2fa', 'status' => 'published'],
            ['cat' => 'off', 'title' => 'Panduan Setting Printer Kantor dan Print Quota', 'slug' => 'panduan-setting-printer-kantor', 'status' => 'published'],
            ['cat' => 'off', 'title' => 'Cara Penggunaan Smart Display Meeting Room', 'slug' => 'cara-penggunaan-smart-display-meeting-room', 'status' => 'published'],
            ['cat' => 'hw', 'title' => 'Troubleshooting Docking Station Thunderbolt (Draft)', 'slug' => 'troubleshooting-docking-station-thunderbolt', 'status' => 'draft'],
        ];

        $viewIndex = 0;
        foreach ($articles as $article) {
            $categoryId = $categories[$article['cat']]?->id;
            if ($categoryId === null) {
                continue;
            }

            $isPublished = $article['status'] === 'published';
            $viewCount = self::ARTICLE_VIEW_COUNTS[$viewIndex] ?? 0;
            $viewIndex++;

            KnowledgeArticle::updateOrCreate(
                ['slug' => $article['slug']],
                [
                    'category_id' => $categoryId,
                    'author_id' => $admin->id,
                    'title' => $article['title'],
                    'content' => 'Dokumentasi dan petunjuk langkah demi langkah untuk '.$article['title'].'. Pastikan mengikuti instruksi keselamatan dan keamanan kerja IT.',
                    'status' => $article['status'],
                    'view_count' => $isPublished ? $viewCount : 0,
                    'published_at' => $isPublished ? now()->subDays($viewIndex + 2) : null,
                ]
            );
        }
    }

    private function seedSupportingUsers(): void
    {
        $itDept = Department::where('name', 'Information Technology')->first();
        $financeDept = Department::where('name', 'Finance & Accounting')->first();
        $opsDept = Department::where('name', 'Operations')->first();

        $technicianRole = Role::where('name', 'technician')->first();
        $employeeRole = Role::where('name', 'employee')->first();

        $users = [
            [
                'email' => 'budi@jarvisops.test',
                'full_name' => 'Budi Santoso',
                'role_id' => $technicianRole?->id,
                'department_id' => $itDept?->id,
                'password' => Hash::make('Password123!'),
                'status' => 'active',
                'must_change_password' => false,
            ],
            [
                'email' => 'citra@jarvisops.test',
                'full_name' => 'Citra Lestari',
                'role_id' => $technicianRole?->id,
                'department_id' => $itDept?->id,
                'password' => Hash::make('Password123!'),
                'status' => 'active',
                'must_change_password' => false,
            ],
            [
                'email' => 'dewi@jarvisops.test',
                'full_name' => 'Dewi Sartika',
                'role_id' => $employeeRole?->id,
                'department_id' => $financeDept?->id,
                'password' => Hash::make('Password123!'),
                'status' => 'active',
                'must_change_password' => false,
            ],
            [
                'email' => 'eko@jarvisops.test',
                'full_name' => 'Eko Prasetyo',
                'role_id' => $employeeRole?->id,
                'department_id' => $opsDept?->id,
                'password' => Hash::make('Password123!'),
                'status' => 'active',
                'must_change_password' => false,
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(['email' => $userData['email']], $userData);
        }
    }

    private function seedTickets(): void
    {
        $reporters = [
            'employee' => User::where('email', 'employee@jarvisops.test')->first(),
            'dewi' => User::where('email', 'dewi@jarvisops.test')->first(),
            'eko' => User::where('email', 'eko@jarvisops.test')->first(),
        ];

        $technicians = [
            'demo' => User::where('email', 'technician@jarvisops.test')->first(),
            'budi' => User::where('email', 'budi@jarvisops.test')->first(),
            'citra' => User::where('email', 'citra@jarvisops.test')->first(),
        ];

        if (in_array(null, $reporters, true) || in_array(null, $technicians, true)) {
            return;
        }

        $categories = $this->ticketCategoriesBySlugKeyword();

        $plans = [
            // Per technician: [reporter, statusId, priorityId, createdDaysAgo, resolutionOffsetMinutes, breached]
            // Resolved pool target: 26 on-time / 30 total = 86.7%.
            'demo' => [
                ['employee', 5, 2, 25, 90, false],
                ['dewi', 5, 3, 24, 120, false],
                ['eko', 5, 2, 23, 180, false],
                ['employee', 5, 1, 22, 60, false],
                ['dewi', 5, 2, 21, 200, false],
                ['eko', 5, 3, 20, 300, false],
                ['employee', 5, 2, 19, 150, false],
                ['dewi', 5, 4, 18, 600, false],
                ['eko', 5, 1, 17, 45, false],
                ['employee', 5, 2, 16, 240, false],
                ['dewi', 5, 3, 15, 360, false],
                ['eko', 5, 2, 14, 210, false],
                ['employee', 5, 2, 13, 500, true],
                ['dewi', 5, 2, 12, 520, true],
                ['eko', 4, 3, 6, 280, false],
                ['employee', 4, 2, 5, 160, false],
                ['dewi', 4, 2, 4, 190, false],
                ['eko', 4, 1, 3, 70, false],
                ['employee', 3, 2, 2, null, false],
                ['dewi', 3, 2, 1, null, true],
                ['eko', 2, 3, 1, null, false],
                ['employee', 1, 2, 0, null, false],
                ['dewi', 1, 3, 0, null, false],
            ],
            'budi' => [
                ['eko', 5, 2, 22, 110, false],
                ['dewi', 5, 3, 20, 240, false],
                ['employee', 5, 4, 18, 700, false],
                ['eko', 5, 2, 15, 260, false],
                ['dewi', 5, 2, 12, 180, false],
                ['employee', 5, 3, 9, 320, false],
                ['eko', 5, 2, 6, 260, false],
                ['dewi', 5, 4, 4, 900, false],
                ['eko', 5, 2, 3, 640, true],
                ['dewi', 4, 2, 5, 220, false],
                ['eko', 2, 3, 2, null, false],
                ['employee', 1, 4, 1, null, false],
                ['dewi', 1, 2, 0, null, true],
            ],
            'citra' => [
                ['dewi', 5, 3, 14, 300, false],
                ['eko', 5, 2, 10, 220, false],
                ['employee', 5, 3, 7, 380, false],
                ['dewi', 5, 2, 5, 800, true],
                ['eko', 3, 2, 2, null, false],
                ['employee', 2, 2, 1, null, false],
                ['eko', 1, 3, 0, null, false],
            ],
        ];

        $sequence = 0;
        foreach ($plans as $technicianKey => $tickets) {
            $technician = $technicians[$technicianKey];

            foreach ($tickets as [$reporterKey, $statusId, $priorityId, $createdDaysAgo, $resolutionOffsetMinutes, $breached]) {
                $sequence++;
                $reporter = $reporters[$reporterKey];
                $slaMinutes = $this->slaMinutesForPriority($priorityId);
                $createdAt = now()->subDays($createdDaysAgo)->subMinutes($sequence * 7);
                $slaDeadline = (clone $createdAt)->addMinutes($slaMinutes);

                $resolvedAt = null;
                $closedAt = null;
                $slaBreachedAt = null;
                $isBreached = false;

                if ($statusId >= 4) {
                    $resolvedAt = $breached
                        ? (clone $slaDeadline)->addMinutes($resolutionOffsetMinutes)
                        : (clone $slaDeadline)->subMinutes($resolutionOffsetMinutes);
                }

                if ($statusId === 5) {
                    $closedAt = (clone $resolvedAt)->addHours(2);
                }

                if ($breached && $statusId < 4) {
                    $isBreached = true;
                    $slaBreachedAt = $slaDeadline;
                } elseif ($breached && $statusId >= 4) {
                    $isBreached = true;
                    $slaBreachedAt = $slaDeadline;
                }

                Ticket::updateOrCreate(
                    ['ticket_number' => sprintf('TCK-DEMO-%03d', $sequence)],
                    [
                        'title' => $this->pickTitle($categories, $sequence),
                        'description' => 'Tiket demo untuk keperluan presentasi capstone. Deskripsi insiden mencakup langkah yang sudah dicoba user sebelum membuat tiket ini.',
                        'category_id' => $this->pickCategoryId($categories, $sequence),
                        'priority_id' => $priorityId,
                        'status_id' => $statusId,
                        'reporter_id' => $reporter->id,
                        'technician_id' => $statusId >= 2 ? $technician->id : null,
                        'department_id' => $reporter->department_id,
                        'asset_id' => null,
                        'sla_duration_minutes' => $slaMinutes,
                        'sla_deadline' => $slaDeadline,
                        'resolved_at' => $resolvedAt,
                        'closed_at' => $closedAt,
                        'sla_breached' => $isBreached,
                        'sla_breached_at' => $slaBreachedAt,
                        'created_at' => $createdAt,
                        'updated_at' => $closedAt ?? $resolvedAt ?? $createdAt,
                    ]
                );
            }
        }
    }

    private function seedAssetOwnershipHistory(): void
    {
        $asset = Asset::where('asset_tag', 'AST-00002')->first();

        if ($asset === null) {
            return;
        }

        $employee = User::where('email', 'employee@jarvisops.test')->first();
        $budi = User::where('email', 'budi@jarvisops.test')->first();

        if ($employee === null || $budi === null) {
            return;
        }

        AssetAssignment::updateOrCreate(
            [
                'asset_id' => $asset->id,
                'user_id' => $budi->id,
            ],
            [
                'assigned_at' => now()->subDays(120),
                'released_at' => now()->subDays(60),
                'notes' => 'Penugasan awal unit MacBook Pro 14 kepada teknisi onboarding.',
            ]
        );

        AssetAssignment::updateOrCreate(
            [
                'asset_id' => $asset->id,
                'user_id' => $employee->id,
            ],
            [
                'assigned_at' => now()->subDays(45),
                'released_at' => null,
                'notes' => 'Unit serahan permanen untuk kebutuhan kerja harian employee.',
            ]
        );

        $histories = [
            [
                'action' => 'assigned',
                'description' => 'Unit diserahkan ke Budi Santoso (Teknisi) untuk kebutuhan penanganan tiket lapangan.',
                'action_at' => now()->subDays(120),
            ],
            [
                'action' => 'released',
                'description' => 'Unit dikembalikan ke gudang IT setelah masa penugasan teknisi berakhir.',
                'action_at' => now()->subDays(60),
            ],
            [
                'action' => 'maintenance',
                'description' => 'Perawatan berkala: pembersihan komponen internal dan pengecekan kesehatan baterai.',
                'action_at' => now()->subDays(50),
            ],
            [
                'action' => 'assigned',
                'description' => 'Unit diserahkan ke Demo Employee untuk kebutuhan kerja harian.',
                'action_at' => now()->subDays(45),
            ],
        ];

        foreach ($histories as $history) {
            AssetHistory::updateOrCreate(
                [
                    'asset_id' => $asset->id,
                    'action_at' => $history['action_at'],
                ],
                [
                    'action' => $history['action'],
                    'description' => $history['description'],
                ]
            );
        }

        $asset->update(['status' => AssetStatus::Assigned]);
    }

    /**
     * @return array<string, Collection<int, int>>
     */
    private function ticketCategoriesBySlugKeyword(): array
    {
        $keywords = ['hardware', 'software', 'network', 'account'];

        $resolved = [];
        foreach ($keywords as $keyword) {
            $resolved[$keyword] = TicketCategory::query()
                ->where('name', 'like', "%{$keyword}%")
                ->pluck('id');
        }

        return $resolved;
    }

    private function pickCategoryId(array $categories, int $sequence): ?int
    {
        $keywordOrder = ['hardware', 'software', 'network', 'account'];
        $keyword = $keywordOrder[$sequence % 4];

        $ids = $categories[$keyword] ?? collect();

        if ($ids->isEmpty()) {
            $allCategories = TicketCategory::query()->pluck('id');

            return $allCategories->isNotEmpty() ? $allCategories->first() : null;
        }

        return $ids[$sequence % $ids->count()];
    }

    private function pickTitle(array $categories, int $sequence): string
    {
        $keywordOrder = ['hardware', 'software', 'network', 'account'];
        $keyword = $keywordOrder[$sequence % 4];

        $templates = self::TICKET_TEMPLATES[$keyword];
        $index = intdiv($sequence, 4) % count($templates);

        return $templates[$index];
    }

    private function slaMinutesForPriority(int $priorityId): int
    {
        return match ($priorityId) {
            1 => 120,
            2 => 240,
            3 => 480,
            4 => 1440,
            default => 480,
        };
    }
}
