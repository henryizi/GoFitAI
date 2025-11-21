/**
 * Show what columns actually exist in progression_settings table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('🔍 Fetching actual table structure from Supabase...\n');
  
  // Try to insert with minimal data to see what's required
  try {
    const { error } = await supabase
      .from('progression_settings')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000001',
      })
      .select();
    
    if (error) {
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('\nThis tells us about the table structure.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  
  console.log('\n---\n');
  
  // Try selecting with specific columns to see which exist
  console.log('Testing individual columns:\n');
  
  const columnsToTest = [
    'id',
    'user_id',
    'progression_mode',
    'mode', // old column name
    'auto_adjust_enabled',
    'auto_deload_enabled',
    'auto_exercise_swap_enabled',
    'recovery_threshold',
    'plateau_detection_weeks',
    'deload_frequency_weeks',
    'created_at',
    'updated_at',
  ];
  
  const existingColumns = [];
  const missingColumns = [];
  
  for (const column of columnsToTest) {
    try {
      const { error } = await supabase
        .from('progression_settings')
        .select(column)
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('Could not find')) {
          missingColumns.push(column);
          console.log(`❌ ${column} - MISSING`);
        } else {
          console.log(`⚠️  ${column} - Error: ${error.message}`);
        }
      } else {
        existingColumns.push(column);
        console.log(`✅ ${column} - EXISTS`);
      }
    } catch (err) {
      console.log(`⚠️  ${column} - Unexpected error`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
  console.log('📊 SUMMARY:\n');
  console.log(`✅ Existing columns (${existingColumns.length}):`);
  existingColumns.forEach(col => console.log(`   • ${col}`));
  
  console.log(`\n❌ Missing columns (${missingColumns.length}):`);
  missingColumns.forEach(col => console.log(`   • ${col}`));
  
  if (missingColumns.length > 0) {
    console.log('\n🔧 ACTION REQUIRED:');
    console.log('   You need to run this SQL in your Supabase dashboard:\n');
    
    console.log('   ```sql');
    missingColumns.forEach(col => {
      let colType = 'text';
      let defaultVal = null;
      
      if (col.includes('enabled')) {
        colType = 'boolean';
        defaultVal = 'DEFAULT true';
      } else if (col.includes('threshold') || col.includes('weeks') || col.includes('frequency')) {
        colType = 'integer';
        defaultVal = `DEFAULT ${col.includes('threshold') ? '5' : col.includes('plateau') ? '3' : '6'}`;
      } else if (col === 'progression_mode') {
        colType = 'text';
        defaultVal = "DEFAULT 'moderate'";
      }
      
      console.log(`   ALTER TABLE progression_settings`);
      console.log(`     ADD COLUMN IF NOT EXISTS ${col} ${colType} ${defaultVal || ''};`);
    });
    console.log('   ```');
  } else {
    console.log('\n✅ All required columns exist!');
    console.log('   The progression settings should work correctly.');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
})();

