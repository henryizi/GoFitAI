/**
 * AI Workout Generator Service
 * Enhanced Gemini-powered workout plan generation with professional bodybuilder-style formatting
 */

/**
 * Compose an enhanced prompt for AI workout generation
 * @param {Object} params - User parameters
 * @param {string} params.gender - User's gender (male/female)
 * @param {string} params.primaryGoal - Primary fitness goal
 * @param {string} params.workoutFrequency - Preferred workout frequency (e.g., '4_5')
 * @param {string} params.trainingLevel - Training level (beginner/intermediate/advanced)
 * @param {number} params.age - User's age
 * @param {number} params.weight - User's weight in kg
 * @param {number} params.height - User's height in cm
 * @returns {string} The formatted prompt for Gemini AI
 */
function composeEnhancedWorkoutPrompt(params) {
  const {
    gender = 'male',
    primaryGoal = 'general_fitness',
    workoutFrequency = '4_5',
    trainingLevel = 'intermediate',
    age,
    weight,
    height,
    fullName = 'Client'
  } = params;

  // Parse workout frequency - use exact numbers to match system expectations
  const freqMap = {
    '1': { min: 1, max: 1, display: '1 day' },
    '2': { min: 2, max: 2, display: '2 days' },
    '2_3': { min: 3, max: 3, display: '3 days' }, // Always use upper limit
    '3': { min: 3, max: 3, display: '3 days' },
    '3_4': { min: 4, max: 4, display: '4 days' }, // Always use upper limit
    '4': { min: 4, max: 4, display: '4 days' },
    '4_5': { min: 5, max: 5, display: '5 days' }, // Always use upper limit to match system expectation
    '5': { min: 5, max: 5, display: '5 days' },
    '5_6': { min: 6, max: 6, display: '6 days' }, // Always use upper limit
    '6': { min: 6, max: 6, display: '6 days' },
    '6_7': { min: 7, max: 7, display: '7 days' }, // Always use upper limit
    '7': { min: 7, max: 7, display: '7 days' }
  };
  
  const freq = freqMap[workoutFrequency] || freqMap['4_5'];

  // Goal-specific guidance
  const goalGuidance = {
    'muscle_gain': {
      repRange: '6-12',
      restTime: '90-120s',
      intensity: 'moderate to heavy',
      focus: 'compound movements with progressive overload',
      exercises: 'Barbell Bench Press, Deadlifts, Squats, Overhead Press, Bent Over Rows',
      notes: 'Focus on time under tension and mind-muscle connection'
    },
    'fat_loss': {
      repRange: '12-15',
      restTime: '60-90s',
      intensity: 'moderate with higher volume',
      focus: 'circuit training and supersets',
      exercises: 'Compound movements combined with metabolic conditioning',
      notes: 'Include cardio finishers and keep rest periods short'
    },
    'athletic_performance': {
      repRange: '5-8',
      restTime: '120-180s',
      intensity: 'explosive and powerful',
      focus: 'power and functional movements',
      exercises: 'Power Cleans, Box Jumps, Olympic Lifts, Plyometrics',
      notes: 'Emphasize speed, power, and sport-specific movements'
    },
    'general_fitness': {
      repRange: '8-12',
      restTime: '90s',
      intensity: 'moderate',
      focus: 'balanced training with variety',
      exercises: 'Mix of compound and isolation movements',
      notes: 'Combine strength training with cardio for overall fitness'
    }
  };

  const guidance = goalGuidance[primaryGoal] || goalGuidance['general_fitness'];

  // Training split recommendations based on frequency
  const splitRecommendations = {
    1: 'Full Body workout focusing on major compound movements',
    2: 'Upper/Lower split',
    3: 'Push/Pull/Legs split',
    4: 'Upper/Lower split repeated, or 4-day Body Part split',
    5: 'Push/Pull/Legs/Upper/Lower, or 5-day Body Part split',
    6: 'Push/Pull/Legs repeated twice, or 6-day Body Part split',
    7: 'Push/Pull/Legs/Upper/Lower/Full Body/Active Recovery'
  };

  const split = splitRecommendations[freq.min] || splitRecommendations[5];

  const prompt = `🚨🚨🚨 CRITICAL INSTRUCTION 🚨🚨🚨
YOU MUST GENERATE EXACTLY ${freq.min} WORKOUT DAYS - NOT 3 DAYS!
YOU MUST USE THE NEW FORMAT WITH "exercises" ARRAY
DO NOT USE THE OLD FORMAT WITH warm_up/main_workout/cool_down
DO NOT GENERATE ONLY 3 DAYS - GENERATE ${freq.min} DAYS!
IF YOU GENERATE 3 DAYS, THE REQUEST WILL BE REJECTED!

EXAMPLE FORMAT (use this exact structure):
{
  "weekly_schedule": [
    {
      "day": 1,
      "focus": "Chest & Triceps",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": 4,
          "reps": "8-10",
          "rest": "2-3 min"
        }
      ]
    }
  ]
}

🚨 REMEMBER: Generate EXACTLY ${freq.min} days, not 3 days! 🚨

You are an elite professional fitness coach and workout programmer. Create a comprehensive, professional-quality workout plan that rivals the best programs used by competitive bodybuilders and athletes.

═══════════════════════════════════════════════════════════
CLIENT PROFILE
═══════════════════════════════════════════════════════════
Name: ${fullName}
Gender: ${gender}
Age: ${age} years
Height: ${height} cm
Weight: ${weight} kg
Training Level: ${trainingLevel}
Primary Goal: ${primaryGoal.replace(/_/g, ' ').toUpperCase()}
Workout Frequency: ${freq.display} per week

🚨 CRITICAL: Generate EXACTLY ${freq.min} workout days using the NEW format with "exercises" array. Do NOT use the old format with warm_up/main_workout/cool_down.

═══════════════════════════════════════════════════════════
PROGRAMMING REQUIREMENTS
═══════════════════════════════════════════════════════════

🎯 TRAINING PHILOSOPHY:
Create a workout plan inspired by professional bodybuilder training methodologies. The plan should be:
- Evidence-based and scientifically sound
- Progressive and periodized
- Goal-specific and personalized
- Challenging but achievable
- Professional in presentation

📋 SPLIT STRUCTURE:
${split}

- MUST create exactly ${freq.min} training days (no more, no less)
- Each day should have a clear focus (e.g., "Chest & Triceps", "Back & Biceps", "Legs & Glutes")
- Use strategic exercise order (compound movements first, isolation later)
- IMPORTANT: Generate ${freq.min} workout days, not just 3 days. For 5-day plans, create 5 distinct workout days.

💪 EXERCISE PROGRAMMING:
Goal: ${primaryGoal.replace(/_/g, ' ')}
- Rep Range: ${guidance.repRange} reps per set
- Rest Time: ${guidance.restTime} between sets
- Intensity: ${guidance.intensity} loads
- Focus: ${guidance.focus}

🏋️ EXERCISE SELECTION:
- Include 5-7 exercises per training day
- Start with compound movements (Bench Press, Squats, Deadlifts, Overhead Press, Rows)
- Follow with accessory movements for muscle development
- Include ${guidance.exercises}
- ${guidance.notes}

📊 VOLUME GUIDELINES:
Beginner: 10-15 sets per muscle group per week
Intermediate: 15-20 sets per muscle group per week
Advanced: 20-25+ sets per muscle group per week

🔄 PROGRESSIVE OVERLOAD:
- Week 1-2: Base volume, focus on form
- Week 3-4: Increase weight by 5-10%
- Week 5-6: Increase sets or reps
- Week 7: Deload week (reduce volume by 40%)
- Week 8: Peak week (test new maxes)

═══════════════════════════════════════════════════════════
OUTPUT FORMAT (CRITICAL - MUST FOLLOW EXACTLY)
═══════════════════════════════════════════════════════════

You MUST respond with a valid JSON object. Do not include any markdown, explanations, or text outside the JSON.

The JSON structure MUST be:

{
  "plan_name": "${fullName}'s ${primaryGoal.replace(/_/g, ' ')} ${freq.display} Plan",
  "weekly_schedule": [
    {
      "day": "Monday",
      "focus": "Chest & Triceps",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "sets": 4,
          "reps": "${guidance.repRange}",
          "rest": "${guidance.restTime}",
          "notes": "Compound movement, focus on form and progressive overload"
        },
        {
          "name": "Incline Dumbbell Press",
          "sets": 3,
          "reps": "${guidance.repRange}",
          "rest": "${guidance.restTime}",
          "notes": "Upper chest emphasis"
        }
      ]
    },
    {
      "day": "Tuesday", 
      "focus": "Back & Biceps",
      "exercises": [
        {
          "name": "Barbell Deadlift",
          "sets": 4,
          "reps": "${guidance.repRange}",
          "rest": "${guidance.restTime}",
          "notes": "King of all exercises, focus on hip hinge"
        }
      ]
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${freq.min} workout days (not 3, not 4, but ${freq.min})
2. Use "exercises" array format, NOT warm_up/main_workout/cool_down format
3. Use proper day names (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
4. Each workout must have a "focus" field describing the muscle groups
5. Do NOT use "day_name" field - use "day" field with day names
6. Do NOT use numeric day values (1, 2, 3) - use day names
7. Do NOT use "warm_up", "main_workout", or "cool_down" fields
8. ONLY use "exercises" array for each workout day

EXAMPLE FOR 5-DAY PLAN:
{
  "plan_name": "John's General Fitness 5-Day Plan",
  "weekly_schedule": [
    {
      "day": "Monday",
      "focus": "Chest & Triceps",
      "exercises": [...]
    },
    {
      "day": "Tuesday", 
      "focus": "Back & Biceps",
      "exercises": [...]
    },
    {
      "day": "Wednesday",
      "focus": "Legs & Glutes", 
      "exercises": [...]
    },
    {
      "day": "Thursday",
      "focus": "Shoulders & Arms",
      "exercises": [...]
    },
    {
      "day": "Friday",
      "focus": "Full Body",
      "exercises": [...]
    }
  ]
}

═══════════════════════════════════════════════════════════
EXERCISE NAMING CONVENTIONS
═══════════════════════════════════════════════════════════

Use proper exercise names:
✅ "Barbell Bench Press" (not "Bench Press")
✅ "Romanian Deadlift" (not "RDL")
✅ "Barbell Back Squat" (not "Squats")
✅ "Lat Pulldown" (not "Pulldowns")
✅ "Dumbbell Lateral Raise" (not "Side Raises")

═══════════════════════════════════════════════════════════
CRITICAL REQUIREMENTS
═══════════════════════════════════════════════════════════

1. Create EXACTLY ${freq.min} workout days (no more, no less)
2. Each workout should be 45-75 minutes long
3. Include specific sets, reps, and rest times for EVERY exercise
4. Add helpful notes for each exercise (form cues, intensity techniques, etc.)
5. Balance muscle groups throughout the week
6. Consider recovery between similar muscle groups
7. Make the plan professional and detailed like a coach would write it
8. CRITICAL: If user requests 5 days, generate 5 workout days. If user requests 4 days, generate 4 workout days. Do NOT default to 3 days.
BEGIN GENERATING THE WORKOUT PLAN NOW (JSON ONLY):`;

  return prompt;
}

