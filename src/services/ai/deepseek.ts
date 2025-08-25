import { DEEPSEEK_API_KEY, DEEPSEEK_API_URL, DEEPSEEK_MODEL, AI_TIMEOUT_MS, AI_VERBOSE_LOGGING } from './config';
import { 
  SUPPORTED_EXERCISES, 
  getExerciseNamesForPrompt, 
  getExercisesByEquipment,
  isSupportedExercise,
  getExerciseInfo,
  ExerciseInfo 
} from '../../constants/exerciseNames';
import axios from 'axios';

interface WorkoutPlanInput {
  fullName?: string;    // Client's full name
  height: number;       // in cm
  weight: number;       // in kg
  age: number;
  gender: 'male' | 'female';
  fatLossGoal: number; // scale 1-5
  muscleGainGoal: number; // scale 1-5
  trainingLevel: 'beginner' | 'intermediate' | 'advanced';
  availableEquipment?: ('Dumbbell' | 'Barbell' | 'Kettlebell' | 'Resistance Band' | 'Cable Machine' | 'Plate')[];
  emulateBodybuilder?: string; // Optional parameter to emulate a famous bodybuilder's workout style
  
  // Enhanced onboarding data
  bodyFat?: number; // Body fat percentage
  weightTrend?: 'losing' | 'gaining' | 'stable' | 'unsure'; // Current weight trend
  exerciseFrequency?: '0' | '1-3' | '4-6' | '7+'; // Current exercise frequency
  activityLevel?: 'sedentary' | 'moderate' | 'very-active'; // Daily activity level
  bodyAnalysis?: {
    chest_rating?: number;
    arms_rating?: number;
    back_rating?: number;
    legs_rating?: number;
    waist_rating?: number;
    overall_rating?: number;
    strongest_body_part?: string;
    weakest_body_part?: string;
    ai_feedback?: string;
  };
}

// Interfaces are now more flexible to accept unpredictable AI responses
interface Exercise {
  name: string; // App expects 'name'
  exercise?: string; // AI is sending 'exercise'
  sets: number; // Can be number or string
  reps: string;  // Can be number or string
  rest?: string;
  restBetweenSets: string;
  duration?: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[]; // Use 'exercises'
  workout?: any; // To handle inconsistencies from the AI
  notes?: string;
  estimatedCaloriesBurned?: number; // New: estimated calories burned per day (kcal)
}

export interface WorkoutPlan {
  weeklySchedule: WorkoutDay[];
  recommendations: Record<string, string | string[]>;
  estimatedTimePerSession: string;
  splits?: any[];
}

export class DeepSeekService {
  private static API_URL = DEEPSEEK_API_URL;
  private static API_KEY = DEEPSEEK_API_KEY;
  private static MODEL = DEEPSEEK_MODEL;
  private static TIMEOUT_MS = AI_TIMEOUT_MS;
  private static VERBOSE = AI_VERBOSE_LOGGING;

  /**
   * Generates AI-powered real-time bodybuilder training instructions
   */
  private static async generateBodybuilderInstructions(bodybuilderKey: string): Promise<string> {
    try {
      const bodybuilderData = this.getBodybuilderData(bodybuilderKey);
      
      if (!bodybuilderData) {
        console.warn(`[DEEPSEEK] Unknown bodybuilder: ${bodybuilderKey}`);
        return '';
      }

      const prompt = `You are an expert in bodybuilding history and training methodologies. Generate authentic training instructions for ${bodybuilderData.name}'s workout methodology.

BODYBUILDER: ${bodybuilderData.name}
STYLE: ${bodybuilderData.style}
DESCRIPTION: ${bodybuilderData.description}

Generate a comprehensive training instruction that includes:

1. **TRAINING SPLIT**: The exact split this bodybuilder used (number of days, body part groupings)
2. **TRAINING PHILOSOPHY**: Their unique approach and mindset
3. **EXERCISE SELECTION**: Specific exercises they favored for each muscle group (provide 8-10 options per muscle group)
4. **VOLUME & INTENSITY**: Sets per muscle group, rep ranges, intensity techniques
5. **SIGNATURE TECHNIQUES**: Special methods they were known for
6. **PROGRESSION PRINCIPLES**: How they progressed over time

Make this AUTHENTIC and based on real training methodologies. Include specific exercise rotations to prevent adaptation.

Format as a detailed instruction block that starts with:
"CRITICAL: Create a workout plan that authentically emulates ${bodybuilderData.name}'s REAL training methodology with EXERCISE VARIETY:"

Return only the instruction text, no other commentary.`;

      const response = await axios.post(
        this.API_URL,
        {
          model: this.MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert fitness historian specializing in authentic bodybuilder training methodologies. Generate precise, historically accurate training instructions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: this.TIMEOUT_MS
        }
      );

      const instructions = response.data.choices[0]?.message?.content?.trim();
      
      if (this.VERBOSE) {
        console.log(`[DEEPSEEK] Generated instructions for ${bodybuilderData.name}:`, instructions?.substring(0, 200) + '...');
      }

      return instructions || '';
    } catch (error) {
      console.error(`[DEEPSEEK] Failed to generate instructions for ${bodybuilderKey}:`, error);
      return '';
    }
  }

