const axios = require('axios');

async function testWorkoutFrequency() {
    console.log('🧪 Testing Workout Frequency Consideration...\n');

    const testCases = [
        {
            name: '2-3 times per week',
            userProfile: {
                fitnessLevel: "intermediate",
                primaryGoal: "muscle_gain",
                age: 25,
                workoutFrequency: "2_3",
                equipment: "Full gym access",
                experience: "2 years"
            },
            preferences: {
                workoutTypes: ["strength_training", "compound_movements"],
                sessionDuration: 60,
                focusAreas: ["chest", "back", "legs"],
                limitations: "None"
            }
        },
        {
            name: '4-5 times per week',
            userProfile: {
                fitnessLevel: "intermediate",
                primaryGoal: "muscle_gain",
                age: 25,
                workoutFrequency: "4_5",
                equipment: "Full gym access",
                experience: "2 years"
            },
            preferences: {
                workoutTypes: ["strength_training", "compound_movements"],
                sessionDuration: 60,
                focusAreas: ["chest", "back", "legs"],
                limitations: "None"
            }
        },
        {
            name: '6 times per week',
            userProfile: {
                fitnessLevel: "intermediate",
                primaryGoal: "muscle_gain",
                age: 25,
                workoutFrequency: "6",
                equipment: "Full gym access",
                experience: "2 years"
            },
            preferences: {
                workoutTypes: ["strength_training", "compound_movements"],
                sessionDuration: 60,
                focusAreas: ["chest", "back", "legs"],
                limitations: "None"
            }
        }
    ];

    for (const testCase of testCases) {
        console.log(`📋 Testing: ${testCase.name}`);
        console.log(`📤 Sending request to: http://localhost:4001/api/generate-workout-plan`);
        console.log(`🎯 Expected frequency: ${testCase.userProfile.workoutFrequency}`);
        
        try {
            const response = await axios.post('http://localhost:4001/api/generate-workout-plan', testCase, {
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
                console.log(`🎯 Expected days: ${testCase.userProfile.workoutFrequency}`);
                
                // Check if frequency matches expectation
                let expectedDays;
                if (testCase.userProfile.workoutFrequency === '2_3') {
                    expectedDays = [2, 3];
                } else if (testCase.userProfile.workoutFrequency === '4_5') {
                    expectedDays = [4, 5];
                } else if (testCase.userProfile.workoutFrequency === '6') {
                    expectedDays = [6];
                } else {
                    expectedDays = [parseInt(testCase.userProfile.workoutFrequency)];
                }

                if (expectedDays.includes(trainingDays)) {
                    console.log(`✅ Frequency match: ${trainingDays} days (within expected range)`);
                } else {
                    console.log(`❌ Frequency mismatch: ${trainingDays} days (expected ${testCase.userProfile.workoutFrequency})`);
                }
                
                console.log(`📊 Weekly schedule: ${weeklySchedule.map(day => day.day_name || day.day).join(', ')}`);
                
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
        
        console.log('─'.repeat(50) + '\n');
        
        // Wait between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

testWorkoutFrequency().catch(console.error);


















































