const axios = require('axios');

async function testGoalBasedWorkoutPlans() {
    console.log('🧪 Testing Goal-Based Workout Plan Generation...\n');

    const goals = [
        {
            id: 'muscle_gain',
            name: 'Muscle Gain',
            expectedStyle: 'hypertrophy and strength',
            expectedReps: '8-12',
            expectedRest: '60-90 seconds'
        },
        {
            id: 'fat_loss',
            name: 'Fat Loss',
            expectedStyle: 'calorie burn and metabolic conditioning',
            expectedReps: '12-20',
            expectedRest: '30-60 seconds'
        },
        {
            id: 'strength',
            name: 'Strength',
            expectedStyle: 'maximal strength development',
            expectedReps: '3-6',
            expectedRest: '2-5 minutes'
        },
        {
            id: 'endurance',
            name: 'Endurance',
            expectedStyle: 'cardiovascular fitness and muscular endurance',
            expectedReps: '15-30',
            expectedRest: '30-45 seconds'
        }
    ];

    for (const goal of goals) {
        console.log(`📋 Testing: ${goal.name}`);
        console.log(`🎯 Expected Style: ${goal.expectedStyle}`);
        console.log(`🎯 Expected Reps: ${goal.expectedReps}`);
        console.log(`🎯 Expected Rest: ${goal.expectedRest}`);
        console.log('');

        const testData = {
            userProfile: {
                fitnessLevel: "intermediate",
                primaryGoal: goal.id,
                age: 25,
                workoutFrequency: "4_5",
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
                
                // Check if the plan reflects the goal
                if (workoutPlan.primary_goal === goal.id || workoutPlan.primaryGoal === goal.id) {
                    console.log(`✅ Goal match: ${goal.id}`);
                } else {
                    console.log(`❌ Goal mismatch: expected ${goal.id}, got ${workoutPlan.primary_goal || workoutPlan.primaryGoal}`);
                }
                
                // Analyze workout style based on exercises
                const weeklySchedule = workoutPlan.weekly_schedule || workoutPlan.weeklySchedule || [];
                let hasCompoundMovements = false;
                let hasHIIT = false;
                let hasEnduranceExercises = false;
                let hasStrengthExercises = false;
                
                weeklySchedule.forEach(day => {
                    if (day && day.main_workout) {
                        day.main_workout.forEach(exercise => {
                            const exerciseName = exercise.exercise?.toLowerCase() || '';
                            
                            // Check for compound movements (strength/muscle gain)
                            if (exerciseName.includes('squat') || exerciseName.includes('deadlift') || 
                                exerciseName.includes('bench') || exerciseName.includes('press') ||
                                exerciseName.includes('row') || exerciseName.includes('pull')) {
                                hasCompoundMovements = true;
                            }
                            
                            // Check for HIIT exercises (fat loss)
                            if (exerciseName.includes('burpee') || exerciseName.includes('jump') ||
                                exerciseName.includes('mountain') || exerciseName.includes('high knee')) {
                                hasHIIT = true;
                            }
                            
                            // Check for endurance exercises
                            if (exercise.reps && exercise.reps.includes('20') || exercise.reps.includes('30')) {
                                hasEnduranceExercises = true;
                            }
                            
                            // Check for strength exercises (low reps)
                            if (exercise.reps && (exercise.reps.includes('3') || exercise.reps.includes('5') || exercise.reps.includes('6'))) {
                                hasStrengthExercises = true;
                            }
                        });
                    }
                });
                
                console.log('');
                console.log('🏋️ Workout Style Analysis:');
                console.log(`  Compound Movements: ${hasCompoundMovements ? '✅' : '❌'}`);
                console.log(`  HIIT Exercises: ${hasHIIT ? '✅' : '❌'}`);
                console.log(`  Endurance Exercises: ${hasEnduranceExercises ? '✅' : '❌'}`);
                console.log(`  Strength Exercises: ${hasStrengthExercises ? '✅' : '❌'}`);
                
                // Validate style matches goal
                let styleMatch = false;
                if (goal.id === 'muscle_gain' && hasCompoundMovements) {
                    styleMatch = true;
                } else if (goal.id === 'fat_loss' && hasHIIT) {
                    styleMatch = true;
                } else if (goal.id === 'strength' && hasStrengthExercises) {
                    styleMatch = true;
                } else if (goal.id === 'endurance' && hasEnduranceExercises) {
                    styleMatch = true;
                }
                
                if (styleMatch) {
                    console.log(`✅ Style match: ${goal.expectedStyle}`);
                } else {
                    console.log(`❌ Style mismatch: expected ${goal.expectedStyle}`);
                }
                
                console.log('');
                console.log('📊 Sample Exercises:');
                if (weeklySchedule.length > 0 && weeklySchedule[0].main_workout) {
                    weeklySchedule[0].main_workout.slice(0, 3).forEach((exercise, index) => {
                        console.log(`  ${index + 1}. ${exercise.exercise} - ${exercise.sets} sets, ${exercise.reps} reps`);
                    });
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
        
        console.log('\n' + '─'.repeat(80) + '\n');
    }
}

testGoalBasedWorkoutPlans().catch(console.error);




