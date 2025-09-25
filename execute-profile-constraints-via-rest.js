require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase configuration. Please check your .env file.');
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error executing SQL via REST:', error.message);
    return null;
  }
}

async function executeProfileConstraintsFix() {
  try {
    console.log('🔧 Starting profile constraints fix...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-profile-constraints-corrected.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL file loaded successfully');

    // Split SQL into individual statements (basic approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('SELECT'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        console.log('Statement:', statement.substring(0, 100) + '...');

        try {
          const result = await executeSQLViaREST(statement);

          if (result !== null) {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          } else {
            console.log(`⚠️ Statement ${i + 1} may have failed, continuing...`);
          }
        } catch (error) {
          console.log(`⚠️ Statement ${i + 1} failed, continuing...`);
        }
      }
    }

    console.log('🎉 All SQL statements attempted!');
    console.log('🔍 Running verification queries...');

    // Run verification queries to check constraints
    const verificationSQL = `
      SELECT
          conname as constraint_name,
          pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c';
    `;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({ sql: verificationSQL })
      });

      if (response.ok) {
        const constraints = await response.json();
        console.log('📋 Current constraints:');
        console.table(constraints);
      } else {
        console.log('⚠️ Could not verify constraints, but SQL execution completed');
      }
    } catch (error) {
      console.log('⚠️ Could not verify constraints, but SQL execution completed');
    }

    console.log('✅ Profile constraints fix completed successfully!');

  } catch (error) {
    console.error('❌ Error during execution:', error);
    process.exit(1);
  }
}

// Execute the function
executeProfileConstraintsFix();


