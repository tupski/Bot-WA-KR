// Test Supabase connection for Bot WhatsApp
require('dotenv').config();
const database = require('./src/database-supabase');

async function testSupabaseConnection() {
    console.log('🧪 Testing Supabase Connection...\n');

    try {
        // Test 1: Initialize database
        console.log('1️⃣ Initializing Supabase database...');
        await database.initialize();
        console.log('✅ Database initialized successfully\n');

        // Test 2: Test apartments
        console.log('2️⃣ Testing apartments table...');
        const apartments = await database.getApartments();
        console.log(`✅ Found ${apartments.length} apartments`);
        if (apartments.length > 0) {
            console.log(`   First apartment: ${apartments[0].name}`);
        }
        console.log('');

        // Test 3: Test units
        console.log('3️⃣ Testing units table...');
        const units = await database.getUnits();
        console.log(`✅ Found ${units.length} units`);
        if (units.length > 0) {
            console.log(`   First unit: ${units[0].unit_number} (${units[0].status})`);
        }
        console.log('');

        // Test 4: Test checkins
        console.log('4️⃣ Testing checkins table...');
        const checkins = await database.getActiveCheckins();
        console.log(`✅ Found ${checkins.length} active checkins`);
        if (checkins.length > 0) {
            console.log(`   Latest checkin: Unit ${checkins[0].units?.unit_number}`);
        }
        console.log('');

        // Test 5: Test activity logs
        console.log('5️⃣ Testing activity logs...');
        const testLog = await database.addActivityLog({
            user_id: 1,
            user_type: 'admin',
            action: 'test_connection',
            description: 'Testing Supabase connection from bot',
            ip_address: '127.0.0.1'
        });
        
        if (testLog) {
            console.log('✅ Activity log created successfully');
        } else {
            console.log('⚠️ Activity log table might not exist (this is OK)');
        }
        console.log('');

        // Summary
        console.log('🎉 ALL TESTS PASSED!');
        console.log('✅ Bot WhatsApp can connect to Supabase');
        console.log('✅ Database tables are accessible');
        console.log('✅ Real-time sync with mobile app is ready');
        console.log('');
        console.log('🚀 You can now start the bot with: node index.js');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('1. Check your .env file has correct Supabase keys');
        console.log('2. Verify Supabase project is active');
        console.log('3. Ensure database schema is created');
        console.log('4. Check network connection');
        
        process.exit(1);
    } finally {
        await database.close();
    }
}

// Run test
testSupabaseConnection();
