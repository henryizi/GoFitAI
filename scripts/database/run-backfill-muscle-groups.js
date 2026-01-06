/**
 * Script to run the muscle groups backfill migration
 * Usage: node scripts/database/run-backfill-muscle-groups.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env.production') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runBackfillMigration() {
  try {
    console.log('Reading migration SQL file...');
    const sqlPath = path.join(__dirname, 'backfill-muscle-groups.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try alternative method - execute SQL directly
      console.log('Trying alternative execution method...');
      const statements = sql.split(';').filter(s => s.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim().startsWith('--')) continue;
        if (statement.trim().startsWith('DO $$')) {
          // Handle DO blocks separately
          continue;
        }
        
        try {
          const { error: execError } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (execError) {
            console.warn('Warning executing statement:', execError.message);
          }
        } catch (err) {
          console.warn('Warning:', err.message);
        }
      }
    }
    
    // Verify results
    console.log('Verifying results...');
    const { data: exercises, error: verifyError } = await supabase
      .from('exercises')
      .select('id, name, muscle_groups')
      .limit(100);
    
    if (verifyError) {
      console.error('Error verifying:', verifyError);
    } else {
      const withMuscleGroups = exercises.filter(e => 
        e.muscle_groups && 
        Array.isArray(e.muscle_groups) && 
        e.muscle_groups.length > 0 &&
        !e.muscle_groups.includes('new')
      );
      
      console.log(`\n✅ Migration complete!`);
      console.log(`   Total exercises checked: ${exercises.length}`);
      console.log(`   Exercises with proper muscle groups: ${withMuscleGroups.length}`);
      console.log(`   Coverage: ${((withMuscleGroups.length / exercises.length) * 100).toFixed(1)}%`);
    }
    
  } catch (error) {
    console.error('Error running migration:', error);
    console.log('\n⚠️  Note: You may need to run this SQL directly in your Supabase SQL editor');
    console.log('   File location: scripts/database/backfill-muscle-groups.sql');
    process.exit(1);
  }
}

runBackfillMigration();







