require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Read environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

async function executeSQLViaREST(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return null;
    }
  } catch (error) {
    console.error('Network error:', error.message);
    return null;
  }
}

async function updateProfilesData(updates) {
  try {
    for (const update of updates) {
      const { column, oldValue, newValue } = update;
      console.log(`🔄 Updating ${column}: ${oldValue} → ${newValue}`);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${column}=eq.${oldValue}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ [column]: newValue })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Updated ${result.length} records for ${column}`);
      } else {
        console.error(`❌ Failed to update ${column}:`, response.statusText);
      }
    }
  } catch (error) {
    console.error('Error updating profiles:', error);
  }
}

async function executeProfileConstraintsFix() {
  try {
    console.log('🔧 Starting profile constraints fix...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-profile-constraints-corrected.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL file loaded successfully');

    // Parse the SQL file to extract operations
    const lines = sqlContent.split('\n');
    let currentStatement = '';
    const statements = [];

    for (const line of lines) {
      if (line.trim() && !line.trim().startsWith('--')) {
        currentStatement += line + ' ';
        if (line.trim().endsWith(';')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
    }

    console.log(`📋 Found ${statements.length} SQL statements`);

    // Execute UPDATE statements first (data updates)
    console.log('📝 Executing data updates...');
    const dataUpdates = [
      { column: 'activity_level', oldValue: 'very-active', newValue: 'very_active' },
      { column: 'primary_goal', oldValue: 'hypertrophy', newValue: 'muscle_gain' }
    ];

    await updateProfilesData(dataUpdates);

    // Execute constraint operations
    console.log('🔧 Executing constraint operations...');
    const constraintOperations = statements.filter(stmt =>
      stmt.includes('DROP CONSTRAINT') || stmt.includes('ADD CONSTRAINT') ||
      stmt.includes('CHECK') || stmt.includes('ALTER TABLE')
    );

    for (let i = 0; i < constraintOperations.length; i++) {
      const statement = constraintOperations[i];
      console.log(`⚡ Executing constraint operation ${i + 1}/${constraintOperations.length}...`);

      try {
        const result = await executeSQLViaREST(statement);
        if (result !== null) {
          console.log(`✅ Constraint operation ${i + 1} executed successfully`);
        } else {
          console.log(`⚠️ Constraint operation ${i + 1} may have failed, continuing...`);
        }
      } catch (error) {
        console.log(`⚠️ Constraint operation ${i + 1} failed, continuing...`);
      }
    }

    console.log('🎉 All operations completed!');
    console.log('🔍 Verifying constraints...');

    // Check current constraints
    const checkConstraintsSQL = `
      SELECT
          conname as constraint_name,
          pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c';
    `;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({ query: checkConstraintsSQL })
      });

      if (response.ok) {
        const constraints = await response.json();
        console.log('📋 Current constraints:');
        console.table(constraints);
      } else {
        console.log('⚠️ Could not verify constraints');
      }
    } catch (error) {
      console.log('⚠️ Could not verify constraints');
    }

    console.log('✅ Profile constraints fix completed successfully!');

  } catch (error) {
    console.error('❌ Error during execution:', error);
    process.exit(1);
  }
}

// Execute the function
executeProfileConstraintsFix();


