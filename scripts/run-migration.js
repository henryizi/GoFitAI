#!/usr/bin/env node

/**
 * Migration runner to add estimated_calories column to workout_sessions table
 * Fixes the PGRST204 error when creating workout sessions
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌ Missing');
  console.error('- SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Running migration to add estimated_calories column...');
    
    // Read the SQL migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add-estimated-calories-column.sql'), 
      'utf8'
    );
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });
    
    if (error) {
      // If the RPC doesn't exist, try direct query
      console.log('💡 Trying direct SQL execution...');
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.includes('DO $$')) {
          // Skip DO blocks for direct execution
          continue;
        }
        
        const { error: directError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'workout_sessions')
          .eq('column_name', 'estimated_calories');
          
        if (directError) {
          console.error('❌ Error checking column:', directError);
        }
      }
      
      // Try to alter table directly
      console.log('🔧 Attempting to add column directly...');
      const { error: alterError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS estimated_calories INTEGER;'
      });
      
      if (alterError) {
        console.error('❌ Migration failed:', alterError);
        console.log('\n📝 Manual steps required:');
        console.log('1. Go to your Supabase SQL Editor');
        console.log('2. Run this SQL command:');
        console.log('   ALTER TABLE public.workout_sessions ADD COLUMN estimated_calories INTEGER;');
        console.log('3. Or run the migration file: scripts/add-estimated-calories-column.sql');
        return;
      }
    }
    
    // Verify the column exists
    console.log('🔍 Verifying column was added...');
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'workout_sessions')
      .eq('table_schema', 'public');
    
    if (verifyError) {
      console.error('❌ Error verifying columns:', verifyError);
      return;
    }
    
    const estimatedCaloriesColumn = columns?.find(col => col.column_name === 'estimated_calories');
    
    if (estimatedCaloriesColumn) {
      console.log('✅ Migration successful! Column estimated_calories added to workout_sessions');
      console.log('📊 Column details:', estimatedCaloriesColumn);
    } else {
      console.log('⚠️  Column not found. Please run the migration manually.');
      console.log('\n📋 Current workout_sessions columns:');
      columns?.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
    console.log('\n🎯 Next steps:');
    console.log('1. Test workout plan creation');
    console.log('2. Verify estimated_calories is being saved');
    
  } catch (error) {
    console.error('❌ Migration script error:', error);
  }
}

// Run the migration
runMigration();
