const GeminiTextService = require('./server/services/geminiTextService');

async function testAllGoalsWithGemini() {
    console.log('🧪 Testing Gemini Service with All Fitness Goals...\n');

    // Check if API key is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log('❌ No GEMINI_API_KEY found in environment variables');
        console.log('Please set your GEMINI_API_KEY to test the service');
        return;
    }

    const goals = [
        {
            id: 'hypertrophy',
            name: 'Hypertrophy',
            expectedStyle: 'muscle building and size gains',
            expectedReps: '8-12',
            expectedRest: '60-90 seconds',
            expectedFocus: 'compound and isolation exercises'
        },
        {
            id: 'fat_loss',
            name: 'Fat Loss',
            expectedStyle: 'calorie burn and metabolic conditioning',
            expectedReps: '12-20',
            expectedRest: '30-60 seconds',
            expectedFocus: 'high-intensity cardio and compound movements'
        },
        {
            id: 'strength',
            name: 'Strength',
            expectedStyle: 'maximal strength development',
            expectedReps: '3-6',
            expectedRest: '2-5 minutes',
            expectedFocus: 'heavy compound lifts'
        },
        {
            id: 'endurance',
            name: 'Endurance',
            expectedStyle: 'cardiovascular fitness and muscular endurance',
            expectedReps: '15-30',
            expectedRest: '30-45 seconds',
            expectedFocus: 'high reps and circuit training'
        },
        {
            id: 'general_fitness',
            name: 'General Fitness',
            expectedStyle: 'overall health and fitness',
            expectedReps: '8-15',
            expectedRest: '45-90 seconds',
            expectedFocus: 'balanced full-body workouts'
        }
    ];

    for (const goal of goals) {
        console.log(`\n🎯 Testing: ${goal.name} (${goal.id})`);
        console.log(`📋 Expected Style: ${goal.expectedStyle}`);
        console.log(`📋 Expected Reps: ${goal.expectedReps}`);
        console.log(`📋 Expected Rest: ${goal.expectedRest}`);
        console.log(`📋 Expected Focus: ${goal.expectedFocus}`);
        console.log('');

        try {
            // Initialize Gemini service
            const geminiService = new GeminiTextService(apiKey);

            // Test data for the goal
            const userProfile = {
                fitnessLevel: "intermediate",
                primaryGoal: goal.id,
                age: 28,
                workoutFrequency: "4_5",
                gender: "male"
            };

            const preferences = {
                sessionDuration: 60,
                daysPerWeek: 4,
                focusAreas: ["chest", "back", "legs", "shoulders", "arms"],
                limitations: "None"
            };

            console.log('⏳ Generating workout plan...');

            const startTime = Date.now();

            // Generate workout plan
            const workoutPlan = await geminiService.generateWorkoutPlan(userProfile, preferences);

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`✅ Workout plan generated successfully in ${duration}ms`);

            // Validate the response
            console.log('📊 Plan Analysis:');
            console.log(`  - Plan Name: ${workoutPlan.plan_name || 'N/A'}`);
            console.log(`  - Primary Goal: ${workoutPlan.primary_goal || workoutPlan.primaryGoal || 'N/A'}`);
            console.log(`  - Sessions per Week: ${workoutPlan.sessions_per_week || 'N/A'}`);
            console.log(`  - Target Level: ${workoutPlan.target_level || 'N/A'}`);
            console.log(`  - Duration (weeks): ${workoutPlan.duration_weeks || 'N/A'}`);
            console.log(`  - Workout Split: ${workoutPlan.workout_split || 'N/A'}`);
            console.log('');

            // Goal-specific validation
            await validateGoalSpecificCriteria(goal, workoutPlan);

        } catch (error) {
            console.error(`❌ Test failed for ${goal.name}:`, error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            console.log('');
        }
    }
}

