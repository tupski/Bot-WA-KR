<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // Dashboard
            'view-dashboard',

            // Transactions/Checkin
            'view-transactions',
            'create-transactions',
            'edit-transactions',
            'delete-transactions',

            // Reports
            'view-reports',
            'export-reports',

            // Customer Management
            'view-customers',
            'create-customers',
            'edit-customers',
            'delete-customers',

            // Apartments
            'view-apartments',
            'create-apartments',
            'edit-apartments',
            'delete-apartments',

            // Bot Management
            'view-bot-status',
            'manage-bot',
            'view-whatsapp-groups',
            'manage-whatsapp-groups',

            // System Configuration
            'view-config',
            'edit-config',

            // User Management
            'view-users',
            'create-users',
            'edit-users',
            'delete-users',

            // Monitoring
            'view-monitoring',
            'view-logs',

            // Export/Import
            'export-data',
            'import-data',
            'backup-system',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions

        // Superadmin - Full access
        $superAdmin = Role::create(['name' => 'superadmin']);
        $superAdmin->givePermissionTo(Permission::all());

        // Admin - Most access except system config and user management
        $admin = Role::create(['name' => 'admin']);
        $admin->givePermissionTo([
            'view-dashboard',
            'view-transactions', 'create-transactions', 'edit-transactions', 'delete-transactions',
            'view-reports', 'export-reports',
            'view-customers', 'create-customers', 'edit-customers', 'delete-customers',
            'view-apartments', 'create-apartments', 'edit-apartments', 'delete-apartments',
            'view-bot-status', 'view-whatsapp-groups', 'manage-whatsapp-groups',
            'view-monitoring', 'view-logs',
            'export-data', 'import-data',
        ]);

        // Tim Lapangan - Limited to checkin/transactions only
        $timLapangan = Role::create(['name' => 'tim-lapangan']);
        $timLapangan->givePermissionTo([
            'view-dashboard',
            'view-transactions', 'create-transactions',
            'view-customers',
        ]);
    }
}
