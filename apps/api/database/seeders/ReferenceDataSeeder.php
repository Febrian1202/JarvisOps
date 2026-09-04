<?php

namespace Database\Seeders;

use App\Enums\RoleName;
use App\Enums\TicketStatusName;
use App\Models\Department;
use App\Models\KnowledgeCategory;
use App\Models\Role;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use Illuminate\Database\Seeder;

class ReferenceDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Roles (Pinned ID D-15)
        $roles = [
            1 => ['name' => RoleName::Admin->value, 'description' => 'System Administrator'],
            2 => ['name' => RoleName::Manager->value, 'description' => 'IT Operations Manager'],
            3 => ['name' => RoleName::Technician->value, 'description' => 'IT Support Technician'],
            4 => ['name' => RoleName::Employee->value, 'description' => 'Company Employee / Requester'],
        ];
        foreach ($roles as $id => $data) {
            Role::updateOrCreate(['id' => $id], $data);
        }

        // 2. Ticket Statuses (Pinned ID D-15)
        $statuses = [
            1 => ['name' => TicketStatusName::Open->value, 'description' => 'Ticket newly created and unassigned', 'is_closed' => false, 'is_final' => false],
            2 => ['name' => TicketStatusName::Assigned->value, 'description' => 'Ticket assigned to a technician', 'is_closed' => false, 'is_final' => false],
            3 => ['name' => TicketStatusName::InProgress->value, 'description' => 'Technician is actively working on the issue', 'is_closed' => false, 'is_final' => false],
            4 => ['name' => TicketStatusName::Resolved->value, 'description' => 'Technician has provided a solution awaiting confirmation', 'is_closed' => true, 'is_final' => false],
            5 => ['name' => TicketStatusName::Closed->value, 'description' => 'Ticket confirmed resolved and permanently closed', 'is_closed' => true, 'is_final' => true],
        ];
        foreach ($statuses as $id => $data) {
            TicketStatus::updateOrCreate(['id' => $id], $data);
        }

        // 3. Ticket Priorities (Pinned ID D-15)
        $priorities = [
            1 => ['name' => 'Critical', 'level' => 1, 'sla_minutes' => 120, 'description' => 'Company-wide system outage (2 hours)'],
            2 => ['name' => 'High', 'level' => 2, 'sla_minutes' => 240, 'description' => 'Employee unable to work (4 hours)'],
            3 => ['name' => 'Medium', 'level' => 3, 'sla_minutes' => 480, 'description' => 'Non-critical application issue (8 hours)'],
            4 => ['name' => 'Low', 'level' => 4, 'sla_minutes' => 1440, 'description' => 'General request (24 hours)'],
        ];
        foreach ($priorities as $id => $data) {
            TicketPriority::updateOrCreate(['id' => $id], $data);
        }

        // 4. Departments (D-15)
        $departments = [
            'Information Technology' => 'Handles company technology, infrastructure, and IT support',
            'Finance & Accounting' => 'Manages company finances, payroll, accounting, and audits',
            'Human Resources' => 'People operations, recruiting, onboarding, and employee relations',
            'Operations' => 'Core operational logistics, facilities, and supply chain',
            'Marketing & Sales' => 'Customer acquisition, marketing campaigns, and business development',
        ];
        foreach ($departments as $name => $description) {
            Department::updateOrCreate(['name' => $name], ['description' => $description]);
        }

        // 5. Ticket Categories (PRD §8, D-04, D-14)
        $categoryTree = [
            'Hardware' => [
                'description' => 'Physical computer hardware and accessories',
                'children' => [
                    'Laptop' => 'Laptop devices and screen/battery issues',
                    'Desktop' => 'Desktop PC units and towers',
                    'Monitor' => 'External monitors and display adapters',
                    'Printer' => 'Network and office printers/scanners',
                    'Peripheral' => 'Keyboard, mouse, webcam, dock, headset',
                ],
            ],
            'Software' => [
                'description' => 'Operating systems and application software',
                'children' => [
                    'Operating System' => 'Windows, macOS, or Linux OS issues',
                    'Microsoft Office' => 'Office 365, Word, Excel, Teams, Outlook',
                    'Internal Application' => 'JarvisOps and internal business apps',
                    'Installation Request' => 'New software installation and license requests',
                ],
            ],
            'Network' => [
                'description' => 'Network connectivity and internet access',
                'children' => [
                    'Wi-Fi' => 'Office wireless network connection issues',
                    'Internet' => 'Wired LAN and general internet accessibility',
                    'VPN' => 'Remote access and secure VPN connections',
                    'DNS' => 'Domain name resolution and routing issues',
                ],
            ],
            'Account' => [
                'description' => 'User identity, logins, and permissions',
                'children' => [
                    'Password' => 'Password reset and lockout resolution',
                    'Account Access' => 'Account creation, unlock, and provisioning',
                    'Permission' => 'File share, group, and privilege adjustments',
                ],
            ],
            'Other' => [
                'description' => 'General and miscellaneous IT requests',
                'children' => [
                    'Other IT Request' => 'Requests not covered by other categories',
                ],
            ],
        ];

        foreach ($categoryTree as $parentName => $config) {
            $parent = TicketCategory::updateOrCreate(
                ['name' => $parentName],
                ['description' => $config['description'], 'parent_id' => null]
            );

            foreach ($config['children'] as $childName => $childDesc) {
                TicketCategory::updateOrCreate(
                    ['name' => $childName],
                    ['description' => $childDesc, 'parent_id' => $parent->id]
                );
            }
        }

        // 6. Knowledge Categories (D-15)
        $knowledgeCategories = [
            'Hardware Troubleshooting' => 'Guides for hardware setup, troubleshooting, and peripherals',
            'Network & Connectivity' => 'Guides for Wi-Fi, Ethernet, VPN, and network configuration',
            'Software & OS' => 'Guides for operating systems, Office 365, and licensed software',
            'Access & Account' => 'Guides for account security, passwords, and service permissions',
            'Office Facility' => 'Guides for meeting rooms, printing, and office IT facilities',
        ];
        foreach ($knowledgeCategories as $name => $description) {
            KnowledgeCategory::updateOrCreate(['name' => $name], ['description' => $description]);
        }
    }
}