  /**
   * Get bodybuilder data by key
   */
  private static getBodybuilderData(key: string): { name: string; style: string; description: string } | null {
    const bodybuilders: Record<string, { name: string; style: string; description: string }> = {
      'cbum': { 
        name: 'Chris Bumstead', 
        style: 'Classic Physique', 
        description: '6-day split, 12-15 sets per muscle group, focus on symmetry and classic aesthetics'
      },
      'arnold': { 
        name: 'Arnold Schwarzenegger', 
        style: 'Golden Era', 
        description: '6-day split, 15-20 sets per muscle group, supersets and giant sets'
      },
      'ronnie': { 
        name: 'Ronnie Coleman', 
        style: 'Mass Monster', 
        description: '5-day body part split, 12-15 sets per muscle group, heavy weights and basic movements'
      },
      'dorian': { 
        name: 'Dorian Yates', 
        style: 'HIT (High Intensity Training)', 
        description: '4-day split, 6-9 sets per muscle group, maximum intensity to absolute failure'
      },
      'jay': { 
        name: 'Jay Cutler', 
        style: 'Mass & Symmetry', 
        description: '5-day body part split, 15-20 sets per muscle group, FST-7 technique and weak point focus'
      },
      'phil': { 
        name: 'Phil Heath', 
        style: 'Precision Training', 
        description: '5-day split, 10-12 sets per muscle group, perfect form and muscle isolation focus'
      },
      'kai': { 
        name: 'Kai Greene', 
        style: 'Mind-Muscle Connection', 
        description: '5-day split, 15-20 sets per muscle group, extreme mind-muscle connection and tempo manipulation'
      },
      'franco': { 
        name: 'Franco Columbu', 
        style: 'Strength & Power', 
        description: '4-day split, 8-12 sets per muscle group, powerlifting influence and explosive training'
      },
      'frank': { 
        name: 'Frank Zane', 
        style: 'Aesthetic Perfection', 
        description: '3-day split repeated twice, 10-15 sets per muscle group, precision training for aesthetics'
      },
      'lee': { 
        name: 'Lee Haney', 
        style: 'Stimulate, Don\'t Annihilate', 
        description: '4-day split, 10-15 sets per muscle group, recovery focus and pre-exhaustion techniques'
      },
      'derek': {
        name: 'Derek Lunsford',
        style: 'Modern Open',
        description: '6-day split, 12-15 sets per muscle group, back width focus and conditioning emphasis'
      },
      'hadi': {
        name: 'Hadi Choopan',
        style: 'Modern Open',
        description: '5-day split, 12-15 sets per muscle group, high intensity and dense muscle focus'
      },
      'nick': {
        name: 'Nick Walker',
        style: 'Mass Monster',
        description: '6-day split, 12-15 sets per muscle group, extreme mass focus and heavy compound movements'
      },
      'platz': {
        name: 'Tom Platz',
        style: 'Golden Era Legs',
        description: '4-day split with leg emphasis, 15-20 sets for legs, legendary high-rep squats and leg specialization'
      },
      'flex': {
        name: 'Flex Wheeler',
        style: 'Aesthetic & Symmetrical',
        description: '5-day split, 12-15 sets per muscle group, focus on symmetry, aesthetics, and flexibility'
      },
      'sergio': {
        name: 'Sergio Oliva',
        style: 'The Myth',
        description: '4-day split, 10-15 sets per muscle group, unmatched genetics focus and V-taper development'
      }
    };

    return bodybuilders[key] || null;
  }

