require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testMigration() {
  console.log('🚀 Starting migration test...');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  console.log('📍 Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('🔑 Service Key:', serviceKey ? '✅ Set' : '❌ Missing');

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Test basic connection
    console.log('🔗 Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Connection test failed:', testError.message);
      return;
    }

    console.log('✅ Connection successful!');

    // Provide SQL commands for manual execution
    console.log('\n📋 SQL Commands to run in Supabase SQL Editor:');
    console.log('=' .repeat(50));

    console.log('\n1. Add columns:');
    console.log(`ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS height_original_value TEXT,
      ADD COLUMN IF NOT EXISTS weight_original_value TEXT;`);

    console.log('\n2. Update existing data:');
    console.log(`UPDATE profiles
      SET
        height_original_value = CASE
          WHEN height_unit_preference = 'ft' AND height_cm IS NOT NULL THEN
            '{"value":' || ROUND((height_cm * 0.0328084)::numeric, 1) || ',"unit":"ft","feet":' || FLOOR(height_cm * 0.0328084) || ',"inches":' || ROUND(((height_cm * 0.0328084) - FLOOR(height_cm * 0.0328084)) * 12) || '}'
          WHEN height_cm IS NOT NULL THEN
            '{"value":' || height_cm || ',"unit":"cm"}'
          ELSE NULL
        END,
        weight_original_value = CASE
          WHEN weight_unit_preference = 'lbs' AND weight_kg IS NOT NULL THEN
            '{"value":' || ROUND((weight_kg * 2.20462)::numeric, 0) || ',"unit":"lbs"}'
          WHEN weight_kg IS NOT NULL THEN
            '{"value":' || weight_kg || ',"unit":"kg"}'
          ELSE NULL
        END
      WHERE height_original_value IS NULL OR weight_original_value IS NULL;`);

    console.log('\n3. Verify changes:');
    console.log(`SELECT id, height_original_value, weight_original_value
      FROM profiles
      LIMIT 5;`);

    console.log('=' .repeat(50));
    console.log('Copy and paste these commands into your Supabase SQL Editor');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMigration();





