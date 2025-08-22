require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProfilesSchema() {
  try {
    console.log('Reading fix-profiles-schema.sql...');
    const schemaPath = path.join(__dirname, 'fix-profiles-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Applying profiles schema fix...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('Error applying schema fix:', error);
      console.log('Trying alternative approach...');
      
      // Try to add the column directly
      const addColumnSQL = `
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'general_fitness';
      `;
      
      const { error: addError } = await supabase.rpc('exec_sql', { sql: addColumnSQL });
      
      if (addError) {
        console.error('Failed to add goal_type column:', addError);
      } else {
        console.log('goal_type column added successfully!');
        
        // Update existing records
        const updateSQL = `
          UPDATE public.profiles 
          SET goal_type = 'general_fitness' 
          WHERE goal_type IS NULL;
        `;
        
        const { error: updateError } = await supabase.rpc('exec_sql', { sql: updateSQL });
        
        if (updateError) {
          console.error('Failed to update existing records:', updateError);
        } else {
          console.log('Existing profiles updated successfully!');
        }
      }
    } else {
      console.log('Profiles schema fix applied successfully!');
    }
  } catch (err) {
    console.error('Failed to fix profiles schema:', err);
  }
}

// Run the function
fixProfilesSchema()
  .then(() => {
    console.log('Profiles schema fix process completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Uncaught error:', err);
    process.exit(1);
  });
