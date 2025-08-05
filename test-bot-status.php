<?php
// Test script untuk cek status bot
require_once 'vendor/autoload.php';

// Load Laravel app
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Test BotStatusController
$controller = new App\Http\Controllers\BotStatusController();
$response = $controller->status();

echo "Bot Status Response:\n";
echo $response->getContent();
echo "\n";
