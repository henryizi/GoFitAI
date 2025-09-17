const axios = require('axios');

async function testFatLossWorkoutPlan() {
    console.log('🔥 Testing Fat Loss Workout Plan...\n');

    const testData = {
        userProfile: {
            fitnessLevel: "beginner",
            primaryGoal: "fat_loss",
            age: 30,
            workoutFrequency: "3_4",
            equipment: "Home equipment",
            experience: "6 months"
        },
        preferences: {
            workoutTypes: ["cardio", "hiit"],
            sessionDuration: 45,
            focusAreas: ["full_body"],
            limitations: "Knee issues"
        }
    };

    try {
        console.log('📤 Sending request to: http://localhost:4001/api/generate-workout-plan');
        const response = await axios.post('http://localhost:4001/api/generate-workout-plan', testData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        if (response.data.success) {
            const workoutPlan = response.data.workoutPlan;
            console.log(`✅ Success! Provider: ${response.data.provider}`);
            console.log(`📅 Plan name: ${workoutPlan.plan_name || workoutPlan.name}`);
            console.log(`🎯 Primary Goal: ${workoutPlan.primary_goal || workoutPlan.primaryGoal}`);
            
            console.log('\n🏋️ Weekly Schedule:');
            const weeklySchedule = workoutPlan.weekly_schedule || workoutPlan.weeklySchedule || [];
            
            if (weeklySchedule.length > 0) {
                weeklySchedule.forEach((day, index) => {
                    if (day) {
                        console.log(`\n📅 Day ${index + 1}: ${day.day_name || day.dayName || `Day ${index + 1}`}`);
                        console.log(`Focus: ${day.focus_area || day.focusArea || 'Full body'}`);
                        
                        if (day.warm_up && day.warm_up.length > 0) {
                            console.log('🔥 Warm-up:');
                            day.warm_up.forEach((exercise, i) => {
                                console.log(`  ${i + 1}. ${exercise.exercise} - ${exercise.duration || exercise.reps}`);
                            });
                        }
                        
                        if (day.main_workout && day.main_workout.length > 0) {
                            console.log('💪 Main Workout:');
                            day.main_workout.forEach((exercise, i) => {
                                const rest = exercise.rest ? ` (Rest: ${exercise.rest}s)` : '';
                                console.log(`  ${i + 1}. ${exercise.exercise} - ${exercise.sets} sets, ${exercise.reps} reps${rest}`);
                            });
                        }
                        
                        if (day.cool_down && day.cool_down.length > 0) {
                            console.log('🧘 Cool-down:');
                            day.cool_down.forEach((exercise, i) => {
                                console.log(`  ${i + 1}. ${exercise.exercise} - ${exercise.duration || exercise.reps}`);
                            });
                        }
                    }
                });
            }
            
            // Analyze fat loss specific features
            console.log('\n🔥 Fat Loss Analysis:');
            let hasHIIT = false;
            let hasCardio = false;
            let hasHighReps = false;
            let hasShortRest = false;
            let totalCalorieBurn = 0;
            
            weeklySchedule.forEach(day => {
                if (day && day.main_workout) {
                    day.main_workout.forEach(exercise => {
                        const exerciseName = exercise.exercise?.toLowerCase() || '';
                        const reps = exercise.reps || '';
                        
                        // Check for HIIT exercises
                        if (exerciseName.includes('burpee') || exerciseName.includes('jump') ||
                            exerciseName.includes('mountain') || exerciseName.includes('high knee')) {
                            hasHIIT = true;
                            totalCalorieBurn += 15; // High calorie burn
                        }
                        
                        // Check for cardio exercises
                        if (exerciseName.includes('cardio') || exerciseName.includes('run') ||
                            exerciseName.includes('bike') || exerciseName.includes('row')) {
                            hasCardio = true;
                            totalCalorieBurn += 10;
                        }
                        
                        // Check for high reps (fat loss range)
                        if (reps.includes('15') || reps.includes('20') || reps.includes('30')) {
                            hasHighReps = true;
                        }
                        
                        // Check for short rest periods
                        if (exercise.rest && exercise.rest <= 60) {
                            hasShortRest = true;
                        }
                    });
                }
            });
            
            console.log(`Has HIIT Exercises: ${hasHIIT ? '✅' : '❌'}`);
            console.log(`Has Cardio: ${hasCardio ? '✅' : '❌'}`);
            console.log(`Has High Reps: ${hasHighReps ? '✅' : '❌'}`);
            console.log(`Has Short Rest: ${hasShortRest ? '✅' : '❌'}`);
            console.log(`Estimated Calorie Burn: ${totalCalorieBurn} calories per session`);
            
            // Fat loss effectiveness score
            let fatLossScore = 0;
            if (hasHIIT) fatLossScore += 40;
            if (hasCardio) fatLossScore += 30;
            if (hasHighReps) fatLossScore += 20;
            if (hasShortRest) fatLossScore += 10;
            
            console.log(`\n🎯 Fat Loss Effectiveness: ${fatLossScore}/100`);
            if (fatLossScore >= 80) {
                console.log('🔥 Excellent fat loss workout!');
            } else if (fatLossScore >= 60) {
                console.log('👍 Good fat loss workout');
            } else {
                console.log('⚠️ Could be more effective for fat loss');
            }
            
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

testFatLossWorkoutPlan().catch(console.error);

























































