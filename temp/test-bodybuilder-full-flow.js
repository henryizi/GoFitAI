// Comprehensive test of the full bodybuilder plan creation flow

// Mock AsyncStorage for Node.js
const AsyncStorage = require('@react-native-async-storage/async-storage');
if (typeof window === 'undefined') {
  global.AsyncStorage = AsyncStorage;
}

// Mock the bodybuilder data
const bodybuilderTemplates = [
  'cbum', 'platz', 'ronnie', 'arnold', 'dorian', 'jay', 'phil', 'kai',
  'franco', 'frank', 'lee', 'derek', 'hadi', 'nick', 'flex', 'sergio'
];

// Simulate WorkoutLocalStore.addPlan
class MockWorkoutLocalStore {
  static async addPlan(userId, plan) {
    const key = `workoutPlans:${userId}`;
    const existingPlans = await this.getPlans(userId) || [];
    existingPlans.push(plan);
    await AsyncStorage.setItem(key, JSON.stringify(existingPlans));
    console.log(`✅ [MockWorkoutLocalStore] Added plan ${plan.id} for user ${userId}`);
  }

  static async getPlans(userId) {
    const key = `workoutPlans:${userId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }
}

// Simulate bodybuilder plan creation
function createBodybuilderPlan(userId, bodybuilder) {
  console.log(`🏗️ Creating bodybuilder plan for ${bodybuilder}...`);

  const planName = `${bodybuilder.toUpperCase()} Training Plan`;
  const planId = `bb-${Date.now().toString(36)}-${bodybuilder}`;

  const plan = {
    id: planId,
    user_id: userId,
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

  console.log(`📋 Created plan:`);
  console.log(`   ID: ${plan.id}`);
  console.log(`   Name: ${plan.name}`);
  console.log(`   User ID: ${plan.user_id}`);
  console.log(`   Active: ${plan.is_active}`);
  console.log(`   Status: ${plan.status}`);
  console.log(`   Weekly Schedule: ${plan.weekly_schedule.length} days`);

  return plan;
}

// Simulate the validation function from the plans screen
function validatePlan(plan) {
  try {
    if (!plan || typeof plan !== 'object') {
      console.log('❌ Validation failed: not an object');
      return null;
    }

    if (Array.isArray(plan)) {
      console.log('❌ Validation failed: is an array');
      return null;
    }

    if (!plan.id && !plan.name) {
      console.log('❌ Validation failed: missing id and name');
      return null;
    }

    const normalizedPlan = {
      id: plan.id || `temp-${Date.now()}-${Math.random()}`,
      name: plan.name || 'Untitled Plan',
      user_id: plan.user_id || '',
      status: plan.status || 'inactive',
      created_at: plan.created_at || new Date().toISOString(),
      updated_at: plan.updated_at || new Date().toISOString(),
      current_week: plan.current_week || 1,
      mesocycle_length_weeks: plan.mesocycle_length_weeks || 4,
      deload_week: plan.deload_week || false,
      training_level: plan.training_level || 'beginner',
      goal_muscle_gain: plan.goal_muscle_gain || 1,
      goal_fat_loss: plan.goal_fat_loss || 1,
      weekly_schedule: Array.isArray(plan.weekly_schedule) ? plan.weekly_schedule : [],
      is_active: plan.is_active || plan.status === 'active'
    };

    console.log('✅ Plan validation passed');
    return normalizedPlan;
  } catch (error) {
    console.log('❌ Validation error:', error.message);
    return null;
  }
}

// Main test function
async function testFullBodybuilderFlow() {
  console.log('🧪 Testing Full Bodybuilder Plan Flow...\n');

  const testUserId = 'test-user-789';
  const testBodybuilder = 'cbum';

  try {
    // Step 1: Clear existing data
    console.log('🧹 Step 1: Clearing existing test data...');
    await AsyncStorage.removeItem(`workoutPlans:${testUserId}`);

    // Step 2: Create bodybuilder plan
    console.log('\n🏗️ Step 2: Creating bodybuilder plan...');
    const plan = createBodybuilderPlan(testUserId, testBodybuilder);

    // Step 3: Save plan to local storage
    console.log('\n💾 Step 3: Saving plan to local storage...');
    await MockWorkoutLocalStore.addPlan(testUserId, plan);

    // Step 4: Retrieve plans from local storage
    console.log('\n📖 Step 4: Retrieving plans from local storage...');
    const retrievedPlans = await MockWorkoutLocalStore.getPlans(testUserId);

    console.log(`📊 Found ${retrievedPlans.length} plans:`);
    retrievedPlans.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name} (ID: ${p.id})`);
    });

    // Step 5: Validate each plan
    console.log('\n🔍 Step 5: Validating plans...');
    const validPlans = [];
    for (const retrievedPlan of retrievedPlans) {
      console.log(`\nValidating plan: ${retrievedPlan.name}`);
      const validatedPlan = validatePlan(retrievedPlan);
      if (validatedPlan) {
        validPlans.push(validatedPlan);
      }
    }

    console.log(`\n✅ Valid plans: ${validPlans.length}`);
    validPlans.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.name} (ID: ${p.id}, Active: ${p.is_active})`);
    });

    // Step 6: Check if bodybuilder plans are present
    console.log('\n🏆 Step 6: Checking for bodybuilder plans...');
    const bodybuilderPlans = validPlans.filter(p => p.id && p.id.startsWith('bb-'));
    console.log(`Bodybuilder plans found: ${bodybuilderPlans.length}`);

    if (bodybuilderPlans.length > 0) {
      console.log('✅ SUCCESS: Bodybuilder plans are being created and validated correctly!');
      bodybuilderPlans.forEach((plan, index) => {
        console.log(`   ${index + 1}. ${plan.name}`);
        console.log(`      - ID: ${plan.id}`);
        console.log(`      - Active: ${plan.is_active}`);
        console.log(`      - Training Level: ${plan.training_level}`);
        console.log(`      - Weekly Schedule: ${plan.weekly_schedule?.length || 0} days`);
      });
    } else {
      console.log('❌ FAILURE: No bodybuilder plans found after validation');
    }

    // Step 7: Simulate the plan display filtering
    console.log('\n📱 Step 7: Simulating plan display filtering...');
    const activePlans = validPlans.filter(p => p.is_active);
    const inactivePlans = validPlans.filter(p => !p.is_active);

    console.log(`Active plans: ${activePlans.length}`);
    console.log(`Inactive plans: ${inactivePlans.length}`);

    // Check for common issues
    console.log('\n🔧 Step 8: Checking for common issues...');

    const issues = [];

    // Check if plans have proper structure
    validPlans.forEach((plan, index) => {
      if (!plan.id) issues.push(`Plan ${index + 1}: Missing ID`);
      if (!plan.name) issues.push(`Plan ${index + 1}: Missing name`);
      if (!plan.weekly_schedule || plan.weekly_schedule.length === 0) {
        issues.push(`Plan ${index + 1}: Missing or empty weekly schedule`);
      }
      if (plan.is_active === undefined) issues.push(`Plan ${index + 1}: Undefined is_active`);
    });

    if (issues.length > 0) {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('✅ No structural issues found');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testFullBodybuilderFlow();
