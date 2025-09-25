const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfileData() {
  try {
    console.log('🔍 Checking profile data in database...');

    // Get all profiles (limit to 10 for demo)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, workout_frequency, onboarding_completed')
      .limit(10);

    if (error) {
      console.error('❌ Error fetching profiles:', error);
      return;
    }

    console.log(`📊 Found ${profiles.length} profiles:`);
    console.table(profiles);

    // Check for common issues
    const issues = [];
    profiles.forEach((profile, index) => {
      if (!profile.workout_frequency) {
        issues.push(`Profile ${index + 1}: Missing workout_frequency`);
      }
      if (!profile.onboarding_completed) {
        issues.push(`Profile ${index + 1}: Onboarding not completed`);
      }
    });

    if (issues.length > 0) {
      console.log('\n⚠️  Potential issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('\n✅ No obvious data issues found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProfileData();