  /**
   * Enhanced exercise selection algorithm to ensure variety
   */
  private static selectVariedExercises(
    availableExercises: ExerciseInfo[],
    muscleGroups: string[],
    count: number,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    equipment: string[],
    excludeExercises: string[] = []
  ): ExerciseInfo[] {
    // Filter exercises by criteria
    let filteredExercises = availableExercises.filter(exercise => {
      const matchesMuscleGroup = exercise.muscleGroups.some(mg => 
        muscleGroups.some(targetMg => 
          targetMg.toLowerCase().includes(mg.toLowerCase()) || 
          mg.toLowerCase().includes(targetMg.toLowerCase())
        )
      );
      
      const matchesDifficulty = exercise.difficulty.toLowerCase() === difficulty;
      const matchesEquipment = !equipment.length || equipment.includes(exercise.equipment || 'Bodyweight');
      const notExcluded = !excludeExercises.includes(exercise.name);
      
      return matchesMuscleGroup && matchesDifficulty && matchesEquipment && notExcluded;
    });

    // If not enough exercises, relax some constraints
    if (filteredExercises.length < count) {
      filteredExercises = availableExercises.filter(exercise => {
        const matchesMuscleGroup = exercise.muscleGroups.some(mg => 
          muscleGroups.some(targetMg => 
            targetMg.toLowerCase().includes(mg.toLowerCase()) || 
            mg.toLowerCase().includes(targetMg.toLowerCase())
          )
        );
        
        const matchesEquipment = !equipment.length || equipment.includes(exercise.equipment || 'Bodyweight');
        const notExcluded = !excludeExercises.includes(exercise.name);
        
        return matchesMuscleGroup && matchesEquipment && notExcluded;
      });
    }

    // Ensure variety by selecting different exercise types
    const selected: ExerciseInfo[] = [];
    const usedCategories = new Set<string>();
    const usedEquipment = new Set<string>();

    // First pass: try to get one of each category and equipment type
    for (const exercise of filteredExercises) {
      if (selected.length >= count) break;
      
      const isNewCategory = !usedCategories.has(exercise.category);
      const isNewEquipment = !usedEquipment.has(exercise.equipment || 'Bodyweight');
      
      if (isNewCategory || isNewEquipment) {
        selected.push(exercise);
        usedCategories.add(exercise.category);
        usedEquipment.add(exercise.equipment || 'Bodyweight');
      }
    }

    // Second pass: fill remaining slots with any available exercises
    for (const exercise of filteredExercises) {
      if (selected.length >= count) break;
      if (!selected.find(e => e.name === exercise.name)) {
        selected.push(exercise);
      }
    }

    // Shuffle the selected exercises for more variety
    return selected.sort(() => Math.random() - 0.5);
  }

