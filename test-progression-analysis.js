/**
 * Test script for Progression Analysis API
 * Tests the /api/progression/analyze endpoint
 */

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Get API URL from environment or use defaults
const getApiUrl = () => {
  // If environment variable is explicitly set, use it (for production testing)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Try localhost first for local testing
  const localhost = 'http://localhost:4000';
  
  // Try Railway production as fallback
  const railway = 'https://gofitai-production.up.railway.app';
  
  // Default to localhost for testing
  return localhost;
};

const API_URL = getApiUrl();

// Initialize Supabase client for fetching user ID
let supabase = null;
if (process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// Test user ID - replace with your actual user ID from the database
// You can get this from Supabase or from your app
let TEST_USER_ID = process.env.TEST_USER_ID || null;

async function getUserIdFromDatabase() {
  if (!supabase) {
    return null;
  }

  try {
    // First, try to get a user ID from exercise_history (users with actual workout data)
    console.log('   Checking exercise_history table...');
    const { data: exerciseHistory, error: historyError } = await supabase
      .from('exercise_history')
      .select('user_id')
      .limit(1);

    if (!historyError && exerciseHistory && exerciseHistory.length > 0) {
      const userId = exerciseHistory[0].user_id;
      console.log(`   ✅ Found user with exercise history: ${userId}`);
      return userId;
    }

    // Fallback: Try to get a user ID from workout_sessions
    console.log('   Checking workout_sessions table...');
    const { data: sessions, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('user_id')
      .limit(1);

    if (!sessionError && sessions && sessions.length > 0) {
      const userId = sessions[0].user_id;
      console.log(`   ✅ Found user with workout sessions: ${userId}`);
      return userId;
    }

    // Last resort: Try to get a user ID from the users table
    console.log('   Checking users table...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (!userError && users && users.length > 0) {
      const userId = users[0].id;
      console.log(`   ✅ Found user: ${userId}`);
      return userId;
    }

    console.log('   ⚠️  No users found in any table');
    return null;
  } catch (error) {
    console.log('   ⚠️  Error fetching user ID:', error.message);
    return null;
  }
}

async function testProgressionAnalysis() {
  console.log('🧪 Testing Progression Analysis API\n');
  console.log(`📍 API URL: ${API_URL}\n`);

  // Try to get user ID from database if not provided
  if (!TEST_USER_ID && supabase) {
    console.log('🔍 Attempting to fetch user ID from database...');
    TEST_USER_ID = await getUserIdFromDatabase();
    if (TEST_USER_ID) {
      console.log(`✅ Found user ID: ${TEST_USER_ID}\n`);
    }
  }

  if (!TEST_USER_ID) {
    console.error('❌ ERROR: TEST_USER_ID is required');
    console.log('\n💡 To test:');
    console.log('   1. Get a user ID from your Supabase database');
    console.log('   2. Set it as an environment variable:');
    console.log('      export TEST_USER_ID="your-user-id-here"');
    console.log('   3. Or edit this script and set TEST_USER_ID directly');
    console.log('\n📝 To get a user ID from Supabase:');
    console.log('   SELECT id FROM auth.users LIMIT 1;');
    console.log('   or');
    console.log('   SELECT id FROM users LIMIT 1;');
    return;
  }

  console.log(`👤 Using User ID: ${TEST_USER_ID}\n`);

  try {
    // Test 0: Check what routes are registered on the server
    console.log('🔍 Test 0: Checking registered routes on server...');
    try {
      const routesResponse = await axios.get(`${API_URL}/api/routes`);
      if (routesResponse.data.success) {
        console.log(`✅ Server has ${routesResponse.data.totalRoutes} routes registered`);
        const progressionRoutes = routesResponse.data.progressionRoutes || [];
        if (progressionRoutes.length > 0) {
          console.log(`✅ Found ${progressionRoutes.length} progression routes:`);
          progressionRoutes.forEach(route => {
            console.log(`   - ${route.method} ${route.path}`);
          });
        } else {
          console.log('⚠️  No progression routes found on server');
        }
      }
    } catch (error) {
      console.log('⚠️  Could not check routes:', error.response?.status || error.message);
    }
    console.log('');

    // Test 1: Test endpoint availability
    console.log('📡 Test 1: Checking endpoint availability...');
    try {
      const testResponse = await axios.get(`${API_URL}/api/progression/test`);
      console.log('✅ Test endpoint works:', testResponse.data.message);
    } catch (error) {
      console.log('⚠️  Test endpoint error:', error.response?.status || error.message);
    }
    console.log('');

    // Test 2: Analyze progress
    console.log('📊 Test 2: Analyzing user progress...');
    const analyzeResponse = await axios.post(`${API_URL}/api/progression/analyze`, {
      userId: TEST_USER_ID,
      lookbackDays: 30,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`📈 Response Status: ${analyzeResponse.status} ${analyzeResponse.statusText || ''}`);

    const result = analyzeResponse.data;
    
    console.log('\n✅ Analysis Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (result.success) {
      console.log('✅ Success: true');
      console.log(`📊 Insights Count: ${result.insights?.length || 0}`);
      
      if (result.insights && result.insights.length > 0) {
        console.log('\n📋 Exercise Insights:');
        result.insights.forEach((insight, index) => {
          console.log(`\n  ${index + 1}. ${insight.exerciseName}`);
          console.log(`     Status: ${insight.performanceStatus}`);
          console.log(`     Records: ${insight.recordCount}`);
          if (insight.metrics) {
            console.log(`     Estimated 1RM: ${insight.metrics.estimatedOneRM?.toFixed(2) || 'N/A'} kg`);
            console.log(`     Volume Change: ${insight.metrics.volumeChange || 0}%`);
            console.log(`     Avg RPE: ${insight.metrics.avgRPE || 'N/A'}`);
          }
          if (insight.recommendation) {
            console.log(`     Recommendation: ${insight.recommendation}`);
          }
        });
      } else {
        console.log('\n⚠️  No insights found. This could mean:');
        console.log('   - User has less than 2 records per exercise');
        console.log('   - No exercise history in the last 30 days');
        console.log('   - Exercise history needs to be synced');
      }
      
      if (result.settings) {
        console.log('\n⚙️  Progression Settings:');
        console.log(`   Mode: ${result.settings.mode || 'N/A'}`);
        console.log(`   Target Weight Increase: ${result.settings.target_weight_increase_kg || 'N/A'} kg`);
        console.log(`   Target Rep Increase: ${result.settings.target_rep_increase || 'N/A'}`);
      }
      
      if (result.message) {
        console.log(`\n💬 Message: ${result.message}`);
      }
    } else {
      console.log('❌ Analysis failed:', result.error || 'Unknown error');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test 3: Detect plateaus
    console.log('🔍 Test 3: Detecting plateaus...');
    try {
      const plateauResponse = await axios.post(`${API_URL}/api/progression/detect-plateaus`, {
        userId: TEST_USER_ID,
        plateauWeeks: 3,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const plateauData = plateauResponse.data;
      console.log(`✅ Plateau Detection: ${plateauData.plateaus?.length || 0} plateaus found`);
      if (plateauData.plateaus && plateauData.plateaus.length > 0) {
        plateauData.plateaus.forEach((plateau, index) => {
          console.log(`\n  ${index + 1}. ${plateau.exerciseName}`);
          console.log(`     Weeks without progress: ${plateau.weeksWithoutProgress}`);
          console.log(`     Recommendation: ${plateau.recommendedAction}`);
        });
      }
    } catch (error) {
      console.log('⚠️  Plateau detection error:', error.response?.data || error.message);
    }

    console.log('\n✅ All tests completed!\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    
    if (error.response) {
      // Server responded with error status
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      // Request made but no response
      console.error('No response received from server');
      console.error('Error:', error.message);
      console.error('\n💡 Connection error. Make sure:');
      console.error('   1. The server is running');
      console.error('   2. The API_URL is correct:', API_URL);
      console.error('   3. The server is accessible from this machine');
    } else {
      // Error setting up request
      console.error('Error:', error.message);
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('\n💡 Network error. Check:');
      console.error('   1. Internet connection');
      console.error('   2. Server is running and accessible');
      console.error('   3. CORS is properly configured');
    }
  }
}

// Run the test
testProgressionAnalysis();



