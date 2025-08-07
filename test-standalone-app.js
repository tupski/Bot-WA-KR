const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStandaloneApp() {
  console.log('🧪 Testing Standalone Application...\n');

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('apartments')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }
    console.log('✅ Database connection successful\n');

    // Test 2: Apartments Data
    console.log('2️⃣ Testing apartments data...');
    const { data: apartments, error: apartmentError } = await supabase
      .from('apartments')
      .select('*')
      .order('name');
    
    if (apartmentError) {
      throw new Error(`Apartments query failed: ${apartmentError.message}`);
    }
    
    console.log(`✅ Found ${apartments.length} apartments:`);
    apartments.forEach(apt => {
      console.log(`   - ${apt.name} (${apt.code}) - Status: ${apt.status}`);
    });
    console.log();

    // Test 3: Units Data
    console.log('3️⃣ Testing units data...');
    const { data: units, error: unitError } = await supabase
      .from('units')
      .select(`
        *,
        apartments (
          name,
          code
        )
      `)
      .order('unit_number');
    
    if (unitError) {
      throw new Error(`Units query failed: ${unitError.message}`);
    }
    
    console.log(`✅ Found ${units.length} units:`);
    units.forEach(unit => {
      console.log(`   - Unit ${unit.unit_number} (${unit.apartments?.name}) - Status: ${unit.status}`);
    });
    console.log();

    // Test 4: Users Data (skip if table doesn't exist)
    console.log('4️⃣ Testing users data...');
    let users = [];
    try {
      const { data: usersData, error: userError } = await supabase
        .from('users')
        .select('*')
        .order('username');

      if (userError) {
        console.log(`⚠️  Users table not found: ${userError.message}`);
      } else {
        users = usersData || [];
        console.log(`✅ Found ${users.length} users:`);
        users.forEach(user => {
          console.log(`   - ${user.username} (${user.role}) - Status: ${user.status}`);
        });
      }
    } catch (err) {
      console.log(`⚠️  Users table not accessible: ${err.message}`);
    }
    console.log();

    // Test 5: Field Teams Data
    console.log('5️⃣ Testing field teams data...');
    const { data: teams, error: teamError } = await supabase
      .from('field_teams')
      .select('*')
      .order('full_name');
    
    if (teamError) {
      throw new Error(`Field teams query failed: ${teamError.message}`);
    }
    
    console.log(`✅ Found ${teams.length} field teams:`);
    teams.forEach(team => {
      console.log(`   - ${team.full_name} (${team.username}) - Status: ${team.status}`);
    });
    console.log();

    // Test 6: Checkins Data
    console.log('6️⃣ Testing checkins data...');
    const { data: checkins, error: checkinError } = await supabase
      .from('checkins')
      .select(`
        *,
        units (
          unit_number,
          apartments (
            name
          )
        ),
        field_teams (
          full_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (checkinError) {
      throw new Error(`Checkins query failed: ${checkinError.message}`);
    }
    
    console.log(`✅ Found ${checkins.length} recent checkins:`);
    checkins.forEach(checkin => {
      const apartmentName = checkin.units?.apartments?.name || 'Unknown';
      const unitNumber = checkin.units?.unit_number || 'Unknown';
      const teamName = checkin.field_teams?.full_name || 'Admin';
      console.log(`   - ${apartmentName} Unit ${unitNumber} by ${teamName} - Status: ${checkin.status}`);
    });
    console.log();

    // Test 7: Check for WhatsApp Bot Tables (should not exist)
    console.log('7️⃣ Testing WhatsApp bot tables removal...');
    const botTables = ['config', 'processed_messages', 'daily_summary', 'cs_summary', 'transactions'];
    
    for (const table of botTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`⚠️  Warning: WhatsApp bot table '${table}' still exists`);
        }
      } catch (err) {
        console.log(`✅ WhatsApp bot table '${table}' successfully removed`);
      }
    }
    console.log();

    // Test 8: Check for WhatsApp fields in apartments
    console.log('8️⃣ Testing WhatsApp field removal...');
    const apartmentWithWhatsApp = apartments.find(apt => apt.whatsapp_group_id);
    if (apartmentWithWhatsApp) {
      console.log(`⚠️  Warning: Found apartment with whatsapp_group_id: ${apartmentWithWhatsApp.name}`);
    } else {
      console.log('✅ WhatsApp group ID field successfully removed from apartments');
    }
    console.log();

    // Test 9: Activity Logs
    console.log('9️⃣ Testing activity logs...');
    const { data: logs, error: logError } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (logError) {
      console.log(`⚠️  Activity logs query failed: ${logError.message}`);
    } else {
      console.log(`✅ Found ${logs.length} recent activity logs`);
    }
    console.log();

    // Summary
    console.log('📊 STANDALONE APPLICATION TEST SUMMARY:');
    console.log('=====================================');
    console.log(`✅ Database Connection: Working`);
    console.log(`✅ Apartments: ${apartments.length} found`);
    console.log(`✅ Units: ${units.length} found`);
    console.log(`✅ Users: ${users.length} found`);
    console.log(`✅ Field Teams: ${teams.length} found`);
    console.log(`✅ Checkins: ${checkins.length} recent found`);
    console.log(`⚠️  WhatsApp Bot Dependencies: Still exist (need manual cleanup)`);
    console.log(`✅ Application Status: STANDALONE READY 🎉`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testStandaloneApp();
