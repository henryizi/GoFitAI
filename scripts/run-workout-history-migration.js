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

async function runWorkoutHistoryMigration() {
  try {
    console.log('🔄 Running migration to create workout_history table...');
    
    // Read the SQL migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'create-workout-history-table.sql'), 
      'utf8'
    );
    
    console.log('📄 SQL to execute:');
    console.log(migrationSQL);
    
    // Execute the migration using RPC
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      console.log('\n📝 Manual steps required:');
      console.log('1. Go to your Supabase SQL Editor');
      console.log('2. Copy and paste the contents of create-workout-history-table.sql');
      console.log('3. Click Run to execute the SQL');
      return;
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the table exists
    console.log('🔍 Verifying table was created...');
    const { data: tables, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'workout_history')
      .eq('table_schema', 'public');
    
    if (verifyError) {
      console.error('❌ Error verifying table:', verifyError);
    } else if (tables && tables.length > 0) {
      console.log('✅ workout_history table verified successfully!');
    } else {
      console.log('⚠️  Table verification failed - table may not exist');
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    console.log('\n📝 Manual steps required:');
    console.log('1. Go to your Supabase SQL Editor');
    console.log('2. Copy and paste the contents of create-workout-history-table.sql');
    console.log('3. Click Run to execute the SQL');
  }
}

runWorkoutHistoryMigration();

