require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySchema() {
  try {
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Applying schema to database...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('Error applying schema:', error);
      // Try alternative approach for Supabase instances that don't support exec_sql
      console.log('Trying alternative approach with direct SQL queries...');
      
      // Split the SQL into individual statements
      const statements = schemaSQL.split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      for (const stmt of statements) {
        console.log(`Executing: ${stmt.substring(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: stmt });
        if (error) {
          console.error(`Error executing statement: ${error.message}`);
        }
      }
    } else {
      console.log('Schema applied successfully!');
    }
  } catch (err) {
    console.error('Failed to apply schema:', err);
    
    // Fallback: Create only the progress_photos table directly
    console.log('Attempting to create progress_photos table directly...');
    try {
      const { error } = await supabase
        .from('progress_photos')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') { // Table doesn't exist
        console.log('Creating progress_photos table...');
        
        // Execute raw SQL to create the table
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS public.progress_photos (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            photo_url TEXT NOT NULL,
            photo_type TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            notes TEXT
          );
        `;
        
        const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        
        if (createError) {
          console.error('Failed to create progress_photos table:', createError);
        } else {
          console.log('progress_photos table created successfully!');
        }
      } else {
        console.log('progress_photos table already exists.');
      }
    } catch (tableErr) {
      console.error('Failed to check/create progress_photos table:', tableErr);
    }
  }
}

// Run the function
applySchema()
  .then(() => {
    console.log('Schema application process completed.');
  })
  .catch(err => {
    console.error('Uncaught error:', err);
    process.exit(1);
  }); 