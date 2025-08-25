require('dotenv').config(); // Loads .env file from the root of the project
const { createClient } = require('@supabase/supabase-js');

// --- Configuration ---
// Make sure these are set in your .env file
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// This is your user ID from previous logs.
const USER_ID = '2b7ea2b7-b739-47f1-b389-aba682ac8c5f';

// --- Helper function to check if a date is today ---
const isDateToday = (d) => {
  const today = new Date();
  const date = new Date(d);
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const run = async () => {
  console.log('--- Starting nutrition plan cleanup script ---');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !USER_ID) {
    console.error('Missing required configuration: SUPABASE_URL, SUPABASE_SERVICE_KEY, or USER_ID.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Fetch all nutrition plans for the specified user
    console.log(`Fetching plans for user ID: ${USER_ID}`);
    const { data: plans, error: fetchError } = await supabase
      .from('nutrition_plans')
      .select('id, created_at')
      .eq('user_id', USER_ID);

    if (fetchError) throw fetchError;

    if (!plans || plans.length === 0) {
      console.log('No plans found for this user. Nothing to do.');
      return;
    }

    // 2. Determine which plans to keep and which to delete
    const plansToDelete = [];
    plans.forEach(plan => {
      if (!isDateToday(plan.created_at)) {
        plansToDelete.push(plan.id);
      }
    });

    console.log(`Found ${plans.length} total plans.`);
    console.log(`Found ${plansToDelete.length} old plans to delete.`);
    console.log(`Found ${plans.length - plansToDelete.length} plans from today to keep.`);

    if (plansToDelete.length === 0) {
      console.log('No old plans to delete.');
      return;
    }

    // 3. Delete the old plans
    console.log('Deleting old plans...');
    const { error: deleteError } = await supabase
      .from('nutrition_plans')
      .delete()
      .in('id', plansToDelete);

    if (deleteError) throw deleteError;

    console.log(`Successfully deleted ${plansToDelete.length} old plans.`);
  } catch (error) {
    console.error('An error occurred during cleanup:', error.message);
  }

  console.log('--- Cleanup script finished ---');
};

run(); 