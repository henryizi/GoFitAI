// Test script to create a bodybuilder plan and verify it gets saved correctly

// Mock AsyncStorage for Node.js
const AsyncStorage = require('@react-native-async-storage/async-storage');
if (typeof window === 'undefined') {
  global.AsyncStorage = AsyncStorage;
}

// Import required modules
const { WorkoutLocalStore } = require('./src/services/workout/WorkoutLocalStore.ts');

// Test data
const TEST_USER_ID = 'test-user-456';
const TEST_BODYBUILDER = 'cbum';

async function testBodybuilderPlanCreation() {
  console.log('🧪 Testing Bodybuilder Plan Creation...\n');

  try {
    // Clear existing test data first
    console.log('🧹 Clearing existing test data...');
    await AsyncStorage.removeItem(`workoutPlans:${TEST_USER_ID}`);

    // Simulate the bodybuilder plan creation process
    console.log('🏗️ Creating bodybuilder plan...');

    const planName = `Chris Bumstead's Training Plan`;
    const planId = `bb-${Date.now().toString(36)}-${TEST_BODYBUILDER}`;

    // Create a sample bodybuilder plan structure
    const bodybuilderPlan = {
      id: planId,
      user_id: TEST_USER_ID,
      name: planName,
      training_level: 'intermediate',
      mesocycle_length_weeks: 4,
      current_week: 1,
      deload_week: false,
      is_active: true,
      status: 'active',
      weekly_schedule: [
        {
          day: 'Day 1',
          bodyParts: ['Chest', 'Shoulders'],
          exercises: [
            { name: 'Bench Press', sets: '4', reps: '8-12', restTime: '2-3 min' },
            { name: 'Incline Dumbbell Press', sets: '4', reps: '10-12', restTime: '2 min' }
          ]
        },
        {
          day: 'Day 2',
          bodyParts: ['Back', 'Biceps'],
          exercises: [
            { name: 'Deadlift', sets: '4', reps: '6-8', restTime: '3 min' },
            { name: 'Pull-ups', sets: '4', reps: '8-12', restTime: '2 min' }
          ]
        }
      ],
      weeklySchedule: [
        {
          day: 'Day 1',
          bodyParts: ['Chest', 'Shoulders'],
          exercises: [
            { name: 'Bench Press', sets: '4', reps: '8-12', restTime: '2-3 min' },
            { name: 'Incline Dumbbell Press', sets: '4', reps: '10-12', restTime: '2 min' }
          ]
        }
      ],
      goal_fat_loss: 0,
      goal_muscle_gain: 1,
      estimatedTimePerSession: '60-75 minutes',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📋 Plan details:');
    console.log(`  ID: ${bodybuilderPlan.id}`);
    console.log(`  Name: ${bodybuilderPlan.name}`);
    console.log(`  User ID: ${bodybuilderPlan.user_id}`);
    console.log(`  Active: ${bodybuilderPlan.is_active}`);
    console.log(`  Status: ${bodybuilderPlan.status}`);
    console.log(`  Weekly Schedule: ${bodybuilderPlan.weekly_schedule.length} days`);
    console.log('');

    // Save the plan using WorkoutLocalStore
    console.log('💾 Saving plan to local storage...');
    await WorkoutLocalStore.addPlan(TEST_USER_ID, bodybuilderPlan);
    console.log('✅ Plan saved successfully!');

    // Verify the plan was saved
    console.log('\n🔍 Verifying plan was saved...');
    const savedPlans = await WorkoutLocalStore.getPlans(TEST_USER_ID);

    console.log(`📊 Found ${savedPlans.length} plans for user ${TEST_USER_ID}`);

    if (savedPlans.length > 0) {
      const savedPlan = savedPlans.find(p => p.id === planId);
      if (savedPlan) {
        console.log('✅ Bodybuilder plan found in local storage!');
        console.log(`  Saved Plan ID: ${savedPlan.id}`);
        console.log(`  Saved Plan Name: ${savedPlan.name}`);
        console.log(`  Saved Plan Active: ${savedPlan.is_active}`);
        console.log(`  Saved Plan Status: ${savedPlan.status}`);
        console.log(`  Saved Plan Weekly Schedule: ${savedPlan.weekly_schedule ? savedPlan.weekly_schedule.length + ' days' : 'None'}`);
      } else {
        console.log('❌ Bodybuilder plan not found in saved plans');
        console.log('📋 Saved plans:');
        savedPlans.forEach((plan, index) => {
          console.log(`  ${index + 1}. ${plan.name} (ID: ${plan.id})`);
        });
      }
    } else {
      console.log('❌ No plans found in local storage after saving');
    }

    // Test getting all plans
    console.log('\n🔍 Testing getAllPlans...');
    const allPlans = await WorkoutLocalStore.getAllPlans();
    const bodybuilderPlans = allPlans.filter(p => p.id && p.id.startsWith('bb-'));

    console.log(`🏆 Bodybuilder plans in all storage: ${bodybuilderPlans.length}`);
    bodybuilderPlans.forEach((plan, index) => {
      console.log(`  ${index + 1}. ${plan.name} (ID: ${plan.id}, User: ${plan.user_id})`);
    });

  } catch (error) {
    console.error('❌ Error testing bodybuilder plan creation:', error);
    console.error(error.stack);
  }
}

// Run the test
testBodybuilderPlanCreation();
