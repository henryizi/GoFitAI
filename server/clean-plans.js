// Script to delete all workout plans from the database
require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: './.env', override: true });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with the same configuration as the server
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY available:', !!SUPABASE_SERVICE_KEY);
console.log('SUPABASE_ANON_KEY available:', !!SUPABASE_ANON_KEY);

// Use service key if available, otherwise use anon key
const supabaseKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, supabaseKey);

// Also clear the local mock store
const mockWorkoutPlansStore = { plans: [] };

async function deleteAllWorkoutPlans() {
  try {
    console.log('Starting to delete all workout plans...');
    
    // Delete all workout plans
    const { data: plans, error: plansError } = await supabase
      .from('workout_plans')
      .select('id');
    
    if (plansError) {
      console.error('Error fetching workout plans:', plansError);
    } else {
      console.log(`Found ${plans.length} workout plans to delete`);
      
      // Delete plans one by one
      for (const plan of plans) {
        console.log(`Deleting plan ${plan.id}...`);
        const { error } = await supabase
          .from('workout_plans')
          .delete()
          .eq('id', plan.id);
        
        if (error) {
          console.error(`Error deleting plan ${plan.id}:`, error);
        }
      }
      
      console.log(`Successfully deleted ${plans.length} workout plans`);
    }
    
    // Also delete all related data
    try {
      console.log('Deleting related workout sessions...');
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id');
      
      if (sessionsError) {
        console.error('Error fetching workout sessions:', sessionsError);
      } else {
        console.log(`Found ${sessions.length} workout sessions to delete`);
        
        // Delete sessions one by one
        for (const session of sessions) {
          const { error } = await supabase
            .from('workout_sessions')
            .delete()
            .eq('id', session.id);
          
          if (error) {
            console.error(`Error deleting session ${session.id}:`, error);
          }
        }
        
        console.log(`Successfully deleted ${sessions.length} workout sessions`);
      }
    } catch (err) {
      console.error('Error deleting workout sessions:', err);
    }
    
    try {
      console.log('Deleting related training splits...');
      const { data: splits, error: splitsError } = await supabase
        .from('training_splits')
        .select('id');
      
      if (splitsError) {
        console.error('Error fetching training splits:', splitsError);
      } else {
        console.log(`Found ${splits.length} training splits to delete`);
        
        // Delete splits one by one
        for (const split of splits) {
          const { error } = await supabase
            .from('training_splits')
            .delete()
            .eq('id', split.id);
          
          if (error) {
            console.error(`Error deleting split ${split.id}:`, error);
          }
        }
        
        console.log(`Successfully deleted ${splits.length} training splits`);
      }
    } catch (err) {
      console.error('Error deleting training splits:', err);
    }
    
    console.log('Cleanup complete!');
  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
  }
}

// Run the cleanup
deleteAllWorkoutPlans();
 