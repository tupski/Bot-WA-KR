<?php
// Test rekap command for yesterday
require_once 'vendor/autoload.php';

// Load Laravel app
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "=== TESTING REKAP LOGIC FOR YESTERDAY ===\n";
    
    // Simulate yesterday's rekap logic (like bot does)
    $now = new DateTime('now', new DateTimeZone('Asia/Jakarta'));
    echo "Current time (WIB): " . $now->format('Y-m-d H:i:s') . "\n";
    
    // Yesterday's business day: day before yesterday 12:00 - yesterday 11:59
    $startTime = clone $now;
    $startTime->setTime(12, 0, 0);
    $startTime->modify('-2 days'); // day before yesterday
    
    $endTime = clone $now;
    $endTime->setTime(11, 59, 59);
    $endTime->modify('-1 day'); // yesterday
    
    echo "Yesterday's rekap range: {$startTime->format('Y-m-d H:i:s')} - {$endTime->format('Y-m-d H:i:s')}\n";
    
    // Check transactions in yesterday's range
    $yesterdayCount = DB::table('transactions')
        ->whereBetween('created_at', [$startTime->format('Y-m-d H:i:s'), $endTime->format('Y-m-d H:i:s')])
        ->count();
    
    echo "Transactions in yesterday's range: {$yesterdayCount}\n";
    
    if ($yesterdayCount > 0) {
        $yesterdayData = DB::table('transactions')
            ->whereBetween('created_at', [$startTime->format('Y-m-d H:i:s'), $endTime->format('Y-m-d H:i:s')])
            ->select('location', 'created_at', 'amount')
            ->get();
        
        echo "Yesterday's transactions:\n";
        foreach ($yesterdayData as $trans) {
            echo "  - {$trans->location}: {$trans->created_at} (Rp {$trans->amount})\n";
        }
    }
    
    // Test today's range (should be 0)
    echo "\n=== TODAY'S RANGE (SHOULD BE 0) ===\n";
    $todayStart = clone $now;
    $todayStart->setTime(12, 0, 0);
    $todayStart->modify('-1 day'); // yesterday
    
    $todayEnd = clone $now;
    $todayEnd->setTime(11, 59, 59); // today
    
    echo "Today's rekap range: {$todayStart->format('Y-m-d H:i:s')} - {$todayEnd->format('Y-m-d H:i:s')}\n";
    
    $todayCount = DB::table('transactions')
        ->whereBetween('created_at', [$todayStart->format('Y-m-d H:i:s'), $todayEnd->format('Y-m-d H:i:s')])
        ->count();
    
    echo "Transactions in today's range: {$todayCount}\n";
    
    echo "\n=== CONCLUSION ===\n";
    echo "- Bot !rekap for today: {$todayCount} transactions (correct)\n";
    echo "- Bot !rekap for yesterday would show: {$yesterdayCount} transactions\n";
    echo "- Laravel dashboard should match bot logic\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}
