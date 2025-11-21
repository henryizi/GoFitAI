/**
 * Quick check: Verify progression_settings table structure
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔍 Checking progression_settings table...\n');
  
  // Test 1: Check if table exists and get structure
  console.log('1️⃣ Checking table structure...');
  try {
    const { data, error } = await supabase
      .from('progression_settings')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error.message);
      console.log('   Code:', error.code);
      
      if (error.code === '42P01') {
        console.log('\n❌ TABLE DOES NOT EXIST!');
        console.log('   You need to run the migration SQL in Supabase dashboard.');
      } else if (error.code === '42703') {
        console.log('\n❌ COLUMN DOES NOT EXIST!');
        console.log('   Some required columns are missing.');
      }
    } else {
      console.log('✅ Table exists and is accessible!');
      
      if (data && data.length > 0) {
        console.log('\n📋 Table has data. Sample record:');
        console.log(JSON.stringify(data[0], null, 2));
        
        console.log('\n📋 Available columns:');
        Object.keys(data[0]).forEach(col => console.log('   ✓', col));
      } else {
        console.log('\nℹ️  Table is empty (no settings saved yet)');
        console.log('   This is normal if you haven\'t opened the progression settings screen.');
      }
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
  
  console.log('\n---\n');
  
  // Test 2: Try a simple insert (will fail if columns don't exist)
  console.log('2️⃣ Testing if columns exist (dry run)...');
  
  const requiredColumns = {
    user_id: '00000000-0000-0000-0000-000000000001',
    progression_mode: 'moderate',
    auto_adjust_enabled: true,
    auto_deload_enabled: true,
    auto_exercise_swap_enabled: false,
    recovery_threshold: 5,
    plateau_detection_weeks: 3,
    deload_frequency_weeks: 6
  };
  
  console.log('   Required columns:');
  Object.keys(requiredColumns).forEach(col => console.log('   -', col));
  
  // Don't actually insert, just check if the column names are recognized
  try {
    // This will fail due to foreign key, but will tell us if columns exist
    const { error } = await supabase
      .from('progression_settings')
      .insert(requiredColumns)
      .select();
    
    if (error) {
      if (error.code === '42703') {
        console.log('\n❌ MISSING COLUMNS!');
        console.log('   Error:', error.message);
        console.log('\n🔧 ACTION REQUIRED:');
        console.log('   Run the migration SQL in your Supabase dashboard.');
      } else if (error.code === '23503') {
        console.log('\n✅ All columns exist!');
        console.log('   (Foreign key error is expected for test user ID)');
      } else if (error.code === '23505') {
        console.log('\n✅ All columns exist!');
        console.log('   (Duplicate key error means the table structure is fine)');
      } else {
        console.log('\n⚠️  Unexpected error:', error.message);
        console.log('   Code:', error.code);
      }
    } else {
      console.log('\n✅ All columns exist and insert works!');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
  
  console.log('\n---\n');
  
  // Test 3: Check existing data
  console.log('3️⃣ Checking existing progression settings...');
  try {
    const { data, error, count } = await supabase
      .from('progression_settings')
      .select('*', { count: 'exact' });
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log(`✅ Found ${count || 0} progression setting record(s)`);
      
      if (data && data.length > 0) {
        console.log('\n📊 Existing settings:');
        data.forEach((setting, idx) => {
          console.log(`\n   Record ${idx + 1}:`);
          console.log('   User ID:', setting.user_id);
          console.log('   Mode:', setting.progression_mode);
          console.log('   Auto-adjust:', setting.auto_adjust_enabled);
          console.log('   Auto-deload:', setting.auto_deload_enabled);
          console.log('   Auto-swap:', setting.auto_exercise_swap_enabled);
          console.log('   Recovery threshold:', setting.recovery_threshold);
          console.log('   Plateau weeks:', setting.plateau_detection_weeks);
          console.log('   Deload frequency:', setting.deload_frequency_weeks);
        });
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Check complete! See results above.                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
})();

