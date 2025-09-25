const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lmfdgnxertwrhbjhrcby.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtZmRnbnhlcnR3cmhiamhyY2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMjc0MjUsImV4cCI6MjA2NzkwMzQyNX0.RwCFJHt5aPclsPtAXOFXFvDy7DhQxgDFMMPxxdKSygM';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugUserFrequency(userId) {
  if (!userId) {
    console.error('Please provide a user ID as an argument');
    console.log('Usage: node debug-frequency.js <user_id>');
    process.exit(1);
  }

  console.log('🔍 Debugging workout frequency for user:', userId);

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching profile:', error);
      return;
    }

    console.log('📋 Profile data:');
    console.log('  - exercise_frequency:', profile.exercise_frequency);
    console.log('  - workout_frequency:', profile.workout_frequency);
    console.log('  - primary_goal:', profile.primary_goal);
    console.log('  - training_level:', profile.training_level);

    // Check what the onboarding should have saved
    console.log('\n🔄 Expected values based on onboarding logic:');
    if (profile.exercise_frequency === '4-5') {
      console.log('  - Should map to workout_frequency: "4_5"');
    } else if (profile.exercise_frequency === '2-3') {
      console.log('  - Should map to workout_frequency: "2_3"');
    } else if (profile.exercise_frequency === '6-7') {
      console.log('  - Should map to workout_frequency: "6"');
    }

    // Check if there's a mismatch
    if (profile.exercise_frequency === '4-5' && profile.workout_frequency !== '4_5') {
      console.log('\n❌ MISMATCH DETECTED!');
      console.log('  User selected "4-5" but workout_frequency is:', profile.workout_frequency);
    } else {
      console.log('\n✅ Values appear consistent');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];
debugUserFrequency(userId);