/**
 * Transform raw Gemini response to app format
 */
function transformAIWorkoutResponse(rawPlan, params) {
  const {
    trainingLevel = 'intermediate',
    primaryGoal = 'general_fitness',
    workoutFrequency = '4_5',
    age,
    weight,
    height,
    gender,
    fullName = 'Client'
  } = params;

  // Ensure we have a valid plan
  if (!rawPlan || !rawPlan.weekly_schedule || !Array.isArray(rawPlan.weekly_schedule)) {
    throw new Error('Invalid workout plan structure from AI');
  }

  // Force correct number of days if AI generates wrong amount
  const freqMap = {
    '1': { min: 1, max: 1, display: '1 day' },
    '2': { min: 2, max: 2, display: '2 days' },
    '2_3': { min: 3, max: 3, display: '3 days' },
    '3': { min: 3, max: 3, display: '3 days' },
    '3_4': { min: 4, max: 4, display: '4 days' },
    '4': { min: 4, max: 4, display: '4 days' },
    '4_5': { min: 5, max: 5, display: '5 days' },
    '5': { min: 5, max: 5, display: '5 days' },
    '5_6': { min: 6, max: 6, display: '6 days' },
    '6': { min: 6, max: 6, display: '6 days' },
    '6_7': { min: 7, max: 7, display: '7 days' },
    '7': { min: 7, max: 7, display: '7 days' }
  };
  const expectedDays = freqMap[workoutFrequency.toString()]?.min || 5;
  
  console.log(`[AI WORKOUT] Debug: workoutFrequency=${workoutFrequency}, expectedDays=${expectedDays}, actualDays=${rawPlan.weekly_schedule.length}`);
  
  // CRITICAL: Trim excess days if AI generated too many
  if (rawPlan.weekly_schedule.length > expectedDays) {
    console.log(`[AI WORKOUT] AI generated ${rawPlan.weekly_schedule.length} days, expected ${expectedDays}. Trimming excess days.`);
    rawPlan.weekly_schedule = rawPlan.weekly_schedule.slice(0, expectedDays);
  } else if (rawPlan.weekly_schedule.length < expectedDays) {
    console.log(`[AI WORKOUT] AI generated ${rawPlan.weekly_schedule.length} days, expected ${expectedDays}. Adding missing days.`);
    
    // Add missing days with proper structure
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const focusOptions = ['Upper Body', 'Lower Body', 'Push', 'Pull', 'Legs', 'Full Body', 'Core & Cardio'];
    
    for (let i = rawPlan.weekly_schedule.length; i < expectedDays; i++) {
      const focusType = focusOptions[i % focusOptions.length];
      rawPlan.weekly_schedule.push({
        day: i + 1,
        day_name: dayNames[i],
        focus: focusType,
        workout_type: 'Strength Training',
        duration_minutes: 60,
        exercises: [
          {
            name: `${focusType} - Compound Movement`,
            sets: 3,
            reps: '8-12',
            rest_seconds: 90,
            instructions: 'Focus on proper form and controlled movement'
          },
          {
            name: `${focusType} - Isolation Exercise`,
            sets: 3,
            reps: '10-15',
            rest_seconds: 60,
            instructions: 'Target specific muscle groups'
          },
          {
            name: 'Core Work',
            sets: 3,
            reps: '10-15',
            rest_seconds: 45,
            instructions: 'Strengthen your core'
          }
        ]
      });
    }
  }

  // Calculate estimated time per session (average across days)
  const avgExercises = rawPlan.weekly_schedule.reduce((sum, day) => {
    // Handle both new format (exercises array) and old format (warm_up/main_workout/cool_down)
    if (day.exercises && Array.isArray(day.exercises)) {
      return sum + day.exercises.length;
    } else {
      // Old format - count exercises from warm_up, main_workout, cool_down
      const warmUpCount = day.warm_up?.length || 0;
      const mainWorkoutCount = day.main_workout?.length || 0;
      const coolDownCount = day.cool_down?.length || 0;
      return sum + warmUpCount + mainWorkoutCount + coolDownCount;
    }
  }, 0) / rawPlan.weekly_schedule.length;

  const estimatedTime = avgExercises <= 5 ? '45-60 min' :
                       avgExercises <= 7 ? '60-75 min' : '75-90 min';

  // Transform to app format
  const transformedPlan = {
    name: rawPlan.plan_name || `${fullName}'s ${primaryGoal.replace(/_/g, ' ')} Plan`,
    training_level: trainingLevel,
    primary_goal: primaryGoal,
    workout_frequency: workoutFrequency,
    mesocycle_length_weeks: 8,
    estimated_time_per_session: estimatedTime,
    goal_fat_loss: primaryGoal === 'fat_loss' ? 5 : 0,
    goal_muscle_gain: primaryGoal === 'muscle_gain' ? 5 : 0,
    status: 'active',
    is_active: true,
    source: 'ai_generated',
    weeklySchedule: rawPlan.weekly_schedule.map(day => {
      // Handle both new format (exercises array) and old format (warm_up, main_workout, cool_down)
      let exercises = [];
      
      // Check if this is a rest day
      const isRestDay = day.focus && day.focus.toLowerCase().includes('rest');
      
      if (isRestDay) {
        // Rest days have no exercises
        exercises = [];
      } else if (day.exercises && Array.isArray(day.exercises) && day.exercises.length > 0) {
        // New format - exercises array
        exercises = day.exercises.map(ex => ({
          name: ex.name,
          sets: Number(ex.sets) || 3,
          reps: String(ex.reps),
          rest: ex.rest || '90s',
          notes: ex.notes || '',
          category: determineExerciseCategory(ex.name),
          difficulty: trainingLevel
        }));
      } else if ((day.warm_up && day.warm_up.length > 0) || (day.main_workout && day.main_workout.length > 0) || (day.cool_down && day.cool_down.length > 0)) {
        // Old format - combine warm_up, main_workout, cool_down
        const allExercises = [
          ...(day.warm_up || []).map(ex => ({
            name: ex.exercise || ex.name,
            sets: Number(ex.sets) || 1,
            reps: String(ex.reps || ex.duration || "5 min"),
            rest: ex.rest_seconds || ex.rest || "30s",
            notes: ex.instructions || '',
            category: 'warm_up',
            difficulty: trainingLevel
          })),
          ...(day.main_workout || []).map(ex => ({
            name: ex.exercise || ex.name,
            sets: Number(ex.sets) || 3,
            reps: String(ex.reps || "8-12"),
            rest: ex.rest_seconds || ex.rest || "60s",
            notes: ex.instructions || '',
            category: 'main_workout',
            difficulty: trainingLevel
          })),
          ...(day.cool_down || []).map(ex => ({
            name: ex.exercise || ex.name,
            sets: Number(ex.sets) || 1,
            reps: String(ex.reps || ex.duration || "5 min"),
            rest: ex.rest_seconds || ex.rest || "30s",
            notes: ex.instructions || '',
            category: 'cool_down',
            difficulty: trainingLevel
          }))
        ];
        exercises = allExercises;
      } else {
        // No exercises found - this shouldn't happen for workout days, but if it does, create placeholder
        console.warn(`[AI WORKOUT] Day ${day.day_name} has no exercises, creating placeholder`);
        if (!isRestDay) {
          // Only add placeholder for non-rest days
          exercises = [
            {
              name: 'Placeholder Exercise',
              sets: 3,
              reps: '8-12',
              rest: '90s',
              notes: 'Replace with actual exercise',
              category: 'main_workout',
              difficulty: trainingLevel
            }
          ];
        }
      }
      
      return {
        day: day.day || day.day_name || 'Workout Day',
        focus: day.focus || day.day || day.day_name || 'Workout',
        exercises: exercises
      };
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Log the transformed plan for debugging
  console.log('[AI WORKOUT] 🔍 Transformed plan structure:');
  console.log('[AI WORKOUT] - Total days:', transformedPlan.weeklySchedule?.length || 0);
  console.log('[AI WORKOUT] - Days with exercises:', transformedPlan.weeklySchedule?.filter((d) => d.exercises?.length > 0).length || 0);
  transformedPlan.weeklySchedule?.forEach((day, idx) => {
    console.log(`[AI WORKOUT] - Day ${idx + 1} (${day.focus}): ${day.exercises?.length || 0} exercises`);
  });
  
  // CRITICAL VALIDATION: Ensure all non-rest days have exercises
  transformedPlan.weeklySchedule = transformedPlan.weeklySchedule.map((day, idx) => {
    const isRestDay = day.focus && day.focus.toLowerCase().includes('rest');
    
    if (!isRestDay && (!day.exercises || day.exercises.length === 0)) {
      console.warn(`[AI WORKOUT] ⚠️ Day ${idx + 1} (${day.focus}) has no exercises, adding placeholders`);
      return {
        ...day,
        exercises: [
          {
            name: `${day.focus} - Primary Compound`,
            sets: 4,
            reps: '8-12',
            rest: '90s',
            notes: 'Main strength movement',
            category: 'main_workout',
            difficulty: trainingLevel
          },
          {
            name: `${day.focus} - Secondary Movement`,
            sets: 3,
            reps: '10-15',
            rest: '60s',
            notes: 'Secondary strength focus',
            category: 'main_workout',
            difficulty: trainingLevel
          },
          {
            name: `${day.focus} - Accessory Work`,
            sets: 3,
            reps: '12-15',
            rest: '45s',
            notes: 'Accessory/isolation exercise',
            category: 'main_workout',
            difficulty: trainingLevel
          }
        ]
      };
    }
    return day;
  });
  
  console.log('[AI WORKOUT] ✅ Final validation complete - All non-rest days have exercises');
  
  return transformedPlan;
}

/**
 * Determine exercise category from name
 */
function determineExerciseCategory(exerciseName) {
  const name = exerciseName.toLowerCase();
  
  // Compound movements
  if (name.includes('bench press') || name.includes('squat') || 
      name.includes('deadlift') || name.includes('row') ||
      name.includes('pull-up') || name.includes('overhead press')) {
    return 'compound';
  }
  
  // Isolation movements
  if (name.includes('curl') || name.includes('extension') || 
      name.includes('fly') || name.includes('raise') ||
      name.includes('cable')) {
    return 'isolation';
  }
  
  // Cardio
  if (name.includes('run') || name.includes('bike') || 
      name.includes('jump') || name.includes('burpee')) {
    return 'cardio';
  }
  
  return 'compound'; // Default
}

module.exports = {
  composeEnhancedWorkoutPrompt,
  transformAIWorkoutResponse
};




