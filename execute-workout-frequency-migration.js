require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQLViaREST(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({ sql })
    });

    if (response.ok) {
      return await response.json();
    } else {
      // If 404, it means exec_sql function doesn't exist
      if (response.status === 404) {
        throw new Error('RPC function exec_sql not found. You need to run this SQL in Supabase Dashboard.');
      }
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text}`);
    }
  } catch (error) {
    console.error('Error executing SQL via REST:', error.message);
    throw error;
  }
}

async function runMigration() {
  try {
    console.log('🔧 Starting preferred_workout_frequency migration...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'scripts/database/add-preferred-workout-frequency.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ SQL file not found at ${sqlPath}`);
        process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('📄 SQL file loaded successfully');

    // Execute the SQL
    console.log('⚡ Executing SQL...');
    console.log(sqlContent);
    
    await executeSQLViaREST(sqlContent);
    
    console.log('✅ SQL executed successfully!');
    
    // Verify column exists
    console.log('🔍 Verifying column existence...');
    const verificationSQL = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'preferred_workout_frequency';
    `;
    
    const result = await executeSQLViaREST(verificationSQL);
    console.log('📋 Verification result:', result);
    
    if (result && result.length > 0) {
        console.log('✅ Column preferred_workout_frequency exists!');
    } else {
        console.warn('⚠️ Column verification failed - column might not have been created.');
    }

  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    if (error.message.includes('exec_sql not found')) {
        console.log('\n⚠️ ACTION REQUIRED: Please run the SQL manually in Supabase Dashboard > SQL Editor');
        console.log(fs.readFileSync(path.join(__dirname, 'scripts/database/add-preferred-workout-frequency.sql'), 'utf8'));
    }
    process.exit(1);
  }
}

runMigration();





























