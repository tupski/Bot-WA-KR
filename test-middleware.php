<?php
// Test script untuk cek middleware permission
require_once 'vendor/autoload.php';

// Load Laravel app
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "Testing middleware registration:\n";
    
    // Test if we can create WhatsAppGroupController without error
    $controller = new App\Http\Controllers\WhatsAppGroupController();
    echo "✅ WhatsAppGroupController created successfully\n";
    
    // Test if permission middleware is available
    $middleware = app('router')->getMiddleware();
    if (isset($middleware['permission'])) {
        echo "✅ Permission middleware is registered: " . $middleware['permission'] . "\n";
    } else {
        echo "❌ Permission middleware is NOT registered\n";
    }
    
    // Test if role middleware is available
    if (isset($middleware['role'])) {
        echo "✅ Role middleware is registered: " . $middleware['role'] . "\n";
    } else {
        echo "❌ Role middleware is NOT registered\n";
    }
    
    echo "\nAll middleware tests completed!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}
