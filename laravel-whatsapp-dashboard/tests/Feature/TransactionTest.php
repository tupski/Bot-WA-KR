<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Transaction;
use App\Models\CustomerService;
use App\Models\Apartment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use Carbon\Carbon;

class TransactionTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test user with admin role
        $this->user = User::factory()->create();
        $this->user->assignRole('admin');

        // Create test data
        $this->cs = CustomerService::factory()->create();
        $this->apartment = Apartment::factory()->create();
    }

    public function test_can_view_transactions_index()
    {
        $this->actingAs($this->user)
            ->get(route('transactions.index'))
            ->assertStatus(200)
            ->assertViewIs('transactions.index');
    }

    public function test_can_create_transaction()
    {
        $transactionData = [
            'message_id' => 'test_' . uniqid(),
            'location' => $this->apartment->name,
            'unit' => 'A101',
            'checkout_time' => '14:00',
            'duration' => '2 jam',
            'payment_method' => 'Cash',
            'cs_name' => $this->cs->name,
            'amount' => 500000,
            'commission' => 25000,
            'date_only' => Carbon::today()->format('Y-m-d'),
        ];

        $this->actingAs($this->user)
            ->post(route('transactions.store'), $transactionData)
            ->assertRedirect(route('transactions.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('transactions', [
            'message_id' => $transactionData['message_id'],
            'amount' => $transactionData['amount'],
        ]);
    }

    public function test_can_update_transaction()
    {
        $transaction = Transaction::factory()->create([
            'cs_name' => $this->cs->name,
            'location' => $this->apartment->name,
        ]);

        $updateData = [
            'message_id' => $transaction->message_id,
            'location' => $transaction->location,
            'unit' => 'B202',
            'checkout_time' => '15:00',
            'duration' => '3 jam',
            'payment_method' => 'TF',
            'cs_name' => $transaction->cs_name,
            'amount' => 750000,
            'commission' => 37500,
            'date_only' => $transaction->date_only->format('Y-m-d'),
        ];

        $this->actingAs($this->user)
            ->put(route('transactions.update', $transaction), $updateData)
            ->assertRedirect(route('transactions.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'unit' => 'B202',
            'amount' => 750000,
        ]);
    }

    public function test_can_delete_transaction()
    {
        $transaction = Transaction::factory()->create([
            'cs_name' => $this->cs->name,
            'location' => $this->apartment->name,
        ]);

        $this->actingAs($this->user)
            ->delete(route('transactions.destroy', $transaction))
            ->assertRedirect(route('transactions.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('transactions', [
            'id' => $transaction->id,
        ]);
    }

    public function test_transaction_validation_rules()
    {
        $this->actingAs($this->user)
            ->post(route('transactions.store'), [])
            ->assertSessionHasErrors([
                'message_id',
                'location',
                'unit',
                'amount',
                'cs_name',
            ]);
    }

    public function test_webhook_can_create_transaction()
    {
        $webhookData = [
            'message_id' => 'webhook_' . uniqid(),
            'location' => $this->apartment->name,
            'unit' => 'C303',
            'checkout_time' => '16:00',
            'duration' => '1 jam',
            'payment_method' => 'Cash',
            'cs_name' => $this->cs->name,
            'amount' => 300000,
            'commission' => 15000,
            'date_only' => Carbon::today()->format('Y-m-d'),
        ];

        $this->withHeaders([
            'X-Webhook-Token' => config('app.webhook_token', 'default-webhook-token'),
        ])
        ->postJson('/api/webhook/transaction', $webhookData)
        ->assertStatus(201)
        ->assertJson([
            'message' => 'Transaction processed successfully',
        ]);

        $this->assertDatabaseHas('transactions', [
            'message_id' => $webhookData['message_id'],
            'amount' => $webhookData['amount'],
        ]);
    }

    public function test_webhook_rejects_duplicate_message_id()
    {
        $transaction = Transaction::factory()->create([
            'cs_name' => $this->cs->name,
            'location' => $this->apartment->name,
        ]);

        $webhookData = [
            'message_id' => $transaction->message_id,
            'location' => $this->apartment->name,
            'unit' => 'D404',
            'checkout_time' => '17:00',
            'duration' => '2 jam',
            'payment_method' => 'TF',
            'cs_name' => $this->cs->name,
            'amount' => 400000,
            'commission' => 20000,
            'date_only' => Carbon::today()->format('Y-m-d'),
        ];

        $this->withHeaders([
            'X-Webhook-Token' => config('app.webhook_token', 'default-webhook-token'),
        ])
        ->postJson('/api/webhook/transaction', $webhookData)
        ->assertStatus(200)
        ->assertJson([
            'message' => 'Message already processed',
        ]);
    }

    public function test_webhook_requires_valid_token()
    {
        $webhookData = [
            'message_id' => 'invalid_token_test',
            'location' => $this->apartment->name,
            'unit' => 'E505',
            'checkout_time' => '18:00',
            'duration' => '1 jam',
            'payment_method' => 'Cash',
            'cs_name' => $this->cs->name,
            'amount' => 200000,
            'commission' => 10000,
            'date_only' => Carbon::today()->format('Y-m-d'),
        ];

        $this->withHeaders([
            'X-Webhook-Token' => 'invalid-token',
        ])
        ->postJson('/api/webhook/transaction', $webhookData)
        ->assertStatus(401);
    }
}
