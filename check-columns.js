const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  try {
    console.log('🔍 Checking profiles table columns...');

    // Query to get column information
    const { data: columns, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = 'profiles' AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });

    if (error) {
      console.error('❌ Error fetching columns via RPC:', error);

      // Try alternative approach using raw SQL
      console.log('\n🔄 Trying alternative approach...');
      const { data: altData, error: altError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (altError) {
        console.error('❌ Alternative approach also failed:', altError);
        return;
      }

      // If we get here, check what columns were actually selected
      console.log('✅ Successfully queried profiles table');
      console.log('📋 Available columns based on query:', Object.keys(altData[0] || {}));
      return;
    }

    console.log('📋 Available columns:');
    console.table(columns);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkColumns();




