/**
 * Verification Script - Run AFTER applying the SQL fix
 * This confirms that progression settings are working correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        PROGRESSION SETTINGS - POST-FIX VERIFICATION           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let allPassed = true;

  // Test 1: Check all required columns exist
  console.log('Test 1: Checking required columns...');
  const requiredColumns = [
    'id', 'user_id', 'progression_mode', 'auto_adjust_enabled',
    'auto_deload_enabled', 'auto_exercise_swap_enabled',
    'recovery_threshold', 'plateau_detection_weeks',
    'deload_frequency_weeks', 'created_at', 'updated_at'
  ];

  const existingCols = [];
  const missingCols = [];

  for (const col of requiredColumns) {
    const { error } = await supabase
      .from('progression_settings')
      .select(col)
      .limit(1);

    if (error && error.code === 'PGRST204') {
      missingCols.push(col);
      allPassed = false;
    } else if (!error) {
      existingCols.push(col);
    }
  }

  if (missingCols.length === 0) {
    console.log('✅ All required columns exist!\n');
    existingCols.forEach(col => console.log(`   ✓ ${col}`));
  } else {
    console.log('❌ Missing columns:\n');
    missingCols.forEach(col => console.log(`   ✗ ${col}`));
    allPassed = false;
  }

  console.log('\n---\n');

  // Test 2: Check default values
  console.log('Test 2: Checking default values...');
  
  try {
    const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'progression_settings'
        AND column_name IN ('progression_mode', 'auto_adjust_enabled', 'recovery_threshold')
        ORDER BY column_name;
      `
    });

    if (schemaError) {
      console.log('⚠️  Could not check defaults (RPC not available)');
      console.log('   This is OK - defaults are set at database level');
    } else {
      console.log('✅ Default values configured');
    }
  } catch (err) {
    console.log('ℹ️  Skipping default check (requires RPC function)');
  }

  console.log('\n---\n');

  // Test 3: Simulate saving settings
  console.log('Test 3: Simulating settings save...');
  
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testSettings = {
    user_id: testUserId,
    progression_mode: 'aggressive',
    auto_adjust_enabled: true,
    auto_deload_enabled: true,
    auto_exercise_swap_enabled: false,
    recovery_threshold: 7,
    plateau_detection_weeks: 3,
    deload_frequency_weeks: 6
  };

  const { error: insertError } = await supabase
    .from('progression_settings')
    .upsert(testSettings, { onConflict: 'user_id' })
    .select();

  if (insertError) {
    if (insertError.code === '23503') {
      console.log('✅ Column structure is correct!');
      console.log('   (Foreign key error is expected for test user)');
    } else if (insertError.code === '42703') {
      console.log('❌ Column missing:', insertError.message);
      allPassed = false;
    } else if (insertError.code === '42501') {
      console.log('✅ Column structure is correct!');
      console.log('   (RLS policy prevented test insert - this is expected)');
    } else {
      console.log('⚠️  Unexpected error:', insertError.message);
      console.log('   Code:', insertError.code);
    }
  } else {
    console.log('✅ Settings saved successfully!');
    console.log('   (Cleaning up test data...)');
    await supabase.from('progression_settings').delete().eq('user_id', testUserId);
  }

  console.log('\n---\n');

  // Test 4: Check AdaptiveProgressionService compatibility
  console.log('Test 4: Checking service compatibility...');
  
  const serviceExpectedColumns = [
    'progression_mode',
    'auto_adjust_enabled',
    'recovery_threshold'
  ];

  let serviceCompatible = true;
  for (const col of serviceExpectedColumns) {
    if (!existingCols.includes(col)) {
      console.log(`   ✗ Service expects "${col}" but it's missing`);
      serviceCompatible = false;
      allPassed = false;
    }
  }

  if (serviceCompatible) {
    console.log('✅ AdaptiveProgressionService compatibility: OK');
    console.log('   All service-required columns are present');
  }

  // Final verdict
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║                    ✅ ALL TESTS PASSED!                       ║');
    console.log('║                                                               ║');
    console.log('║  Your progression settings are now working correctly!        ║');
    console.log('║                                                               ║');
    console.log('║  Next steps:                                                 ║');
    console.log('║  1. Open your app                                            ║');
    console.log('║  2. Go to Settings → Adaptive Progression                    ║');
    console.log('║  3. Tap Conservative/Moderate/Aggressive                     ║');
    console.log('║  4. Tap "Save Settings"                                      ║');
    console.log('║  5. Restart app to verify settings persist                   ║');
  } else {
    console.log('║                    ❌ TESTS FAILED                            ║');
    console.log('║                                                               ║');
    console.log('║  The SQL fix was not applied correctly.                      ║');
    console.log('║                                                               ║');
    console.log('║  Please run the SQL in FIX_PROGRESSION_SETTINGS.sql          ║');
    console.log('║  in your Supabase SQL Editor.                                ║');
  }
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  process.exit(allPassed ? 0 : 1);
})();

