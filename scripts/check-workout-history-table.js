require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌ Missing');
  console.error('- SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWorkoutHistoryTable() {
  try {
    console.log('🔍 Checking workout_history table...');
    
    // Try to select from the table to see if it exists
    const { data, error } = await supabase
      .from('workout_history')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ workout_history table does not exist!');
        console.log('📝 Please run the migration script or manually create the table.');
        console.log('\n📋 Required table structure:');
        console.log('  - id: UUID PRIMARY KEY');
        console.log('  - user_id: UUID REFERENCES auth.users(id)');
        console.log('  - plan_id: UUID REFERENCES workout_plans(id)');
        console.log('  - session_id: UUID REFERENCES workout_sessions(id)');
        console.log('  - completed_at: TIMESTAMP WITH TIME ZONE');
        console.log('  - duration_minutes: INTEGER');
        console.log('  - total_sets: INTEGER');
        console.log('  - total_exercises: INTEGER');
        console.log('  - estimated_calories: INTEGER');
        console.log('  - notes: TEXT');
        console.log('  - created_at: TIMESTAMP WITH TIME ZONE');
        console.log('  - plan_name: TEXT');
        console.log('  - session_name: TEXT');
        console.log('  - week_number: INTEGER');
        console.log('  - day_number: INTEGER');
        console.log('  - exercises_data: JSONB');
        return;
      } else {
        console.error('❌ Error accessing table:', error);
        return;
      }
    }
    
    console.log('✅ workout_history table exists');
    
    // Try to get the count of rows
    const { count, error: countError } = await supabase
      .from('workout_history')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting rows:', countError);
    } else {
      console.log(`📊 Row count: ${count || 0}`);
    }
    
    // Try to get a sample row to see the structure
    if (data && data.length > 0) {
      console.log('\n📋 Sample row structure:');
      const sampleRow = data[0];
      Object.keys(sampleRow).forEach(key => {
        const value = sampleRow[key];
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${key}: ${type} = ${value}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error checking table:', err);
  }
}

checkWorkoutHistoryTable();




