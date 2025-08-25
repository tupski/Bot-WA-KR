// Script untuk menambahkan sample data ke Supabase
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ixqjqjqjqjqjqjqjqjqj.supabase.co'; // Replace with your URL
const supabaseAnonKey = 'your-anon-key'; // Replace with your anon key

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addSampleData() {
  try {
    console.log('🔄 Adding sample data to Supabase...');

    // 1. Add sample apartments
    console.log('Adding apartments...');
    const { data: apartments, error: apartmentError } = await supabase
      .from('apartments')
      .insert([
        {
          name: 'Kakarama Tower A',
          code: 'KTA',
          address: 'Jl. Kakarama No. 1, Jakarta',
          total_units: 50,
          status: 'active'
        },
        {
          name: 'Kakarama Tower B',
          code: 'KTB',
          address: 'Jl. Kakarama No. 2, Jakarta',
          total_units: 40,
          status: 'active'
        },
        {
          name: 'Kakarama Residence',
          code: 'KR',
          address: 'Jl. Kakarama No. 3, Jakarta',
          total_units: 30,
          status: 'active'
        }
      ])
      .select();

    if (apartmentError) {
      console.error('Error adding apartments:', apartmentError);
      return;
    }

    console.log('✅ Added apartments:', apartments.length);

    // 2. Add sample units for each apartment
    console.log('Adding units...');
    const units = [];
    
    apartments.forEach(apartment => {
      const unitCount = apartment.total_units;
      for (let i = 1; i <= unitCount; i++) {
        units.push({
          apartment_id: apartment.id,
          unit_number: `${apartment.code}-${i.toString().padStart(3, '0')}`,
          unit_type: i <= 20 ? 'standard' : i <= 35 ? 'deluxe' : 'suite',
          status: 'available'
        });
      }
    });

    const { data: insertedUnits, error: unitError } = await supabase
      .from('units')
      .insert(units)
      .select();

    if (unitError) {
      console.error('Error adding units:', unitError);
      return;
    }

    console.log('✅ Added units:', insertedUnits.length);

    // 3. Add sample field teams
    console.log('Adding field teams...');
    const { data: fieldTeams, error: teamError } = await supabase
      .from('field_teams')
      .insert([
        {
          username: 'team1',
          password: 'team123', // In production, this should be hashed
          full_name: 'Tim Lapangan 1',
          phone: '081234567890',
          email: 'team1@kakarama.com',
          status: 'active'
        },
        {
          username: 'team2',
          password: 'team123',
          full_name: 'Tim Lapangan 2',
          phone: '081234567891',
          email: 'team2@kakarama.com',
          status: 'active'
        },
        {
          username: 'team3',
          password: 'team123',
          full_name: 'Tim Lapangan 3',
          phone: '081234567892',
          email: 'team3@kakarama.com',
          status: 'active'
        }
      ])
      .select();

    if (teamError) {
      console.error('Error adding field teams:', teamError);
      return;
    }

    console.log('✅ Added field teams:', fieldTeams.length);

    // 4. Add sample admin
    console.log('Adding admin...');
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .insert([
        {
          username: 'admin',
          password: 'admin123', // In production, this should be hashed
          full_name: 'Administrator',
          email: 'admin@kakarama.com',
          role: 'super_admin',
          status: 'active'
        }
      ])
      .select();

    if (adminError) {
      console.error('Error adding admin:', adminError);
      return;
    }

    console.log('✅ Added admin:', admin.length);

    // 5. Add sample checkins
    console.log('Adding sample checkins...');
    const sampleCheckins = [];
    const now = new Date();
    
    for (let i = 0; i < 10; i++) {
      const checkinDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)); // Last 10 days
      const checkoutDate = new Date(checkinDate.getTime() + (4 * 60 * 60 * 1000)); // 4 hours later
      
      sampleCheckins.push({
        apartment_id: apartments[i % apartments.length].id,
        unit_id: insertedUnits[i % insertedUnits.length].id,
        team_id: fieldTeams[i % fieldTeams.length].id,
        marketing_name: `Marketing ${i + 1}`,
        payment_method: i % 2 === 0 ? 'cash' : 'transfer',
        payment_amount: 150000 + (i * 25000),
        duration_hours: 4,
        status: i < 5 ? 'completed' : 'active',
        created_at: checkinDate.toISOString(),
        checkout_time: checkoutDate.toISOString(),
        notes: `Sample checkin ${i + 1}`
      });
    }

    const { data: checkins, error: checkinError } = await supabase
      .from('checkins')
      .insert(sampleCheckins)
      .select();

    if (checkinError) {
      console.error('Error adding checkins:', checkinError);
      return;
    }

    console.log('✅ Added checkins:', checkins.length);

    console.log('🎉 Sample data added successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Apartments: ${apartments.length}`);
    console.log(`- Units: ${insertedUnits.length}`);
    console.log(`- Field Teams: ${fieldTeams.length}`);
    console.log(`- Admins: ${admin.length}`);
    console.log(`- Checkins: ${checkins.length}`);

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
}

// Run the script
addSampleData();
