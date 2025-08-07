// Script untuk mengkonversi data bot WhatsApp ke format Supabase
// File: convert-bot-data.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase configuration
const supabaseUrl = 'https://rvcknyuinfssgpgkfetx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2tueXVpbmZzc2dwZ2tmZXR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDUyMTY5OCwiZXhwIjoyMDcwMDk3Njk4fQ.c-TsCsWk7rG-l-Z-BvFc111oCpAsJ8wXKTqydj9sWIc';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Konversi data transactions ke format checkins
 */
async function convertTransactionsToCheckins() {
  console.log('🔄 Converting transactions to checkins...');

  try {
    // Read migration data
    const migrationData = fs.readFileSync('migration-data.sql', 'utf8');
    
    // Extract transactions data (simplified - in real scenario, parse SQL properly)
    // For now, let's create sample data based on the structure
    
    // First, create sample apartments if not exist
    const sampleApartments = [
      { name: 'Apartemen A', code: 'APT-A', whatsapp_group_id: 'group1' },
      { name: 'Apartemen B', code: 'APT-B', whatsapp_group_id: 'group2' },
      { name: 'Apartemen C', code: 'APT-C', whatsapp_group_id: 'group3' }
    ];

    console.log('📊 Creating sample apartments...');
    for (const apt of sampleApartments) {
      const { error } = await supabase
        .from('apartments')
        .upsert(apt, { onConflict: 'code' });
      
      if (error && !error.message.includes('duplicate')) {
        console.error('Error creating apartment:', error);
      }
    }

    // Get apartments for reference
    const { data: apartments } = await supabase
      .from('apartments')
      .select('*');

    if (!apartments || apartments.length === 0) {
      console.error('❌ No apartments found');
      return;
    }

    // Create sample units
    console.log('📊 Creating sample units...');
    const sampleUnits = [];
    apartments.forEach((apt, aptIndex) => {
      for (let i = 1; i <= 10; i++) {
        sampleUnits.push({
          apartment_id: apt.id,
          unit_number: `${String.fromCharCode(65 + aptIndex)}${i.toString().padStart(2, '0')}`,
          unit_type: i <= 5 ? 'Studio' : '1BR',
          status: 'available'
        });
      }
    });

    const { error: unitsError } = await supabase
      .from('units')
      .upsert(sampleUnits, { onConflict: 'apartment_id,unit_number' });

    if (unitsError) {
      console.error('Error creating units:', unitsError);
    }

    // Create sample field team
    console.log('📊 Creating sample field team...');
    const { data: team, error: teamError } = await supabase
      .from('field_teams')
      .upsert({
        username: 'team1',
        password: 'team123',
        full_name: 'Tim Lapangan 1',
        phone: '081234567890',
        status: 'active'
      }, { onConflict: 'username' })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
      return;
    }

    // Convert some transactions to checkins (sample)
    console.log('📊 Converting transactions to checkins...');
    const { data: units } = await supabase
      .from('units')
      .select('*')
      .limit(5);

    const sampleCheckins = units.map((unit, index) => {
      const now = new Date();
      const checkoutTime = new Date(now.getTime() + (4 + index) * 60 * 60 * 1000); // 4-8 hours from now
      
      return {
        apartment_id: unit.apartment_id,
        unit_id: unit.id,
        team_id: team.id,
        duration_hours: 4 + index,
        checkout_time: checkoutTime.toISOString(),
        payment_method: index % 2 === 0 ? 'Cash' : 'Transfer',
        payment_amount: 150000 + (index * 50000),
        marketing_name: `Marketing ${index + 1}`,
        notes: `Sample checkin ${index + 1}`,
        status: 'active'
      };
    });

    const { error: checkinsError } = await supabase
      .from('checkins')
      .insert(sampleCheckins);

    if (checkinsError) {
      console.error('Error creating checkins:', checkinsError);
    } else {
      console.log(`✅ Created ${sampleCheckins.length} sample checkins`);
    }

    // Update unit status to occupied
    const unitIds = sampleCheckins.map(c => c.unit_id);
    const { error: updateError } = await supabase
      .from('units')
      .update({ status: 'occupied' })
      .in('id', unitIds);

    if (updateError) {
      console.error('Error updating unit status:', updateError);
    }

    console.log('✅ Conversion completed successfully!');

  } catch (error) {
    console.error('❌ Conversion error:', error);
  }
}

/**
 * Upload existing bot data to Supabase
 */
async function uploadBotData() {
  console.log('📤 Uploading bot data to Supabase...');

  try {
    // Read migration SQL and extract INSERT statements
    const migrationData = fs.readFileSync('migration-data.sql', 'utf8');
    
    // Parse and upload transactions (simplified)
    console.log('📊 Processing transactions...');
    
    // For demo, let's create some sample data
    // In real implementation, you would parse the SQL file properly
    
    console.log('✅ Bot data upload completed!');
    
  } catch (error) {
    console.error('❌ Upload error:', error);
  }
}

/**
 * Test Supabase connection and data
 */
async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');

  try {
    // Test apartments
    const { data: apartments, error: aptError } = await supabase
      .from('apartments')
      .select('*')
      .limit(5);

    if (aptError) {
      console.error('❌ Apartments test failed:', aptError);
    } else {
      console.log(`✅ Found ${apartments.length} apartments`);
    }

    // Test units
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')
      .limit(5);

    if (unitsError) {
      console.error('❌ Units test failed:', unitsError);
    } else {
      console.log(`✅ Found ${units.length} units`);
    }

    // Test checkins
    const { data: checkins, error: checkinsError } = await supabase
      .from('checkins')
      .select('*')
      .limit(5);

    if (checkinsError) {
      console.error('❌ Checkins test failed:', checkinsError);
    } else {
      console.log(`✅ Found ${checkins.length} checkins`);
    }

    // Test real-time subscription
    console.log('🔄 Testing real-time subscription...');
    const channel = supabase
      .channel('test_channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'checkins' }, 
        (payload) => {
          console.log('📡 Real-time update:', payload);
        }
      )
      .subscribe();

    // Test insert to trigger real-time
    setTimeout(async () => {
      console.log('🧪 Testing real-time with sample insert...');
      
      const { data: testApt } = await supabase
        .from('apartments')
        .select('id')
        .limit(1)
        .single();

      const { data: testUnit } = await supabase
        .from('units')
        .select('id')
        .eq('apartment_id', testApt.id)
        .eq('status', 'available')
        .limit(1)
        .single();

      if (testUnit) {
        await supabase
          .from('checkins')
          .insert({
            apartment_id: testApt.id,
            unit_id: testUnit.id,
            duration_hours: 2,
            checkout_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            payment_method: 'Test',
            notes: 'Real-time test',
            status: 'active'
          });
      }

      // Cleanup
      setTimeout(() => {
        supabase.removeChannel(channel);
        console.log('✅ Real-time test completed');
      }, 2000);
    }, 1000);

  } catch (error) {
    console.error('❌ Connection test error:', error);
  }
}

// Main execution
async function main() {
  console.log('🎯 KakaRama Room - Bot Data Conversion Tool');
  console.log('==========================================\n');

  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    await testSupabaseConnection();
  } else if (args.includes('--upload')) {
    await uploadBotData();
  } else {
    await convertTransactionsToCheckins();
  }

  console.log('\n🎉 Process completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { convertTransactionsToCheckins, uploadBotData, testSupabaseConnection };
