<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('dashboard');
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified', 'role:admin,cs,viewer'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Transactions routes
    Route::resource('transactions', \App\Http\Controllers\TransactionController::class);
    Route::get('transactions-export', [\App\Http\Controllers\TransactionController::class, 'export'])->name('transactions.export');

    // Reports routes
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/', [\App\Http\Controllers\ReportController::class, 'index'])->name('index');
        Route::get('/daily', [\App\Http\Controllers\ReportController::class, 'daily'])->name('daily');
        Route::get('/monthly', [\App\Http\Controllers\ReportController::class, 'monthly'])->name('monthly');
        Route::get('/custom', [\App\Http\Controllers\ReportController::class, 'custom'])->name('custom');
        Route::get('/export', [\App\Http\Controllers\ReportController::class, 'export'])->name('export');
    });

    // Customer Services routes
    Route::resource('customer-services', \App\Http\Controllers\CustomerServiceController::class);
    Route::get('customer-services-ranking', [\App\Http\Controllers\CustomerServiceController::class, 'ranking'])->name('customer-services.ranking');

    // Apartments routes
    Route::resource('apartments', \App\Http\Controllers\ApartmentController::class);

    // Configuration routes
    Route::get('config', [\App\Http\Controllers\ConfigController::class, 'index'])->name('config.index');
    Route::put('config', [\App\Http\Controllers\ConfigController::class, 'update'])->name('config.update');

    // Export/Import routes
    Route::prefix('export-import')->name('export-import.')->group(function () {
        Route::get('/', [\App\Http\Controllers\ExportImportController::class, 'index'])->name('index');
    });
    Route::post('export/pdf', [\App\Http\Controllers\ExportImportController::class, 'exportPdf'])->name('export.pdf');
    Route::post('export/csv', [\App\Http\Controllers\ExportImportController::class, 'exportCsv'])->name('export.csv');
    Route::get('export/backup', [\App\Http\Controllers\ExportImportController::class, 'backup'])->name('export.backup');
    Route::post('import/restore', [\App\Http\Controllers\ExportImportController::class, 'restore'])->name('import.restore');

    // User Management routes (Admin only)
    Route::middleware('role:admin')->group(function () {
        Route::resource('users', \App\Http\Controllers\UserController::class);

        // Monitoring routes
        Route::prefix('monitoring')->name('monitoring.')->group(function () {
            Route::get('/', [\App\Http\Controllers\MonitoringController::class, 'index'])->name('index');
            Route::get('/logs', [\App\Http\Controllers\MonitoringController::class, 'logs'])->name('logs');
            Route::get('/system-status', [\App\Http\Controllers\MonitoringController::class, 'systemStatus'])->name('system-status');
        });
    });

    // Bot Status routes
    Route::prefix('bot-status')->name('bot-status.')->group(function () {
        Route::get('/', [\App\Http\Controllers\BotStatusController::class, 'index'])->name('index');
        Route::get('/status', [\App\Http\Controllers\BotStatusController::class, 'status'])->name('status');
        Route::get('/qr-code', [\App\Http\Controllers\BotStatusController::class, 'qrCode'])->name('qr-code');
        Route::post('/restart', [\App\Http\Controllers\BotStatusController::class, 'restart'])->name('restart');
        Route::post('/logout', [\App\Http\Controllers\BotStatusController::class, 'logout'])->name('logout');
    });

    // WhatsApp Groups routes
    Route::resource('whatsapp-groups', \App\Http\Controllers\WhatsAppGroupController::class);
    Route::post('whatsapp-groups/{whatsappGroup}/toggle-monitoring', [\App\Http\Controllers\WhatsAppGroupController::class, 'toggleMonitoring'])->name('whatsapp-groups.toggle-monitoring');
    Route::get('whatsapp-groups-sync', [\App\Http\Controllers\WhatsAppGroupController::class, 'sync'])->name('whatsapp-groups.sync');
});

require __DIR__.'/auth.php';
