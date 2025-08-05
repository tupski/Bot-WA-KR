<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\ProcessedMessage;
use App\Models\CsSummary;
use App\Models\DailySummary;
use App\Models\Apartment;
use App\Models\CustomerService;
use Illuminate\Http\Request;
use Carbon\Carbon;

use Illuminate\Support\Facades\Log;
use App\Events\NewTransactionEvent;

class WebhookController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->except(['webhook']);
    }

    /**
     * Webhook endpoint for bot to send transaction data
     */
    public function webhook(Request $request)
    {
        try {
            // Validate webhook token
            $token = $request->header('X-Webhook-Token');
            if ($token !== config('app.webhook_token', 'default-webhook-token')) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $validated = $request->validate([
                'message_id' => 'required|string',
                'location' => 'required|string',
                'unit' => 'required|string',
                'checkout_time' => 'required|string',
                'duration' => 'required|string',
                'payment_method' => 'required|in:Cash,TF',
                'cs_name' => 'required|string',
                'amount' => 'required|numeric|min:0',
                'commission' => 'required|numeric|min:0',
                'date_only' => 'required|date',
                'chat_id' => 'nullable|string',
            ]);

            // Check if message already processed
            if (ProcessedMessage::where('message_id', $validated['message_id'])->exists()) {
                return response()->json(['message' => 'Message already processed'], 200);
            }

            // Calculate net amount
            $validated['net_amount'] = $validated['amount'] - $validated['commission'];

            // Create transaction
            $transaction = Transaction::create($validated);

            // Mark message as processed
            ProcessedMessage::create([
                'message_id' => $validated['message_id'],
                'chat_id' => $validated['chat_id'] ?? '',
                'status' => 'processed',
                'processed_at' => now(),
            ]);

            // Update summaries
            $this->updateSummaries($validated);

            // Broadcast new transaction event
            broadcast(new NewTransactionEvent($transaction));

            Log::info('Webhook transaction processed', ['transaction_id' => $transaction->id]);

            return response()->json([
                'message' => 'Transaction processed successfully',
                'transaction_id' => $transaction->id
            ], 201);

        } catch (\Exception $e) {
            Log::error('Webhook error: ' . $e->getMessage(), [
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Get apartments list for bot
     */
    public function apartments()
    {
        $apartments = Apartment::active()->select('name', 'code', 'whatsapp_group_id')->get();
        return response()->json($apartments);
    }

    /**
     * Get customer services list for bot
     */
    public function customerServices()
    {
        $cs = CustomerService::active()->select('name', 'full_name', 'commission_rate')->get();
        return response()->json($cs);
    }

    /**
     * Get daily summary
     */
    public function dailySummary(Request $request)
    {
        $date = $request->get('date', Carbon::today()->format('Y-m-d'));
        $selectedDate = Carbon::parse($date);

        $summary = DailySummary::byDate($selectedDate)->first();

        if (!$summary) {
            return response()->json(['message' => 'No data found for this date'], 404);
        }

        return response()->json($summary);
    }

    /**
     * Get CS performance
     */
    public function csPerformance(Request $request)
    {
        $date = $request->get('date', Carbon::today()->format('Y-m-d'));
        $selectedDate = Carbon::parse($date);

        $performance = CsSummary::byDate($selectedDate)->get();

        return response()->json($performance);
    }

    /**
     * Update summaries after transaction
     */
    private function updateSummaries($transactionData)
    {
        $date = Carbon::parse($transactionData['date_only']);

        // Update CS Summary
        $csSummary = CsSummary::firstOrCreate(
            [
                'date' => $date,
                'cs_name' => $transactionData['cs_name']
            ],
            [
                'total_bookings' => 0,
                'total_cash' => 0,
                'total_transfer' => 0,
                'total_commission' => 0,
            ]
        );

        $csSummary->increment('total_bookings');
        $csSummary->increment('total_commission', $transactionData['commission']);

        if ($transactionData['payment_method'] === 'Cash') {
            $csSummary->increment('total_cash', $transactionData['amount']);
        } else {
            $csSummary->increment('total_transfer', $transactionData['amount']);
        }

        // Update Daily Summary
        $dailySummary = DailySummary::firstOrCreate(
            ['date' => $date],
            [
                'total_bookings' => 0,
                'total_cash' => 0,
                'total_transfer' => 0,
                'total_gross' => 0,
                'total_commission' => 0,
            ]
        );

        $dailySummary->increment('total_bookings');
        $dailySummary->increment('total_gross', $transactionData['amount']);
        $dailySummary->increment('total_commission', $transactionData['commission']);

        if ($transactionData['payment_method'] === 'Cash') {
            $dailySummary->increment('total_cash', $transactionData['amount']);
        } else {
            $dailySummary->increment('total_transfer', $transactionData['amount']);
        }
    }
}
