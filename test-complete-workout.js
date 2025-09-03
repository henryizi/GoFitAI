const axios = require('axios');

async function testCompleteWorkoutSystem() {
    console.log('🧪 Testing Complete Workout System...\n');

    // Test case with 4-5 times per week preference
    const testData = {
        userProfile: {
            fitnessLevel: "intermediate",
            primaryGoal: "muscle_gain",
            age: 25,
            workoutFrequency: "4_5", // This should generate 4 training days
            equipment: "Full gym access",
            experience: "2 years"
        },
        preferences: {
            workoutTypes: ["strength_training", "compound_movements"],
            sessionDuration: 60,
            focusAreas: ["chest", "back", "legs", "shoulders"],
            limitations: "None"
        }
    };

    console.log('📋 Test Configuration:');
    console.log(`🎯 Fitness Level: ${testData.userProfile.fitnessLevel}`);
    console.log(`🎯 Primary Goal: ${testData.userProfile.primaryGoal}`);
    console.log(`🎯 Workout Frequency: ${testData.userProfile.workoutFrequency}`);
    console.log(`🎯 Expected Training Days: 4-5`);
    console.log(`🎯 Session Duration: ${testData.preferences.sessionDuration} minutes`);
    console.log('');

    try {
        console.log('📤 Sending request to: http://localhost:4001/api/generate-workout-plan');
        const response = await axios.post('http://localhost:4001/api/generate-workout-plan', testData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        if (response.data.success) {
            const workoutPlan = response.data.workoutPlan;
            const weeklySchedule = workoutPlan.weekly_schedule || workoutPlan.weeklySchedule || [];
            const trainingDays = weeklySchedule.filter(day => 
                day && day.main_workout && day.main_workout.length > 0
            ).length;

            console.log(`✅ Success! Provider: ${response.data.provider}`);
            console.log(`📅 Plan name: ${workoutPlan.plan_name || workoutPlan.name}`);
            console.log(`🏋️ Training days generated: ${trainingDays}`);
            console.log(`🎯 Expected days: 4-5`);
            
            if (trainingDays >= 4 && trainingDays <= 5) {
                console.log(`✅ Frequency match: ${trainingDays} days (within expected range)`);
            } else {
                console.log(`❌ Frequency mismatch: ${trainingDays} days (expected 4-5)`);
            }
            
            console.log('');
            console.log('📊 Weekly Schedule:');
            weeklySchedule.forEach((day, index) => {
                if (day && day.main_workout && day.main_workout.length > 0) {
                    console.log(`  ${index + 1}. ${day.day_name || day.day}: ${day.focus}`);
                    console.log(`     Exercises: ${day.main_workout.length}`);
                    console.log(`     Duration: ${day.duration_minutes} minutes`);
                } else {
                    console.log(`  ${index + 1}. ${day.day_name || day.day}: Rest Day`);
                }
            });
            
            console.log('');
            console.log('📈 Progression Plan:');
            if (workoutPlan.progression_plan) {
                Object.entries(workoutPlan.progression_plan).forEach(([week, guidance]) => {
                    console.log(`  ${week}: ${guidance}`);
                });
            }
            
            console.log('');
            console.log('💡 Nutrition Tips:');
            if (workoutPlan.nutrition_tips) {
                workoutPlan.nutrition_tips.forEach(tip => {
                    console.log(`  • ${tip}`);
                });
            }
            
            console.log('');
            console.log('🔒 Safety Guidelines:');
            if (workoutPlan.safety_guidelines) {
                workoutPlan.safety_guidelines.forEach(guideline => {
                    console.log(`  • ${guideline}`);
                });
            }
            
            console.log('');
            console.log('📦 Equipment Needed:');
            if (workoutPlan.equipment_needed) {
                workoutPlan.equipment_needed.forEach(equipment => {
                    console.log(`  • ${equipment}`);
                });
            }
            
            console.log('');
            console.log(`📊 Estimated Results: ${workoutPlan.estimated_results}`);
            
        } else {
            console.log(`❌ Failed: ${response.data.error || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

testCompleteWorkoutSystem().catch(console.error);




