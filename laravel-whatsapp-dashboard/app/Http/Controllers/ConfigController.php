<?php

namespace App\Http\Controllers;

use App\Models\Config;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ConfigController extends Controller
{
    public function index()
    {
        $configs = Config::all()->keyBy('key');

        return view('config.index', compact('configs'));
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'configs' => 'required|array',
            'configs.*' => 'nullable|string',
        ]);

        foreach ($validated['configs'] as $key => $value) {
            $config = Config::where('key', $key)->first();

            if ($config) {
                $oldValue = $config->value;
                $config->update(['value' => $value]);

                ActivityLog::log('updated', $config, ['value' => $oldValue], ['value' => $value], "Config {$key} updated");
            } else {
                $config = Config::create([
                    'key' => $key,
                    'value' => $value,
                    'description' => $this->getConfigDescription($key)
                ]);

                ActivityLog::log('created', $config, null, ['key' => $key, 'value' => $value], "Config {$key} created");
            }
        }

        return redirect()->route('config.index')->with('success', 'Konfigurasi berhasil diperbarui.');
    }

    private function getConfigDescription($key)
    {
        $descriptions = [
            'bot_name' => 'Nama bot WhatsApp',
            'default_commission_rate' => 'Rate komisi default untuk CS baru (%)',
            'notification_email' => 'Email untuk notifikasi sistem',
            'daily_report_time' => 'Waktu pengiriman laporan harian (HH:MM)',
            'whatsapp_api_url' => 'URL API WhatsApp',
            'whatsapp_api_token' => 'Token API WhatsApp',
            'backup_schedule' => 'Jadwal backup database (cron format)',
            'max_transaction_amount' => 'Maksimal amount transaksi',
            'min_transaction_amount' => 'Minimal amount transaksi',
            'system_timezone' => 'Timezone sistem',
        ];

        return $descriptions[$key] ?? 'Konfigurasi sistem';
    }
}
