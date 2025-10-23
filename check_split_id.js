const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rdgiqoxmjogmozxmmvbh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkZ2lxb3htam9nbW96eG1tdmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTIwMjk5MjksImV4cCI6MjAyNzYwNTkyOX0.Q7GaWAy0eD8vECjwQXm2Zo6aZQ9THU3R3__xGC78pzA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('Checking training_splits schema...');
  
  // Try to query information_schema
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('*')
    .eq('table_name', 'training_splits');
    
  if (error) {
    console.log('Error querying information_schema:', error);
    console.log('\nAttempting to fetch one training_split record...');
    
    // Try to fetch actual data
    const { data: splits, error: splitsError } = await supabase
      .from('training_splits')
      .select('*')
      .limit(1);
      
    if (splitsError) {
      console.log('Error fetching training_splits:', splitsError);
    } else if (splits && splits.length > 0) {
      console.log('Found training_split record:');
      console.log(JSON.stringify(splits[0], null, 2));
      console.log('\nColumn types (inferred from data):');
      Object.keys(splits[0]).forEach(key => {
        console.log(`  ${key}: ${typeof splits[0][key]}`);
      });
    } else {
      console.log('No training_splits found');
    }
  } else {
    console.log('Schema columns:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkSchema().catch(console.error);
