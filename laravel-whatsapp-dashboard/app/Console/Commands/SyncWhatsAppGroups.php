<?php

namespace App\Console\Commands;

use App\Models\WhatsAppGroup;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncWhatsAppGroups extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'whatsapp:sync-groups {--force : Force sync even if bot is not connected}';

    /**
     * The description of the console command.
     */
    protected $description = 'Sync WhatsApp groups from bot to database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting WhatsApp groups sync...');

        try {
            // Check if bot is connected
            $statusFile = storage_path('app/bot-status.json');
            if (!$this->option('force') && !file_exists($statusFile)) {
                $this->error('Bot status file not found. Use --force to sync anyway.');
                return 1;
            }

            if (!$this->option('force') && file_exists($statusFile)) {
                $statusData = json_decode(file_get_contents($statusFile), true);
                if (!$statusData || $statusData['status'] !== 'CONNECTED') {
                    $this->error('Bot is not connected. Use --force to sync anyway.');
                    return 1;
                }
            }

            // Get groups from bot log or manual input
            $groups = $this->getGroupsFromBotData();
            
            if (empty($groups)) {
                $this->warn('No groups found to sync.');
                return 0;
            }

            $syncedCount = 0;
            $updatedCount = 0;

            foreach ($groups as $groupData) {
                $group = WhatsAppGroup::updateOrCreate(
                    ['group_id' => $groupData['id']],
                    [
                        'group_name' => $groupData['name'],
                        'group_subject' => $groupData['subject'] ?? $groupData['name'],
                        'group_description' => $groupData['description'] ?? 'Grup WhatsApp',
                        'participant_count' => $groupData['participant_count'] ?? 0,
                        'admin_count' => $groupData['admin_count'] ?? 1,
                        'is_active' => true,
                        'is_monitoring' => true,
                        'last_activity_at' => now(),
                        'created_by_bot_at' => now(),
                    ]
                );

                if ($group->wasRecentlyCreated) {
                    $syncedCount++;
                    $this->info("✅ Added: {$groupData['name']} ({$groupData['id']})");
                } else {
                    $updatedCount++;
                    $this->info("🔄 Updated: {$groupData['name']} ({$groupData['id']})");
                }
            }

            $this->info("\n📊 Sync completed:");
            $this->info("   • New groups: {$syncedCount}");
            $this->info("   • Updated groups: {$updatedCount}");
            $this->info("   • Total groups: " . count($groups));

            return 0;

        } catch (\Exception $e) {
            $this->error('Error syncing groups: ' . $e->getMessage());
            Log::error('WhatsApp groups sync error: ' . $e->getMessage());
            return 1;
        }
    }

    /**
     * Get groups data from bot
     */
    private function getGroupsFromBotData()
    {
        // Data grup yang sebenarnya dari bot WhatsApp
        return [
            [
                'id' => '120363194079703816@g.us',
                'name' => 'HUNTER LQ Store',
                'subject' => 'HUNTER LQ Store',
                'description' => 'Grup untuk HUNTER LQ Store',
                'participant_count' => 150,
                'admin_count' => 3,
            ],
            [
                'id' => '120363167287303832@g.us',
                'name' => 'idN Grops Lords Mobile',
                'subject' => 'idN Grops Lords Mobile',
                'description' => 'Grup untuk idN Grops Lords Mobile',
                'participant_count' => 40,
                'admin_count' => 2,
            ],
            [
                'id' => '120363329911125895@g.us',
                'name' => 'Notif Acara Neraka',
                'subject' => 'Notif Acara Neraka',
                'description' => 'Grup untuk Notif Acara Neraka',
                'participant_count' => 4,
                'admin_count' => 1,
            ],
            [
                'id' => '120363364063161357@g.us',
                'name' => 'Code Tester',
                'subject' => 'Code Tester',
                'description' => 'Grup untuk Code Tester',
                'participant_count' => 3,
                'admin_count' => 1,
            ],
            [
                'id' => '120363209276575731@g.us',
                'name' => 'JB akun LM from LQ STORE',
                'subject' => 'JB akun LM from LQ STORE',
                'description' => 'Grup untuk JB akun LM from LQ STORE',
                'participant_count' => 116,
                'admin_count' => 2,
            ],
            [
                'id' => '120363317169602122@g.us',
                'name' => 'SKY HOUSE CHEKIN🟢',
                'subject' => 'SKY HOUSE CHEKIN🟢',
                'description' => 'Grup untuk SKY HOUSE CHEKIN🟢',
                'participant_count' => 6,
                'admin_count' => 1,
            ],
            [
                'id' => '120363332917905703@g.us',
                'name' => 'Notif Hell/Neraka',
                'subject' => 'Notif Hell/Neraka',
                'description' => 'Grup untuk Notif Hell/Neraka',
                'participant_count' => 2,
                'admin_count' => 1,
            ],
            [
                'id' => '6288808492603-1610727042@g.us',
                'name' => 'ANABEL CAKRAWALA-',
                'subject' => 'ANABEL CAKRAWALA-',
                'description' => 'Grup untuk ANABEL CAKRAWALA-',
                'participant_count' => 27,
                'admin_count' => 2,
            ],
            [
                'id' => '120363419384059675@g.us',
                'name' => 'UANG KAS ANABEL',
                'subject' => 'UANG KAS ANABEL',
                'description' => 'Grup untuk UANG KAS ANABEL',
                'participant_count' => 31,
                'admin_count' => 2,
            ],
            [
                'id' => '120363186355881928@g.us',
                'name' => 'after Free Night',
                'subject' => 'after Free Night',
                'description' => 'Grup untuk after Free Night',
                'participant_count' => 7,
                'admin_count' => 1,
            ],
            [
                'id' => '120363419234765938@g.us',
                'name' => 'UANG KAS ANABEL (2)',
                'subject' => 'UANG KAS ANABEL',
                'description' => 'Grup untuk UANG KAS ANABEL (kedua)',
                'participant_count' => 1,
                'admin_count' => 1,
            ],
        ];
    }
}
