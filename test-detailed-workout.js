const axios = require('axios');

async function testDetailedWorkoutPlan() {
    console.log('🔍 Detailed Workout Plan Analysis...\n');

    const testData = {
        userProfile: {
            fitnessLevel: "intermediate",
            primaryGoal: "athletic_performance",
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
            console.log(`📊 Fitness Level: ${workoutPlan.fitness_level || workoutPlan.fitnessLevel}`);
            console.log(`⏱️ Session Duration: ${workoutPlan.session_duration || workoutPlan.sessionDuration} minutes`);
            console.log(`📈 Weekly Frequency: ${workoutPlan.weekly_frequency || workoutPlan.weeklyFrequency} days`);
            
            console.log('\n📋 Plan Overview:');
            console.log(`Description: ${workoutPlan.description || workoutPlan.overview || 'No description provided'}`);
            
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
            } else {
                console.log('❌ No weekly schedule found');
            }
            
            console.log('\n🍎 Nutrition Guidelines:');
            if (workoutPlan.nutrition_guidelines || workoutPlan.nutritionGuidelines) {
                const nutrition = workoutPlan.nutrition_guidelines || workoutPlan.nutritionGuidelines;
                if (nutrition.pre_workout) {
                    console.log(`Pre-workout: ${nutrition.pre_workout}`);
                }
                if (nutrition.post_workout) {
                    console.log(`Post-workout: ${nutrition.post_workout}`);
                }
                if (nutrition.daily_recommendations) {
                    console.log(`Daily: ${nutrition.daily_recommendations}`);
                }
            } else {
                console.log('No nutrition guidelines provided');
            }
            
            console.log('\n💡 Progression Tips:');
            if (workoutPlan.progression_tips || workoutPlan.progressionTips) {
                const tips = workoutPlan.progression_tips || workoutPlan.progressionTips;
                if (Array.isArray(tips)) {
                    tips.forEach((tip, i) => {
                        console.log(`  ${i + 1}. ${tip}`);
                    });
                } else {
                    console.log(tips);
                }
            } else {
                console.log('No progression tips provided');
            }
            
            console.log('\n⚠️ Safety Notes:');
            if (workoutPlan.safety_notes || workoutPlan.safetyNotes) {
                const safety = workoutPlan.safety_notes || workoutPlan.safetyNotes;
                if (Array.isArray(safety)) {
                    safety.forEach((note, i) => {
                        console.log(`  ${i + 1}. ${note}`);
                    });
                } else {
                    console.log(safety);
                }
            } else {
                console.log('No safety notes provided');
            }
            
            // Analyze workout plan quality
            console.log('\n📊 Workout Plan Quality Analysis:');
            let totalExercises = 0;
            let hasWarmUp = false;
            let hasCoolDown = false;
            let hasCompoundMovements = false;
            let hasProgressiveOverload = false;
            
            weeklySchedule.forEach(day => {
                if (day) {
                    if (day.warm_up && day.warm_up.length > 0) {
                        hasWarmUp = true;
                        totalExercises += day.warm_up.length;
                    }
                    if (day.main_workout && day.main_workout.length > 0) {
                        totalExercises += day.main_workout.length;
                        day.main_workout.forEach(exercise => {
                            const exerciseName = exercise.exercise?.toLowerCase() || '';
                            if (exerciseName.includes('squat') || exerciseName.includes('deadlift') || 
                                exerciseName.includes('bench') || exerciseName.includes('press') ||
                                exerciseName.includes('row') || exerciseName.includes('pull')) {
                                hasCompoundMovements = true;
                            }
                        });
                    }
                    if (day.cool_down && day.cool_down.length > 0) {
                        hasCoolDown = true;
                        totalExercises += day.cool_down.length;
                    }
                }
            });
            
            console.log(`Total Exercises: ${totalExercises}`);
            console.log(`Has Warm-up: ${hasWarmUp ? '✅' : '❌'}`);
            console.log(`Has Cool-down: ${hasCoolDown ? '✅' : '❌'}`);
            console.log(`Has Compound Movements: ${hasCompoundMovements ? '✅' : '❌'}`);
            console.log(`Has Progressive Overload: ${hasProgressiveOverload ? '✅' : '❌'}`);
            
            // Overall assessment
            let score = 0;
            if (hasWarmUp) score += 20;
            if (hasCoolDown) score += 20;
            if (hasCompoundMovements) score += 30;
            if (totalExercises >= 15) score += 30;
            
            console.log(`\n🎯 Overall Quality Score: ${score}/100`);
            if (score >= 80) {
                console.log('🌟 Excellent workout plan!');
            } else if (score >= 60) {
                console.log('👍 Good workout plan');
            } else {
                console.log('⚠️ Needs improvement');
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

testDetailedWorkoutPlan().catch(console.error);

























































