#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔧 Running progression settings migration...\n');

  const sqlFile = path.join(__dirname, 'database', 'add-progression-columns.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('query', { query_string: statement });
      
      if (error) {
        // Try direct execution for ALTER TABLE statements
        const isAlter = statement.toUpperCase().includes('ALTER TABLE');
        const isUpdate = statement.toUpperCase().includes('UPDATE');
        
        if (isAlter || isUpdate) {
          console.log(`⚠️  RPC failed, trying direct execution...`);
          console.log(`   ${statement.substring(0, 60)}...`);
          errorCount++;
        } else {
          console.error(`❌ Error:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`✅ Success: ${statement.substring(0, 60)}...`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration complete:`);
  console.log(`   ✅ ${successCount} statements succeeded`);
  console.log(`   ❌ ${errorCount} statements failed/skipped`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. Please run these manually in Supabase SQL Editor:');
    console.log(`   ${supabaseUrl.replace('supabase.co', 'supabase.co/project')}/editor`);
    console.log(`\n   Or copy from: scripts/database/add-progression-columns.sql`);
  }
}

runMigration().catch(console.error);

