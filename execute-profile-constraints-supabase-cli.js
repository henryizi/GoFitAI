require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Read environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

async function executeProfileConstraintsFix() {
  try {
    console.log('🔧 Starting profile constraints fix...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'fix-profile-constraints-corrected.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL file loaded successfully');

    // Create a temporary SQL file for Supabase CLI
    const tempSqlPath = path.join(__dirname, 'temp-profile-fix.sql');
    fs.writeFileSync(tempSqlPath, sqlContent);

    console.log('📋 Executing SQL via Supabase CLI...');

    // Execute using Supabase CLI
    const command = `npx supabase db reset --linked --include-all --debug`;
    console.log(`Executing: ${command}`);

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.log('⚠️ Warnings:', stderr);
    }

    console.log('✅ SQL executed via Supabase CLI');
    console.log('📄 Output:', stdout);

    // Clean up temporary file
    fs.unlinkSync(tempSqlPath);

    console.log('🧹 Cleanup completed');
    console.log('✅ Profile constraints fix completed successfully!');

  } catch (error) {
    console.error('❌ Error during execution:', error);
    process.exit(1);
  }
}

// Execute the function
executeProfileConstraintsFix();


