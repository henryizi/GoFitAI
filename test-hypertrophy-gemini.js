const GeminiTextService = require('./server/services/geminiTextService');

async function testHypertrophyGoal() {
    console.log('🧪 Testing Gemini Service with Hypertrophy Goal...\n');

    // Check if API key is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log('❌ No GEMINI_API_KEY found in environment variables');
        console.log('Please set your GEMINI_API_KEY to test the service');
        return;
    }

    try {
        // Initialize Gemini service
        const geminiService = new GeminiTextService(apiKey);
        console.log('✅ Gemini service initialized successfully');

        // Test data for hypertrophy goal
        const userProfile = {
            fitnessLevel: "intermediate",
            primaryGoal: "hypertrophy",
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

        console.log('📋 Test Profile:');
        console.log(`  - Fitness Level: ${userProfile.fitnessLevel}`);
        console.log(`  - Primary Goal: ${userProfile.primaryGoal}`);
        console.log(`  - Workout Frequency: ${userProfile.workoutFrequency}`);
        console.log(`  - Age: ${userProfile.age}`);
        console.log('');

        console.log('⏳ Generating workout plan with hypertrophy goal...');

        const startTime = Date.now();

        // Generate workout plan
        const workoutPlan = await geminiService.generateWorkoutPlan(userProfile, preferences);

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`✅ Workout plan generated successfully in ${duration}ms`);
        console.log('');

        // Validate the response
        console.log('📊 Plan Analysis:');
        console.log(`  - Plan Name: ${workoutPlan.plan_name}`);
        console.log(`  - Primary Goal: ${workoutPlan.primary_goal}`);
        console.log(`  - Sessions per Week: ${workoutPlan.sessions_per_week}`);
        console.log(`  - Target Level: ${workoutPlan.target_level}`);
        console.log(`  - Duration (weeks): ${workoutPlan.duration_weeks}`);
        console.log(`  - Workout Split: ${workoutPlan.workout_split}`);
        console.log('');

        // Check if hypertrophy-specific characteristics are present
        const weeklySchedule = workoutPlan.weekly_schedule || [];
        let hypertrophyIndicators = {
            compoundMovements: false,
            isolationExercises: false,
            hypertrophyRepRange: false,
            moderateRest: false,
            progressiveOverload: false
        };

        console.log('🔍 Hypertrophy-Specific Analysis:');

        weeklySchedule.forEach((day, index) => {
            console.log(`  Day ${day.day} - ${day.day_name}: ${day.focus}`);
            if (day.main_workout && day.main_workout.length > 0) {
                day.main_workout.forEach(exercise => {
                    const exerciseName = exercise.exercise?.toLowerCase() || '';
                    const reps = exercise.reps || '';
                    const restSeconds = exercise.rest_seconds || 0;

                    // Check for compound movements
                    if (exerciseName.includes('bench') || exerciseName.includes('press') ||
                        exerciseName.includes('squat') || exerciseName.includes('deadlift') ||
                        exerciseName.includes('row') || exerciseName.includes('pull')) {
                        hypertrophyIndicators.compoundMovements = true;
                    }

                    // Check for isolation exercises (shoulders, arms, etc.)
                    if (exerciseName.includes('curl') || exerciseName.includes('extension') ||
                        exerciseName.includes('fly') || exerciseName.includes('raise') ||
                        exerciseName.includes('lateral') || exerciseName.includes('tricep')) {
                        hypertrophyIndicators.isolationExercises = true;
                    }

                    // Check for hypertrophy rep range (8-12 reps)
                    if (reps.includes('8') || reps.includes('9') || reps.includes('10') ||
                        reps.includes('11') || reps.includes('12') || reps === '8-12') {
                        hypertrophyIndicators.hypertrophyRepRange = true;
                    }

                    // Check for moderate rest periods (60-90 seconds)
                    if (restSeconds >= 60 && restSeconds <= 90) {
                        hypertrophyIndicators.moderateRest = true;
                    }
                });

                // Show first 2 exercises as examples
                const firstExercises = day.main_workout.slice(0, 2);
                firstExercises.forEach((exercise, i) => {
                    console.log(`    ${i + 1}. ${exercise.exercise} - ${exercise.sets} sets × ${exercise.reps} reps (${exercise.rest_seconds}s rest)`);
                });

                if (day.main_workout.length > 2) {
                    console.log(`    ... and ${day.main_workout.length - 2} more exercises`);
                }
            }
            console.log('');
        });

        // Check progression plan for progressive overload
        const progressionPlan = workoutPlan.progression_plan || {};
        if (progressionPlan.week_2 && progressionPlan.week_2.includes('increase')) {
            hypertrophyIndicators.progressiveOverload = true;
        }

        console.log('🏋️ Hypertrophy Indicators:');
        console.log(`  - Compound Movements: ${hypertrophyIndicators.compoundMovements ? '✅' : '❌'}`);
        console.log(`  - Isolation Exercises: ${hypertrophyIndicators.isolationExercises ? '✅' : '❌'}`);
        console.log(`  - Hypertrophy Rep Range (8-12): ${hypertrophyIndicators.hypertrophyRepRange ? '✅' : '❌'}`);
        console.log(`  - Moderate Rest (60-90s): ${hypertrophyIndicators.moderateRest ? '✅' : '❌'}`);
        console.log(`  - Progressive Overload: ${hypertrophyIndicators.progressiveOverload ? '✅' : '❌'}`);

        // Nutrition tips validation
        const nutritionTips = workoutPlan.nutrition_tips || [];
        const hasHighProtein = nutritionTips.some(tip =>
            tip.toLowerCase().includes('high protein') ||
            tip.toLowerCase().includes('protein') ||
            tip.toLowerCase().includes('caloric surplus')
        );

        console.log(`  - High Protein Nutrition: ${hasHighProtein ? '✅' : '❌'}`);

        // Overall assessment
        const indicatorsCount = Object.values(hypertrophyIndicators).filter(Boolean).length;
        const totalIndicators = Object.keys(hypertrophyIndicators).length;

        console.log('');
        console.log('📈 Overall Assessment:');
        console.log(`  - Hypertrophy Indicators: ${indicatorsCount}/${totalIndicators}`);
        console.log(`  - Nutrition Guidance: ${hasHighProtein ? '✅' : '❌'}`);

        if (indicatorsCount >= 4 && hasHighProtein) {
            console.log('🎉 SUCCESS: Hypertrophy goal implementation looks excellent!');
        } else if (indicatorsCount >= 3) {
            console.log('👍 GOOD: Hypertrophy goal is working well with minor areas for improvement');
        } else {
            console.log('⚠️  NEEDS IMPROVEMENT: Hypertrophy goal implementation needs attention');
        }

        console.log('');
        console.log('💡 Sample Nutrition Tips:');
        nutritionTips.slice(0, 2).forEach((tip, index) => {
            console.log(`  ${index + 1}. ${tip}`);
        });

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
if (require.main === module) {
    testHypertrophyGoal()
        .then(() => {
            console.log('\n🏁 Hypertrophy goal test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testHypertrophyGoal };