async function validateGoalSpecificCriteria(goal, workoutPlan) {
    const weeklySchedule = workoutPlan.weekly_schedule || [];
    let indicators = {
        correctRepRange: false,
        correctRestPeriod: false,
        appropriateExercises: false,
        goalAlignment: false
    };

    console.log(`🔍 ${goal.name}-Specific Analysis:`);

    weeklySchedule.forEach((day, index) => {
        if (day.main_workout && day.main_workout.length > 0) {
            day.main_workout.forEach(exercise => {
                const reps = exercise.reps || '';
                const restSeconds = exercise.rest_seconds || 0;
                const exerciseName = exercise.exercise?.toLowerCase() || '';

                // Check rep ranges based on goal
                switch (goal.id) {
                    case 'hypertrophy':
                        if (reps.includes('8') || reps.includes('9') || reps.includes('10') ||
                            reps.includes('11') || reps.includes('12') || reps === '8-12') {
                            indicators.correctRepRange = true;
                        }
                        if (restSeconds >= 60 && restSeconds <= 90) {
                            indicators.correctRestPeriod = true;
                        }
                        if (exerciseName.includes('curl') || exerciseName.includes('press') ||
                            exerciseName.includes('extension') || exerciseName.includes('fly')) {
                            indicators.appropriateExercises = true;
                        }
                        break;

                    case 'fat_loss':
                        if (reps.includes('12') || reps.includes('13') || reps.includes('14') ||
                            reps.includes('15') || reps.includes('16') || reps.includes('17') ||
                            reps.includes('18') || reps.includes('19') || reps.includes('20')) {
                            indicators.correctRepRange = true;
                        }
                        if (restSeconds >= 30 && restSeconds <= 60) {
                            indicators.correctRestPeriod = true;
                        }
                        if (exerciseName.includes('burpee') || exerciseName.includes('jump') ||
                            exerciseName.includes('sprint') || exerciseName.includes('circuit')) {
                            indicators.appropriateExercises = true;
                        }
                        break;

                    case 'strength':
                        if (reps.includes('3') || reps.includes('4') || reps.includes('5') || reps.includes('6')) {
                            indicators.correctRepRange = true;
                        }
                        if (restSeconds >= 120 && restSeconds <= 300) {
                            indicators.correctRestPeriod = true;
                        }
                        if (exerciseName.includes('deadlift') || exerciseName.includes('squat') ||
                            exerciseName.includes('bench') || exerciseName.includes('press')) {
                            indicators.appropriateExercises = true;
                        }
                        break;

                    case 'endurance':
                        if (reps.includes('15') || reps.includes('16') || reps.includes('17') ||
                            reps.includes('18') || reps.includes('19') || reps.includes('20') ||
                            reps.includes('25') || reps.includes('30')) {
                            indicators.correctRepRange = true;
                        }
                        if (restSeconds >= 30 && restSeconds <= 45) {
                            indicators.correctRestPeriod = true;
                        }
                        if (exerciseName.includes('push') || exerciseName.includes('pull') ||
                            exerciseName.includes('circuit') || exerciseName.includes('step')) {
                            indicators.appropriateExercises = true;
                        }
                        break;

                    case 'general_fitness':
                        if (reps.includes('8') || reps.includes('9') || reps.includes('10') ||
                            reps.includes('11') || reps.includes('12') || reps.includes('13') ||
                            reps.includes('14') || reps.includes('15')) {
                            indicators.correctRepRange = true;
                        }
                        if (restSeconds >= 45 && restSeconds <= 90) {
                            indicators.correctRestPeriod = true;
                        }
                        if (exerciseName.includes('squat') || exerciseName.includes('push') ||
                            exerciseName.includes('pull') || exerciseName.includes('plank')) {
                            indicators.appropriateExercises = true;
                        }
                        break;
                }
            });
        }
    });

    // Check if the plan's primary goal matches the expected goal
    if (workoutPlan.primary_goal === goal.id || workoutPlan.primaryGoal === goal.id) {
        indicators.goalAlignment = true;
    }

    console.log(`  - Correct Rep Range (${goal.expectedReps}): ${indicators.correctRepRange ? '✅' : '❌'}`);
    console.log(`  - Appropriate Rest (${goal.expectedRest}): ${indicators.correctRestPeriod ? '✅' : '❌'}`);
    console.log(`  - Appropriate Exercises: ${indicators.appropriateExercises ? '✅' : '❌'}`);
    console.log(`  - Goal Alignment: ${indicators.goalAlignment ? '✅' : '❌'}`);

    // Overall assessment
    const indicatorsCount = Object.values(indicators).filter(Boolean).length;
    const totalIndicators = Object.keys(indicators).length;

    console.log('');
    console.log('📈 Overall Assessment:');
    console.log(`  - Goal-Specific Indicators: ${indicatorsCount}/${totalIndicators}`);

    if (indicatorsCount >= 3) {
        console.log(`🎉 SUCCESS: ${goal.name} goal implementation looks excellent!`);
    } else if (indicatorsCount >= 2) {
        console.log(`👍 GOOD: ${goal.name} goal is working well with minor areas for improvement`);
    } else {
        console.log(`⚠️  NEEDS IMPROVEMENT: ${goal.name} goal implementation needs attention`);
    }

    console.log('');
    console.log('─'.repeat(80));
}

// Run the test
if (require.main === module) {
    testAllGoalsWithGemini()
        .then(() => {
            console.log('\n🏁 All goals test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testAllGoalsWithGemini };











