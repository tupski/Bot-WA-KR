<?php

namespace Database\Seeders;

use App\Models\Config;
use Illuminate\Database\Seeder;

class ConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $configs = [
            [
                'key' => 'bot_name',
                'value' => 'KakaRama Bot',
                'description' => 'Nama bot WhatsApp',
                'type' => 'string',
                'is_public' => true,
            ],
            [
                'key' => 'default_commission_rate',
                'value' => '5',
                'description' => 'Rate komisi default untuk CS baru (%)',
                'type' => 'number',
                'is_public' => false,
            ],
            [
                'key' => 'notification_email',
                'value' => 'admin@kakarama.com',
                'description' => 'Email untuk notifikasi sistem',
                'type' => 'string',
                'is_public' => false,
            ],
            [
                'key' => 'daily_report_time',
                'value' => '23:00',
                'description' => 'Waktu pengiriman laporan harian (HH:MM)',
                'type' => 'string',
                'is_public' => false,
            ],
            [
                'key' => 'whatsapp_api_url',
                'value' => '',
                'description' => 'URL API WhatsApp',
                'type' => 'string',
                'is_public' => false,
            ],
            [
                'key' => 'whatsapp_api_token',
                'value' => '',
                'description' => 'Token API WhatsApp',
                'type' => 'string',
                'is_public' => false,
            ],
            [
                'key' => 'backup_schedule',
                'value' => '0 2 * * *',
                'description' => 'Jadwal backup database (cron format)',
                'type' => 'string',
                'is_public' => false,
            ],
            [
                'key' => 'max_transaction_amount',
                'value' => '5000000',
                'description' => 'Maksimal amount transaksi',
                'type' => 'number',
                'is_public' => false,
            ],
            [
                'key' => 'min_transaction_amount',
                'value' => '50000',
                'description' => 'Minimal amount transaksi',
                'type' => 'number',
                'is_public' => false,
            ],
            [
                'key' => 'system_timezone',
                'value' => 'Asia/Jakarta',
                'description' => 'Timezone sistem',
                'type' => 'string',
                'is_public' => true,
            ],
            [
                'key' => 'enable_email_notifications',
                'value' => '1',
                'description' => 'Aktifkan notifikasi email',
                'type' => 'boolean',
                'is_public' => false,
            ],
            [
                'key' => 'enable_realtime_notifications',
                'value' => '1',
                'description' => 'Aktifkan notifikasi real-time',
                'type' => 'boolean',
                'is_public' => true,
            ],
            [
                'key' => 'enable_daily_reports',
                'value' => '1',
                'description' => 'Aktifkan laporan harian otomatis',
                'type' => 'boolean',
                'is_public' => false,
            ],
        ];

        foreach ($configs as $config) {
            Config::updateOrCreate(
                ['key' => $config['key']],
                $config
            );
        }
    }
}