  /**
   * Generates a personalized workout plan based on user data and goals
   */
  static async generateWorkoutPlan(input: WorkoutPlanInput): Promise<WorkoutPlan> {
    try {
      if (this.VERBOSE || __DEV__) {
        console.log('[DeepSeekService] Generating workout plan with input:', input);
        console.log('[DeepSeekService] API Key available:', !!this.API_KEY);
      }

      // Get available exercises based on equipment
      let availableExercises = [...SUPPORTED_EXERCISES];
      if (input.availableEquipment) {
        availableExercises = [
          ...getExercisesByEquipment('Bodyweight'),
          ...input.availableEquipment.flatMap(equipment => getExercisesByEquipment(equipment))
        ];
      }
      
      const exerciseNames = availableExercises.map(ex => ex.name).join(", ");
      const equipmentList = input.availableEquipment ? 
        input.availableEquipment.join(", ") : 
        "all equipment";
      
      // Enhanced bodybuilder-specific instructions with exercise variety
      let bodybuilderInstructions = '';
      if (input.emulateBodybuilder) {
        // AI-generated real-time bodybuilder instructions
        bodybuilderInstructions = await this.generateBodybuilderInstructions(input.emulateBodybuilder);
        
        // Fallback to static instructions if AI generation fails
        if (!bodybuilderInstructions) {
        switch (input.emulateBodybuilder) {
          case 'dorian':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Dorian Yates's REAL HIT methodology with EXERCISE VARIETY:

              TRAINING SPLIT: 4-day split
              - Monday: Chest & Triceps
              - Tuesday: Back & Biceps
              - Wednesday: Rest
              - Thursday: Shoulders & Arms
              - Friday: Legs
              - Saturday: Rest
              - Sunday: Rest
              
              EXERCISE SELECTION (MUST VARY THESE EXERCISES EACH WEEK):

              - CHEST: Choose 3-4 from: Incline Barbell Press, Flat Dumbbell Press, Incline Flyes, Decline Press, Cable Flyes, Dips, Incline Dumbbell Press, Decline Dumbbell Press
              - BACK: Choose 3-4 from: Deadlifts, Barbell Rows, Lat Pulldowns, T-Bar Rows, Seated Rows, One-Arm Rows, Wide Grip Pull-ups, Close Grip Pull-ups
              - SHOULDERS: Choose 3-4 from: Military Press, Lateral Raises, Rear Delt Flyes, Front Raises, Arnold Press, Cable Lateral Raises, Upright Rows
              - ARMS: Choose 4-5 from: Barbell Curls, Preacher Curls, Hammer Curls, Tricep Extensions, Dips, Skull Crushers, Rope Pushdowns, Concentration Curls
              - LEGS: Choose 4-5 from: Squats, Leg Press, Leg Extensions, Leg Curls, Calf Raises, Hack Squats, Romanian Deadlifts, Walking Lunges
              
              TRAINING TECHNIQUES:
              - Volume: 6-9 sets per muscle group
              - Reps: 6-8 for compounds, 8-10 for isolations
              - 1-2 all-out working sets after warm-up
              - Training to absolute failure
              - Forced reps and negatives
              - 3-5 minute rest between exercises
              - HIT philosophy: maximum intensity
              - IMPORTANT: Rotate exercises every 2-3 weeks to prevent adaptation
            `;
            break;
          case 'jay':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Jay Cutler's REAL training methodology with EXERCISE VARIETY:

              TRAINING SPLIT: 5-day body part split
              - Monday: Chest
              - Tuesday: Back
              - Wednesday: Shoulders
              - Thursday: Arms
              - Friday: Legs
              - Saturday: Rest
              - Sunday: Rest
              
              EXERCISE SELECTION (MUST VARY THESE EXERCISES EACH WEEK):

              - CHEST: Choose 4-5 from: Flat Bench Press, Incline Press, Decline Press, Dumbbell Flyes, Cable Flyes, Dips, Incline Dumbbell Press, Decline Dumbbell Press, Cable Crossovers, Incline Flyes
              - BACK: Choose 4-5 from: Deadlifts, Barbell Rows, T-Bar Rows, Lat Pulldowns, Pull-ups, Seated Rows, One-Arm Rows, Wide Grip Lat Pulldown, Close Grip Lat Pulldown, Pendlay Rows
              - SHOULDERS: Choose 4-5 from: Military Press, Lateral Raises, Rear Delt Flyes, Upright Rows, Front Raises, Cable Lateral Raises, Arnold Press, Cable Rear Delt Flyes, Dumbbell Shoulder Press
              - ARMS: Choose 5-6 from: Barbell Curls, Hammer Curls, Preacher Curls, Tricep Extensions, Dips, Skull Crushers, Rope Pushdowns, Incline Dumbbell Curl, Concentration Curl, Overhead Dumbbell Extension
              - LEGS: Choose 5-6 from: Squats, Leg Press, Leg Extensions, Leg Curls, Calf Raises, Hack Squats, Lunges, Romanian Deadlifts, Walking Lunges, Goblet Squats
              
              TRAINING TECHNIQUES:
              - Volume: 15-20 sets per muscle group
              - Reps: 8-12 for compounds, 10-15 for isolations
              - FST-7 technique (7 sets with short rest)
              - Focus on weak points
              - Balanced development approach
              - High volume training
              - Progressive overload
              - IMPORTANT: Rotate exercises every 3-4 weeks to prevent adaptation
            `;
            break;
          case 'phil':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Phil Heath's REAL training methodology with EXERCISE VARIETY:

              TRAINING SPLIT: 5-day split
              - Monday: Chest & Triceps
              - Tuesday: Back & Biceps
              - Wednesday: Shoulders
              - Thursday: Legs
              - Friday: Arms
              - Saturday: Rest
              - Sunday: Rest
              
              EXERCISE SELECTION (MUST VARY THESE EXERCISES EACH WEEK):

              - CHEST: Choose 4-5 from: Incline Barbell Press, Flat Dumbbell Press, Incline Flyes, Cable Flyes, Dips, Decline Press, Cable Crossovers, Incline Dumbbell Press, Decline Dumbbell Press, Dumbbell Flyes
              - BACK: Choose 4-5 from: Deadlifts, Barbell Rows, Lat Pulldowns, T-Bar Rows, Pull-ups, Seated Rows, One-Arm Rows, Wide Grip Lat Pulldown, Close Grip Lat Pulldown, Pendlay Rows
              - SHOULDERS: Choose 4-5 from: Military Press, Lateral Raises, Rear Delt Flyes, Upright Rows, Front Raises, Cable Lateral Raises, Arnold Press, Cable Rear Delt Flyes, Dumbbell Shoulder Press
              - ARMS: Choose 5-6 from: Barbell Curls, Preacher Curls, Hammer Curls, Tricep Extensions, Dips, Skull Crushers, Rope Pushdowns, Incline Dumbbell Curl, Concentration Curl, Overhead Dumbbell Extension
              - LEGS: Choose 5-6 from: Squats, Leg Press, Leg Extensions, Leg Curls, Calf Raises, Hack Squats, Lunges, Romanian Deadlifts, Walking Lunges, Goblet Squats
              
              TRAINING TECHNIQUES:
              - Volume: 10-12 sets per muscle group
              - Reps: 8-12 for compounds, 10-15 for isolations
              - Perfect form on every rep
              - Drop sets and rest-pause
              - Muscle isolation focus
              - Multiple angles for muscle detail
              - Precision training approach
              - IMPORTANT: Rotate exercises every 3-4 weeks to prevent adaptation
            `;
            break;
          case 'arnold':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Arnold Schwarzenegger's REAL training methodology with EXERCISE VARIETY:

              TRAINING SPLIT: 6-day split (double split)
              - Monday AM: Chest, PM: Back
              - Tuesday AM: Shoulders, PM: Arms
              - Wednesday AM: Legs, PM: Core
              - Thursday AM: Chest, PM: Back
              - Friday AM: Shoulders, PM: Arms
              - Saturday AM: Legs, PM: Core
              - Sunday: Rest
              
              EXERCISE SELECTION (MUST VARY THESE EXERCISES EACH WEEK):

              - CHEST: Choose 4-5 from: Bench Press, Incline Press, Decline Press, Dumbbell Press, Dumbbell Flyes, Cable Flyes, Dips, Incline Dumbbell Press, Decline Dumbbell Press, Cable Crossovers
              - BACK: Choose 4-5 from: Deadlifts, Barbell Rows, Lat Pulldowns, Pull-ups, Seated Rows, One-Arm Rows, T-Bar Rows, Wide Grip Lat Pulldown, Close Grip Lat Pulldown, Pendlay Rows
              - SHOULDERS: Choose 4-5 from: Military Press, Lateral Raises, Rear Delt Flyes, Front Raises, Arnold Press, Cable Lateral Raises, Upright Rows, Cable Rear Delt Flyes, Dumbbell Shoulder Press
              - ARMS: Choose 5-6 from: Barbell Curls, Preacher Curls, Hammer Curls, Tricep Extensions, Dips, Skull Crushers, Rope Pushdowns, Incline Dumbbell Curl, Concentration Curl, Overhead Dumbbell Extension
              - LEGS: Choose 5-6 from: Squats, Leg Press, Leg Extensions, Leg Curls, Calf Raises, Hack Squats, Lunges, Romanian Deadlifts, Walking Lunges, Goblet Squats
              - CORE: Choose 3-4 from: Plank, Side Plank, Crunch, Sit Up, Leg Raise, Russian Twist, Cable Crunch, Cable Woodchop
              
              TRAINING TECHNIQUES:
              - Volume: 20-25 sets per muscle group
              - Reps: 8-12 for compounds, 10-15 for isolations
              - High intensity training
              - Supersets and giant sets
              - Multiple angles for muscle detail
              - Progressive overload
              - IMPORTANT: Rotate exercises every 2-3 weeks to prevent adaptation
            `;
            break;
          case 'ronnie':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Ronnie Coleman's REAL training methodology with EXERCISE VARIETY:

              TRAINING SPLIT: 6-day split
              - Monday: Chest & Triceps
              - Tuesday: Back & Biceps
              - Wednesday: Shoulders & Traps
              - Thursday: Legs
              - Friday: Arms
              - Saturday: Core & Cardio
              - Sunday: Rest
              
              EXERCISE SELECTION (MUST VARY THESE EXERCISES EACH WEEK):

              - CHEST: Choose 4-5 from: Bench Press, Incline Press, Decline Press, Dumbbell Press, Dumbbell Flyes, Cable Flyes, Dips, Incline Dumbbell Press, Decline Dumbbell Press, Cable Crossovers
              - BACK: Choose 4-5 from: Deadlifts, Barbell Rows, Lat Pulldowns, Pull-ups, Seated Rows, One-Arm Rows, T-Bar Rows, Wide Grip Lat Pulldown, Close Grip Lat Pulldown, Pendlay Rows
              - SHOULDERS: Choose 4-5 from: Military Press, Lateral Raises, Rear Delt Flyes, Front Raises, Arnold Press, Cable Lateral Raises, Upright Rows, Cable Rear Delt Flyes, Dumbbell Shoulder Press
              - ARMS: Choose 5-6 from: Barbell Curls, Preacher Curls, Hammer Curls, Tricep Extensions, Dips, Skull Crushers, Rope Pushdowns, Incline Dumbbell Curl, Concentration Curl, Overhead Dumbbell Extension
              - LEGS: Choose 5-6 from: Squats, Leg Press, Leg Extensions, Leg Curls, Calf Raises, Hack Squats, Lunges, Romanian Deadlifts, Walking Lunges, Goblet Squats
              - TRAPS: Choose 2-3 from: Barbell Shrug, Dumbbell Shrug, Cable Shrug, Upright Row
              
              TRAINING TECHNIQUES:
              - Volume: 15-20 sets per muscle group
              - Reps: 8-12 for compounds, 10-15 for isolations
              - Heavy compound movements
              - Progressive overload
              - Multiple angles for muscle detail
              - High intensity training
              - IMPORTANT: Rotate exercises every 3-4 weeks to prevent adaptation
            `;
            break;
          case 'cbum':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Chris Bumstead's REAL training methodology with EXERCISE VARIETY:

              TRAINING SPLIT: 6-day split (Classic Physique focus)
              - Monday: Chest & Triceps
              - Tuesday: Back & Biceps
              - Wednesday: Shoulders & Traps
              - Thursday: Legs
              - Friday: Arms
              - Saturday: Core & Cardio
              - Sunday: Rest
              
              EXERCISE SELECTION (MUST VARY THESE EXERCISES EACH WEEK):

              - CHEST: Choose 4-5 from: Bench Press, Incline Press, Decline Press, Dumbbell Press, Dumbbell Flyes, Cable Flyes, Dips, Incline Dumbbell Press, Decline Dumbbell Press, Cable Crossovers
              - BACK: Choose 4-5 from: Deadlifts, Barbell Rows, Lat Pulldowns, Pull-ups, Seated Rows, One-Arm Rows, T-Bar Rows, Wide Grip Lat Pulldown, Close Grip Lat Pulldown, Pendlay Rows
              - SHOULDERS: Choose 4-5 from: Military Press, Lateral Raises, Rear Delt Flyes, Front Raises, Arnold Press, Cable Lateral Raises, Upright Rows, Cable Rear Delt Flyes, Dumbbell Shoulder Press
              - ARMS: Choose 5-6 from: Barbell Curls, Preacher Curls, Hammer Curls, Tricep Extensions, Dips, Skull Crushers, Rope Pushdowns, Incline Dumbbell Curl, Concentration Curl, Overhead Dumbbell Extension
              - LEGS: Choose 5-6 from: Squats, Leg Press, Leg Extensions, Leg Curls, Calf Raises, Hack Squats, Lunges, Romanian Deadlifts, Walking Lunges, Goblet Squats
              - TRAPS: Choose 2-3 from: Barbell Shrug, Dumbbell Shrug, Cable Shrug, Upright Row
              
              TRAINING TECHNIQUES:
              - Volume: 12-15 sets per muscle group
              - Reps: 8-12 for compounds, 10-15 for isolations
              - Classic physique proportions
              - Symmetry focus
              - Multiple angles for muscle detail
              - Progressive overload
              - IMPORTANT: Rotate exercises every 3-4 weeks to prevent adaptation
            `;
            break;
          }
        }
      }
      
      // Build comprehensive user profile for AI
      const userProfile = `
        PHYSICAL PROFILE:
        - Height: ${input.height} cm, Weight: ${input.weight} kg, Age: ${input.age}, Gender: ${input.gender}
        - Body Fat: ${input.bodyFat ? `${input.bodyFat}%` : 'Not specified'}
        - Current Weight Trend: ${input.weightTrend || 'Not specified'}
        - Daily Activity Level: ${input.activityLevel || 'Not specified'}
        - Current Exercise Frequency: ${input.exerciseFrequency || 'Not specified'}

        FITNESS GOALS & LEVEL:
        - Training Level: ${input.trainingLevel}
        - Fat Loss Goal Priority: ${input.fatLossGoal}/5
        - Muscle Gain Goal Priority: ${input.muscleGainGoal}/5
        - Available Equipment: ${equipmentList}

        BODY ANALYSIS (if available):
        ${input.bodyAnalysis ? `
        - Overall Rating: ${input.bodyAnalysis.overall_rating || 'N/A'}/10
        - Strongest Body Part: ${input.bodyAnalysis.strongest_body_part || 'N/A'}
        - Weakest Body Part: ${input.bodyAnalysis.weakest_body_part || 'N/A'}
        - Body Part Ratings: Chest ${input.bodyAnalysis.chest_rating || 'N/A'}/10, Arms ${input.bodyAnalysis.arms_rating || 'N/A'}/10, Back ${input.bodyAnalysis.back_rating || 'N/A'}/10, Legs ${input.bodyAnalysis.legs_rating || 'N/A'}/10, Waist ${input.bodyAnalysis.waist_rating || 'N/A'}/10
        - AI Feedback: ${input.bodyAnalysis.ai_feedback || 'N/A'}
        ` : 'No body analysis data available'}
      `;

      // Enhanced prompt with exercise variety instructions
      const prompt = `
You are an expert fitness coach creating personalized workout plans. Your client has the following profile:

        CLIENT PROFILE:
- Name: ${input.fullName || 'Client'}
- Age: ${input.age} years old
- Gender: ${input.gender}
- Height: ${input.height} cm
- Weight: ${input.weight} kg
- Training Level: ${input.trainingLevel}
- Fat Loss Goal: ${input.fatLossGoal}/5
- Muscle Gain Goal: ${input.muscleGainGoal}/5
- Available Equipment: ${equipmentList}
- Exercise Frequency: ${input.exerciseFrequency || '4-6'} days per week

${bodybuilderInstructions}

CRITICAL EXERCISE VARIETY REQUIREMENTS:
1. NEVER repeat the same exercises in consecutive workouts
2. Use different exercise variations for the same muscle group
3. Rotate between compound and isolation exercises
4. Vary equipment types (barbell, dumbbell, cable, bodyweight)
5. Include different angles and grips for muscle groups
6. Use progressive exercise selection (start with basics, progress to advanced)

AVAILABLE EXERCISES (${availableExercises.length} total):
${exerciseNames}

EXERCISE SELECTION RULES:
- Choose exercises appropriate for ${input.trainingLevel} level
- Ensure variety in exercise types and equipment
- Include both compound and isolation movements
- Consider the client's available equipment: ${equipmentList}
- Rotate exercises to prevent adaptation and boredom

Create a comprehensive weekly workout plan with:
1. 7-day schedule with appropriate rest days
2. 4-6 exercises per workout day
3. Sets, reps, and rest periods for each exercise
4. Estimated time per session
5. Progressive overload principles

Return ONLY a valid JSON object with this structure:
        {
          "weeklySchedule": [
            {
              "day": "Monday",
      "focus": "Chest and Triceps",
              "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": "8-10", "restBetweenSets": "90s" },
        { "name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "restBetweenSets": "60s" },
        { "name": "Cable Flyes", "sets": 3, "reps": "12-15", "restBetweenSets": "60s" },
        { "name": "Tricep Pushdown", "sets": 3, "reps": "12-15", "restBetweenSets": "60s" },
        { "name": "Overhead Dumbbell Extension", "sets": 3, "reps": "10-12", "restBetweenSets": "60s" }
      ]
    }
  ],
          "estimatedTimePerSession": "60 minutes"
        }

IMPORTANT: Ensure maximum exercise variety and avoid repetition across workouts.
      `;

      if (!this.API_KEY) {
        console.error('[DeepSeekService] API key is missing. Please set EXPO_PUBLIC_DEEPSEEK_API_KEY in your .env file.');
        throw new Error('DeepSeek API key is missing. Please set EXPO_PUBLIC_DEEPSEEK_API_KEY in your .env file.');
      }

      const headers = {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
      };

      const body = {
          model: this.MODEL,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
      } as const;

      if (this.VERBOSE || __DEV__) {
        console.log('[DeepSeekService] Sending request to API via Axios...');
        console.log('[DeepSeekService] API URL:', this.API_URL);
        console.log('[DeepSeekService] Model:', this.MODEL);
        console.log('[DeepSeekService] Timeout (ms):', this.TIMEOUT_MS);
      }
      
      // Simple retry-on-timeout: first with configured timeout, then with doubled timeout
      const attempts: number[] = [this.TIMEOUT_MS, this.TIMEOUT_MS * 2];
      let lastErr: unknown = null;
      for (let idx = 0; idx < attempts.length; idx++) {
        const timeout = attempts[idx];
        try {
          const response = await axios.post(this.API_URL, body, { headers, timeout });
          if (this.VERBOSE || __DEV__) console.log('[DeepSeekService] API response status:', response.status);

          let responseContent = response.data.choices[0].message.content as string;
          if (this.VERBOSE || __DEV__) console.log('[DeepSeekService] Raw response content length:', responseContent?.length ?? 0);

          // Clean the response content (models often wrap JSON in markdown)
          if (responseContent.startsWith('```json')) {
            responseContent = responseContent.substring(7, responseContent.length - 3).trim();
          } else if (responseContent.startsWith('```')) {
            responseContent = responseContent.substring(3, responseContent.length - 3).trim();
          }

          const workoutPlan: WorkoutPlan = JSON.parse(responseContent);
          if (this.VERBOSE || __DEV__) console.log('[DeepSeekService] Raw parsed workout plan keys:', Object.keys(workoutPlan || {}));

          // 1. Normalize the plan first to create a consistent structure.
          const normalizedPlan = this.normalizeWorkoutPlan(workoutPlan);
          if (this.VERBOSE || __DEV__) console.log('[DeepSeekService] Normalized workout plan summary:', {
            days: normalizedPlan?.weeklySchedule?.length || 0,
            recKeys: Object.keys(normalizedPlan?.recommendations || {}),
          });

          // 2. Validate the clean, normalized plan.
          if (!this.validateWorkoutPlan(normalizedPlan)) {
            console.error('[DeepSeekService] Invalid workout plan structure AFTER normalization:', normalizedPlan);
            throw new Error('Invalid workout plan structure received from API');
          }

          return normalizedPlan;
        } catch (axiosError: any) {
          lastErr = axiosError;
          if (axios.isAxiosError(axiosError)) {
            const isTimeout = axiosError?.code === 'ECONNABORTED' || (axiosError?.message || '').toLowerCase().includes('timeout');
            console.warn(`[DeepSeekService] Attempt ${idx + 1} failed${isTimeout ? ' (timeout)' : ''}.`);
            if (isTimeout && idx < attempts.length - 1) {
              console.warn('[DeepSeekService] Retrying with extended timeout...');
              continue;
            }
            console.error('[DeepSeekService] Axios error response:', axiosError.response?.data);
            console.error('[DeepSeekService] Axios error status:', axiosError.response?.status);
          } else {
            console.error('[DeepSeekService] Non-Axios error:', axiosError);
          }
          break;
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error('DeepSeek API request failed');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[DeepSeekService] Axios API request failed:', error.response?.status, error.response?.data);
        throw new Error(`DeepSeek API error: ${error.response?.data?.error?.message || error.message}`);
      }
      console.error('[DeepSeekService] Error generating workout plan:', error);
      throw error;
    }
  }

  /**
   * Aggressively normalizes the AI's workout plan into a consistent structure.
   */
  private static normalizeWorkoutPlan(plan: WorkoutPlan): WorkoutPlan {
    // Ensure weeklySchedule is an array
    if (!Array.isArray(plan.weeklySchedule)) {
        plan.weeklySchedule = [];
    }

    plan.weeklySchedule.forEach(day => {
      // Unify the key for the exercises array ('workout' -> 'exercises')
      if (day.workout && !day.exercises) {
        day.exercises = day.workout;
        delete day.workout;
      }
      // Ensure exercises is an array
      if (!Array.isArray(day.exercises)) {
        day.exercises = [];
      }

      // Normalize estimated calories if provided
      if ((day as any).estimatedCaloriesBurned !== undefined && (day as any).estimatedCaloriesBurned !== null) {
        (day as any).estimatedCaloriesBurned = parseInt(String((day as any).estimatedCaloriesBurned), 10) || 0;
      }

      day.exercises.forEach(exercise => {
        // Unify the key for the exercise name ('exercise' -> 'name')
        if (exercise.exercise && !exercise.name) {
          exercise.name = exercise.exercise;
          delete exercise.exercise;
        }

        // Coerce 'sets' to a number
        exercise.sets = parseInt(String(exercise.sets), 10) || 3;
        // Coerce 'reps' to a string
        exercise.reps = String(exercise.reps);
        // Unify rest period key ('rest' -> 'restBetweenSets')
        if (exercise.rest && !exercise.restBetweenSets) {
          exercise.restBetweenSets = exercise.rest;
          delete exercise.rest;
        }
      });
    });

    // Ensure recommendations object exists
    if (typeof plan.recommendations !== 'object' || plan.recommendations === null) {
      plan.recommendations = {};
    }
    
    // Ensure all recommendation values are arrays of strings
    const requiredRecs = ['nutrition', 'rest', 'progression', 'hydration', 'recovery', 'cardio', 'sleep'];
    for (const key of requiredRecs) {
      if (typeof (plan as any).recommendations[key] === 'string') {
        (plan as any).recommendations[key] = [(plan as any).recommendations[key] as unknown as string];
      } else if (!(plan as any).recommendations[key]) {
        (plan as any).recommendations[key] = [];
      }
    }

    return plan;
  }

  /**
   * Validates the structure of a NORMALIZED workout plan.
   */
  private static validateWorkoutPlan(plan: any): plan is WorkoutPlan {
    if (!plan || typeof plan !== 'object') return false;
    if (!Array.isArray(plan.weeklySchedule)) return false;
    if (!plan.recommendations || typeof plan.recommendations !== 'object') return false;
    if (typeof plan.estimatedTimePerSession !== 'string') return false;

    for (const day of plan.weeklySchedule) {
      // After normalization, 'exercises' must be a valid array.
      if (!day.day || !Array.isArray(day.exercises)) {
        console.error(`[Validate] Invalid day structure after normalization: ${JSON.stringify(day)}`);
        return false;
      }
      for (const exercise of day.exercises) {
        // After normalization, types should be correct and 'name' must exist.
        if (
            typeof exercise.name !== 'string' || // MUST be 'name' now
            typeof exercise.sets !== 'number' ||
            typeof exercise.reps !== 'string'
        ) {
          console.error(`[Validate] Invalid exercise structure after normalization: ${JSON.stringify(exercise)}`);
          return false;
        }
      }
    }
    return true;
  }
} 