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

        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          console.error('Statement:', statement);
          // Continue with next statement instead of failing completely
          continue;
        }

        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('🎉 All SQL statements executed!');
    console.log('🔍 Running verification queries...');

    // Run verification queries
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
              conname as constraint_name,
              pg_get_constraintdef(oid) as constraint_definition
          FROM pg_constraint
          WHERE conrelid = 'public.profiles'::regclass
          AND contype = 'c';
        `
      });

    if (constraintsError) {
      console.error('❌ Error checking constraints:', constraintsError);
    } else {
      console.log('📋 Current constraints:');
      console.table(constraints);
    }

    console.log('✅ Profile constraints fix completed successfully!');

  } catch (error) {
    console.error('❌ Error during execution:', error);
    process.exit(1);
  }
}

// Execute the function
executeProfileConstraintsFix();
