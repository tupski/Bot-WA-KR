<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\WebhookController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// WhatsApp Webhook (No auth required for external webhooks)
Route::post('/webhook/whatsapp', [\App\Http\Controllers\WhatsAppWebhookController::class, 'handle']);

// Health check endpoint
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now(),
        'version' => '1.0.0'
    ]);
});

// Webhook routes (no auth required)
Route::post('/webhook/transaction', [WebhookController::class, 'webhook']);

// API routes (auth required)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/apartments', [WebhookController::class, 'apartments']);
    Route::get('/customer-services', [WebhookController::class, 'customerServices']);
    Route::get('/daily-summary', [WebhookController::class, 'dailySummary']);
    Route::get('/cs-performance', [WebhookController::class, 'csPerformance']);
});
