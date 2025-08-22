require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProfilesSchema() {
  try {
    console.log('Checking if goal_type column exists...');
    
    // Try to select the goal_type column to see if it exists
    const { data, error } = await supabase
      .from('profiles')
      .select('goal_type')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('goal_type')) {
        console.log('goal_type column does not exist. Adding it...');
        
        // Since we can't use exec_sql, let's try to work around this
        // by updating the server code to handle missing goal_type gracefully
        console.log('Cannot add column via client. Will update server code to handle missing goal_type.');
        return;
      } else {
        throw error;
      }
    } else {
      console.log('goal_type column already exists!');
      
      // Update any null values
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ goal_type: 'general_fitness' })
        .is('goal_type', null);
      
      if (updateError) {
        console.error('Error updating null goal_type values:', updateError);
      } else {
        console.log('Updated null goal_type values successfully!');
      }
    }
  } catch (err) {
    console.error('Failed to check profiles schema:', err);
  }
}

// Run the function
fixProfilesSchema()
  .then(() => {
    console.log('Profiles schema check completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Uncaught error:', err);
    process.exit(1);
  });


