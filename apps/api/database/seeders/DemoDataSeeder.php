<?php

namespace Database\Seeders;

use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@jarvisops.test')->first() ?? User::factory()->admin()->create();

        // 1. Seed 10 Assets
        $assetData = [
            ['tag' => 'AST-00001', 'name' => 'MacBook Pro 16 M3 Max', 'cat' => 'Laptop', 'brand' => 'Apple', 'model' => 'MacBook Pro 16', 'sn' => 'SN-MBP16-001', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00002', 'name' => 'MacBook Pro 14 M3 Pro', 'cat' => 'Laptop', 'brand' => 'Apple', 'model' => 'MacBook Pro 14', 'sn' => 'SN-MBP14-002', 'status' => AssetStatus::Assigned],
            ['tag' => 'AST-00003', 'name' => 'ThinkPad X1 Carbon Gen 11', 'cat' => 'Laptop', 'brand' => 'Lenovo', 'model' => 'X1 Carbon', 'sn' => 'SN-TPX1-003', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00004', 'name' => 'Dell UltraSharp 27 4K', 'cat' => 'Monitor', 'brand' => 'Dell', 'model' => 'U2723QE', 'sn' => 'SN-DEL27-004', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00005', 'name' => 'Dell UltraSharp 32 4K', 'cat' => 'Monitor', 'brand' => 'Dell', 'model' => 'U3223QE', 'sn' => 'SN-DEL32-005', 'status' => AssetStatus::Assigned],
            ['tag' => 'AST-00006', 'name' => 'HP LaserJet Pro MFP', 'cat' => 'Printer', 'brand' => 'HP', 'model' => 'M428fdw', 'sn' => 'SN-HPLJ-006', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00007', 'name' => 'Cisco Catalyst 2960-X', 'cat' => 'Network', 'brand' => 'Cisco', 'model' => 'WS-C2960X-48TD-L', 'sn' => 'SN-CSC29-007', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00008', 'name' => 'Ubiquiti UniFi U6-Pro', 'cat' => 'Network', 'brand' => 'Ubiquiti', 'model' => 'U6-Pro', 'sn' => 'SN-UBNT-008', 'status' => AssetStatus::Available],
            ['tag' => 'AST-00009', 'name' => 'Dell PowerEdge R750', 'cat' => 'Server', 'brand' => 'Dell', 'model' => 'R750', 'sn' => 'SN-PER7-009', 'status' => AssetStatus::Maintenance],
            ['tag' => 'AST-00010', 'name' => 'Logitech MX Master 3S', 'cat' => 'Peripheral', 'brand' => 'Logitech', 'model' => 'MX Master 3S', 'sn' => 'SN-LGMX-010', 'status' => AssetStatus::Available],
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

        // 2. Seed 10 Knowledge Articles (plus 1 draft for technician/admin editing demo)
        $hwCat = KnowledgeCategory::where('name', 'Hardware Troubleshooting')->first();
        $netCat = KnowledgeCategory::where('name', 'Network & Connectivity')->first();
        $swCat = KnowledgeCategory::where('name', 'Software & OS')->first();
        $accCat = KnowledgeCategory::where('name', 'Access & Account')->first();
        $offCat = KnowledgeCategory::where('name', 'Office Facility')->first();

        $articles = [
            ['cat_id' => $hwCat?->id, 'title' => 'Mengatasi Laptop Tidak Mau Menyala (Hard Reset)', 'slug' => 'mengatasi-laptop-tidak-mau-menyala', 'status' => 'published'],
            ['cat_id' => $hwCat?->id, 'title' => 'Panduan Menghubungkan Dual Monitor di macOS dan Windows', 'slug' => 'panduan-menghubungkan-dual-monitor', 'status' => 'published'],
            ['cat_id' => $netCat?->id, 'title' => 'Cara Menghubungkan ke Wi-Fi Perusahaan (WPA2/WPA3 Enterprise)', 'slug' => 'cara-menghubungkan-ke-wifi-perusahaan', 'status' => 'published'],
            ['cat_id' => $netCat?->id, 'title' => 'Setup dan Troubleshooting Koneksi VPN Kantor', 'slug' => 'setup-troubleshooting-vpn-kantor', 'status' => 'published'],
            ['cat_id' => $swCat?->id, 'title' => 'Aktivasi dan Instalasi Microsoft 365 Enterprise', 'slug' => 'aktivasi-instalasi-microsoft-365', 'status' => 'published'],
            ['cat_id' => $swCat?->id, 'title' => 'Prosedur Request Instalasi Software Berlisensi', 'slug' => 'prosedur-request-software-berlisensi', 'status' => 'published'],
            ['cat_id' => $accCat?->id, 'title' => 'Kebijakan Standar Password dan Masa Berlaku Kredensial', 'slug' => 'kebijakan-standar-password', 'status' => 'published'],
            ['cat_id' => $accCat?->id, 'title' => 'Cara Mengaktifkan Autentikasi Dua Faktor (2FA)', 'slug' => 'cara-mengaktifkan-autentikasi-2fa', 'status' => 'published'],
            ['cat_id' => $offCat?->id, 'title' => 'Panduan Setting Printer Kantor dan Print Quota', 'slug' => 'panduan-setting-printer-kantor', 'status' => 'published'],
            ['cat_id' => $offCat?->id, 'title' => 'Cara Penggunaan Smart Display Meeting Room', 'slug' => 'cara-penggunaan-smart-display-meeting-room', 'status' => 'published'],
            ['cat_id' => $hwCat?->id, 'title' => 'Troubleshooting Docking Station Thunderbolt (Draft)', 'slug' => 'troubleshooting-docking-station-thunderbolt', 'status' => 'draft'],
        ];

        foreach ($articles as $art) {
            if ($art['cat_id']) {
                $isPublished = ($art['status'] ?? 'published') === 'published';
                KnowledgeArticle::updateOrCreate(
                    ['slug' => $art['slug']],
                    [
                        'category_id' => $art['cat_id'],
                        'author_id' => $admin->id,
                        'title' => $art['title'],
                        'content' => 'Dokumentasi dan petunjuk langkah demi langkah untuk '.$art['title'].'. Pastikan mengikuti instruksi keselamatan dan keamanan kerja IT.',
                        'status' => $art['status'] ?? 'published',
                        'view_count' => $isPublished ? rand(10, 200) : 0,
                        'published_at' => $isPublished ? now()->subDays(rand(1, 30)) : null,
                    ]
                );
            }
        }

        // 3. Demo tickets for employee@jarvisops.test
        $employee = User::where('email', 'employee@jarvisops.test')->first();

        if ($employee) {
            Ticket::factory()->open()->count(3)->create([
                'reporter_id' => $employee->id,
                'department_id' => $employee->department_id,
            ]);
            Ticket::factory()->assigned()->count(2)->create([
                'reporter_id' => $employee->id,
                'department_id' => $employee->department_id,
            ]);
            Ticket::factory()->resolved()->count(2)->create([
                'reporter_id' => $employee->id,
                'department_id' => $employee->department_id,
            ]);
            Ticket::factory()->closed()->count(2)->create([
                'reporter_id' => $employee->id,
                'department_id' => $employee->department_id,
            ]);
            Ticket::factory()->breached()->count(1)->create([
                'reporter_id' => $employee->id,
                'department_id' => $employee->department_id,
            ]);
        }
    }
}
