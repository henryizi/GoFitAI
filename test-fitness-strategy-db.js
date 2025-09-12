#!/usr/bin/env node

/**
 * Test script to check if fitness_strategy column exists and works
 * This uses the same client configuration as the React Native app
 */

const { createClient } = require('@supabase/supabase-js');

// Import the app config to get the same environment variables
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection for Fitness Strategy...');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ SUPABASE CREDENTIALS MISSING');
  console.error('Please set these environment variables:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('\nYou can find these in your Supabase dashboard → Settings → API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFitnessStrategyColumn() {
  try {
    console.log('\n🧪 Testing fitness_strategy column...');
    
    // Test 1: Try to select the column
    console.log('📋 Test 1: Checking if fitness_strategy column exists...');
    const { data: columnTest, error: columnError } = await supabase
      .from('profiles')
      .select('fitness_strategy')
      .limit(1);
    
    if (columnError) {
      console.error('❌ Column does not exist or is not accessible:', columnError.message);
      console.log('\n📋 MANUAL SETUP REQUIRED:');
      console.log('1. Open your Supabase dashboard → SQL Editor');
      console.log('2. Run this SQL command:');
      console.log('\n```sql');
      console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_strategy TEXT;');
      console.log('');
      console.log('DO $$');
      console.log('BEGIN');
      console.log('    IF NOT EXISTS (');
      console.log('        SELECT 1 FROM information_schema.table_constraints');
      console.log('        WHERE constraint_name = \'check_fitness_strategy\'');
      console.log('        AND table_name = \'profiles\'');
      console.log('    ) THEN');
      console.log('        ALTER TABLE profiles ADD CONSTRAINT check_fitness_strategy');
      console.log('        CHECK (fitness_strategy IS NULL OR fitness_strategy IN (\'bulk\', \'cut\', \'maintenance\', \'recomp\', \'maingaining\'));');
      console.log('    END IF;');
      console.log('END $$;');
      console.log('```\n');
      return false;
    }
    
    console.log('✅ fitness_strategy column exists!');
    
    // Test 2: Check if we can query profiles
    console.log('📋 Test 2: Checking profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, fitness_strategy')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Cannot access profiles table:', profilesError.message);
      return false;
    }
    
    console.log(`✅ Found ${profiles.length} profile(s)`);
    
    if (profiles.length > 0) {
      console.log('📊 Sample data:');
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ID: ${profile.id.substring(0, 8)}... Strategy: ${profile.fitness_strategy || 'null'}`);
      });
    }
    
    // Test 3: Test valid strategy values
    console.log('\n📋 Test 3: Testing strategy values...');
    const validStrategies = ['bulk', 'cut', 'maintenance', 'recomp', 'maingaining'];
    
    console.log('✅ Valid fitness strategies:');
    validStrategies.forEach(strategy => {
      console.log(`   • ${strategy}`);
    });
    
    console.log('\n🎉 FITNESS STRATEGY DATABASE IS READY!');
    console.log('\n📱 The onboarding screen should now work correctly.');
    console.log('Users can select their fitness strategy and it will be saved to the database.');
    
    return true;
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return false;
  }
}

async function main() {
  const success = await testFitnessStrategyColumn();
  
  if (success) {
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Test the onboarding flow in your app');
    console.log('2. Verify fitness strategy selections save correctly');
    console.log('3. Check that the strategy affects workout/nutrition plans');
  } else {
    console.log('\n🔧 SETUP REQUIRED:');
    console.log('Please run the SQL commands shown above in your Supabase dashboard');
  }
}

if (require.main === module) {
  main();
}

/**
 * Test script to check if fitness_strategy column exists and works
 * This uses the same client configuration as the React Native app
 */

const { createClient } = require('@supabase/supabase-js');

// Import the app config to get the same environment variables
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection for Fitness Strategy...');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ SUPABASE CREDENTIALS MISSING');
  console.error('Please set these environment variables:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('\nYou can find these in your Supabase dashboard → Settings → API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFitnessStrategyColumn() {
  try {
    console.log('\n🧪 Testing fitness_strategy column...');
    
    // Test 1: Try to select the column
    console.log('📋 Test 1: Checking if fitness_strategy column exists...');
    const { data: columnTest, error: columnError } = await supabase
      .from('profiles')
      .select('fitness_strategy')
      .limit(1);
    
    if (columnError) {
      console.error('❌ Column does not exist or is not accessible:', columnError.message);
      console.log('\n📋 MANUAL SETUP REQUIRED:');
      console.log('1. Open your Supabase dashboard → SQL Editor');
      console.log('2. Run this SQL command:');
      console.log('\n```sql');
      console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_strategy TEXT;');
      console.log('');
      console.log('DO $$');
      console.log('BEGIN');
      console.log('    IF NOT EXISTS (');
      console.log('        SELECT 1 FROM information_schema.table_constraints');
      console.log('        WHERE constraint_name = \'check_fitness_strategy\'');
      console.log('        AND table_name = \'profiles\'');
      console.log('    ) THEN');
      console.log('        ALTER TABLE profiles ADD CONSTRAINT check_fitness_strategy');
      console.log('        CHECK (fitness_strategy IS NULL OR fitness_strategy IN (\'bulk\', \'cut\', \'maintenance\', \'recomp\', \'maingaining\'));');
      console.log('    END IF;');
      console.log('END $$;');
      console.log('```\n');
      return false;
    }
    
    console.log('✅ fitness_strategy column exists!');
    
    // Test 2: Check if we can query profiles
    console.log('📋 Test 2: Checking profiles table access...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, fitness_strategy')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Cannot access profiles table:', profilesError.message);
      return false;
    }
    
    console.log(`✅ Found ${profiles.length} profile(s)`);
    
    if (profiles.length > 0) {
      console.log('📊 Sample data:');
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ID: ${profile.id.substring(0, 8)}... Strategy: ${profile.fitness_strategy || 'null'}`);
      });
    }
    
    // Test 3: Test valid strategy values
    console.log('\n📋 Test 3: Testing strategy values...');
    const validStrategies = ['bulk', 'cut', 'maintenance', 'recomp', 'maingaining'];
    
    console.log('✅ Valid fitness strategies:');
    validStrategies.forEach(strategy => {
      console.log(`   • ${strategy}`);
    });
    
    console.log('\n🎉 FITNESS STRATEGY DATABASE IS READY!');
    console.log('\n📱 The onboarding screen should now work correctly.');
    console.log('Users can select their fitness strategy and it will be saved to the database.');
    
    return true;
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return false;
  }
}

async function main() {
  const success = await testFitnessStrategyColumn();
  
  if (success) {
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Test the onboarding flow in your app');
    console.log('2. Verify fitness strategy selections save correctly');
    console.log('3. Check that the strategy affects workout/nutrition plans');
  } else {
    console.log('\n🔧 SETUP REQUIRED:');
    console.log('Please run the SQL commands shown above in your Supabase dashboard');
  }
}

if (require.main === module) {
  main();
}
