require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env');
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearExercises() {
  try {
    console.log('Connecting to the database...');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Key is missing. Check your .env file.');
    }
    
    console.log('Deleting all rows from the "exercises" table...');
    
    // It's safer to delete in chunks if the table is huge, but for this case, deleting all is fine.
    const { error } = await supabase
      .from('exercises')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // A condition to delete all rows

    if (error) {
      console.error('Error deleting exercises:', error);
    } else {
      console.log('Successfully cleared the "exercises" table.');
    }
  } catch (error) {
    console.error('An error occurred during the clearing process:', error);
  }
}

clearExercises(); 