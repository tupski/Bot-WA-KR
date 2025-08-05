<?php
// Check current user permissions
require_once 'vendor/autoload.php';

// Load Laravel app
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    // Get all users and their roles
    $users = App\Models\User::with('roles.permissions')->get();
    
    echo "=== USERS AND THEIR PERMISSIONS ===\n";
    foreach ($users as $user) {
        echo "\nUser: {$user->name} ({$user->email})\n";
        echo "Roles: " . $user->roles->pluck('name')->join(', ') . "\n";
        
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        echo "Permissions: " . implode(', ', $permissions) . "\n";
        
        // Check specific WhatsApp permissions
        $hasViewWhatsApp = $user->can('view-whatsapp-groups');
        $hasManageWhatsApp = $user->can('manage-whatsapp-groups');
        
        echo "Can view WhatsApp groups: " . ($hasViewWhatsApp ? 'YES' : 'NO') . "\n";
        echo "Can manage WhatsApp groups: " . ($hasManageWhatsApp ? 'YES' : 'NO') . "\n";
        echo str_repeat('-', 50) . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
