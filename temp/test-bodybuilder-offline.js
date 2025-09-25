// Test script to verify bodybuilder templates work completely offline
const { WorkoutService } = require('../src/services/workout/WorkoutService.ts');
const { supabase } = require('../src/services/supabase/client.ts');

async function testBodybuilderOffline() {
  console.log('🧪 Testing Bodybuilder Templates Offline Mode...\n');

  const bodybuilders = ['cbum', 'platz', 'ronnie', 'arnold'];

  for (const bodybuilder of bodybuilders) {
    console.log(`📋 Testing ${bodybuilder.toUpperCase()} template...`);

    try {
      const plan = await WorkoutService.createAIPlan({
        userId: 'test-user-123',
        height: 180,
        weight: 80,
        age: 25,
        gender: 'male',
        fullName: 'Test User',
        fatLossGoal: 3,
        muscleGainGoal: 4,
        trainingLevel: 'intermediate',
        emulateBodybuilder: bodybuilder
      });

      if (plan && plan.weeklySchedule && plan.weeklySchedule.length > 0) {
        console.log(`✅ ${bodybuilder.toUpperCase()} template created successfully`);
        console.log(`   - Plan ID: ${plan.id}`);
        console.log(`   - Days: ${plan.weeklySchedule.length}`);
        console.log(`   - Total exercises: ${plan.weeklySchedule.reduce((total, day) => total + (day.exercises?.length || 0), 0)}`);
        console.log(`   - Plan name: ${plan.name}`);
      } else {
        console.log(`❌ ${bodybuilder.toUpperCase()} template failed - no plan returned`);
      }
    } catch (error) {
      console.log(`❌ ${bodybuilder.toUpperCase()} template failed with error:`, error.message);
    }

    console.log(''); // Empty line for readability
  }

  console.log('🎉 Bodybuilder offline test completed!');
}

// Run the test
testBodybuilderOffline().catch(console.error);
