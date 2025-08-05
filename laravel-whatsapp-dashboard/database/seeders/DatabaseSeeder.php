<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Apartment;
use App\Models\CustomerService;
use App\Models\Config;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin user
        User::create([
            'name' => 'Administrator',
            'email' => 'admin@kakaramaroom.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
            'phone' => '081234567890',
        ]);

        // Create sample apartments
        $apartments = [
            ['name' => 'SKY HOUSE BSD', 'code' => 'SKY', 'whatsapp_group_id' => '120363317169602122@g.us'],
            ['name' => 'TREEPARK CITY', 'code' => 'TREE', 'whatsapp_group_id' => '120363317169602123@g.us'],
            ['name' => 'SPRINGWOOD RESIDENCE', 'code' => 'SPRING', 'whatsapp_group_id' => '120363317169602124@g.us'],
            ['name' => 'EMERALD BINTARO', 'code' => 'EMERALD', 'whatsapp_group_id' => '120363317169602125@g.us'],
            ['name' => 'TOKYO RIVERSIDE', 'code' => 'TOKYO', 'whatsapp_group_id' => '120363317169602126@g.us'],
            ['name' => 'SERPONG GARDEN', 'code' => 'SERPONG', 'whatsapp_group_id' => '120363317169602127@g.us'],
        ];

        foreach ($apartments as $apartment) {
            Apartment::create($apartment);
        }

        // Create sample customer services
        $customerServices = [
            ['name' => 'lia', 'full_name' => 'Lia Permata', 'commission_rate' => 5.00, 'target_monthly' => 50000000],
            ['name' => 'sari', 'full_name' => 'Sari Indah', 'commission_rate' => 5.00, 'target_monthly' => 45000000],
            ['name' => 'dina', 'full_name' => 'Dina Kartika', 'commission_rate' => 5.00, 'target_monthly' => 40000000],
            ['name' => 'maya', 'full_name' => 'Maya Sari', 'commission_rate' => 5.00, 'target_monthly' => 35000000],
        ];

        foreach ($customerServices as $cs) {
            CustomerService::create($cs);
        }

        // Call config seeder
        $this->call([
            ConfigSeeder::class,
        ]);
    }
}
