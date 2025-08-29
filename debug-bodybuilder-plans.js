// Debug script to check if bodybuilder workout plans are being saved and retrieved correctly

const AsyncStorage = require('@react-native-async-storage/async-storage');

// Mock AsyncStorage for Node.js testing
if (typeof window === 'undefined') {
  global.AsyncStorage = AsyncStorage;
}

// Test user ID
const TEST_USER_ID = 'test-user-123';

async function debugBodybuilderPlans() {
  console.log('🔍 Debugging Bodybuilder Workout Plans...\n');

  try {
    // Check what keys are in AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('📋 All AsyncStorage keys:', allKeys);

    // Check for workout plan keys
    const workoutPlanKeys = allKeys.filter(key => key.startsWith('workoutPlans:'));
    console.log('🏋️ Workout plan keys found:', workoutPlanKeys);

    // Check each user's plans
    for (const key of workoutPlanKeys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) {
          console.log(`❌ No data for key: ${key}`);
          continue;
        }

        const plans = JSON.parse(raw);
        const userId = key.replace('workoutPlans:', '');

        console.log(`\n👤 User: ${userId}`);
        console.log(`📊 Number of plans: ${plans.length}`);

        plans.forEach((plan, index) => {
          console.log(`  Plan ${index + 1}:`);
          console.log(`    ID: ${plan.id}`);
          console.log(`    Name: ${plan.name}`);
          console.log(`    Active: ${plan.is_active}`);
          console.log(`    Status: ${plan.status}`);
          console.log(`    Training Level: ${plan.training_level}`);
          console.log(`    Weekly Schedule: ${plan.weekly_schedule ? plan.weekly_schedule.length + ' days' : 'None'}`);
          console.log(`    Created: ${plan.created_at}`);
          console.log('');
        });

      } catch (error) {
        console.error(`❌ Error processing key ${key}:`, error);
      }
    }

    // Check if there are any bodybuilder plans (starting with 'bb-')
    const allPlans = [];
    for (const key of workoutPlanKeys) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const plans = JSON.parse(raw);
          allPlans.push(...plans);
        }
      } catch (error) {
        console.error(`❌ Error processing key ${key}:`, error);
      }
    }

    const bodybuilderPlans = allPlans.filter(plan => plan.id && plan.id.startsWith('bb-'));
    console.log(`\n🏆 Bodybuilder Plans Found: ${bodybuilderPlans.length}`);

    if (bodybuilderPlans.length > 0) {
      console.log('✅ Bodybuilder plans are being saved to local storage!');
      bodybuilderPlans.forEach((plan, index) => {
        console.log(`  ${index + 1}. ${plan.name} (ID: ${plan.id})`);
      });
    } else {
      console.log('❌ No bodybuilder plans found in local storage');
      console.log('💡 This suggests plans are not being saved or are being saved with different IDs');
    }

    // Check for any recent plans (created in last 24 hours)
    const recentPlans = allPlans.filter(plan => {
      if (!plan.created_at) return false;
      const createdDate = new Date(plan.created_at);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return createdDate > oneDayAgo;
    });

    console.log(`\n🕐 Recent Plans (last 24h): ${recentPlans.length}`);
    recentPlans.forEach((plan, index) => {
      console.log(`  ${index + 1}. ${plan.name} (${new Date(plan.created_at).toLocaleString()})`);
    });

  } catch (error) {
    console.error('❌ Error debugging bodybuilder plans:', error);
  }
}

// Run the debug function
debugBodybuilderPlans();




