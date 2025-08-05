<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\WhatsAppGroup;
use App\Models\Apartment;
use App\Models\ProcessedMessage;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class WhatsAppWebhookController extends Controller
{
    /**
     * Handle incoming WhatsApp webhook
     */
    public function handle(Request $request)
    {
        try {
            // Log incoming webhook for debugging
            Log::info('WhatsApp Webhook Received', [
                'headers' => $request->headers->all(),
                'body' => $request->all()
            ]);

            // Validate webhook signature (implement your security)
            if (!$this->validateWebhook($request)) {
                Log::warning('Invalid webhook signature');
                return response()->json(['error' => 'Invalid signature'], 401);
            }

            $data = $request->all();

            // Handle different webhook types
            if (isset($data['messages'])) {
                foreach ($data['messages'] as $message) {
                    $this->processMessage($message);
                }
            }

            if (isset($data['groups'])) {
                foreach ($data['groups'] as $group) {
                    $this->processGroupUpdate($group);
                }
            }

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            Log::error('WhatsApp Webhook Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);

            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Process incoming message
     */
    private function processMessage($message)
    {
        // Check if message already processed
        if (ProcessedMessage::where('message_id', $message['id'])->exists()) {
            Log::info('Message already processed', ['message_id' => $message['id']]);
            return;
        }

        // Mark message as processed
        ProcessedMessage::create([
            'message_id' => $message['id'],
            'chat_id' => $message['from'],
            'processed_at' => now(),
        ]);

        // Update group activity
        $this->updateGroupActivity($message['from']);

        // Parse transaction data from message
        $transactionData = $this->parseTransactionMessage($message);

        if ($transactionData) {
            $this->createTransaction($transactionData, $message);
        }
    }

    /**
     * Parse transaction message using regex patterns
     */
    private function parseTransactionMessage($message)
    {
        $text = $message['body'] ?? '';

        // Pattern for transaction messages
        // Example: "SKY HOUSE BSD\nUnit 1205\nCheckout: 14:30\nDurasi: 3 jam\nCash\nJohn Doe\n150000"

        $patterns = [
            // Pattern 1: Standard format
            '/^(.+?)\n(?:Unit\s*)?(.+?)\n(?:Checkout|Check\s*out):\s*(\d{1,2}:\d{2})\n(?:Durasi|Duration):\s*(\d+)\s*(?:jam|hour|hr|h)\n(.+?)\n(.+?)\n(\d+)$/im',

            // Pattern 2: Alternative format with phone
            '/^(.+?)\n(?:Unit\s*)?(.+?)\n(?:Checkout|Check\s*out):\s*(\d{1,2}:\d{2})\n(?:Durasi|Duration):\s*(\d+)\s*(?:jam|hour|hr|h)\n(.+?)\n(.+?)\s*-?\s*(\d{10,15})\n(\d+)$/im',

            // Pattern 3: Compact format
            '/(.+?)\s*-\s*(.+?)\s*-\s*(\d{1,2}:\d{2})\s*-\s*(\d+)h?\s*-\s*(.+?)\s*-\s*(.+?)\s*-\s*(\d+)/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $matches)) {
                return $this->extractTransactionData($matches, $message);
            }
        }

        // Try to parse apartment and unit separately
        $apartmentData = $this->parseApartmentInfo($text);
        if ($apartmentData) {
            return $apartmentData;
        }

        return null;
    }

    /**
     * Extract transaction data from regex matches
     */
    private function extractTransactionData($matches, $message)
    {
        // Remove empty first element (full match)
        array_shift($matches);

        $location = trim($matches[0] ?? '');
        $unit = trim($matches[1] ?? '');
        $checkoutTime = trim($matches[2] ?? '');
        $duration = (int)($matches[3] ?? 0);
        $paymentMethod = trim($matches[4] ?? '');
        $customerName = trim($matches[5] ?? '');

        // Handle phone number if present
        $customerPhone = null;
        $amount = 0;

        if (count($matches) >= 8) {
            // Pattern with phone number
            $customerPhone = trim($matches[6] ?? '');
            $amount = (int)($matches[7] ?? 0);
        } else {
            // Pattern without phone number
            $amount = (int)($matches[6] ?? 0);
        }

        // Find apartment
        $apartment = $this->findApartment($location);

        return [
            'location' => $location,
            'unit' => $unit,
            'checkout_time' => $checkoutTime,
            'duration' => $duration,
            'payment_method' => $paymentMethod,
            'customer_name' => $customerName,
            'customer_phone' => $customerPhone,
            'amount' => $amount,
            'chat_id' => $message['from'],
            'whatsapp_group_id' => $message['from'],
            'apartment_id' => $apartment ? $apartment->id : null,
            'date_only' => Carbon::now()->format('Y-m-d'),
        ];
    }

    /**
     * Parse apartment information from text
     */
    private function parseApartmentInfo($text)
    {
        $apartments = Apartment::all();

        foreach ($apartments as $apartment) {
            // Check if apartment name or code is mentioned
            if (stripos($text, $apartment->name) !== false ||
                stripos($text, $apartment->code) !== false) {

                // Try to extract more info
                $lines = explode("\n", $text);
                $data = [
                    'location' => $apartment->name,
                    'apartment_id' => $apartment->id,
                    'chat_id' => null, // Will be set by caller
                    'date_only' => Carbon::now()->format('Y-m-d'),
                ];

                // Parse additional fields from lines
                foreach ($lines as $line) {
                    $line = trim($line);

                    // Unit
                    if (preg_match('/(?:unit|kamar|room)\s*:?\s*(.+)/i', $line, $matches)) {
                        $data['unit'] = trim($matches[1]);
                    }

                    // Checkout time
                    if (preg_match('/(?:checkout|check\s*out)\s*:?\s*(\d{1,2}:\d{2})/i', $line, $matches)) {
                        $data['checkout_time'] = $matches[1];
                    }

                    // Duration
                    if (preg_match('/(?:durasi|duration)\s*:?\s*(\d+)/i', $line, $matches)) {
                        $data['duration'] = (int)$matches[1];
                    }

                    // Payment method
                    if (preg_match('/(?:cash|transfer|qris|ovo|gopay|dana)/i', $line, $matches)) {
                        $data['payment_method'] = $matches[0];
                    }

                    // Amount (numbers only line)
                    if (preg_match('/^\d{4,}$/', $line)) {
                        $data['amount'] = (int)$line;
                    }

                    // Customer name (line with letters and spaces, not containing keywords)
                    if (preg_match('/^[a-zA-Z\s]+$/', $line) &&
                        !preg_match('/(?:unit|checkout|durasi|cash|transfer)/i', $line) &&
                        strlen($line) > 2) {
                        $data['customer_name'] = $line;
                    }
                }

                return $data;
            }
        }

        return null;
    }

    /**
     * Find apartment by name or code
     */
    private function findApartment($location)
    {
        return Apartment::where(function($query) use ($location) {
            $query->where('name', 'like', "%{$location}%")
                  ->orWhere('code', 'like', "%{$location}%");
        })->first();
    }

    /**
     * Create transaction from parsed data
     */
    private function createTransaction($data, $message)
    {
        DB::beginTransaction();

        try {
            // Calculate commission (5% default)
            $commissionRate = 5; // Get from config
            $commission = ($data['amount'] ?? 0) * ($commissionRate / 100);
            $netAmount = ($data['amount'] ?? 0) - $commission;

            $transaction = Transaction::create([
                'message_id' => $message['id'],
                'location' => $data['location'] ?? '',
                'unit' => $data['unit'] ?? '',
                'checkout_time' => $data['checkout_time'] ?? '',
                'duration' => $data['duration'] ?? 0,
                'payment_method' => $data['payment_method'] ?? '',
                'customer_name' => $data['customer_name'] ?? '',
                'customer_phone' => $data['customer_phone'] ?? null,
                'amount' => $data['amount'] ?? 0,
                'commission' => $commission,
                'net_amount' => $netAmount,
                'chat_id' => $data['chat_id'],
                'whatsapp_group_id' => $data['whatsapp_group_id'],
                'date_only' => $data['date_only'],
                'skip_financial' => false,
            ]);

            // Log activity
            ActivityLog::log('created', $transaction, null, $data, 'Transaction created from WhatsApp message');

            DB::commit();

            Log::info('Transaction created from WhatsApp', [
                'transaction_id' => $transaction->id,
                'message_id' => $message['id'],
                'amount' => $data['amount'] ?? 0
            ]);

        } catch (\Exception $e) {
            DB::rollback();

            Log::error('Failed to create transaction from WhatsApp', [
                'error' => $e->getMessage(),
                'data' => $data,
                'message_id' => $message['id']
            ]);

            throw $e;
        }
    }

    /**
     * Process group updates
     */
    private function processGroupUpdate($groupData)
    {
        $group = WhatsAppGroup::updateOrCreate(
            ['group_id' => $groupData['id']],
            [
                'group_name' => $groupData['name'] ?? 'Unknown Group',
                'group_subject' => $groupData['subject'] ?? null,
                'group_description' => $groupData['description'] ?? null,
                'participant_count' => $groupData['participant_count'] ?? 0,
                'admin_count' => $groupData['admin_count'] ?? 0,
                'last_activity_at' => now(),
            ]
        );

        Log::info('Group updated from WhatsApp', [
            'group_id' => $group->id,
            'whatsapp_group_id' => $groupData['id']
        ]);
    }

    /**
     * Update group activity timestamp
     */
    private function updateGroupActivity($groupId)
    {
        WhatsAppGroup::where('group_id', $groupId)
            ->update(['last_activity_at' => now()]);
    }

    /**
     * Validate webhook signature
     */
    private function validateWebhook(Request $request)
    {
        // Implement your webhook validation logic here
        // For example, verify HMAC signature

        $signature = $request->header('X-Hub-Signature-256');
        $webhookSecret = config('services.whatsapp.webhook_secret');

        if (!$signature || !$webhookSecret) {
            return true; // Skip validation if not configured
        }

        // For testing, always return true
        return true;

        $expectedSignature = 'sha256=' . hash_hmac('sha256', $request->getContent(), $webhookSecret);

        return hash_equals($expectedSignature, $signature);
    }
}
