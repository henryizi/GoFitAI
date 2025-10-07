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
    '4_5': { min: 5, max: 5, display: '5 days' }, // Always use upper limit to match system expectation
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

  const prompt = `You are an elite professional fitness coach and workout programmer. Create a comprehensive, professional-quality workout plan that rivals the best programs used by competitive bodybuilders and athletes.

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

  // Calculate estimated time per session (average across days)
  const avgExercises = rawPlan.weekly_schedule.reduce((sum, day) => {
    return sum + (day.exercises?.length || 0);
  }, 0) / rawPlan.weekly_schedule.length;

  const estimatedTime = avgExercises <= 5 ? '45-60 min' :
                       avgExercises <= 7 ? '60-75 min' : '75-90 min';

  // Transform to app format
  return {
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
    weeklySchedule: rawPlan.weekly_schedule.map(day => ({
      day: day.day,
      focus: day.focus || day.day,
      exercises: (day.exercises || []).map(ex => ({
        name: ex.name,
        sets: Number(ex.sets) || 3,
        reps: String(ex.reps),
        rest: ex.rest || '90s',
        notes: ex.notes || '',
        category: determineExerciseCategory(ex.name),
        difficulty: trainingLevel
      }))
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
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



