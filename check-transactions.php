<?php
// Check transactions data
require_once 'vendor/autoload.php';

// Load Laravel app
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

try {
    echo "=== CHECKING TRANSACTIONS DATA ===\n";
    
    // Total transactions
    $count = DB::table('transactions')->count();
    echo "Total transactions: {$count}\n";
    
    if ($count > 0) {
        // Latest transaction
        $latest = DB::table('transactions')->orderBy('created_at', 'desc')->first();
        echo "Latest transaction:\n";
        echo "  - ID: {$latest->id}\n";
        echo "  - Created: {$latest->created_at}\n";
        echo "  - Date only: {$latest->date_only}\n";
        echo "  - Location: {$latest->location}\n";
        echo "  - Amount: {$latest->amount}\n";
        
        // Check today's transactions
        $today = date('Y-m-d');
        $todayCount = DB::table('transactions')->where('date_only', $today)->count();
        echo "\nToday's transactions ({$today}): {$todayCount}\n";
        
        // Check yesterday's transactions
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $yesterdayCount = DB::table('transactions')->where('date_only', $yesterday)->count();
        echo "Yesterday's transactions ({$yesterday}): {$yesterdayCount}\n";
        
        // Show all unique dates
        $dates = DB::table('transactions')
            ->select('date_only')
            ->distinct()
            ->orderBy('date_only', 'desc')
            ->limit(10)
            ->pluck('date_only');
        
        echo "\nRecent transaction dates:\n";
        foreach ($dates as $date) {
            $dateCount = DB::table('transactions')->where('date_only', $date)->count();
            echo "  - {$date}: {$dateCount} transactions\n";
        }
        
        // Check current time and expected range
        echo "\n=== DEBUG REKAP COMMAND ===\n";
        $now = new DateTime('now', new DateTimeZone('Asia/Jakarta'));
        echo "Current time (WIB): " . $now->format('Y-m-d H:i:s') . "\n";
        
        // Simulate rekap command logic
        $startTime = clone $now;
        $startTime->setTime(12, 0, 0);
        $startTime->modify('-1 day');
        
        $endTime = clone $now;
        $endTime->setTime(11, 59, 59);
        
        echo "Rekap range: {$startTime->format('Y-m-d H:i:s')} - {$endTime->format('Y-m-d H:i:s')}\n";
        
        // Check transactions in this range
        $rekapCount = DB::table('transactions')
            ->whereBetween('created_at', [$startTime->format('Y-m-d H:i:s'), $endTime->format('Y-m-d H:i:s')])
            ->count();
        
        echo "Transactions in rekap range: {$rekapCount}\n";
        
        if ($rekapCount > 0) {
            $rekapData = DB::table('transactions')
                ->whereBetween('created_at', [$startTime->format('Y-m-d H:i:s'), $endTime->format('Y-m-d H:i:s')])
                ->select('location', 'created_at', 'amount')
                ->get();
            
            echo "Sample transactions in range:\n";
            foreach ($rekapData->take(5) as $trans) {
                echo "  - {$trans->location}: {$trans->created_at} (Rp {$trans->amount})\n";
            }
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}
