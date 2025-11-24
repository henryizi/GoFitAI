
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lmfdgnxertwrhbjhrcby.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjc0MjUsImV4cCI6MjA2NzkwMzQyNX0.RwCFJHt5aPclsPtAXOFXFvDy7DhQxgDFMMPxxdKSygM';

console.log('Supabase URL:', supabaseUrl);
console.log('Key length:', supabaseKey.length);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfile() {
  const userId = '4c6dc7a2-c5cd-4a39-885c-eec81e7393f3';
  
  console.log(`Checking profile for user: ${userId}`);

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else {
      console.log('Profile found:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

checkProfile();
