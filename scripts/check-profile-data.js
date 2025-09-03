// Script to check current profile data in database
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure you have EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfileData() {
  console.log('🔍 Checking profile data in database...\n');

  try {
    // Get all profiles to see the data structure
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);

    if (error) {
      console.error('❌ Error fetching profiles:', error);
      return;
    }

    console.log(`📊 Found ${profiles.length} profiles in database\n`);

    // Show the structure of the first profile
    if (profiles.length > 0) {
      const firstProfile = profiles[0];
      console.log('📋 Sample profile structure:');
      console.log(JSON.stringify(firstProfile, null, 2));
      console.log('\n');

      // Check specifically for workout_frequency
      console.log('🎯 Workout frequency analysis:');
      profiles.forEach((profile, index) => {
        console.log(`Profile ${index + 1} (${profile.id}):`);
        console.log(`  - workout_frequency: ${profile.workout_frequency || 'NULL'}`);
        console.log(`  - training_level: ${profile.training_level || 'NULL'}`);
        console.log(`  - primary_goal: ${profile.primary_goal || 'NULL'}`);
        console.log(`  - full_name: ${profile.full_name || 'NULL'}`);
        console.log('');
      });
    }

    // Check if workout_frequency column exists and has the right constraints
    console.log('🔧 Checking database schema...');
    const { data: schemaInfo, error: schemaError } = await supabase
      .rpc('get_table_info', { table_name: 'profiles' });

    if (schemaError) {
      console.log('Could not fetch schema info, but that\'s okay');
    } else {
      console.log('Schema info:', schemaInfo);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Also check if we can update a profile
async function testProfileUpdate() {
  console.log('\n🧪 Testing profile update functionality...\n');

  try {
    // Get the first profile
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error || !profiles || profiles.length === 0) {
      console.log('❌ No profiles found to test with');
      return;
    }

    const testProfile = profiles[0];
    console.log(`Testing with profile: ${testProfile.id}`);

    // Test updating workout_frequency
    const { data: updateResult, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        workout_frequency: '2_3',
        training_level: 'intermediate',
        primary_goal: 'muscle_gain'
      })
      .eq('id', testProfile.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
    } else {
      console.log('✅ Profile update successful!');
      console.log('Updated profile:', updateResult);
    }

  } catch (error) {
    console.error('❌ Error in test update:', error);
  }
}

// Run the checks
async function main() {
  await checkProfileData();
  await testProfileUpdate();
  
  console.log('\n📝 Summary:');
  console.log('1. Check if workout_frequency column exists and has data');
  console.log('2. Verify the data format matches expected values (2_3, 4_5, 6)');
  console.log('3. Test if profile updates work correctly');
  console.log('4. If workout_frequency is NULL, you need to save it in the app first');
}

main().catch(console.error);
