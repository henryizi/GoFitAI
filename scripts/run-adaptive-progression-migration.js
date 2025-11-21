require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌ Missing');
  console.error('- SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅' : '❌ Missing');
  console.log('\n📝 Please set these environment variables and try again.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runAdaptiveProgressionMigration() {
  try {
    console.log('🔄 Running adaptive progression migration...');
    
    // Read the SQL migration file
    const migrationPath = path.join(
      __dirname, 
      '..', 
      'supabase', 
      'migrations', 
      'create_adaptive_progression_tables.sql'
    );
    
    console.log(`📄 Reading migration from: ${migrationPath}`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📊 Migration size:', migrationSQL.length, 'bytes');
    console.log('✅ Migration file loaded successfully');
    
    console.log('\n⚠️  MANUAL APPLICATION REQUIRED:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('This migration is too large to run automatically.');
    console.log('Please follow these steps:\n');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to: SQL Editor → New Query');
    console.log('3. Open the file: supabase/migrations/create_adaptive_progression_tables.sql');
    console.log('4. Copy ALL content from the file');
    console.log('5. Paste into Supabase SQL Editor');
    console.log('6. Click "Run" button');
    console.log('7. Wait for completion (may take 30-60 seconds)');
    console.log('8. Verify: "Success. No rows returned" message appears\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Try to verify if tables already exist by checking progression_settings
    console.log('\n🔍 Checking if tables already exist...');
    
    const tablesToCheck = [
      'progression_settings',
      'exercise_history',
      'progression_recommendations',
      'plateau_detections'
    ];
    
    const results = await Promise.all(
      tablesToCheck.map(async (tableName) => {
        const { error } = await supabase.from(tableName).select('id').limit(1);
        return { tableName, exists: !error || error.code !== '42P01' };
      })
    );
    
    const existingTables = results.filter(r => r.exists);
    
    if (existingTables.length === tablesToCheck.length) {
      console.log('\n✅ All adaptive progression tables already exist:');
      existingTables.forEach(t => console.log(`  ✓ ${t.tableName}`));
      console.log('\n💡 The migration has already been applied. No action needed!');
    } else if (existingTables.length > 0) {
      console.log('\n⚠️  Some tables exist, but not all:');
      results.forEach(r => console.log(`  ${r.exists ? '✓' : '✗'} ${r.tableName}`));
      console.log('\n❌ Partial migration detected. Please run the manual steps above.');
    } else {
      console.log('\n❌ No adaptive progression tables found.');
      console.log('   You MUST run the manual steps above to create them.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Please apply the migration manually using the Supabase SQL Editor.');
  }
}

// Run the migration
runAdaptiveProgressionMigration().then(() => {
  console.log('\n✨ Script completed.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

