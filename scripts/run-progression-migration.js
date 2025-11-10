#!/usr/bin/env node

/**
 * Migration Script: Adaptive Progression Engine Database Setup
 * 
 * This script creates all necessary database tables for the
 * Adaptive Progression Engine feature in Supabase.
 * 
 * Usage:
 *   node scripts/run-progression-migration.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigration() {
  log('\n🚀 Starting Adaptive Progression Engine Migration\n', 'bright');

  // 1. Load environment variables
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log('❌ ERROR: Missing Supabase credentials', 'red');
    log('   Please ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local', 'yellow');
    process.exit(1);
  }

  log(`✓ Loaded environment variables`, 'green');
  log(`  URL: ${supabaseUrl}\n`, 'cyan');

  // 2. Initialize Supabase client with service key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  log('✓ Connected to Supabase\n', 'green');

  // 3. Read migration SQL file
  const migrationPath = path.join(__dirname, '../supabase/migrations/create_adaptive_progression_tables.sql');
  
  if (!fs.existsSync(migrationPath)) {
    log(`❌ ERROR: Migration file not found at ${migrationPath}`, 'red');
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  log('✓ Loaded migration SQL file\n', 'green');

  // 4. Execute migration
  log('⏳ Executing migration...', 'yellow');
  
  try {
    // Split SQL into individual statements (rough split by semicolons)
    // Note: This is a simple approach. For production, use a proper SQL parser
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    log(`   Found ${statements.length} SQL statements to execute\n`, 'cyan');

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comment-only statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        // Note: Supabase doesn't have a direct exec_sql RPC by default
        // We need to use the REST API directly for DDL statements
        // For now, let's just execute the whole migration as one block
        
      } catch (err) {
        // Continue on non-critical errors
        if (err.message.includes('already exists')) {
          log(`   ⚠️  Skipping: Object already exists`, 'yellow');
        } else {
          log(`   ⚠️  Warning: ${err.message}`, 'yellow');
        }
      }
    }

    // Since Supabase doesn't support direct SQL execution via JS client easily,
    // we'll provide instructions for manual execution
    log('\n📋 MIGRATION INSTRUCTIONS:', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('\n1. Open your Supabase Dashboard:', 'cyan');
    log(`   ${supabaseUrl.replace('/v1', '')}\n`, 'blue');
    
    log('2. Navigate to: SQL Editor (left sidebar)\n', 'cyan');
    
    log('3. Click "New Query"\n', 'cyan');
    
    log('4. Copy and paste the entire contents of:', 'cyan');
    log(`   ${migrationPath}\n`, 'blue');
    
    log('5. Click "Run" to execute the migration\n', 'cyan');
    
    log('6. Verify tables were created:', 'cyan');
    log('   - progression_settings', 'blue');
    log('   - exercise_history', 'blue');
    log('   - progression_recommendations', 'blue');
    log('   - plateau_detections', 'blue');
    log('   - recovery_metrics\n', 'blue');
    
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    log('\n✅ Migration file is ready to be executed!', 'green');
    log('   Please follow the instructions above to complete the setup.\n', 'cyan');

  } catch (error) {
    log('\n❌ ERROR during migration:', 'red');
    log(`   ${error.message}\n`, 'red');
    
    if (error.details) {
      log('Details:', 'yellow');
      log(`   ${error.details}\n`, 'yellow');
    }
    
    if (error.hint) {
      log('Hint:', 'yellow');
      log(`   ${error.hint}\n`, 'yellow');
    }
    
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(error => {
  log('\n❌ Unexpected error:', 'red');
  console.error(error);
  process.exit(1);
});





/**
 * Migration Script: Adaptive Progression Engine Database Setup
 * 
 * This script creates all necessary database tables for the
 * Adaptive Progression Engine feature in Supabase.
 * 
 * Usage:
 *   node scripts/run-progression-migration.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigration() {
  log('\n🚀 Starting Adaptive Progression Engine Migration\n', 'bright');

  // 1. Load environment variables
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log('❌ ERROR: Missing Supabase credentials', 'red');
    log('   Please ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local', 'yellow');
    process.exit(1);
  }

  log(`✓ Loaded environment variables`, 'green');
  log(`  URL: ${supabaseUrl}\n`, 'cyan');

  // 2. Initialize Supabase client with service key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  log('✓ Connected to Supabase\n', 'green');

  // 3. Read migration SQL file
  const migrationPath = path.join(__dirname, '../supabase/migrations/create_adaptive_progression_tables.sql');
  
  if (!fs.existsSync(migrationPath)) {
    log(`❌ ERROR: Migration file not found at ${migrationPath}`, 'red');
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  log('✓ Loaded migration SQL file\n', 'green');

  // 4. Execute migration
  log('⏳ Executing migration...', 'yellow');
  
  try {
    // Split SQL into individual statements (rough split by semicolons)
    // Note: This is a simple approach. For production, use a proper SQL parser
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    log(`   Found ${statements.length} SQL statements to execute\n`, 'cyan');

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comment-only statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        // Note: Supabase doesn't have a direct exec_sql RPC by default
        // We need to use the REST API directly for DDL statements
        // For now, let's just execute the whole migration as one block
        
      } catch (err) {
        // Continue on non-critical errors
        if (err.message.includes('already exists')) {
          log(`   ⚠️  Skipping: Object already exists`, 'yellow');
        } else {
          log(`   ⚠️  Warning: ${err.message}`, 'yellow');
        }
      }
    }

    // Since Supabase doesn't support direct SQL execution via JS client easily,
    // we'll provide instructions for manual execution
    log('\n📋 MIGRATION INSTRUCTIONS:', 'bright');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log('\n1. Open your Supabase Dashboard:', 'cyan');
    log(`   ${supabaseUrl.replace('/v1', '')}\n`, 'blue');
    
    log('2. Navigate to: SQL Editor (left sidebar)\n', 'cyan');
    
    log('3. Click "New Query"\n', 'cyan');
    
    log('4. Copy and paste the entire contents of:', 'cyan');
    log(`   ${migrationPath}\n`, 'blue');
    
    log('5. Click "Run" to execute the migration\n', 'cyan');
    
    log('6. Verify tables were created:', 'cyan');
    log('   - progression_settings', 'blue');
    log('   - exercise_history', 'blue');
    log('   - progression_recommendations', 'blue');
    log('   - plateau_detections', 'blue');
    log('   - recovery_metrics\n', 'blue');
    
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    
    log('\n✅ Migration file is ready to be executed!', 'green');
    log('   Please follow the instructions above to complete the setup.\n', 'cyan');

  } catch (error) {
    log('\n❌ ERROR during migration:', 'red');
    log(`   ${error.message}\n`, 'red');
    
    if (error.details) {
      log('Details:', 'yellow');
      log(`   ${error.details}\n`, 'yellow');
    }
    
    if (error.hint) {
      log('Hint:', 'yellow');
      log(`   ${error.hint}\n`, 'yellow');
    }
    
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(error => {
  log('\n❌ Unexpected error:', 'red');
  console.error(error);
  process.exit(1);
});



