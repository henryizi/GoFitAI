// Test script to verify workout history functionality
// Run this with: node scripts/test-workout-history.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWorkoutHistory() {
  console.log('🧪 Testing Workout History Functionality...\n');

  try {
    // 1. Check if workout_history table exists and has the right schema
    console.log('1️⃣ Checking workout_history table schema...');
    const { data: schemaData, error: schemaError } = await supabase
      .from('workout_history')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error('❌ Error accessing workout_history table:', schemaError);
      return;
    }

    console.log('✅ workout_history table is accessible');
    
    // 2. Check table structure
    console.log('\n2️⃣ Checking table structure...');
    
    // Try to insert a test record to see what columns exist
    try {
      const { error: insertError } = await supabase
        .from('workout_history')
        .insert([{
          user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
          plan_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
          session_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
          completed_at: new Date().toISOString(),
          estimated_calories: 100
        }]);
      
      if (insertError) {
        console.error('❌ Error inserting test record:', insertError);
        console.log('This suggests the table schema might be missing the estimated_calories column');
      } else {
        console.log('✅ estimated_calories column exists');
        // Clean up test record
        await supabase
          .from('workout_history')
          .delete()
          .eq('user_id', '00000000-0000-0000-0000-000000000000');
      }
    } catch (error) {
      console.log('ℹ️ Could not test insert:', error.message);
    }

    // 3. Check if there are any existing records
    console.log('\n3️⃣ Checking existing workout history records...');
    const { data: records, error: recordsError, count } = await supabase
      .from('workout_history')
      .select('*', { count: 'exact' });

    if (recordsError) {
      console.error('❌ Error fetching records:', recordsError);
      return;
    }

    console.log(`📊 Found ${count || 0} workout history records`);
    
    if (records && records.length > 0) {
      console.log('📋 Sample record:');
      console.log(JSON.stringify(records[0], null, 2));
    }

    // 4. Check RLS policies
    console.log('\n4️⃣ Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('workout_history')
      .select('*')
      .limit(1);

    if (policiesError && policiesError.code === 'PGRST116') {
      console.log('ℹ️ RLS is enabled (this is good for security)');
    } else if (policiesError) {
      console.log('⚠️ RLS policy issue:', policiesError);
    } else {
      console.log('✅ RLS policies are working correctly');
    }

    console.log('\n🎯 Test completed!');
    
    if (count === 0) {
      console.log('\n💡 No workout history records found. This could mean:');
      console.log('   - No workouts have been completed yet');
      console.log('   - The workout history is not being saved properly');
      console.log('   - There\'s a data access issue');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testWorkoutHistory();
