/**
 * Test script to create and verify bodybuilder plans
 * This can be run directly in the app environment
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutLocalStore } from './src/services/workout/WorkoutLocalStore';

export async function testBodybuilderPlanCreation(userId) {
  console.log('🧪 Testing Bodybuilder Plan Creation...\n');

  try {
    // Check existing plans
    console.log('1. Checking existing plans...');
    const existingPlans = await WorkoutLocalStore.getPlans(userId);
    console.log(`   Found ${existingPlans.length} existing plans`);

    // Check for bodybuilder plans
    const bodybuilderPlans = existingPlans.filter(p => p.id?.startsWith?.('bb-'));
    console.log(`   Found ${bodybuilderPlans.length} bodybuilder plans:`);
    bodybuilderPlans.forEach(plan => {
      console.log(`     - ${plan.name} (ID: ${plan.id})`);
    });

    // Create Dorian Yates plan manually
    console.log('\n2. Creating Dorian Yates plan...');
    const dorianPlan = {
      id: `bb-${Date.now().toString(36)}-dorian`,
      user_id: userId,
      name: `Dorian Yates's Training Plan`,
      training_level: 'advanced',
      mesocycle_length_weeks: 4,
      current_week: 1,
      deload_week: false,
      is_active: true,
      status: 'active',
      weeklySchedule: [
        {
          day: 'Day 1',
          focus: 'Shoulders & Triceps',
          exercises: [
            { name: 'Smith Machine Shoulder Presses', sets: 4, reps: '6-8', restBetweenSets: '90s' },
            { name: 'Lying EZ-Bar Tricep Extensions', sets: 4, reps: '8-10', restBetweenSets: '90s' },
            { name: 'Crunches', sets: 3, reps: '20-25', restBetweenSets: '60s' }
          ]
        },
        {
          day: 'Day 2',
          focus: 'Back & Rear Delts',
          exercises: [
            { name: 'Machine Pullovers', sets: 4, reps: '8-10', restBetweenSets: '90s' },
            { name: 'Wide-Grip Seated Cable Row', sets: 4, reps: '8-10', restBetweenSets: '90s' }
          ]
        }
      ],
      weekly_schedule: [
        {
          day: 'Day 1',
          focus: 'Shoulders & Triceps',
          exercises: [
            { name: 'Smith Machine Shoulder Presses', sets: 4, reps: '6-8', restBetweenSets: '90s' },
            { name: 'Lying EZ-Bar Tricep Extensions', sets: 4, reps: '8-10', restBetweenSets: '90s' },
            { name: 'Crunches', sets: 3, reps: '20-25', restBetweenSets: '60s' }
          ]
        },
        {
          day: 'Day 2',
          focus: 'Back & Rear Delts',
          exercises: [
            { name: 'Machine Pullovers', sets: 4, reps: '8-10', restBetweenSets: '90s' },
            { name: 'Wide-Grip Seated Cable Row', sets: 4, reps: '8-10', restBetweenSets: '90s' }
          ]
        }
      ],
      goal_fat_loss: 2,
      goal_muscle_gain: 5,
      estimatedTimePerSession: '60-90 minutes',
      image_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2000&auto=format&fit=crop',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save Dorian plan
    await WorkoutLocalStore.addPlan(userId, dorianPlan);
    console.log('   ✅ Dorian Yates plan saved');

    // Create Jay Cutler plan
    console.log('\n3. Creating Jay Cutler plan...');
    const jayPlan = {
      id: `bb-${Date.now().toString(36)}-jay`,
      user_id: userId,
      name: `Jay Cutler's Training Plan`,
      training_level: 'advanced',
      mesocycle_length_weeks: 4,
      current_week: 1,
      deload_week: false,
      is_active: false, // Set as inactive since Dorian is active
      status: 'archived',
      weeklySchedule: [
        {
          day: 'Monday',
          focus: 'Shoulders & Triceps',
          exercises: [
            { name: 'Delts Dumbbell Side Laterals', sets: 3, reps: '12', restBetweenSets: '90s' },
            { name: 'Triceps Cable Extensions', sets: 4, reps: '15', restBetweenSets: '90s' }
          ]
        },
        {
          day: 'Friday',
          focus: 'Quads',
          exercises: [
            { name: 'Leg Extensions', sets: 3, reps: '20', restBetweenSets: '90s' },
            { name: 'Leg Press', sets: 4, reps: '12', restBetweenSets: '90s' }
          ]
        }
      ],
      weekly_schedule: [
        {
          day: 'Monday',
          focus: 'Shoulders & Triceps',
          exercises: [
            { name: 'Delts Dumbbell Side Laterals', sets: 3, reps: '12', restBetweenSets: '90s' },
            { name: 'Triceps Cable Extensions', sets: 4, reps: '15', restBetweenSets: '90s' }
          ]
        },
        {
          day: 'Friday',
          focus: 'Quads',
          exercises: [
            { name: 'Leg Extensions', sets: 3, reps: '20', restBetweenSets: '90s' },
            { name: 'Leg Press', sets: 4, reps: '12', restBetweenSets: '90s' }
          ]
        }
      ],
      goal_fat_loss: 3,
      goal_muscle_gain: 6,
      estimatedTimePerSession: '60-90 minutes',
      image_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2000&auto=format&fit=crop',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save Jay plan
    await WorkoutLocalStore.addPlan(userId, jayPlan);
    console.log('   ✅ Jay Cutler plan saved');

    // Verify plans were saved
    console.log('\n4. Verifying plans were saved...');
    const updatedPlans = await WorkoutLocalStore.getPlans(userId);
    const updatedBodybuilderPlans = updatedPlans.filter(p => p.id?.startsWith?.('bb-'));

    console.log(`   Total plans: ${updatedPlans.length}`);
    console.log(`   Bodybuilder plans: ${updatedBodybuilderPlans.length}`);

    updatedBodybuilderPlans.forEach((plan, index) => {
      console.log(`   ${index + 1}. ${plan.name}`);
      console.log(`      - ID: ${plan.id}`);
      console.log(`      - Active: ${plan.is_active}`);
      console.log(`      - Days: ${plan.weeklySchedule?.length || 0}`);
    });

    console.log('\n✅ Bodybuilder plan creation test completed!');
    return {
      success: true,
      totalPlans: updatedPlans.length,
      bodybuilderPlans: updatedBodybuilderPlans.length,
      plans: updatedBodybuilderPlans
    };

  } catch (error) {
    console.error('❌ Error in bodybuilder plan creation test:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in the app
export default testBodybuilderPlanCreation;
