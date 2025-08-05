<?php

namespace Database\Seeders;

use App\Models\Transaction;
use App\Models\CsSummary;
use App\Models\DailySummary;
use App\Models\ProcessedMessage;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class TransactionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        // Sample transactions for today
        $todayTransactions = [
            [
                'message_id' => 'msg_001_' . time(),
                'location' => 'SKY HOUSE BSD',
                'unit' => 'L3/10D',
                'checkout_time' => '14:00',
                'duration' => '3 jam',
                'payment_method' => 'Cash',
                'cs_name' => 'lia',
                'commission' => 25000,
                'amount' => 500000,
                'net_amount' => 475000,
                'date_only' => $today,
                'created_at' => $today->copy()->addHours(10),
            ],
            [
                'message_id' => 'msg_002_' . time(),
                'location' => 'TREEPARK CITY',
                'unit' => 'B2/05A',
                'checkout_time' => '16:00',
                'duration' => '4 jam',
                'payment_method' => 'TF',
                'cs_name' => 'sari',
                'commission' => 30000,
                'amount' => 600000,
                'net_amount' => 570000,
                'date_only' => $today,
                'created_at' => $today->copy()->addHours(12),
            ],
            [
                'message_id' => 'msg_003_' . time(),
                'location' => 'EMERALD BINTARO',
                'unit' => 'A1/08C',
                'checkout_time' => '18:00',
                'duration' => '2 jam',
                'payment_method' => 'Cash',
                'cs_name' => 'dina',
                'commission' => 20000,
                'amount' => 400000,
                'net_amount' => 380000,
                'date_only' => $today,
                'created_at' => $today->copy()->addHours(14),
            ],
        ];

        // Sample transactions for yesterday
        $yesterdayTransactions = [
            [
                'message_id' => 'msg_004_' . time(),
                'location' => 'SKY HOUSE BSD',
                'unit' => 'L2/15B',
                'checkout_time' => '15:00',
                'duration' => '3 jam',
                'payment_method' => 'TF',
                'cs_name' => 'lia',
                'commission' => 25000,
                'amount' => 500000,
                'net_amount' => 475000,
                'date_only' => $yesterday,
                'created_at' => $yesterday->copy()->addHours(11),
            ],
            [
                'message_id' => 'msg_005_' . time(),
                'location' => 'TOKYO RIVERSIDE',
                'unit' => 'T1/03A',
                'checkout_time' => '17:00',
                'duration' => '5 jam',
                'payment_method' => 'Cash',
                'cs_name' => 'maya',
                'commission' => 35000,
                'amount' => 700000,
                'net_amount' => 665000,
                'date_only' => $yesterday,
                'created_at' => $yesterday->copy()->addHours(13),
            ],
        ];

        // Insert transactions
        foreach (array_merge($todayTransactions, $yesterdayTransactions) as $transaction) {
            Transaction::create($transaction);
        }

        // Create CS summaries for today
        $csSummaries = [
            [
                'date' => $today,
                'cs_name' => 'lia',
                'total_bookings' => 1,
                'total_cash' => 500000,
                'total_transfer' => 0,
                'total_commission' => 25000,
            ],
            [
                'date' => $today,
                'cs_name' => 'sari',
                'total_bookings' => 1,
                'total_cash' => 0,
                'total_transfer' => 600000,
                'total_commission' => 30000,
            ],
            [
                'date' => $today,
                'cs_name' => 'dina',
                'total_bookings' => 1,
                'total_cash' => 400000,
                'total_transfer' => 0,
                'total_commission' => 20000,
            ],
        ];

        foreach ($csSummaries as $summary) {
            CsSummary::create($summary);
        }

        // Create daily summary for today
        DailySummary::create([
            'date' => $today,
            'total_bookings' => 3,
            'total_cash' => 900000,
            'total_transfer' => 600000,
            'total_gross' => 1500000,
            'total_commission' => 75000,
        ]);

        // Create daily summary for yesterday
        DailySummary::create([
            'date' => $yesterday,
            'total_bookings' => 2,
            'total_cash' => 700000,
            'total_transfer' => 500000,
            'total_gross' => 1200000,
            'total_commission' => 60000,
        ]);

        // Create some processed messages
        ProcessedMessage::create([
            'message_id' => 'msg_001_' . time(),
            'chat_id' => '120363317169602122@g.us',
            'status' => 'processed',
            'processed_at' => now(),
        ]);

        ProcessedMessage::create([
            'message_id' => 'msg_002_' . time(),
            'chat_id' => '120363317169602123@g.us',
            'status' => 'processed',
            'processed_at' => now()->subMinutes(5),
        ]);
    }
}
