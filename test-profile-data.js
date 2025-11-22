/**
 * Test Script: Check Profile Data from Supabase
 * Tests what data is actually stored in the profiles table
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const SUPABASE_URL = 'https://ypnzafmgmgacsxwzxenj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwbnphZm1nbWdhY3N4d3p4ZW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY5NzM5MDgsImV4cCI6MjA0MjU0OTkwOH0.IsFy4-B0DDdjH3t0Xj80-YZgnrKjwkjqWKLi0rF06OM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkProfileData() {
  console.log('🔍 Checking Profile Data from Supabase\n');
  console.log('=' .repeat(60));

  try {
    // Get all profiles (or filter by user if needed)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5); // Get first 5 profiles as samples

    if (error) {
      console.error('❌ Error fetching profiles:', error);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️  No profiles found in database');
      return;
    }

    console.log(`✅ Found ${profiles.length} profile(s)\n`);

    profiles.forEach((profile, index) => {
      console.log(`Profile #${index + 1}:`);
      console.log('─'.repeat(60));
      console.log('📧 ID:', profile.id);
      console.log('👤 Name:', profile.full_name || 'Not set');
      console.log('🎂 Age:', profile.age || 'Not set');
      console.log('📅 Birthday:', profile.birthday || 'Not set');
      console.log('⚖️  Weight:', profile.weight || 'Not set', profile.weight ? 'kg' : '');
      console.log('📏 Height:', profile.height || 'Not set', profile.height ? 'cm' : '');
      console.log('👥 Gender:', profile.gender || 'Not set');
      console.log('🎯 Primary Goal:', profile.primary_goal || 'Not set');
      console.log('💪 Fitness Strategy:', profile.fitness_strategy || 'Not set');
      console.log('🏃 Activity Level:', profile.activity_level || 'Not set');
      console.log('📊 Exercise Frequency:', profile.exercise_frequency || 'Not set');
      console.log('🎓 Training Level:', profile.training_level || 'Not set');
      console.log('📈 Body Fat:', profile.body_fat || 'Not set', profile.body_fat ? '%' : '');
      console.log('📉 Weight Trend:', profile.weight_trend || 'Not set');
      console.log('🎯 Goal Fat Reduction:', profile.goal_fat_reduction || 'Not set');
      console.log('💪 Goal Muscle Gain:', profile.goal_muscle_gain || 'Not set');
      
      // Check if critical fields are missing
      const missingFields = [];
      if (!profile.age && !profile.birthday) missingFields.push('age/birthday');
      if (!profile.weight) missingFields.push('weight');
      if (!profile.height) missingFields.push('height');
      if (!profile.gender) missingFields.push('gender');
      
      if (missingFields.length > 0) {
        console.log('\n⚠️  MISSING CRITICAL FIELDS:', missingFields.join(', '));
      } else {
        console.log('\n✅ All critical fields present');
      }
      
      console.log('═'.repeat(60));
      console.log();
    });

    // Check for common issues
    console.log('\n🔍 Analysis:');
    const profilesWithoutWeight = profiles.filter(p => !p.weight);
    const profilesWithoutHeight = profiles.filter(p => !p.height);
    const profilesWithoutAge = profiles.filter(p => !p.age && !p.birthday);
    
    if (profilesWithoutWeight.length > 0) {
      console.log(`⚠️  ${profilesWithoutWeight.length}/${profiles.length} profiles missing weight`);
    }
    if (profilesWithoutHeight.length > 0) {
      console.log(`⚠️  ${profilesWithoutHeight.length}/${profiles.length} profiles missing height`);
    }
    if (profilesWithoutAge.length > 0) {
      console.log(`⚠️  ${profilesWithoutAge.length}/${profiles.length} profiles missing age`);
    }
    
    if (profilesWithoutWeight.length === 0 && profilesWithoutHeight.length === 0 && profilesWithoutAge.length === 0) {
      console.log('✅ All profiles have complete basic data');
    }

  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

// Run check
checkProfileData().then(() => {
  console.log('\n✅ Profile check complete');
  process.exit(0);
});

