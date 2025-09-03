require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCompletedSessions() {
  try {
    console.log('🔍 Checking for completed workout sessions...');
    
    // Check workout_sessions table for completed sessions
    const { data: completedSessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('*')
      .not('completed_at', 'is', null);
    
    if (sessionsError) {
      console.error('❌ Error fetching completed sessions:', sessionsError);
    } else {
      console.log(`✅ Found ${completedSessions?.length || 0} completed sessions`);
      if (completedSessions && completedSessions.length > 0) {
        console.log('Sample completed session:', JSON.stringify(completedSessions[0], null, 2));
      }
    }
    
    // Check if there are any exercise logs at all
    const { data: allLogs, error: logsError } = await supabase
      .from('exercise_logs')
      .select('*');
    
    if (logsError) {
      console.error('❌ Error fetching all logs:', logsError);
    } else {
      console.log(`✅ Found ${allLogs?.length || 0} total exercise logs`);
      if (allLogs && allLogs.length > 0) {
        console.log('Sample exercise log:', JSON.stringify(allLogs[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error in checkCompletedSessions:', error);
  }
}

checkCompletedSessions();




