import { DEEPSEEK_API_KEY, DEEPSEEK_API_URL, DEEPSEEK_MODEL, AI_TIMEOUT_MS, AI_VERBOSE_LOGGING } from './config';
import { 
  SUPPORTED_EXERCISES, 
  getExerciseNamesForPrompt, 
  getExercisesByEquipment,
  isSupportedExercise,
  getExerciseInfo,
  ExerciseInfo 
} from '../../constants/exerciseNames';
import { bodybuilderWorkouts, BodybuilderWorkout } from '../../data/bodybuilder-workouts';
import { WorkoutPlan as AppWorkoutPlan, WorkoutDay as AppWorkoutDay, ExerciseItem } from '../../types/chat';
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
  exerciseFrequency?: '1' | '2-3' | '4-5' | '6-7'; // Current exercise frequency
  workoutFrequency?: '2_3' | '4_5' | '6'; // Preferred workout frequency per week
  activityLevel?: 'sedentary' | 'moderately_active' | 'very_active'; // Daily activity level
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

  static {
    // Debug configuration on class load
    if (this.VERBOSE) {
      console.log('[DeepSeekService] Configuration loaded:', {
        apiUrl: this.API_URL,
        model: this.MODEL,
        hasApiKey: !!this.API_KEY,
        timeout: this.TIMEOUT_MS
      });
    }
  }

  /**
   * Converts static bodybuilder workout template to AppWorkoutPlan format
   */
  private static convertBodybuilderWorkoutToAppWorkoutPlan(
    bodybuilderWorkout: BodybuilderWorkout,
    input: WorkoutPlanInput
  ): AppWorkoutPlan {
    // Convert bodybuilder exercises to app format
    const weeklySchedule: AppWorkoutDay[] = bodybuilderWorkout.weeklySchedule.map(day => ({
      day: day.day,
      focus: day.bodyParts.join(' + '), // Convert bodyParts array to focus string
      exercises: day.exercises.map(exercise => ({
        name: exercise.name,
        sets: typeof exercise.sets === 'string' ?
          (exercise.sets.includes('-') ? parseInt(exercise.sets.split('-')[1]) : parseInt(exercise.sets)) :
          exercise.sets,
        reps: exercise.reps,
        restBetweenSets: exercise.restTime || '60-90 seconds'
      } as ExerciseItem))
    }));

    // Filter out rest days and abs-only days from main schedule
    let mainWorkoutDays = weeklySchedule.filter(day =>
      !day.day.toLowerCase().includes('rest') &&
      !day.focus.toLowerCase().includes('abs only')
    );

    // ADAPT FOR USER'S WORKOUT FREQUENCY PREFERENCE
    if (input.workoutFrequency && input.workoutFrequency !== '6') {
      const targetFrequency = input.workoutFrequency === '2_3' ? 2.5 : input.workoutFrequency === '4_5' ? 4.5 : parseInt(input.workoutFrequency);
      const currentTrainingDays = mainWorkoutDays.length;

      console.log(`[DEEPSEEK] Adapting ${bodybuilderWorkout.name} from ${currentTrainingDays} days to ${targetFrequency} days (user preference)`);

      if (targetFrequency < currentTrainingDays) {
        // Need to reduce training days - select the most important ones
        if (targetFrequency <= 3) {
          // For 2-3 days: Prioritize compound movements and major muscle groups
          const priorityOrder = [
            'chest', 'back', 'legs', 'shoulders', 'arms',
            'chest and back', 'upper body', 'lower body', 'full body'
          ];

          mainWorkoutDays = mainWorkoutDays
            .sort((a, b) => {
              const aPriority = priorityOrder.findIndex(p =>
                a.focus.toLowerCase().includes(p)
              );
              const bPriority = priorityOrder.findIndex(p =>
                b.focus.toLowerCase().includes(p)
              );
              return (aPriority === -1 ? 999 : aPriority) - (bPriority === -1 ? 999 : bPriority);
            })
            .slice(0, Math.floor(targetFrequency));
        } else {
          // For 4-5 days: Keep most days but combine some sessions
          mainWorkoutDays = mainWorkoutDays.slice(0, Math.floor(targetFrequency));
        }
      } else if (targetFrequency > currentTrainingDays) {
        // Need to add training days - this is less common but could happen
        console.log(`[DEEPSEEK] User requested more days (${targetFrequency}) than template has (${currentTrainingDays}). Keeping all available days.`);
      }

      console.log(`[DEEPSEEK] ✅ Adapted schedule: ${mainWorkoutDays.length} training days`);
    }

    return {
      name: `${bodybuilderWorkout.name}'s Training Plan (Adapted for ${input.workoutFrequency ? input.workoutFrequency.replace('_', '-') : '6'} days/week)`,
      training_level: input.trainingLevel as 'beginner' | 'intermediate' | 'advanced',
      goal_fat_loss: input.fatLossGoal,
      goal_muscle_gain: input.muscleGainGoal,
      mesocycle_length_weeks: 8, // Standard 8-week cycle
      weeklySchedule: mainWorkoutDays
    };
  }

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
  static async generateWorkoutPlan(input: WorkoutPlanInput): Promise<AppWorkoutPlan> {
    try {
      if (this.VERBOSE || __DEV__) {
        console.log('[DeepSeekService] Generating workout plan with input:', input);
        console.log('[DeepSeekService] API Key available:', !!this.API_KEY);
      }

      // Check for static bodybuilder workout templates first
      if (input.emulateBodybuilder) {
        const bodybuilderKey = input.emulateBodybuilder.toLowerCase().replace(/\s+/g, '-');
        const staticWorkout = bodybuilderWorkouts[bodybuilderKey];
        
        if (staticWorkout) {
          console.log(`[DeepSeekService] ✅ Using STATIC template for ${input.emulateBodybuilder}`);
          return this.convertBodybuilderWorkoutToAppWorkoutPlan(staticWorkout, input);
        } else {
          console.log(`[DeepSeekService] ⚠️ No static template found for ${input.emulateBodybuilder}, falling back to AI generation`);
        }
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
        console.log(`[DEEPSEEK] Attempting AI generation for bodybuilder: ${input.emulateBodybuilder}`);
        
        // AI-generated real-time bodybuilder instructions
        bodybuilderInstructions = await this.generateBodybuilderInstructions(input.emulateBodybuilder);
        
        if (bodybuilderInstructions) {
          console.log(`[DEEPSEEK] ✅ AI generation SUCCESS for ${input.emulateBodybuilder} (${bodybuilderInstructions.length} chars)`);
        } else {
          console.log(`[DEEPSEEK] ❌ AI generation FAILED for ${input.emulateBodybuilder}, using static fallback`);
        }
        
        // Fallback to static instructions if AI generation fails
        if (!bodybuilderInstructions) {
        switch (input.emulateBodybuilder) {
          case 'dorian':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Dorian Yates's REAL HIT (High Intensity Training) methodology:

              TRAINING SPLIT: 4-day HIT split (Dorian's actual split)
              - Monday: Shoulders, Triceps, Abs
              - Tuesday: Back, Rear Delts, Traps  
              - Wednesday: REST
              - Thursday: Chest, Biceps, Abs
              - Friday: Legs (Quads, Hams, Calves)
              - Saturday: REST
              - Sunday: REST
              
              AUTHENTIC DORIAN YATES METHODOLOGY:
              - ONLY 1-2 ALL-OUT WORKING SETS per exercise (after warm-ups)
              - Train to ABSOLUTE FAILURE on every working set
              - Use forced reps, negatives, and rest-pause techniques
              - 4-7 days rest between training same muscle group
              - Maximum intensity, minimum volume
              - Focus on basic compound movements
              - NO supersets or circuits - single exercises only
              
              EXERCISE SELECTION (Dorian's favorites):
              - CHEST: Incline Barbell Press, Flat Dumbbell Press, Dips
              - BACK: Deadlifts, Reverse-Grip Pulldowns, Machine Rows, Hammer Strength
              - SHOULDERS: Machine Shoulder Press, One-Arm Lateral Raises
              - LEGS: Leg Press (Dorian rarely squatted), Leg Extensions, Leg Curls, Calf Press
              - ARMS: Barbell Curls, Hammer Curls, Close-Grip Bench, Tricep Dips
              
              TRAINING PARAMETERS:
              - Working sets: 1-2 per exercise maximum
              - Reps: 6-10 for compounds, 8-15 for isolations  
              - Rest: 2-4 minutes between exercises
              - Workout duration: 30-45 minutes maximum
              - Failure point: Cannot complete another rep with good form
            `;
            break;
          case 'jay':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Jay Cutler's REAL FST-7 methodology with Hany Rambod:

              TRAINING SPLIT: 5-day body part split (Jay's actual split)
              - Monday: Chest
              - Tuesday: Back
              - Wednesday: Shoulders
              - Thursday: Arms (Biceps & Triceps)
              - Friday: Legs
              - Saturday: Rest
              - Sunday: Rest
              
              AUTHENTIC JAY CUTLER FST-7 METHODOLOGY:
              - FST-7 (Fascia Stretch Training): 7 sets of 15 reps with 30-45 second rest
              - Apply FST-7 to final exercise of each body part
              - High volume: 18-25 total sets per body part
              - Focus on weak point training and symmetry
              - Heavy compound movements followed by isolation work
              - Train each muscle from multiple angles
              
              EXERCISE SELECTION (Jay's actual preferences):
              - CHEST: Incline Barbell Press, Flat Dumbbell Press, Decline Smith Machine, Cable Flyes (FST-7)
              - BACK: T-Bar Rows, Wide-Grip Pulldowns, Barbell Rows, Cable Rows (FST-7)
              - SHOULDERS: Smith Machine Press, Dumbbell Laterals, Rear Delt Machine, Cable Laterals (FST-7)  
              - ARMS: Barbell Curls, Hammer Curls, Cable Curls (FST-7), Close-Grip Bench, Dips, Overhead Extensions
              - LEGS: Leg Press, Squats, Leg Extensions (FST-7), Leg Curls, Romanian Deads, Calf Raises (FST-7)
              
              TRAINING PARAMETERS:
              - Standard sets: 4-5 sets of 8-12 reps
              - FST-7 sets: 7 sets of 15 reps, 30-45 sec rest
              - Heavy weight on compounds, moderate on FST-7
              - Rest: 90-120 seconds between standard sets
              - Workout duration: 60-75 minutes
              - Focus on mind-muscle connection and pump
            `;
            break;
          case 'phil':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Phil Heath's REAL precision training methodology:

              TRAINING SPLIT: 5-day precision split (Phil's actual approach)
              - Monday: Chest & Triceps
              - Tuesday: Back & Biceps
              - Wednesday: Shoulders
              - Thursday: Legs (Quads focus)
              - Friday: Legs (Hams/Glutes focus)
              - Saturday: Rest
              - Sunday: Rest
              
              AUTHENTIC PHIL HEATH METHODOLOGY:
              - "Precision training" - perfect form and muscle isolation
              - Multiple angles to hit every muscle fiber
              - Drop sets and rest-pause techniques
              - Focus on muscle detail and conditioning
              - Higher rep ranges for muscle maturity
              - Time under tension emphasis
              - Mind-muscle connection paramount
              
              EXERCISE SELECTION (Phil's signature moves):
              - CHEST: Incline Dumbbell Press, Cable Flyes, Machine Press, Dips for detail
              - BACK: Wide-Grip Pulldowns, Cable Rows, Machine Rows, Single-Arm work
              - SHOULDERS: Dumbbell Press, Cable Laterals, Rear Delt Machine, Partials
              - TRICEPS: Rope Pushdowns, Overhead Extensions, Close-Grip variations
              - BICEPS: Cable Curls, Hammer Curls, Preacher variations, Peak contractions
              - LEGS: Leg Press variations, Extensions, Curls, Single-leg work
              
              TRAINING PARAMETERS:
              - Volume: 16-20 sets per body part
              - Reps: 10-15 for compounds, 12-20 for isolations
              - Drop sets: 2-3 per workout
              - Rest-pause: On final set of isolation exercises
              - Rest: 60-90 seconds between sets
              - Workout duration: 75-90 minutes
              - Focus: Quality over quantity, perfect execution
            `;
            break;
          case 'arnold':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Arnold Schwarzenegger's REAL Golden Era methodology:

              TRAINING SPLIT: 6-day double split (Arnold's actual split)
              - Day 1: Chest & Back (AM/PM or combined)
              - Day 2: Shoulders & Arms  
              - Day 3: Legs & Lower Back
              - Day 4: Chest & Back
              - Day 5: Shoulders & Arms
              - Day 6: Legs & Lower Back
              - Day 7: Rest
              
              AUTHENTIC ARNOLD METHODOLOGY:
              - Train antagonistic muscles together (chest/back, biceps/triceps)
              - Very high volume: 20-30 sets per body part
              - Supersets between opposing muscle groups
              - "Pump" philosophy - chase the feeling
              - Basic compound movements with barbells/dumbbells
              - Train each body part twice per week
              - 60-75 minute sessions
              
              EXERCISE SELECTION (Arnold's favorites):
              - CHEST: Bench Press, Incline Barbell Press, Dumbbell Flyes, Dips, Pullovers
              - BACK: Wide-Grip Chins, T-Bar Rows, Bent Barbell Rows, Lat Machine
              - SHOULDERS: Behind-Neck Press, Lateral Raises, Bent Laterals, Front Raises
              - BICEPS: Barbell Curls, Dumbbell Curls, Concentration Curls, Preacher Curls
              - TRICEPS: Close-Grip Bench, French Press, Tricep Dips, Overhead Extensions
              - LEGS: Squats, Front Squats, Leg Curls, Leg Extensions, Calf Raises
              
              TRAINING PARAMETERS:
              - Volume: 20-30 sets per body part
              - Reps: 8-12 for mass, 6-10 for strength
              - Supersets: Chest/Back, Biceps/Triceps
              - Rest: 60-90 seconds between exercises
              - Workout duration: 60-75 minutes
              - Philosophy: "Go for the pump" and train with passion
            `;
            break;
          case 'ronnie':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Ronnie Coleman's REAL powerlifting-bodybuilding methodology:

              TRAINING SPLIT: 6-day powerlifting split (Ronnie's actual split)
              - Monday: Back & Rear Delts
              - Tuesday: Quads & Calves
              - Wednesday: Chest & Triceps
              - Thursday: Biceps & Hamstrings  
              - Friday: Shoulders & Traps
              - Saturday: Legs (light) or Rest
              - Sunday: Rest
              
              AUTHENTIC RONNIE COLEMAN METHODOLOGY:
              - HEAVY powerlifting movements as base
              - "Yeah buddy! Light weight!" mentality with heavy weights
              - Deadlifts up to 800lbs, Squats 800lbs+
              - Volume: 15-25 sets per body part
              - Train through pain and intensity
              - Basic movements, heavy weights, high volume
              - Multiple warm-up sets building to working weight
              
              EXERCISE SELECTION (Ronnie's signature lifts):
              - BACK: Deadlifts (signature), T-Bar Rows, Lat Pulldowns, Cable Rows
              - LEGS: Free Weight Squats (signature), Leg Press, Leg Extensions, Leg Curls
              - CHEST: Barbell Bench Press, Incline Press, Dumbbell Press, Dips
              - SHOULDERS: Behind-Neck Press, Lateral Raises, Upright Rows, Front Raises
              - ARMS: Barbell Curls, Preacher Curls, Close-Grip Bench, Tricep Extensions
              
              TRAINING PARAMETERS:
              - Volume: 15-25 sets per body part
              - Reps: 10-15 for compounds, 12-20 for isolations
              - Working weight: 85-95% max after warm-ups
              - Rest: 2-3 minutes between sets
              - Workout duration: 90-120 minutes
              - Philosophy: "Everybody wants to be a bodybuilder, but nobody wants to lift heavy-ass weights!"
            `;
            break;
          case 'cbum':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Chris Bumstead's REAL Classic Physique methodology:

              TRAINING SPLIT: 6-day Classic Physique split (CBum's actual approach)
              - Monday: Chest & Light Triceps
              - Tuesday: Back & Light Biceps
              - Wednesday: Shoulders & Arms
              - Thursday: Legs (Quads focus)
              - Friday: Legs (Glutes/Hams focus) 
              - Saturday: Weak Points/Posing
              - Sunday: Rest
              
              AUTHENTIC CHRIS BUMSTEAD METHODOLOGY:
              - Classic Physique proportions and flow
              - Emphasis on V-taper and waist control
              - Moderate volume with perfect execution
              - Focus on muscle maturity and conditioning
              - Posing practice integrated into training
              - Mind-muscle connection over ego lifting
              - Aesthetic over mass approach
              
              EXERCISE SELECTION (CBum's preferences):
              - CHEST: Incline Dumbbell Press, Cable Flyes, Dips, Machine Press
              - BACK: Lat Pulldowns, Cable Rows, Pull-ups, Single-Arm Rows
              - SHOULDERS: Lateral Raises (signature), Rear Delt Flyes, Cable Work, Machine Press
              - LEGS: Leg Press, Leg Extensions, Romanian Deads, Leg Curls, Hip Thrusts
              - ARMS: Cable Curls, Rope Pushdowns, Preacher Curls, Overhead Extensions
              
              TRAINING PARAMETERS:
              - Volume: 14-18 sets per body part
              - Reps: 10-15 for compounds, 12-20 for isolations
              - Focus on time under tension and control
              - Rest: 60-90 seconds between sets
              - Workout duration: 60-75 minutes
              - Philosophy: "Train for the physique you want, not the weight you can lift"
            `;
            break;
          case 'franco':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Franco Columbu's REAL powerlifting-bodybuilding hybrid methodology:

              TRAINING SPLIT: 4-day powerbuilding split (Franco's actual approach)
              - Monday: Chest & Back (Powerlifting focus)
              - Tuesday: Shoulders & Arms
              - Wednesday: Rest
              - Thursday: Legs (Powerlifting focus)
              - Friday: Power Training (Bench/Squat/Dead variations)
              - Saturday: Rest
              - Sunday: Rest
              
              AUTHENTIC FRANCO COLUMBU METHODOLOGY:
              - Powerlifting meets bodybuilding
              - Strongman training influence
              - Compact, powerful physique focus
              - Heavy compound movements as foundation
              - Short, intense workouts (45-60 minutes)
              - Functional strength emphasis
              - Mediterranean training philosophy
              
              EXERCISE SELECTION (Franco's powerlifting favorites):
              - CHEST: Bench Press (competition style), Incline Press, Dips, Dumbbell Press
              - BACK: Deadlifts (competition style), Bent Rows, Pull-ups, T-Bar Rows
              - SHOULDERS: Standing Military Press, Behind-Neck Press, Lateral Raises
              - ARMS: Barbell Curls, Close-Grip Bench, Tricep Dips, Hammer Curls
              - LEGS: Competition Squats, Romanian Deadlifts, Leg Press, Calf Raises
              - POWER: Heavy singles, doubles, and triples on big 3 lifts
              
              TRAINING PARAMETERS:
              - Volume: 10-16 sets per body part
              - Reps: 3-6 for power, 8-12 for hypertrophy
              - Power sets: 85-95% 1RM for 1-3 reps
              - Rest: 3-5 minutes for power sets, 90 seconds for bodybuilding
              - Workout duration: 45-60 minutes
              - Philosophy: "Strong and aesthetic - function with form"
            `;
            break;
          case 'frank':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Frank Zane's REAL aesthetic methodology:

              TRAINING SPLIT: 3-day quality split (Frank's actual approach)
              - Monday: Chest, Shoulders, Triceps, Abs
              - Tuesday: Back, Biceps, Forearms
              - Wednesday: Legs, Calves, Abs
              - Thursday: Rest or Light Posing
              - Friday: Chest, Shoulders, Triceps, Abs
              - Saturday: Back, Biceps, Forearms
              - Sunday: Legs, Calves, Abs (lighter)
              
              AUTHENTIC FRANK ZANE METHODOLOGY:
              - "Quality over quantity" philosophy
              - Perfect symmetry and proportion focus
              - Moderate weights with perfect form
              - Vacuum poses and core control
              - Aesthetic lines over mass
              - Mind-muscle connection paramount
              - Mathematics of muscle development
              
              EXERCISE SELECTION (Frank's aesthetic choices):
              - CHEST: Incline Dumbbell Press, Dumbbell Flyes, Cable Crossovers, Pullovers
              - BACK: Pull-ups, Cable Rows, Lat Pulldowns, One-Arm Rows
              - SHOULDERS: Dumbbell Press, Lateral Raises, Rear Delt Flyes, Front Raises
              - ARMS: Dumbbell Curls, Tricep Extensions, Concentration Curls, Cable Work
              - LEGS: Leg Press, Leg Extensions, Leg Curls, Lunges, Calf Raises
              - ABS: Vacuum Poses, Crunches, Leg Raises, Side Bends, Planks
              
              TRAINING PARAMETERS:
              - Volume: 9-12 sets per body part
              - Reps: 10-15 for all exercises
              - Focus on peak contraction and control
              - Rest: 60-90 seconds between sets
              - Workout duration: 45-60 minutes
              - Philosophy: "The body is a work of art - sculpt it with precision"
            `;
            break;
          case 'lee':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Lee Haney's REAL "Stimulate, Don't Annihilate" methodology:

              TRAINING SPLIT: 4-day intelligent split (Lee's actual philosophy)
              - Monday: Chest & Triceps
              - Tuesday: Back & Biceps
              - Wednesday: Rest
              - Thursday: Shoulders & Traps
              - Friday: Legs
              - Saturday: Rest
              - Sunday: Rest
              
              AUTHENTIC LEE HANEY METHODOLOGY:
              - "Stimulate, don't annihilate" philosophy
              - Smart training over hardcore training
              - Injury prevention paramount
              - Controlled tempo and perfect form
              - Balanced development approach
              - Conservative but consistent progression
              - 8-time Mr. Olympia longevity mindset
              
              EXERCISE SELECTION (Lee's intelligent choices):
              - CHEST: Incline Barbell Press, Dumbbell Press, Cable Flyes, Dips
              - BACK: Lat Pulldowns, Cable Rows, T-Bar Rows, Pull-ups (controlled)
              - SHOULDERS: Dumbbell Press, Lateral Raises, Rear Delt Flyes, Upright Rows
              - ARMS: Barbell Curls, Preacher Curls, Close-Grip Bench, Tricep Extensions
              - LEGS: Leg Press (safer than squats), Leg Extensions, Leg Curls, Calf Raises
              - TRAPS: Dumbbell Shrugs, Upright Rows
              
              TRAINING PARAMETERS:
              - Volume: 12-16 sets per body part
              - Reps: 8-12 for compounds, 10-15 for isolations
              - Controlled tempo: 2-1-2-1 (eccentric-pause-concentric-pause)
              - Rest: 90-120 seconds between sets
              - Workout duration: 60-75 minutes
              - Philosophy: "Train smart, not just hard - longevity is key"
            `;
            break;

          case 'nick':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Nick Walker's REAL training methodology with EXERCISE VARIETY:

              TRAINING SPLIT: 5-day split (Mass monster approach)
              - Monday: Chest & Triceps
              - Tuesday: Back & Biceps
              - Wednesday: Shoulders & Traps
              - Thursday: Legs
              - Friday: Arms
              - Saturday: Rest
              - Sunday: Rest
              
              EXERCISE SELECTION (MUST VARY THESE EXERCISES EACH WEEK):

              - CHEST: Choose 4-5 from: Incline Barbell Press, Flat Dumbbell Press, Machine Press, Cable Flyes, Dips, Incline Dumbbell Press, Cable Crossovers, Decline Press
              - BACK: Choose 4-5 from: Deadlifts, Barbell Rows, Lat Pulldowns, T-Bar Rows, Pull-ups, Seated Rows, Machine Rows, Cable Rows
              - SHOULDERS: Choose 4-5 from: Machine Press, Lateral Raises, Rear Delt Flyes, Dumbbell Press, Cable Lateral Raises, Front Raises, Smith Machine Press
              - ARMS: Choose 5-6 from: Barbell Curls, Preacher Curls, Hammer Curls, Machine Curls, Tricep Extensions, Rope Pushdowns, Skull Crushers, Overhead Extensions
              - LEGS: Choose 5-6 from: Squats, Leg Press, Leg Extensions, Leg Curls, Calf Raises, Hack Squats, Romanian Deadlifts, Walking Lunges
              - TRAPS: Choose 2-3 from: Barbell Shrugs, Dumbbell Shrugs, Machine Shrugs
              
              TRAINING TECHNIQUES:
              - Volume: 18-22 sets per muscle group
              - Reps: 8-12 for compounds, 10-15 for isolations
              - Mass building focus
              - Heavy progressive overload
              - Machine emphasis for safety
              - High training frequency
              - Multiple angles per muscle
              - IMPORTANT: Rotate exercises every 3-4 weeks to prevent adaptation
            `;
            break;
          case 'platz':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Tom Platz's REAL training methodology:

              TRAINING SPLIT: 5-day authentic Tom Platz split
              - Day 1: Chest and Back (combined session)
              - Day 2: Shoulders (dedicated shoulder day)
              - Day 3: Arms (biceps and triceps specialization)
              - Day 4: Legs (legendary quad-focused sessions)
              - Day 5: Rest and recovery
              - Abs: Integrated into any training day with high intensity
              
              EXERCISE SELECTION AND TRAINING APPROACH:

              - CHEST & BACK (Day 1): Bench Press, Incline Press, Dumbbell Flyes, Barbell Rows, Lat Pulldowns, Cable Rows + Abs exercise
              - SHOULDERS (Day 2): Military Press, Dumbbell Press, Lateral Raises (4 sets), Rear Delt Flyes, Front Raises, Upright Rows + Abs exercise
              - ARMS (Day 3): Barbell Curls (4 sets), Close-Grip Bench, Dumbbell Curls, Tricep Extensions, Hammer Curls, Tricep Pushdowns, Preacher Curls + Abs exercise
              - LEGS (Day 4): LEGENDARY session - Back Squats (5 sets including 20+ rep breathing squats), Front Squats, Leg Press (4 sets), Leg Extensions (4 sets), Hack Squats, Leg Curls, Calf Raises + Abs exercise
              - REST (Day 5): Light stretching and active recovery
              
              TRAINING TECHNIQUES:
              - Legs: Ultra-high volume (20+ sets), high reps (15-30), legendary breathing squats protocol
              - Upper body: Moderate volume (8-15 sets per muscle group)
              - Dedicated body part specialization each day
              - Mind-muscle connection paramount
              - Abs integrated into every training day with high intensity
              - Tom Platz philosophy: Perfect form, high intensity, legendary leg development
            `;
            break;

          case 'kai':
            bodybuilderInstructions = `
              CRITICAL: Create a workout plan that authentically emulates Kai Greene's REAL training methodology with EXERCISE VARIETY:

              TRAINING SPLIT: 6-day split (Artistic bodybuilding)
              - Monday: Chest & Triceps
              - Tuesday: Back & Biceps
              - Wednesday: Shoulders
              - Thursday: Legs (Quads focus)
              - Friday: Arms & Abs
              - Saturday: Legs (Hamstrings & Calves)
              - Sunday: Rest
              
              EXERCISE SELECTION (MUST VARY THESE EXERCISES EACH WEEK):

              - CHEST: Choose 4-5 from: Incline Dumbbell Press, Flat Dumbbell Press, Incline Flyes, Cable Flyes, Dips, Machine Press, Cable Crossovers, Decline Press
              - BACK: Choose 4-5 from: Deadlifts, Barbell Rows, Lat Pulldowns, T-Bar Rows, Pull-ups, Seated Rows, One-Arm Rows, Cable Rows
              - SHOULDERS: Choose 4-5 from: Dumbbell Press, Lateral Raises, Rear Delt Flyes, Machine Press, Cable Lateral Raises, Front Raises, Arnold Press
              - ARMS: Choose 5-6 from: Barbell Curls, Preacher Curls, Hammer Curls, Concentration Curls, Tricep Extensions, Rope Pushdowns, Skull Crushers, Cable Curls
              - LEGS: Choose 6-7 from: Squats, Leg Press, Leg Extensions, Leg Curls, Calf Raises, Hack Squats, Romanian Deadlifts, Walking Lunges, Front Squats
              - ABS: Choose 3-4 from: Cable Crunches, Leg Raises, Plank, Russian Twists, Bicycle Crunches
              
              TRAINING TECHNIQUES:
              - Volume: 16-20 sets per muscle group
              - Reps: 8-12 for compounds, 12-15 for isolations
              - Artistic expression through training
              - Mind-muscle connection mastery
              - Unique exercise variations
              - Dramatic muscle shaping
              - Creative training approach
              - IMPORTANT: Rotate exercises every 3-4 weeks to prevent adaptation
            `;
            break;
          }
        }
        
        if (bodybuilderInstructions) {
          const instructionType = bodybuilderInstructions.includes('CRITICAL: Create a workout plan that authentically emulates') ? 'STATIC' : 'AI-GENERATED';
          console.log(`[DEEPSEEK] Using ${instructionType} instructions for ${input.emulateBodybuilder}`);

          // If user has a specific workout frequency preference, adapt the bodybuilder instructions
          if (input.workoutFrequency && input.workoutFrequency !== '6') {
            const targetDays = input.workoutFrequency === '2_3' ? '2-3' : input.workoutFrequency === '4_5' ? '4-5' : input.workoutFrequency;
            bodybuilderInstructions += `\n\nADAPTATION REQUIRED: The user prefers ${targetDays} training days per week. Adapt this training methodology to fit exactly ${targetDays} days while preserving the core principles, exercise selection preferences, and training intensity of the original methodology.`;
            console.log(`[DEEPSEEK] Adapting ${input.emulateBodybuilder} methodology for ${targetDays} training days`);
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
        - Preferred Workout Frequency: ${input.workoutFrequency ? input.workoutFrequency.replace('_', '-') + ' times per week' : 'Not specified'}

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

      // Enhanced prompt with bodybuilder instructions taking PRIORITY
      const prompt = `
${bodybuilderInstructions ? bodybuilderInstructions + '\n' : 'You are an expert fitness coach creating personalized workout plans.'}

CLIENT PROFILE ${bodybuilderInstructions ? 'TO ADAPT THE ABOVE METHODOLOGY FOR' : ''}:
- Name: ${input.fullName || 'Client'}
- Age: ${input.age} years old
- Gender: ${input.gender}
- Height: ${input.height} cm
- Weight: ${input.weight} kg
- Training Level: ${input.trainingLevel}
- Fat Loss Goal: ${input.fatLossGoal}/5
- Muscle Gain Goal: ${input.muscleGainGoal}/5
- Available Equipment: ${equipmentList}
- Current Exercise Frequency: ${input.exerciseFrequency || '4-6'} days per week
- PREFERRED WORKOUT FREQUENCY: ${input.workoutFrequency ? input.workoutFrequency.replace('_', '-') + ' times per week (MANDATORY - MUST FOLLOW THIS EXACT FREQUENCY)' : 'Not specified'}

AVAILABLE EXERCISES TO CHOOSE FROM (${availableExercises.length} total):
${exerciseNames}

${bodybuilderInstructions ? `
MANDATORY REQUIREMENTS:
1. STRICTLY FOLLOW the training methodology specified above
2. Use the EXACT training split, rep ranges, and set numbers specified
3. Select exercises from the available list that match the methodology
4. Maintain the authentic training philosophy and approach
5. Adapt only for available equipment, but keep the core methodology intact
6. CRITICAL: RESPECT THE USER'S PREFERRED WORKOUT FREQUENCY - ${input.workoutFrequency ? input.workoutFrequency.replace('_', '-') + ' times per week' : 'Not specified'}

EXERCISE VARIETY WITHIN THE METHODOLOGY:
- Choose different exercises each time while staying true to the training style
- Rotate exercise variations that fit the methodology
- Use equipment variations when available
- Maintain the specified intensity and volume principles
` : `
GENERAL WORKOUT REQUIREMENTS:
1. Create a balanced workout program appropriate for the client's level
2. Use proper exercise progression and periodization
3. Include both compound and isolation exercises
4. Vary exercises to prevent adaptation and boredom
5. Consider available equipment and client preferences
6. CRITICAL: MUST CREATE EXACTLY ${input.workoutFrequency ? input.workoutFrequency.replace('_', '-') : '4-5'} TRAINING DAYS PER WEEK (this is MANDATORY - no more, no less)

EXERCISE VARIETY REQUIREMENTS:
- Rotate exercises weekly to prevent adaptation
- Include different movement patterns and angles
- Use various equipment types when available
- Progress from basic to advanced movements
`}

Return ONLY a valid JSON object with this structure:
        {
          "weeklySchedule": [
            {
              "day": "Monday",
      "focus": "Body Part Focus",
              "exercises": [
        { "name": "Exercise Name", "sets": 4, "reps": "8-10", "restBetweenSets": "90s" }
      ]
    }
  ],
  "estimatedTimePerSession": "60 minutes",
  "recommendations": {
    "nutrition": ["Follow the specific nutritional approach for this training style"],
    "rest": ["Rest periods as specified in the methodology"],
    "progression": ["Progression method specific to this training approach"],
    "hydration": ["Standard hydration guidelines"],
    "recovery": ["Recovery methods specific to this training intensity"],
    "cardio": ["Cardio recommendations for this training style"],
    "sleep": ["Sleep requirements for this training approach"]
  }
}

${bodybuilderInstructions ? 'CRITICAL: The workout plan MUST authentically reflect the specified training methodology above. Do not deviate from the core principles, splits, or intensity guidelines.' : 'IMPORTANT: Create a well-balanced, progressive workout plan that matches the client\'s goals and fitness level.'}

${input.workoutFrequency ? `MANDATORY WORKOUT FREQUENCY REQUIREMENT: You MUST create exactly ${input.workoutFrequency.replace('_', '-')} training days per week. This is NON-NEGOTIABLE. If the methodology specifies a different frequency, adapt it to fit the user's preference of ${input.workoutFrequency.replace('_', '-')} days per week while maintaining the core principles of the training style.` : ''}
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
          const normalizedPlan = this.convertWorkoutPlanToAppWorkoutPlan(this.normalizeWorkoutPlan(workoutPlan), input);
          if (this.VERBOSE || __DEV__) console.log('[DeepSeekService] Normalized workout plan summary:', {
            days: normalizedPlan?.weeklySchedule?.length || 0,
            hasRecommendations: !!(normalizedPlan as any)?.recommendations,
          });

          // 2. Validate the clean, normalized plan.
          if (!this.validateAppWorkoutPlan(normalizedPlan)) {
            console.error('[DeepSeekService] Invalid workout plan structure AFTER normalization:', normalizedPlan);
            throw new Error('Invalid workout plan structure received from API');
          }

          // 3. Validate workout frequency matches user preference
          if (input.workoutFrequency) {
            const targetDays = input.workoutFrequency === '2_3' ? 2.5 : input.workoutFrequency === '4_5' ? 4.5 : parseInt(input.workoutFrequency);
            const actualTrainingDays = normalizedPlan.weeklySchedule.filter(day =>
              day.exercises.length > 0 &&
              !day.day.toLowerCase().includes('rest') &&
              !day.focus.toLowerCase().includes('rest')
            ).length;

            // Allow some flexibility (±1 day) but warn if significantly off
            if (Math.abs(actualTrainingDays - targetDays) > 1) {
              console.warn(`[DEEPSEEK] Workout frequency mismatch: User requested ${targetDays} days/week, AI generated ${actualTrainingDays} days/week`);
              // For now, we'll still return the plan but log the discrepancy
              // In the future, we could retry the AI request with more explicit instructions
            } else {
              console.log(`[DEEPSEEK] ✅ Workout frequency validated: ${actualTrainingDays} training days matches user's preference of ${targetDays} days/week`);
            }
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
   * Converts the old WorkoutPlan interface to the new AppWorkoutPlan interface
   */
  private static convertWorkoutPlanToAppWorkoutPlan(plan: WorkoutPlan, input: WorkoutPlanInput): AppWorkoutPlan {
    // Extract workout name from plan or generate default
    const name = (plan as any).name || `${input.emulateBodybuilder ? `${input.emulateBodybuilder} Style ` : ''}Workout Plan`;
    
    // Convert weeklySchedule to match AppWorkoutPlan format
    const weeklySchedule = plan.weeklySchedule.map(day => ({
      day: day.day,
      focus: (day as any).bodyParts?.join(', ') || 'General Training',
      exercises: day.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        restBetweenSets: ex.restBetweenSets || '60-90 seconds',
        instructions: (ex as any).instructions || '',
        muscleGroups: (ex as any).muscleGroups || []
      }))
    }));

    return {
      id: `workout-${Date.now()}`,
      name,
      training_level: input.trainingLevel || 'intermediate',
      goal_muscle_gain: (input as any).goalMuscleGain || 3,
      goal_fat_loss: (input as any).goalFatLoss || 2,
      mesocycle_length_weeks: 4,
      weeklySchedule,
      recommendations: plan.recommendations,
      estimatedTimePerSession: plan.estimatedTimePerSession || '60-90 minutes'
    } as AppWorkoutPlan;
  }

  /**
   * Validates the structure of an AppWorkoutPlan.
   */
  private static validateAppWorkoutPlan(plan: any): plan is AppWorkoutPlan {
    if (!plan || typeof plan !== 'object') return false;
    if (!Array.isArray(plan.weeklySchedule)) return false;
    if (!plan.recommendations || typeof plan.recommendations !== 'object') return false;
    if (typeof plan.estimatedTimePerSession !== 'string') return false;
    if (typeof plan.name !== 'string') return false;
    if (typeof plan.training_level !== 'string') return false;
    if (typeof plan.goal_muscle_gain !== 'number') return false;
    if (typeof plan.goal_fat_loss !== 'number') return false;

    for (const day of plan.weeklySchedule) {
      if (!day.day || !Array.isArray(day.exercises) || typeof day.focus !== 'string') {
        console.error(`[ValidateApp] Invalid day structure: ${JSON.stringify(day)}`);
        return false;
      }
      for (const exercise of day.exercises) {
        if (
            typeof exercise.name !== 'string' ||
            typeof exercise.sets !== 'number' ||
            typeof exercise.reps !== 'string'
        ) {
          console.error(`[ValidateApp] Invalid exercise structure: ${JSON.stringify(exercise)}`);
          return false;
        }
      }
    }

    return true;
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