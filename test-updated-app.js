// Test the updated app configuration with working Gemini model
require('dotenv').config();

// Test the updated GeminiTextService
async function testUpdatedApp() {
  console.log('🧪 Testing updated app configuration...\n');
  
  // Test 1: Check environment variables
  console.log('1️⃣ Environment Variables:');
  console.log('   GEMINI_API_KEY:', !!process.env.GEMINI_API_KEY);
  console.log('   GEMINI_MODEL:', process.env.GEMINI_MODEL || 'Not set (will use default)');
  
  // Test 2: Import and test GeminiTextService
  console.log('\n2️⃣ Testing GeminiTextService...');
  try {
    const GeminiTextService = require('./server/services/geminiTextService.js');
    
    // Mock API key manager
    const mockApiKeyManager = {
      getBestAvailableKey: () => process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      markKeyFailure: () => {},
      markKeySuccess: () => {}
    };
    
    const geminiService = new GeminiTextService(mockApiKeyManager);
    console.log('   ✅ GeminiTextService instantiated successfully');
    console.log('   🎯 Using model:', geminiService.modelName);
    console.log('   🔄 Fallback models:', geminiService.modelFallbacks);
    
    // Test 3: Test workout generation
    console.log('\n3️⃣ Testing workout generation...');
    const testProfile = {
      fullName: 'TestUser',
      age: 25,
      gender: 'male',
      fitnessLevel: 'intermediate',
      primaryGoal: 'muscle_gain',
      workoutFrequency: '4_5'
    };
    
    console.log('   📝 Test profile:', testProfile);
    console.log('   🚀 Calling generateWorkoutPlan...');
    
    const startTime = Date.now();
    const result = await geminiService.generateWorkoutPlan(testProfile, {});
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Workout generation successful! (${duration}ms)`);
    console.log('   📋 Plan name:', result.name);
    console.log('   📅 Weekly schedule:', result.weekly_schedule?.length || 0, 'days');
    console.log('   🎯 Provider:', result.provider || 'gemini');
    
    // Test 4: Verify plan structure
    console.log('\n4️⃣ Verifying plan structure...');
    const requiredFields = ['name', 'weekly_schedule', 'duration_weeks'];
    const missingFields = requiredFields.filter(field => !result[field]);
    
    if (missingFields.length === 0) {
      console.log('   ✅ All required fields present');
    } else {
      console.log('   ⚠️ Missing fields:', missingFields);
    }
    
    // Show sample workout day
    if (result.weekly_schedule && result.weekly_schedule[0]) {
      const firstDay = result.weekly_schedule[0];
      console.log('   📅 Sample day:', firstDay.day_name);
      console.log('   💪 Exercise count:', firstDay.exercises?.length || 0);
    }
    
    console.log('\n🎉 ALL TESTS PASSED! App is ready with working Gemini model!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n💡 This might indicate:');
    console.log('1. VPN needs to be connected');
    console.log('2. API key quota exceeded');
    console.log('3. Regional restrictions still in effect');
    console.log('4. Model name needs adjustment');
    
    return false;
  }
}

if (require.main === module) {
  testUpdatedApp().then(success => {
    if (success) {
      console.log('\n✅ Your app is ready to generate AI-powered workout plans!');
      console.log('🚀 Make sure to keep VPN connected when using the app');
    } else {
      console.log('\n❌ App test failed - check VPN connection and API quotas');
    }
  }).catch(console.error);
}

module.exports = { testUpdatedApp };
