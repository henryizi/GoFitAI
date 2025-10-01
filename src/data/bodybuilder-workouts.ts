export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  restTime?: string;
  notes?: string;
}

export interface WorkoutDay {
  day: string;
  bodyParts: string[];
  exercises: Exercise[];
  sessionTime?: string;
  specialNotes?: string;
}

export interface BodybuilderWorkout {
  name: string;
  description: string;
  weeklySchedule: WorkoutDay[];
  restDays: string[];
  specialFeatures: string[];
  estimatedTimePerSession: string;
  trainingPhilosophy: string;
}

export const bodybuilderWorkouts: Record<string, BodybuilderWorkout> = {
  'arnold': {
    name: 'Arnold Schwarzenegger - Chest & Back (Version 1)',
    description: 'The Austrian Oak - 7x Mr. Olympia Chest and Back specialization program with high-intensity compound movements and classic mass-building techniques',
    trainingPhilosophy: 'Focus on chest and back development with compound movements, high intensity, and perfect form. Double split training for maximum muscle stimulation and growth.',
    estimatedTimePerSession: '90-120 minutes',
    specialFeatures: [
      'Double split training - morning and evening sessions',
      'Chest and back specialization with compound movements',
      'High-intensity training with heavy weights',
      '7x Mr. Olympia proven techniques',
      'Focus on full range of motion and mind-muscle connection',
      'Classic mass-building exercises with modern intensity'
    ],
    restDays: ['Day 7'],
    weeklySchedule: [
      {
        day: 'Monday',
        bodyParts: ['Chest', 'Back', 'Legs', 'Abs', 'Calves'],
        sessionTime: 'AM: Chest, PM: Back, Legs, Abs, Calves',
        specialNotes: 'Triple session day - chest in morning, back/legs/abs/calves in evening for complete body development',
        exercises: [
          // CHEST (AM)
          {
            name: 'Flat Barbell Bench Press',
            sets: '4',
            reps: '6-8',
            notes: 'Foundation chest movement - heavy compound for mass'
          },
          {
            name: 'Dumbbell Incline Bench Press',
            sets: '3',
            reps: '10-12',
            notes: 'Upper chest development with dumbbells'
          },
          {
            name: 'Cable Crossovers',
            sets: '3',
            reps: '10-12',
            notes: 'Chest isolation and constant tension'
          },
          {
            name: 'Incline Barbell Bench Press',
            sets: '4',
            reps: '6-8',
            notes: 'Upper chest emphasis with barbell'
          },
          {
            name: 'Dumbbell Pec Flyes',
            sets: '3',
            reps: '10-12',
            notes: 'Chest definition and stretch'
          },
          {
            name: 'Dips',
            sets: '3',
            reps: '10-12',
            notes: 'Bodyweight chest and tricep development'
          },
          // BACK (PM)
          {
            name: 'Bent Over Rows',
            sets: '4',
            reps: '8-10',
            notes: 'Heavy rowing for back thickness and strength'
          },
          {
            name: 'Seated Cable Rows',
            sets: '3',
            reps: '10-12',
            notes: 'Mid-back development with constant tension'
          },
          {
            name: 'Pull-Ups',
            sets: '4',
            reps: '8-10',
            notes: 'Lat width development - go to failure'
          },
          {
            name: 'Kroc Rows',
            sets: '3',
            reps: '10-12',
            notes: 'Unilateral back intensity with heavy weight'
          },
          {
            name: 'Lat Pulldowns',
            sets: '3',
            reps: '12-15',
            notes: 'Lat isolation with higher reps'
          },
          {
            name: 'Dumbbell Pullovers',
            sets: '3',
            reps: '10-12',
            notes: 'Lat stretch and ribcage expansion'
          },
          // LEGS
          {
            name: 'Squats',
            sets: '3',
            reps: '6-8',
            notes: 'Foundation leg movement - heavy compound for quad mass'
          },
          {
            name: 'Straight-Leg Deadlifts',
            sets: '3',
            reps: '8-10',
            notes: 'Hamstring stretch and posterior chain development'
          },
          {
            name: 'Leg Press',
            sets: '4',
            reps: '10-12',
            notes: 'Quad isolation with high volume'
          },
          {
            name: 'Hamstring Curls',
            sets: '4',
            reps: '12-15',
            notes: 'Hamstring isolation for definition'
          },
          {
            name: 'Deadlifts',
            sets: '3',
            reps: '6-8',
            notes: 'Heavy compound for overall posterior chain strength'
          },
          {
            name: 'Hack Squat',
            sets: '3',
            reps: '8-10',
            notes: 'Quad emphasis with different angle'
          },
          {
            name: 'Good Mornings',
            sets: '4',
            reps: '8-10',
            notes: 'Lower back and hamstring development'
          },
          {
            name: 'Glute Ham Raise',
            sets: '4',
            reps: '10-12',
            notes: 'Hamstring and glute isolation'
          },
          {
            name: 'Leg Extensions',
            sets: '4',
            reps: '12-15',
            notes: 'Quad isolation for definition and pump'
          },
          // CALVES
          {
            name: 'Calf Raises',
            sets: '4',
            reps: '15-20',
            notes: 'Standing calf raises for mass and strength'
          },
          // ABS
          {
            name: 'Cable Crunches',
            sets: '2',
            reps: '25',
            notes: 'Core strength and definition'
          },
          {
            name: 'Lying Leg Raise',
            sets: '2',
            reps: '25',
            notes: 'Lower ab development'
          }
        ]
      },
      {
        day: 'Tuesday',
        bodyParts: ['Shoulders', 'Arms', 'Calves', 'Abs'],
        sessionTime: 'AM: Shoulders, PM: Arms, Calves, Abs',
        specialNotes: 'Shoulder and arm development with compound and isolation movements, plus calves and abs',
        exercises: [
          // SHOULDERS (AM)
          {
            name: 'Overhead Press',
            sets: '4',
            reps: '6-8',
            notes: 'Foundation shoulder movement for overall mass'
          },
          {
            name: 'Seated Arnold Press',
            sets: '4',
            reps: '8-10',
            notes: 'Full range of motion for all three delts'
          },
          {
            name: 'Lateral Raises',
            sets: '3',
            reps: '10-12',
            notes: 'Side delt isolation for shoulder width'
          },
          {
            name: 'Seated Dumbbell Press',
            sets: '4',
            reps: '6-8',
            notes: 'Seated position for controlled shoulder development'
          },
          {
            name: 'Face Pulls',
            sets: '4',
            reps: '8-10',
            notes: 'Rear delt and trap development'
          },
          {
            name: 'Shrugs',
            sets: '3',
            reps: '15-20',
            notes: 'Trap development for shoulder aesthetics'
          },
          // ARMS (PM)
          {
            name: 'EZ Curl Bar Bicep Curls',
            sets: '3',
            reps: '12-15',
            notes: 'Bicep mass building with EZ bar'
          },
          {
            name: 'Hammer Curls',
            sets: '3',
            reps: '12-15',
            notes: 'Brachialis and forearm development'
          },
          {
            name: 'Bicep 21s',
            sets: '3',
            reps: '7 bottom + 7 top + 7 full',
            notes: 'Complete bicep development with varying ranges'
          },
          {
            name: 'Skull Crushers',
            sets: '3',
            reps: '12-15',
            notes: 'Tricep isolation for horseshoe development'
          },
          {
            name: 'Close Grip Bench Press',
            sets: '3',
            reps: '8-10',
            notes: 'Tricep mass builder with close grip'
          },
          {
            name: 'Overhead Tricep Extensions',
            sets: '3',
            reps: '10-12',
            notes: 'Overhead position for full tricep stretch'
          },
          // CALVES
          {
            name: 'Calf Raises',
            sets: '4',
            reps: '15-20',
            notes: 'Standing calf raises for mass and strength'
          },
          // ABS
          {
            name: 'Cable Crunches',
            sets: '2',
            reps: '25',
            notes: 'Core strength and definition'
          }
        ]
      },
      {
        day: 'Wednesday',
        bodyParts: ['Chest', 'Back', 'Legs', 'Abs', 'Calves'],
        sessionTime: 'AM: Chest, PM: Back, Legs, Abs, Calves',
        specialNotes: 'Second chest/back/legs session with progressive overload for continued development',
        exercises: [
          // CHEST (AM)
          {
            name: 'Flat Barbell Bench Press',
            sets: '4',
            reps: '6-8',
            notes: 'Foundation movement - focus on progressive overload'
          },
          {
            name: 'Dumbbell Incline Bench Press',
            sets: '3',
            reps: '10-12',
            notes: 'Upper chest emphasis with dumbbells'
          },
          {
            name: 'Cable Crossovers',
            sets: '3',
            reps: '10-12',
            notes: 'Chest isolation and mind-muscle connection'
          },
          {
            name: 'Incline Barbell Bench Press',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy upper chest development'
          },
          {
            name: 'Dumbbell Pec Flyes',
            sets: '3',
            reps: '10-12',
            notes: 'Chest definition and stretch'
          },
          {
            name: 'Dips',
            sets: '3',
            reps: '10-12',
            notes: 'Bodyweight movement for chest and tricep synergy'
          },
          // BACK (PM)
          {
            name: 'Bent Over Rows',
            sets: '4',
            reps: '8-10',
            notes: 'Heavy compound for back thickness'
          },
          {
            name: 'Seated Cable Rows',
            sets: '3',
            reps: '10-12',
            notes: 'Mid-back development with cables'
          },
          {
            name: 'Pull-Ups',
            sets: '4',
            reps: '8-10',
            notes: 'Lat width - focus on full range'
          },
          {
            name: 'Kroc Rows',
            sets: '3',
            reps: '10-12',
            notes: 'Unilateral intensity for back balance'
          },
          {
            name: 'Lat Pulldowns',
            sets: '3',
            reps: '12-15',
            notes: 'Lat isolation with higher volume'
          },
          {
            name: 'Dumbbell Pullovers',
            sets: '3',
            reps: '10-12',
            notes: 'Lat stretch and serratus work'
          },
          // LEGS
          {
            name: 'Squats',
            sets: '3',
            reps: '6-8',
            notes: 'Foundation leg movement - heavy compound for quad mass'
          },
          {
            name: 'Straight-Leg Deadlifts',
            sets: '3',
            reps: '8-10',
            notes: 'Hamstring stretch and posterior chain development'
          },
          {
            name: 'Leg Press',
            sets: '4',
            reps: '10-12',
            notes: 'Quad isolation with high volume'
          },
          {
            name: 'Hamstring Curls',
            sets: '4',
            reps: '12-15',
            notes: 'Hamstring isolation for definition'
          },
          {
            name: 'Deadlifts',
            sets: '3',
            reps: '6-8',
            notes: 'Heavy compound for overall posterior chain strength'
          },
          {
            name: 'Hack Squat',
            sets: '3',
            reps: '8-10',
            notes: 'Quad emphasis with different angle'
          },
          {
            name: 'Good Mornings',
            sets: '4',
            reps: '8-10',
            notes: 'Lower back and hamstring development'
          },
          {
            name: 'Glute Ham Raise',
            sets: '4',
            reps: '10-12',
            notes: 'Hamstring and glute isolation'
          },
          {
            name: 'Leg Extensions',
            sets: '4',
            reps: '12-15',
            notes: 'Quad isolation for definition and pump'
          },
          // CALVES
          {
            name: 'Calf Raises',
            sets: '4',
            reps: '15-20',
            notes: 'Standing calf raises for mass and strength'
          },
          // ABS
          {
            name: 'Cable Crunches',
            sets: '2',
            reps: '25',
            notes: 'Core strength and definition'
          },
          {
            name: 'Lying Leg Raise',
            sets: '2',
            reps: '25',
            notes: 'Lower ab development'
          }
        ]
      },
      {
        day: 'Thursday',
        bodyParts: ['Shoulders', 'Arms', 'Calves', 'Abs'],
        sessionTime: 'AM: Shoulders, PM: Arms, Calves, Abs',
        specialNotes: 'Second shoulder/arm session with focus on different angles and techniques, plus calves and abs',
        exercises: [
          // SHOULDERS (AM)
          {
            name: 'Overhead Press',
            sets: '4',
            reps: '6-8',
            notes: 'Compound shoulder strength and mass'
          },
          {
            name: 'Seated Arnold Press',
            sets: '4',
            reps: '8-10',
            notes: 'Rotational movement for complete delt development'
          },
          {
            name: 'Lateral Raises',
            sets: '3',
            reps: '10-12',
            notes: 'Side delt isolation and width'
          },
          {
            name: 'Seated Dumbbell Press',
            sets: '4',
            reps: '6-8',
            notes: 'Seated stability for shoulder development'
          },
          {
            name: 'Face Pulls',
            sets: '4',
            reps: '8-10',
            notes: 'Rear delt and upper back development'
          },
          {
            name: 'Shrugs',
            sets: '3',
            reps: '15-20',
            notes: 'Trap development for shoulder aesthetics'
          },
          // ARMS (PM)
          {
            name: 'EZ Curl Bar Bicep Curls',
            sets: '3',
            reps: '12-15',
            notes: 'Bicep mass with EZ bar comfort'
          },
          {
            name: 'Hammer Curls',
            sets: '3',
            reps: '12-15',
            notes: 'Brachialis emphasis for arm thickness'
          },
          {
            name: 'Bicep 21s',
            sets: '3',
            reps: '7 bottom + 7 top + 7 full',
            notes: 'Complete bicep range and development'
          },
          {
            name: 'Skull Crushers',
            sets: '3',
            reps: '12-15',
            notes: 'Tricep isolation for definition'
          },
          {
            name: 'Close Grip Bench Press',
            sets: '3',
            reps: '8-10',
            notes: 'Heavy tricep compound movement'
          },
          {
            name: 'Overhead Tricep Extensions',
            sets: '3',
            reps: '10-12',
            notes: 'Full tricep stretch and contraction'
          },
          // CALVES
          {
            name: 'Calf Raises',
            sets: '4',
            reps: '15-20',
            notes: 'Standing calf raises for mass and strength'
          },
          // ABS
          {
            name: 'Cable Crunches',
            sets: '2',
            reps: '25',
            notes: 'Core strength and definition'
          }
        ]
      },
      {
        day: 'Friday',
        bodyParts: ['Chest', 'Back', 'Legs', 'Abs', 'Calves'],
        sessionTime: 'AM: Chest, PM: Back, Legs, Abs, Calves',
        specialNotes: 'Third chest/back/legs session with maximum intensity and progressive overload',
        exercises: [
          // CHEST (AM)
          {
            name: 'Flat Barbell Bench Press',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy foundation movement - increase weight each session'
          },
          {
            name: 'Dumbbell Incline Bench Press',
            sets: '3',
            reps: '10-12',
            notes: 'Upper chest development with dumbbell control'
          },
          {
            name: 'Cable Crossovers',
            sets: '3',
            reps: '10-12',
            notes: 'Chest isolation with constant cable tension'
          },
          {
            name: 'Incline Barbell Bench Press',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy upper chest compound movement'
          },
          {
            name: 'Dumbbell Pec Flyes',
            sets: '3',
            reps: '10-12',
            notes: 'Chest stretch and squeeze for definition'
          },
          {
            name: 'Dips',
            sets: '3',
            reps: '10-12',
            notes: 'Bodyweight intensity for chest and tricep growth'
          },
          // BACK (PM)
          {
            name: 'Bent Over Rows',
            sets: '4',
            reps: '8-10',
            notes: 'Heavy rowing for maximum back thickness'
          },
          {
            name: 'Seated Cable Rows',
            sets: '3',
            reps: '10-12',
            notes: 'Mid-back development with perfect form'
          },
          {
            name: 'Pull-Ups',
            sets: '4',
            reps: '8-10',
            notes: 'Lat width - push to complete failure'
          },
          {
            name: 'Kroc Rows',
            sets: '3',
            reps: '10-12',
            notes: 'Unilateral back intensity and balance'
          },
          {
            name: 'Lat Pulldowns',
            sets: '3',
            reps: '12-15',
            notes: 'High rep lat development'
          },
          {
            name: 'Dumbbell Pullovers',
            sets: '3',
            reps: '10-12',
            notes: 'Lat stretch and ribcage expansion work'
          },
          // LEGS
          {
            name: 'Squats',
            sets: '3',
            reps: '6-8',
            notes: 'Foundation leg movement - heavy compound for quad mass'
          },
          {
            name: 'Straight-Leg Deadlifts',
            sets: '3',
            reps: '8-10',
            notes: 'Hamstring stretch and posterior chain development'
          },
          {
            name: 'Leg Press',
            sets: '4',
            reps: '10-12',
            notes: 'Quad isolation with high volume'
          },
          {
            name: 'Hamstring Curls',
            sets: '4',
            reps: '12-15',
            notes: 'Hamstring isolation for definition'
          },
          {
            name: 'Deadlifts',
            sets: '3',
            reps: '6-8',
            notes: 'Heavy compound for overall posterior chain strength'
          },
          {
            name: 'Hack Squat',
            sets: '3',
            reps: '8-10',
            notes: 'Quad emphasis with different angle'
          },
          {
            name: 'Good Mornings',
            sets: '4',
            reps: '8-10',
            notes: 'Lower back and hamstring development'
          },
          {
            name: 'Glute Ham Raise',
            sets: '4',
            reps: '10-12',
            notes: 'Hamstring and glute isolation'
          },
          {
            name: 'Leg Extensions',
            sets: '4',
            reps: '12-15',
            notes: 'Quad isolation for definition and pump'
          },
          // CALVES
          {
            name: 'Calf Raises',
            sets: '4',
            reps: '15-20',
            notes: 'Standing calf raises for mass and strength'
          },
          // ABS
          {
            name: 'Cable Crunches',
            sets: '2',
            reps: '25',
            notes: 'Core strength and abdominal definition'
          },
          {
            name: 'Lying Leg Raise',
            sets: '2',
            reps: '25',
            notes: 'Lower ab development'
          }
        ]
      },
      {
        day: 'Saturday',
        bodyParts: ['Shoulders', 'Arms', 'Calves', 'Abs'],
        sessionTime: 'AM: Shoulders, PM: Arms, Calves, Abs',
        specialNotes: 'Fourth shoulder/arm session focusing on refinement and detail work, plus calves and abs',
        exercises: [
          // SHOULDERS (AM)
          {
            name: 'Overhead Press',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy compound for shoulder foundation'
          },
          {
            name: 'Seated Arnold Press',
            sets: '4',
            reps: '8-10',
            notes: 'Complete delt rotation for all angles'
          },
          {
            name: 'Lateral Raises',
            sets: '3',
            reps: '10-12',
            notes: 'Side delt width and definition'
          },
          {
            name: 'Seated Dumbbell Press',
            sets: '4',
            reps: '6-8',
            notes: 'Seated control for shoulder development'
          },
          {
            name: 'Face Pulls',
            sets: '4',
            reps: '8-10',
            notes: 'Rear delt and trap refinement'
          },
          {
            name: 'Shrugs',
            sets: '3',
            reps: '15-20',
            notes: 'Trap development for complete shoulder package'
          },
          // ARMS (PM)
          {
            name: 'EZ Curl Bar Bicep Curls',
            sets: '3',
            reps: '12-15',
            notes: 'Bicep mass and peak development'
          },
          {
            name: 'Hammer Curls',
            sets: '3',
            reps: '12-15',
            notes: 'Brachialis and forearm synergy'
          },
          {
            name: 'Bicep 21s',
            sets: '3',
            reps: '7 bottom + 7 top + 7 full',
            notes: 'Complete bicep stimulation at all ranges'
          },
          {
            name: 'Skull Crushers',
            sets: '3',
            reps: '12-15',
            notes: 'Tricep isolation for horseshoe shape'
          },
          {
            name: 'Close Grip Bench Press',
            sets: '3',
            reps: '8-10',
            notes: 'Heavy tricep compound for mass'
          },
          {
            name: 'Overhead Tricep Extensions',
            sets: '3',
            reps: '10-12',
            notes: 'Full tricep extension and stretch'
          },
          // CALVES
          {
            name: 'Calf Raises',
            sets: '4',
            reps: '15-20',
            notes: 'Standing calf raises for mass and strength'
          },
          // ABS
          {
            name: 'Cable Crunches',
            sets: '2',
            reps: '25',
            notes: 'Core strength and definition'
          }
        ]
      },
      {
        day: 'Sunday',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair for maximum growth',
        exercises: []
      }
    ]
  },
  'cbum': {
    name: 'Chris Bumstead',
    description: 'Mr. Classic Physique - Known for perfect symmetry, aesthetics, and classic physique proportions',
    trainingPhilosophy: 'Focus on symmetry, proportions, and classic aesthetics. Mind-muscle connection with perfect form. Train for the timeless physique.',
    estimatedTimePerSession: '75-90 minutes',
    specialFeatures: [
      'High-intensity drop sets and advanced training techniques',
      'Focus on perfect proportions and aesthetics',
      'Mind-muscle connection with controlled movements',
      'Classic physique development with modern intensity',
      'Strategic rest days for optimal recovery'
    ],
    restDays: ['Day 4', 'Day 8'],
    weeklySchedule: [
      {
        day: 'Day 1',
        bodyParts: ['Calves', 'Quads'],
        specialNotes: 'Focus on lower body development with drop sets for maximum intensity',
        exercises: [
          {
            name: 'Leg Extensions (Drop Sets)',
            sets: '2',
            reps: '20',
            notes: 'Drop set technique for quad burn and hypertrophy'
          },
          {
            name: 'Smith Machine Squats',
            sets: '2',
            reps: '6-10',
            notes: 'Heavy compound movement for quad mass'
          },
          {
            name: 'Unilateral Leg Presses',
            sets: '3',
            reps: '8-10',
            notes: 'Unilateral work for balance and quad development'
          },
          {
            name: 'Sissy Squats',
            sets: '3',
            reps: '12-15',
            notes: 'Quad isolation and stretch for definition'
          },
          {
            name: 'Seated Calf Raises',
            sets: '3',
            reps: '10-12',
            notes: 'Calf development with controlled movement'
          }
        ]
      },
      {
        day: 'Day 2',
        bodyParts: ['Chest', 'Triceps'],
        specialNotes: 'Chest and tricep synergy with high-intensity techniques',
        exercises: [
          {
            name: 'Incline Dumbbell Presses',
            sets: '2',
            reps: '8-10',
            notes: 'Upper chest development with dumbbells'
          },
          {
            name: 'Incline Dumbbell Flys',
            sets: '2',
            reps: '8-10',
            notes: 'Chest isolation with stretch and squeeze'
          },
          {
            name: 'Hammer Strength Machine Incline Presses (Drop Sets)',
            sets: '2',
            reps: '6-10',
            notes: 'Machine work with drop sets for intensity'
          },
          {
            name: 'Pec Decks Flyes',
            sets: '3',
            reps: '15',
            notes: 'High rep chest isolation for definition'
          },
          {
            name: 'EZ Bar Skull Crushers',
            sets: '2',
            reps: '8-10',
            notes: 'Tricep development with controlled form'
          },
          {
            name: 'Pushups',
            sets: '2',
            reps: 'Failure',
            notes: 'Bodyweight movement to failure for chest pump'
          }
        ]
      },
      {
        day: 'Day 3',
        bodyParts: ['Back', 'Biceps'],
        specialNotes: 'Complete back development with bicep synergy',
        exercises: [
          {
            name: 'Close Grip Underhand Lat Pulldowns',
            sets: '3',
            reps: '10-12',
            notes: 'Bicep emphasis lat pulldowns'
          },
          {
            name: 'Chest-Supported Dumbbell Rows',
            sets: '2',
            reps: '8-10',
            notes: 'Supported rowing for back thickness'
          },
          {
            name: 'Chest-Supported T-Bar Rows (Drop Set)',
            sets: '2',
            reps: '8-10',
            notes: 'Drop set technique for maximum back stimulus'
          },
          {
            name: 'Machine Chest Supported Rows',
            sets: '2',
            reps: '10-12',
            notes: 'Machine work for controlled back development'
          },
          {
            name: 'Cable Lat Extensions',
            sets: '2',
            reps: '10-12',
            notes: 'Lat stretch and isolation'
          },
          {
            name: 'Machine Preacher Curls',
            sets: '2',
            reps: '10-12',
            notes: 'Isolated bicep work with machine support'
          }
        ]
      },
      {
        day: 'Day 4',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair',
        exercises: []
      },
      {
        day: 'Day 5',
        bodyParts: ['Shoulders', 'Chest'],
        specialNotes: 'Shoulder and chest combination with drop sets',
        exercises: [
          {
            name: 'Seated Dumbbell Shoulder Presses',
            sets: '2',
            reps: '6-10',
            notes: 'Heavy shoulder pressing for mass'
          },
          {
            name: 'Machine Shoulder Presses (Drop Sets)',
            sets: '3',
            reps: '6-10',
            notes: 'Machine work with drop sets for intensity'
          },
          {
            name: 'Seated Dumbbell Lateral Raises (Drop Sets)',
            sets: '2',
            reps: '8-10',
            notes: 'Side delt development with drop sets'
          },
          {
            name: 'Machine Lateral Raises',
            sets: '2',
            reps: '10-12',
            notes: 'Machine isolation for side delts'
          },
          {
            name: 'Superset: Reverse Pec Decks & Machine Flyes',
            sets: '2',
            reps: '10-12',
            notes: 'Superset for rear delts and chest synergy'
          }
        ]
      },
      {
        day: 'Day 6',
        bodyParts: ['Hamstrings', 'Back'],
        specialNotes: 'Hamstring and back focus with heavy compound movements',
        exercises: [
          {
            name: 'Lying Leg Curls',
            sets: '2',
            reps: '8-10',
            notes: 'Hamstring isolation with lying position'
          },
          {
            name: 'Deadlifts',
            sets: '2',
            reps: '4-8',
            notes: 'Heavy compound for overall posterior chain'
          },
          {
            name: 'Seated Leg Curls',
            sets: '2',
            reps: '8-10',
            notes: 'Seated hamstring work for different angle'
          },
          {
            name: 'Standing Leg Curls',
            sets: '2',
            reps: '8-10',
            notes: 'Standing hamstring isolation'
          },
          {
            name: 'Wide Grip Lat Pulldowns',
            sets: '3',
            reps: '8-10',
            notes: 'Wide grip for lat width development'
          },
          {
            name: 'Cable Lat Extension',
            sets: '2',
            reps: '10-12',
            notes: 'Cable work for lat stretch and isolation'
          }
        ]
      },
      {
        day: 'Day 7',
        bodyParts: ['Arms'],
        specialNotes: 'Complete arm specialization with drop sets and various angles',
        exercises: [
          {
            name: 'Rope Cable Triceps Pressdowns (Drop Sets)',
            sets: '2',
            reps: '8-10',
            notes: 'Drop set technique for tricep intensity'
          },
          {
            name: 'Incline Dumbbell Skull Crushers',
            sets: '2',
            reps: '8-10',
            notes: 'Incline position for tricep stretch'
          },
          {
            name: 'EZ Bar Preacher Curls (Drop Sets)',
            sets: '3',
            reps: '8-10',
            notes: 'Preacher position with drop sets for bicep burn'
          },
          {
            name: 'Dumbbell Curls',
            sets: '2',
            reps: '10-12',
            notes: 'Free weight bicep work'
          },
          {
            name: 'Cable Cross Body Triceps',
            sets: '2',
            reps: '10-15',
            notes: 'Cross body movement for tricep definition'
          },
          {
            name: 'Low Pulley Cable Curl With V-Bar Handles (Drop Sets)',
            sets: '2',
            reps: '10-12',
            notes: 'Low pulley work with drop sets for peak bicep'
          }
        ]
      },
      {
        day: 'Day 8',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair',
        exercises: []
      }
    ]
  },
  'platz': {
    name: 'Tom Platz',
    description: 'The Golden Eagle - Legendary for his insane leg workouts and high-volume training with perfect form',
    trainingPhilosophy: 'Full range of motion, varying angles, high volume with perfect form, and legendary intensity especially on legs',
    estimatedTimePerSession: '90-120 minutes',
    specialFeatures: [
      'Double sessions on chest/back day (morning chest, late-night back)',
      'Legendary leg workouts with extreme volume',
      'High rep ranges with perfect form',
      'Sometimes limited leg training to twice per month for symmetry',
      'Loose form with momentum on arms for continued reps'
    ],
    restDays: ['Day 5', 'Day 6', 'Day 7'],
    weeklySchedule: [
      {
        day: 'Day 1',
        bodyParts: ['Chest', 'Back'],
        sessionTime: 'Chest: Morning, Back: Late Night',
        specialNotes: 'Double session day - chest in morning, back late at night',
        exercises: [
          // CHEST (Morning Workout)
          {
            name: 'Incline Dumbbell Press',
            sets: '5-6',
            reps: '10-20',
            notes: 'Full range of motion, varying angles'
          },
          {
            name: 'Dumbbell Fly',
            sets: '5-6',
            reps: '10-20',
            notes: 'Target different parts of chest'
          },
          {
            name: 'Pec Deck Fly',
            sets: '5-6',
            reps: '10-20',
            notes: 'Focus on squeeze and contraction'
          },
          {
            name: 'Weighted Dip',
            sets: '3-4',
            reps: 'To failure',
            notes: 'Push to complete muscular failure'
          },
          // BACK (Late-Night Workout)
          {
            name: 'Pull-Ups',
            sets: '8-10',
            reps: '15-30',
            notes: 'Heavy lifting with proper form for back width'
          },
          {
            name: 'Lat Pulldowns',
            sets: '8-10',
            reps: '20-40',
            notes: 'High volume for back width'
          },
          {
            name: 'T-Bar Rows',
            sets: '5-6',
            reps: '10-15',
            notes: 'Focus on back thickness'
          },
          {
            name: 'Low Cable Rows',
            sets: '4-5',
            reps: '10-15',
            notes: 'Proper form for maximum thickness'
          },
          {
            name: 'Dumbbell Pullovers',
            sets: '4-5',
            reps: '10-15',
            notes: 'Expand ribcage and lat stretch'
          }
        ]
      },
      {
        day: 'Day 2',
        bodyParts: ['Shoulders'],
        specialNotes: 'Develop all three heads of deltoid for well-rounded appearance',
        exercises: [
          {
            name: 'Smith Machine Military Press',
            sets: '8-10',
            reps: '12-30',
            notes: 'High volume for shoulder development'
          },
          {
            name: 'Dumbbell Lateral Raises',
            sets: '5-6',
            reps: '12-25',
            notes: 'Target middle deltoid'
          },
          {
            name: 'One Arm Cable Lateral Raises',
            sets: '4-5',
            reps: '12-20',
            notes: 'Unilateral focus for balance'
          },
          {
            name: 'Barbell Upright Rows',
            sets: '4-5',
            reps: '10-15',
            notes: 'Wide grip for rear delt involvement'
          },
          {
            name: 'Bent Over Dumbbell Lateral Raises',
            sets: '4-5',
            reps: '10-20',
            notes: 'Target rear deltoids'
          },
          {
            name: 'Cable Rear Lateral Raises',
            sets: '3-4',
            reps: '10-15',
            notes: 'Finish rear delts with cables'
          }
        ]
      },
      {
        day: 'Day 3',
        bodyParts: ['Arms'],
        specialNotes: 'Duplicate leg workout intensity - sometimes loose form with momentum to continue reps',
        exercises: [
          {
            name: 'Standing Barbell Curls',
            sets: '4-5',
            reps: '10-15',
            notes: 'Use momentum when needed to continue reps'
          },
          {
            name: 'Incline Dumbbell Curls',
            sets: '4-5',
            reps: '10-20',
            notes: 'Full stretch and contraction'
          },
          {
            name: 'Machine Bicep Curls',
            sets: '4-5',
            reps: '10-20',
            notes: 'Controlled movement with machine'
          },
          {
            name: 'Cable Triceps Pushdowns',
            sets: '4-5',
            reps: '10-20',
            notes: 'Full extension and contraction'
          },
          {
            name: 'Close Grip Bench Press',
            sets: '4-5',
            reps: '10-20',
            notes: 'Heavy compound movement for triceps'
          },
          {
            name: 'One Arm Dumbbell Triceps Extensions',
            sets: '4-5',
            reps: '15-30',
            notes: 'High reps for tricep isolation'
          },
          {
            name: 'Barbell Wrist Curls',
            sets: '4-5',
            reps: '20-30',
            notes: 'Forearm strength and development'
          }
        ]
      },
      {
        day: 'Day 4',
        bodyParts: ['Legs'],
        specialNotes: 'LEGENDARY leg workouts - the stuff of legend. Various squat variations for complete quad development. Sometimes limited to twice per month for upper/lower body symmetry',
        exercises: [
          {
            name: 'Barbell Squats',
            sets: '8-10',
            reps: '8-20',
            notes: 'THE legendary exercise - push boundaries of what\'s physically possible'
          },
          {
            name: 'Hack Squats',
            sets: '4-5',
            reps: '10-15',
            notes: 'Target different parts of quadriceps'
          },
          {
            name: 'Leg Extensions',
            sets: '5-8',
            reps: '10-15',
            notes: 'Isolation for quad definition'
          },
          {
            name: 'Lying Leg Curls',
            sets: '6-10',
            reps: '10-15',
            notes: 'High volume for hamstring development'
          },
          {
            name: 'Standing Calf Raises',
            sets: '3-4',
            reps: '10-15',
            notes: 'Calf development'
          },
          {
            name: 'Standing Calf Raises',
            sets: '3-4',
            reps: '10-15',
            notes: 'Additional calf work'
          }
        ]
      },
      {
        day: 'Any Day',
        bodyParts: ['Abs'],
        specialNotes: 'Strong core crucial for aesthetics and overall strength - high intensity with weights for resistance',
        exercises: [
          {
            name: 'Crunches',
            sets: '2',
            reps: '100',
            notes: 'High rep endurance work'
          },
          {
            name: 'Twists',
            sets: '1',
            reps: '10 minutes',
            notes: 'Time-based rotational core work'
          },
          {
            name: 'Roman Chair Leg Raises',
            sets: '3-4',
            reps: '25-30',
            notes: 'Lower ab focus with high reps'
          }
        ]
      }
    ]
  },
  'ronnie': {
    name: 'Ronnie Coleman',
    description: 'The King - 8x Mr. Olympia known for his legendary mass, incredible strength, and high-intensity training style',
    trainingPhilosophy: 'Train heavy, train hard, and push boundaries with high volume and intensity. Focus on compound movements with maximum weight and perfect form. Never skip leg day.',
    estimatedTimePerSession: '90-120 minutes',
    specialFeatures: [
      'High-intensity training with heavy weights',
      'Legendary leg development - "light weight, baby"',
      '8x Mr. Olympia champion',
      'Pyramid training with increasing intensity',
      'Focus on compound movements for maximum mass',
      'High volume with 15-20 reps per set'
    ],
    restDays: ['Day 7'],
    weeklySchedule: [
      {
        day: 'Day 1',
        bodyParts: ['Quads', 'Hamstrings', 'Calves'],
        specialNotes: 'Heavy leg day - Ronnie\'s legendary quad and hamstring development starts here',
        exercises: [
          {
            name: 'Barbell Squat',
            sets: '3',
            reps: '15',
            notes: 'Heavy compound movement for quad mass and overall strength'
          },
          {
            name: 'Barbell Hack Squat',
            sets: '3',
            reps: '15',
            notes: 'Different angle for complete quad development'
          },
          {
            name: 'Leg Extensions',
            sets: '3',
            reps: '15',
            notes: 'Quad isolation for definition and pump'
          },
          {
            name: 'Leg Curls (Standing)',
            sets: '3',
            reps: '15',
            notes: 'Hamstring development with standing position'
          },
          {
            name: 'Leg Curls (Lying)',
            sets: '3',
            reps: '15',
            notes: 'Different angle for complete hamstring work'
          },
          {
            name: 'Seated Single-Leg Curl',
            sets: '3',
            reps: '15',
            notes: 'Unilateral hamstring isolation'
          },
          {
            name: 'Seated Calf Raise',
            sets: '3',
            reps: '15',
            notes: 'Calf development and strength'
          }
        ]
      },
      {
        day: 'Day 2',
        bodyParts: ['Back', 'Triceps'],
        specialNotes: 'Back and tricep development with compound movements and isolation work',
        exercises: [
          {
            name: 'Bent-over Barbell Row',
            sets: '3',
            reps: '15-20',
            notes: 'Heavy rowing for back thickness and mass'
          },
          {
            name: 'Lying T-Bar Row',
            sets: '3',
            reps: '15-20',
            notes: 'T-bar variation for different back angle'
          },
          {
            name: 'One-Arm Dumbbell Row',
            sets: '3',
            reps: '15-20',
            notes: 'Unilateral back development'
          },
          {
            name: 'Wide-Grip Lat Pulldown',
            sets: '3',
            reps: '15-20',
            notes: 'Lat width development with wide grip'
          },
          {
            name: 'Triceps Dips',
            sets: '3',
            reps: '15-20',
            notes: 'Bodyweight tricep development'
          },
          {
            name: 'Standing Dumbbell Triceps Extension',
            sets: '3',
            reps: '15-20',
            notes: 'Overhead tricep isolation'
          },
          {
            name: 'Lying Triceps Press',
            sets: '3',
            reps: '15-20',
            notes: 'Lying position for tricep mass'
          }
        ]
      },
      {
        day: 'Day 3',
        bodyParts: ['Shoulders'],
        specialNotes: 'Complete shoulder development focusing on all three heads of the deltoid',
        exercises: [
          {
            name: 'Overhead Shoulder Press',
            sets: '3',
            reps: '15',
            notes: 'Compound shoulder movement for overall mass'
          },
          {
            name: 'Side Lateral Raise',
            sets: '3',
            reps: '15',
            notes: 'Side delt isolation for shoulder width'
          },
          {
            name: 'Front Dumbbell Raise',
            sets: '3',
            reps: '15',
            notes: 'Front delt development'
          },
          {
            name: 'Seated Bent-Over Dumbbell Rear Deltoid Raise',
            sets: '3',
            reps: '15',
            notes: 'Rear delt isolation for complete shoulder development'
          }
        ]
      },
      {
        day: 'Day 4',
        bodyParts: ['Chest', 'Biceps'],
        specialNotes: 'Chest and bicep development with compound and isolation movements',
        exercises: [
          {
            name: 'Medium Grip Barbell Bench Press',
            sets: '3',
            reps: '15-20',
            notes: 'Chest mass builder with medium grip'
          },
          {
            name: 'Medium Grip Barbell Incline Bench Press',
            sets: '3',
            reps: '15-20',
            notes: 'Upper chest development with incline'
          },
          {
            name: 'Decline Barbell Bench Press',
            sets: '3',
            reps: '15-20',
            notes: 'Lower chest emphasis'
          },
          {
            name: 'Barbell Curls',
            sets: '3',
            reps: '15-20',
            notes: 'Heavy bicep mass builder'
          },
          {
            name: 'One-Arm Dumbbell Preacher Curl',
            sets: '3',
            reps: '15-20',
            notes: 'Preacher position for bicep isolation'
          },
          {
            name: 'Alternate Hammer Curl',
            sets: '3',
            reps: '15-20',
            notes: 'Hammer grip for brachialis development'
          }
        ]
      },
      {
        day: 'Day 5',
        bodyParts: ['Quads', 'Hamstrings', 'Calves'],
        specialNotes: 'Second heavy leg day - Ronnie\'s legendary leg development continues',
        exercises: [
          {
            name: 'Barbell Squat',
            sets: '3',
            reps: '15',
            notes: 'Heavy compound movement - never skip leg day!'
          },
          {
            name: 'Barbell Hack Squat',
            sets: '3',
            reps: '15',
            notes: 'Different angle for complete quad development'
          },
          {
            name: 'Leg Extensions',
            sets: '3',
            reps: '15',
            notes: 'Quad isolation for definition'
          },
          {
            name: 'Leg Curls (Standing)',
            sets: '3',
            reps: '15',
            notes: 'Hamstring development'
          },
          {
            name: 'Leg Curls (Lying)',
            sets: '3',
            reps: '15',
            notes: 'Different hamstring angle'
          },
          {
            name: 'Seated Single-Leg Curl',
            sets: '3',
            reps: '15',
            notes: 'Unilateral hamstring isolation'
          },
          {
            name: 'Seated Calf Raise',
            sets: '3',
            reps: '15',
            notes: 'Calf strength and development'
          }
        ]
      },
      {
        day: 'Day 6',
        bodyParts: ['Chest', 'Triceps', 'Abs'],
        specialNotes: 'Chest, triceps, and abs - high intensity with varying rep ranges',
        exercises: [
          {
            name: 'Incline Dumbbell Press',
            sets: '3-4',
            reps: '12',
            notes: 'Upper chest development with dumbbells'
          },
          {
            name: 'Decline Barbell Press',
            sets: '3-4',
            reps: '12',
            notes: 'Lower chest emphasis with barbell'
          },
          {
            name: 'Incline Dumbbell Flyes',
            sets: '3-4',
            reps: '12',
            notes: 'Chest isolation on incline'
          },
          {
            name: 'Decline Dumbbell Press',
            sets: '3-4',
            reps: '12',
            notes: 'Lower chest with dumbbells'
          },
          {
            name: 'Cambered-Bar Triceps Extensions (Lying)',
            sets: '3-4',
            reps: '12',
            notes: 'Lying tricep extension with cambered bar'
          },
          {
            name: 'Triceps Dips',
            sets: '3-4',
            reps: '12',
            notes: 'Bodyweight tricep work'
          },
          {
            name: 'Donkey Calf Raises',
            sets: '3-4',
            reps: '12',
            notes: 'Calf development with donkey position'
          },
          {
            name: 'Seated Raises',
            sets: '3-4',
            reps: '12',
            notes: 'Seated calf raises for different angle'
          },
          {
            name: 'Crunches',
            sets: '3-4',
            reps: '12',
            notes: 'Ab development for core strength'
          }
        ]
      },
      {
        day: 'Day 7',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair for maximum growth',
        exercises: []
      }
    ]
  },
  'dorian': {
    name: 'Dorian Yates - Shadow',
    description: '6x Mr. Olympia Dorian Yates blood & guts training with high-intensity techniques and slow negatives. Focus on perfect form, intensity, and mind-muscle connection.',
    trainingPhilosophy: 'High-intensity training with slow negatives, perfect form, and maximum muscle stimulation. Focus on quality over quantity with blood & guts mentality.',
    estimatedTimePerSession: '60-90 minutes',
    specialFeatures: [
      '6x Mr. Olympia proven system',
      'High-intensity training with slow negatives',
      'Blood & Guts mentality',
      'Perfect form emphasis',
      'Quality over quantity approach',
      'Focus on mind-muscle connection',
      'Rest-pause and slow negative techniques'
    ],
    restDays: ['Day 3', 'Day 5', 'Day 7'],
    weeklySchedule: [
      {
        day: 'Day 1',
        bodyParts: ['Shoulders', 'Triceps', 'Abs'],
        sessionTime: 'Full Session: Shoulders, Triceps, Abs',
        specialNotes: 'Focus on perfect form - shoulders are prone to injury. Use slow negatives and controlled movements.',
        exercises: [
          // SHOULDERS
          {
            name: 'Smith Machine Shoulder Presses',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy compound for shoulder foundation - use slow negatives'
          },
          // TRICEPS
          {
            name: 'Lying EZ-Bar Tricep Extensions',
            sets: '4',
            reps: '8-10',
            notes: 'Tricep isolation with full range of motion'
          },
          // ABS
          {
            name: 'Crunches',
            sets: '3',
            reps: '20-25',
            notes: 'Core strength and definition'
          },
          {
            name: 'Reverse Crunches',
            sets: '3',
            reps: '15-20',
            notes: 'Lower ab development'
          }
        ]
      },
      {
        day: 'Day 2',
        bodyParts: ['Back', 'Rear Delts'],
        sessionTime: 'Full Session: Back and Rear Delts',
        specialNotes: 'Back and rear delts get dedicated focus for wide silhouette. Use mind-muscle connection and controlled movements.',
        exercises: [
          // BACK
          {
            name: 'Machine Pullovers',
            sets: '4',
            reps: '8-10',
            notes: 'Lats and serratus development'
          },
          {
            name: 'Reverse-Grip Hammer Pulldowns',
            sets: '4',
            reps: '8-10',
            notes: 'Wide back development with reverse grip'
          },
          {
            name: 'Wide-Grip Seated Cable Row',
            sets: '4',
            reps: '8-10',
            notes: 'Mid-back thickness and rear delt activation'
          }
        ]
      },
      {
        day: 'Day 3',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair for maximum growth',
        exercises: []
      },
      {
        day: 'Day 4',
        bodyParts: ['Chest', 'Biceps', 'Abs'],
        sessionTime: 'Full Session: Chest, Biceps, Abs',
        specialNotes: 'Upper body development day focusing on chest and biceps. Use perfect form and slow negatives.',
        exercises: [
          // CHEST
          {
            name: 'Incline Barbell Bench Press',
            sets: '4',
            reps: '6-8',
            notes: 'Upper chest development with heavy compound'
          },
          {
            name: 'Decline Bench Press',
            sets: '4',
            reps: '8-10',
            notes: 'Lower chest emphasis'
          },
          {
            name: 'Flat Bench Dumbbell Flys',
            sets: '3',
            reps: '10-12',
            notes: 'Chest isolation with full stretch'
          },
          // BICEPS
          {
            name: 'Machine Preacher Curl',
            sets: '4',
            reps: '8-10',
            notes: 'Bicep isolation with machine control'
          },
          // ABS
          {
            name: 'Crunches',
            sets: '3',
            reps: '20-25',
            notes: 'Core strength and definition'
          },
          {
            name: 'Reverse Crunches',
            sets: '3',
            reps: '15-20',
            notes: 'Lower ab development'
          }
        ]
      },
      {
        day: 'Day 5',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair for maximum growth',
        exercises: []
      },
      {
        day: 'Day 6',
        bodyParts: ['Legs'],
        sessionTime: 'Full Session: Legs',
        specialNotes: 'Complete leg development with high-intensity techniques. Never skip leg days - they\'re crucial for balanced physique.',
        exercises: [
          // QUADS
          {
            name: 'Leg Extensions',
            sets: '4',
            reps: '10-12',
            notes: 'Quad isolation for complete development'
          },
          {
            name: 'Leg Presses',
            sets: '4',
            reps: '8-10',
            notes: 'Heavy compound for overall leg mass'
          },
          // HAMSTRINGS
          {
            name: 'Seated Hamstring Curls',
            sets: '4',
            reps: '10-12',
            notes: 'Hamstring isolation and strength'
          },
          // CALVES
          {
            name: 'Calf Presses',
            sets: '4',
            reps: '15-20',
            notes: 'Calf development with leg press machine'
          }
        ]
      },
      {
        day: 'Day 7',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair for maximum growth',
        exercises: []
      }
    ]
  },
  'jay': {
    name: 'Jay Cutler - Quadfather',
    description: '4x Mr. Olympia Jay Cutler - renowned for his incredible quad development and balanced physique. Known for his high-volume training and focus on proper nutrition and recovery.',
    trainingPhilosophy: 'Balance, symmetry, and quad development. High-volume training with proper rest and nutrition. Focus on form, recovery, and never overtraining. Quality over quantity approach.',
    estimatedTimePerSession: '60-90 minutes',
    specialFeatures: [
      '4x Mr. Olympia champion',
      'Legendary quad development - "Quadfather"',
      'High-volume training with balanced approach',
      'Emphasis on proper nutrition and recovery',
      'Never overtrain - rest is crucial for gains',
      'Focus on symmetry and proportion',
      'Quality form and controlled movements',
      'Strategic rest days for optimal recovery'
    ],
    restDays: ['Wednesday', 'Sunday'],
    weeklySchedule: [
      {
        day: 'Monday',
        bodyParts: ['Shoulders', 'Triceps', 'Traps', 'Abs'],
        sessionTime: 'Full Session: Delts, Triceps, Traps, and Abs',
        specialNotes: 'Upper body push day with shoulder focus. Never overtrain - quality over quantity.',
        exercises: [
          // DELTS
          {
            name: 'Delts Dumbbell Side Laterals',
            sets: '3',
            reps: '12',
            notes: 'Side delt development for shoulder width'
          },
          {
            name: 'Dumbbell Press',
            sets: '3',
            reps: '8-12',
            notes: 'Overall shoulder development with dumbbells'
          },
          {
            name: 'Side Lateral Cable',
            sets: '3',
            reps: '8-12',
            notes: 'Cable work for constant tension on side delts'
          },
          {
            name: 'Front Raise with Olympic Bar',
            sets: '2',
            reps: '10',
            notes: 'Front delt isolation with barbell'
          },
          {
            name: 'Bent-Over Dumbbell Laterals',
            sets: '3',
            reps: '10',
            notes: 'Rear delt development with bent-over position'
          },
          // TRICEPS
          {
            name: 'Triceps Cable Extensions',
            sets: '4',
            reps: '15',
            notes: 'Tricep isolation with cable for constant tension'
          },
          {
            name: 'Single Arm Extensions',
            sets: '3',
            reps: '15',
            notes: 'Unilateral tricep work for balance'
          },
          {
            name: 'Close-Grip Bench Press',
            sets: '3',
            reps: '8',
            notes: 'Heavy compound for tricep mass'
          },
          {
            name: 'Superset: French Press',
            sets: '3',
            reps: '8',
            notes: 'Superset for tricep intensity'
          },
          {
            name: 'Dumbbell Kickbacks',
            sets: '3',
            reps: '12',
            notes: 'Tricep isolation with kickback movement'
          },
          {
            name: 'Dips',
            sets: '3',
            reps: '15',
            notes: 'Bodyweight tricep work to failure'
          },
          // TRAPS
          {
            name: 'Traps Shrugs',
            sets: '4',
            reps: '12',
            notes: 'Trap development for complete shoulder aesthetics'
          },
          // ABS
          {
            name: 'Crunches',
            sets: '3',
            reps: '20',
            notes: 'Core strength and definition'
          },
          {
            name: 'Rope Crunch',
            sets: '3',
            reps: '20',
            notes: 'Cable rope work for intense ab contraction'
          },
          {
            name: 'Hanging Leg Raise',
            sets: '3',
            reps: '12',
            notes: 'Lower ab development with hanging position'
          },
          {
            name: 'Leg Lifts',
            sets: '3',
            reps: '10',
            notes: 'Additional lower ab work'
          }
        ]
      },
      {
        day: 'Tuesday',
        bodyParts: ['Back'],
        sessionTime: 'Full Session: Back',
        specialNotes: 'Complete back development with compound and isolation movements for thickness and width.',
        exercises: [
          {
            name: 'Wide-Grip Pull-downs',
            sets: '3',
            reps: '10',
            notes: 'Lat width development with wide grip'
          },
          {
            name: 'Dumbbell Rows',
            sets: '3',
            reps: '10',
            notes: 'Unilateral back development with dumbbells'
          },
          {
            name: 'Bent-Over Barbell Rows',
            sets: '4',
            reps: '10',
            notes: 'Heavy compound for back thickness'
          },
          {
            name: 'Deadlifts',
            sets: '3',
            reps: '12',
            notes: 'Posterior chain and lower back development'
          },
          {
            name: 'Close-Grip T-bar Row',
            sets: '3',
            reps: '10',
            notes: 'T-bar variation for different back angle'
          },
          {
            name: 'Behind-the-Neck Pull-downs',
            sets: '3',
            reps: '10',
            notes: 'Alternative lat pulldown variation'
          },
          {
            name: 'Seated Rows',
            sets: '3',
            reps: '10',
            notes: 'Mid-back development with seated position'
          },
          {
            name: 'Hyperextensions',
            sets: '3',
            reps: '10',
            notes: 'Lower back strengthening and development'
          }
        ]
      },
      {
        day: 'Wednesday',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair. Never overtrain for maximum gains.',
        exercises: []
      },
      {
        day: 'Thursday',
        bodyParts: ['Chest', 'Biceps', 'Abs'],
        sessionTime: 'Full Session: Chest, Biceps, and Abs',
        specialNotes: 'Upper body development focusing on chest and biceps with balanced approach.',
        exercises: [
          // CHEST
          {
            name: 'Chest Incline Barbell Press',
            sets: '5',
            reps: '10-12',
            notes: 'Upper chest development with heavy compound'
          },
          {
            name: 'Flat Dumbbell Press',
            sets: '3',
            reps: '8-10',
            notes: 'Chest mass with dumbbell control'
          },
          {
            name: 'Incline Dumbbell Flyes',
            sets: '3',
            reps: '10',
            notes: 'Upper chest isolation with flyes'
          },
          {
            name: 'Cable Crossovers',
            sets: '3',
            reps: '12',
            notes: 'Chest isolation with constant cable tension'
          },
          {
            name: 'Decline Bench Press',
            sets: '3',
            reps: '8',
            notes: 'Lower chest emphasis with decline angle'
          },
          // BICEPS
          {
            name: 'Biceps Straight Bar Curl',
            sets: '5',
            reps: '15',
            notes: 'Heavy bicep mass builder with straight bar'
          },
          {
            name: 'Single Arm Dumbbell Curl',
            sets: '3',
            reps: '12',
            notes: 'Unilateral bicep development'
          },
          {
            name: 'Single Arm Preacher Curl',
            sets: '3',
            reps: '10',
            notes: 'Preacher position for bicep isolation'
          },
          {
            name: 'Hammer Curl',
            sets: '2',
            reps: '12-15',
            notes: 'Hammer grip for brachialis development'
          },
          {
            name: 'Forearms Reverse Curls',
            sets: '6',
            reps: '15',
            notes: 'Forearm strength and development'
          },
          // ABS
          {
            name: 'Abs Crunches',
            sets: '3',
            reps: '20',
            notes: 'Core strength and upper ab development'
          },
          {
            name: 'Rope Crunch',
            sets: '3',
            reps: '20',
            notes: 'Cable rope work for intense ab contraction'
          },
          {
            name: 'Hanging Leg Raise',
            sets: '3',
            reps: '12',
            notes: 'Lower ab development with hanging position'
          },
          {
            name: 'Leg Lifts',
            sets: '3',
            reps: '10',
            notes: 'Additional lower ab work'
          }
        ]
      },
      {
        day: 'Friday',
        bodyParts: ['Quads'],
        sessionTime: 'Full Session: Quads',
        specialNotes: 'Quadfather\'s legendary quad development day. Focus on complete quadriceps development with multiple angles.',
        exercises: [
          {
            name: 'Leg Extensions',
            sets: '3',
            reps: '20',
            notes: 'Quad isolation and pre-exhaustion'
          },
          {
            name: 'Leg Press',
            sets: '4',
            reps: '12',
            notes: 'Heavy compound for overall quad mass'
          },
          {
            name: 'Squats',
            sets: '4',
            reps: '6-10',
            notes: 'Foundation quad movement - heavy and controlled'
          },
          {
            name: 'Lunges',
            sets: '3',
            reps: '8 steps per leg',
            notes: 'Unilateral quad work for balance and development'
          },
          {
            name: 'Leg Extensions',
            sets: '4',
            reps: '10',
            notes: 'Additional quad isolation for complete development'
          }
        ]
      },
      {
        day: 'Saturday',
        bodyParts: ['Hamstrings', 'Calves', 'Abs'],
        sessionTime: 'Full Session: Hamstrings, Calves, and Abs',
        specialNotes: 'Complete leg development with hamstring focus and calf work, plus core strengthening.',
        exercises: [
          // HAMSTRINGS
          {
            name: 'Hamstrings Lying Leg Curl',
            sets: '6',
            reps: '12',
            notes: 'Hamstring isolation with lying position'
          },
          {
            name: 'Romanian Deadlift',
            sets: '3',
            reps: '10',
            notes: 'Hamstring and posterior chain development'
          },
          {
            name: 'Single-Leg Hamstring Curl',
            sets: '3',
            reps: '12',
            notes: 'Unilateral hamstring work for balance'
          },
          {
            name: 'Leg Press',
            sets: '3',
            reps: '12',
            notes: 'Additional hamstring emphasis with leg press'
          },
          // CALVES
          {
            name: 'Calves Standing Calf Raise',
            sets: '4',
            reps: '10',
            notes: 'Standing calf development for mass'
          },
          {
            name: 'Donkey Calf Raise',
            sets: '2',
            reps: '10',
            notes: 'Donkey position for different calf angle'
          },
          {
            name: 'Seated Calf Raise',
            sets: '3',
            reps: '10',
            notes: 'Seated position for soleus development'
          },
          // ABS
          {
            name: 'Abs Crunches',
            sets: '3',
            reps: '20',
            notes: 'Core strength and definition'
          },
          {
            name: 'Rope Crunch',
            sets: '3',
            reps: '20',
            notes: 'Cable rope work for intense ab contraction'
          },
          {
            name: 'Hanging Leg Raise',
            sets: '3',
            reps: '12',
            notes: 'Lower ab development with hanging position'
          },
          {
            name: 'Leg Lifts',
            sets: '3',
            reps: '10',
            notes: 'Additional lower ab work'
          }
        ]
      },
      {
        day: 'Sunday',
        bodyParts: [],
        specialNotes: 'Rest day - recovery is crucial. Never overtrain for maximum gains and longevity.',
        exercises: []
      }
    ]
  },
  'phil': {
    name: 'Phil Heath - The Gift',
    description: '7x Mr. Olympia Phil Heath - known for his incredible conditioning, aesthetics, and balanced physique. The master of "aesthetic bodybuilding" with perfect proportions and conditioning.',
    trainingPhilosophy: 'Focus on aesthetics, proportions, and conditioning. Train with perfect form and mind-muscle connection. High-volume training with strategic intensity for maximum muscle stimulation and definition.',
    estimatedTimePerSession: '75-90 minutes',
    specialFeatures: [
      '7x Mr. Olympia champion',
      'Master of aesthetic bodybuilding',
      'Perfect proportions and conditioning',
      'High-volume training with strategic intensity',
      'Mind-muscle connection emphasis',
      'Focus on complete muscle development',
      'Strategic rest days for recovery',
      'Balanced approach to avoid overtraining'
    ],
    restDays: ['Wednesday', 'Sunday'],
    weeklySchedule: [
      {
        day: 'Monday',
        bodyParts: ['Quads', 'Hamstrings', 'Calves'],
        sessionTime: 'Full Session: Legs',
        specialNotes: 'High-volume leg day focusing on complete lower body development with multiple angles and techniques',
        exercises: [
          {
            name: 'Extensions',
            sets: '4',
            reps: '8-12',
            notes: 'Quad isolation for definition and pump'
          },
          {
            name: 'Front Squats',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy compound movement for quad mass and strength'
          },
          {
            name: 'Leg Presses',
            sets: '3',
            reps: '6-8',
            notes: 'Quad and glute development with high intensity'
          },
          {
            name: 'Hack Squats',
            sets: '7',
            reps: '6-8',
            notes: 'Heavy quad work with hack machine for different angle'
          },
          {
            name: 'Standing Calf Raises',
            sets: '4',
            reps: '15-20',
            notes: 'Calf development with standing position'
          },
          {
            name: 'Leg Press Calf Raises',
            sets: '4',
            reps: '15-20',
            notes: 'Calf isolation using leg press machine'
          },
          {
            name: 'Seated Calf Raises',
            sets: '7',
            reps: '12-15',
            notes: 'Seated calf work for complete development'
          },
          {
            name: 'Stiff-Leg Deadlifts',
            sets: '4',
            reps: '6-8',
            notes: 'Hamstring and posterior chain development'
          },
          {
            name: 'Lying Leg Curls',
            sets: '4',
            reps: '6-8',
            notes: 'Hamstring isolation with lying position'
          },
          {
            name: 'Seated Leg Curls (Dagger)',
            sets: '7',
            reps: '5-7',
            notes: 'Seated hamstring work with dagger machine'
          }
        ]
      },
      {
        day: 'Tuesday',
        bodyParts: ['Chest', 'Triceps'],
        sessionTime: 'Full Session: Chest & Triceps',
        specialNotes: 'Chest and tricep synergy with high-intensity compound and isolation movements',
        exercises: [
          {
            name: 'Dumbbell Incline Presses',
            sets: '4',
            reps: '6-8',
            notes: 'Upper chest development with dumbbell control'
          },
          {
            name: 'Dumbbell Incline Flyes',
            sets: '4',
            reps: '6-8',
            notes: 'Upper chest isolation with flyes'
          },
          {
            name: 'Hammer Strength Bench Presses',
            sets: '3',
            reps: '6-8',
            notes: 'Machine work for controlled chest development'
          },
          {
            name: 'Pec Decks',
            sets: '7',
            reps: '6-8',
            notes: 'High-volume chest isolation with pec deck machine'
          },
          {
            name: 'Pushdowns with Rope Attachment',
            sets: '3',
            reps: '12',
            notes: 'Tricep isolation with rope for full range'
          },
          {
            name: 'Dips',
            sets: '3',
            reps: '12',
            notes: 'Bodyweight tricep and chest development'
          },
          {
            name: 'Close-Grip Bench Presses',
            sets: '3',
            reps: '6-8',
            notes: 'Heavy tricep compound movement'
          },
          {
            name: 'Lying Triceps Extensions',
            sets: '7',
            reps: '6-8',
            notes: 'Tricep isolation with high volume'
          }
        ]
      },
      {
        day: 'Wednesday',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair for maximum growth',
        exercises: []
      },
      {
        day: 'Thursday',
        bodyParts: ['Back', 'Biceps'],
        sessionTime: 'Full Session: Back & Biceps',
        specialNotes: 'Complete back development with bicep synergy using compound and isolation movements',
        exercises: [
          {
            name: 'Wide-Grip Pull-Ups',
            sets: '3',
            reps: '10',
            notes: 'Lat width development with wide grip'
          },
          {
            name: 'Power-Grip Chin-Ups',
            sets: '3',
            reps: '10',
            notes: 'Lat and bicep development with chin-up grip'
          },
          {
            name: 'T-Bar Rows',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy rowing for back thickness'
          },
          {
            name: 'Bent-Over Rows (Underhand Grip)',
            sets: '4',
            reps: '6-8',
            notes: 'Back development with underhand grip'
          },
          {
            name: 'One-Arm Dumbbell Rows',
            sets: '3',
            reps: '6-8',
            notes: 'Unilateral back development'
          },
          {
            name: 'Straight-Arm Pull Downs with Rope Attachment',
            sets: '7',
            reps: '12',
            notes: 'Lat isolation with straight arms'
          },
          {
            name: 'Standing EZ-Bar Curls',
            sets: '3',
            reps: '6-8',
            notes: 'Bicep mass builder with EZ bar'
          },
          {
            name: 'Hammer Curls',
            sets: '3',
            reps: '6-8',
            notes: 'Brachialis development with hammer grip'
          },
          {
            name: 'Concentration Curls',
            sets: '3',
            reps: '6-8',
            notes: 'Bicep isolation with concentration position'
          },
          {
            name: 'Dumbbell Preacher Curls',
            sets: '7',
            reps: '5-7',
            notes: 'Preacher position for bicep isolation'
          }
        ]
      },
      {
        day: 'Friday',
        bodyParts: ['Shoulders', 'Traps'],
        sessionTime: 'Full Session: Shoulders & Traps',
        specialNotes: 'Complete shoulder development including all three heads of the deltoid plus trap work',
        exercises: [
          {
            name: 'Dumbbell Military Presses',
            sets: '4',
            reps: '6-8',
            notes: 'Overall shoulder development with dumbbells'
          },
          {
            name: 'Dumbbell Front Raises',
            sets: '4',
            reps: '6-8',
            notes: 'Front delt isolation'
          },
          {
            name: 'Upright Rows',
            sets: '4',
            reps: '6-8',
            notes: 'Side and rear delt development'
          },
          {
            name: 'Dumbbell Lateral Raises',
            sets: '7',
            reps: '6-8',
            notes: 'Side delt isolation with high volume'
          },
          {
            name: 'Dumbbell Shrugs',
            sets: '4',
            reps: '6-8',
            notes: 'Trap development with dumbbells'
          },
          {
            name: 'Barbell Shrugs',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy trap work with barbell'
          },
          {
            name: 'Bent-Over Dumbbell Raises',
            sets: '4',
            reps: '6-8',
            notes: 'Rear delt development'
          },
          {
            name: 'Reverse Pec Decks',
            sets: '7',
            reps: '6-8',
            notes: 'Rear delt isolation with pec deck machine'
          }
        ]
      },
      {
        day: 'Saturday',
        bodyParts: ['Chest', 'Triceps'],
        sessionTime: 'Full Session: Chest & Triceps',
        specialNotes: 'Second chest and tricep session for continued development and refinement',
        exercises: [
          {
            name: 'Incline Dumbbell Press',
            sets: '4',
            reps: '6-8',
            notes: 'Upper chest development'
          },
          {
            name: 'Flat Bench Press',
            sets: '4',
            reps: '6-8',
            notes: 'Chest mass with flat bench'
          },
          {
            name: 'Cable Crossovers',
            sets: '4',
            reps: '8-10',
            notes: 'Chest isolation with cables'
          },
          {
            name: 'Pushdowns',
            sets: '4',
            reps: '8-10',
            notes: 'Tricep isolation'
          },
          {
            name: 'Overhead Tricep Extensions',
            sets: '4',
            reps: '8-10',
            notes: 'Tricep development with overhead position'
          }
        ]
      },
      {
        day: 'Sunday',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair for maximum growth',
        exercises: []
      }
    ]
  },
  'kai': {
    name: 'Kai Greene - The Predator',
    description: 'Kai Greene - The Predator, known for his incredible back development, artistic posing, and intense training style. Former Mr. Olympia competitor with a unique approach to muscle building.',
    trainingPhilosophy: 'High-volume training with artistic approach. Focus on back development, full range of motion, and mind-muscle connection. Mix of compound and isolation movements for complete muscle stimulation.',
    estimatedTimePerSession: '60-75 minutes',
    specialFeatures: [
      'High-volume training with pyramid sets',
      'Emphasis on back development and aesthetics',
      'Artistic posing and presentation focus',
      'Mix of compound and isolation exercises',
      'Focus on full range of motion',
      'Intense training with proper recovery'
    ],
    restDays: ['Day 6', 'Day 7'],
    weeklySchedule: [
      {
        day: 'Day 1',
        bodyParts: ['Chest', 'Calves'],
        sessionTime: 'Chest & Calves Session',
        specialNotes: 'Chest and calf combination for balanced upper body and lower leg development',
        exercises: [
          {
            name: 'Bench Press',
            sets: '3',
            reps: '20, 15, 12',
            notes: 'Classic chest mass builder with pyramid sets'
          },
          {
            name: 'Dumbbell Fly',
            sets: '3',
            reps: '20, 15, 12',
            notes: 'Chest isolation with dumbbells for full stretch'
          },
          {
            name: 'Decline Bench Press',
            sets: '3',
            reps: '20, 15, 12',
            notes: 'Lower chest development with decline angle'
          },
          {
            name: 'Arm Pullover',
            sets: '3',
            reps: '20, 15, 12',
            notes: 'Chest and back combination movement'
          },
          {
            name: 'Seated Calf Raise',
            sets: '4',
            reps: '10-15',
            notes: 'Calf isolation in seated position'
          },
          {
            name: 'Standing Calf Raise',
            sets: '4',
            reps: '10-15',
            notes: 'Standing calf development with full range'
          },
          {
            name: 'Donkey Calf Raise',
            sets: '4',
            reps: '10-15',
            notes: 'Advanced calf movement for maximum development'
          }
        ]
      },
      {
        day: 'Day 2',
        bodyParts: ['Shoulders', 'Forearms'],
        sessionTime: 'Shoulders & Forearms Session',
        specialNotes: 'Complete shoulder development with forearm work for balanced upper body',
        exercises: [
          {
            name: 'Arnold Press',
            sets: '3',
            reps: '12-15',
            notes: 'Full shoulder development with rotational movement'
          },
          {
            name: 'Behind the Neck Press',
            sets: '3',
            reps: '12-15',
            notes: 'Classic overhead press variation'
          },
          {
            name: 'Lateral Raise',
            sets: '3',
            reps: '12-15',
            notes: 'Side delt isolation for shoulder width'
          },
          {
            name: 'Front Raise',
            sets: '3',
            reps: '12-15',
            notes: 'Front delt development'
          },
          {
            name: 'Shrugs',
            sets: '3',
            reps: '12-15',
            notes: 'Trap development for shoulder aesthetics'
          },
          {
            name: 'Reverse Curls',
            sets: '4',
            reps: '8-12',
            notes: 'Forearm development with reverse grip'
          },
          {
            name: 'Hammer Curls',
            sets: '4',
            reps: '10-12',
            notes: 'Neutral grip forearm and brachialis work'
          },
          {
            name: 'Wrist Curls',
            sets: '4',
            reps: '10-12',
            notes: 'Direct forearm flexor development'
          }
        ]
      },
      {
        day: 'Day 3',
        bodyParts: ['Back'],
        sessionTime: 'Back Development Session',
        specialNotes: 'Kai Greene signature back day with focus on lats, middle back, and lower back',
        exercises: [
          {
            name: 'Barbell Pullover',
            sets: '3',
            reps: '10-15',
            notes: 'Chest and back combination for full development'
          },
          {
            name: 'Lats Pulldown',
            sets: '3',
            reps: '10-15',
            notes: 'Lat isolation with controlled movement'
          },
          {
            name: 'Bent-Over Barbell Rows',
            sets: '3',
            reps: '10-15',
            notes: 'Middle back thickness with barbell'
          },
          {
            name: 'Seated Cable Rows',
            sets: '3',
            reps: '10-15',
            notes: 'Back isolation with cable for constant tension'
          }
        ]
      },
      {
        day: 'Day 4',
        bodyParts: ['Legs', 'Calves'],
        sessionTime: 'Legs & Calves Session',
        specialNotes: 'Complete leg development with calf work for balanced lower body',
        exercises: [
          {
            name: 'Squats',
            sets: '3',
            reps: '10-12',
            notes: 'King of exercises for overall leg development'
          },
          {
            name: 'Lying Leg Curls',
            sets: '3',
            reps: '10-12',
            notes: 'Hamstring isolation for balanced leg development'
          },
          {
            name: 'Deadlifts',
            sets: '3',
            reps: '10-12',
            notes: 'Posterior chain development with compound movement'
          },
          {
            name: 'Lunges',
            sets: '4',
            reps: '10-15',
            notes: 'Single-leg work for unilateral strength'
          },
          {
            name: 'Seated Calf Raise',
            sets: '4',
            reps: '10-15',
            notes: 'Seated calf isolation'
          },
          {
            name: 'Standing Calf Raise',
            sets: '4',
            reps: '10-15',
            notes: 'Standing calf development'
          },
          {
            name: 'Donkey Calf Raise',
            sets: '4',
            reps: '10-15',
            notes: 'Advanced calf work for maximum development'
          }
        ]
      },
      {
        day: 'Day 5',
        bodyParts: ['Arms'],
        sessionTime: 'Arms Specialization Session',
        specialNotes: 'Complete arm development with focus on biceps and triceps for balanced aesthetics',
        exercises: [
          {
            name: 'Reverse Curls',
            sets: '4',
            reps: '8-12',
            notes: 'Forearm and brachialis development'
          },
          {
            name: 'Hammer Curls',
            sets: '4',
            reps: '10-12',
            notes: 'Brachialis emphasis with neutral grip'
          },
          {
            name: 'Wrist Curls',
            sets: '4',
            reps: '10-12',
            notes: 'Direct forearm work'
          },
          {
            name: 'Preacher Curls',
            sets: '4',
            reps: '10-12',
            notes: 'Isolated bicep development'
          },
          {
            name: 'Bicep Curls',
            sets: '4',
            reps: '10-12',
            notes: 'Standard bicep curl for mass'
          },
          {
            name: 'Dumbbell Kickbacks',
            sets: '3',
            reps: '15-20',
            notes: 'Tricep isolation movement'
          },
          {
            name: 'Overhead Dumbbell Triceps Extension',
            sets: '3',
            reps: '15-20',
            notes: 'Tricep development with overhead position'
          },
          {
            name: 'Triceps Pulldown',
            sets: '3',
            reps: '15-20',
            notes: 'Cable tricep isolation'
          }
        ]
      },
      {
        day: 'Day 6',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair for continued growth',
        exercises: []
      },
      {
        day: 'Day 7',
        bodyParts: [],
        specialNotes: 'Rest day - full recovery for maximum muscle growth and performance',
        exercises: []
      }
    ]
  },
  'franco': {
    name: 'Franco Columbu - The Sardinian Strongman',
    description: 'Franco Columbu - The Sardinian Strongman, Arnold Schwarzenegger\'s training partner and one of the strongest bodybuilders ever. Known for his incredible power and balanced physique development.',
    trainingPhilosophy: 'High-intensity training with progressive overload. Focus on compound movements, supersets for efficiency, and pyramid training for optimal muscle stimulation. Emphasis on heavy weights and controlled movements.',
    estimatedTimePerSession: '60-75 minutes',
    specialFeatures: [
      'Superset training for efficiency and intensity',
      'Pyramid training schemes (increasing weight, decreasing reps)',
      'Heavy compound movements for maximum muscle stimulation',
      'Progressive overload with asterisk exercises',
      'Balanced development across all muscle groups',
      'High-intensity, low-rest training methodology'
    ],
    restDays: ['Day 6', 'Day 7'],
    weeklySchedule: [
      {
        day: 'Day 1',
        bodyParts: ['Chest'],
        sessionTime: 'Chest Specialization Session',
        specialNotes: 'Columbu\'s signature chest workout with supersets and pyramid training. Complete 3 cycles of each superset group.',
        exercises: [
          {
            name: 'Barbell Bench Press',
            sets: '3',
            reps: '15, 10, 4',
            notes: 'Pyramid training - decrease reps, increase weight each set. Superset with cable crossovers.'
          },
          {
            name: 'Cable Crossovers',
            sets: '3',
            reps: '20',
            notes: 'Superset with bench press - no rest between exercises'
          },
          {
            name: 'Dumbbell Flyes',
            sets: '3',
            reps: '20, 15, 6',
            notes: 'Pyramid training - decrease reps, increase weight each set. Superset with cable crossovers.'
          },
          {
            name: 'Cable Crossovers',
            sets: '3',
            reps: '20',
            notes: 'Superset with dumbbell flyes - no rest between exercises'
          },
          {
            name: 'Incline Bench Press',
            sets: '3',
            reps: '15',
            notes: 'Complete all exercises in superset 3 back-to-back before resting'
          },
          {
            name: 'Barbell Pullovers',
            sets: '3',
            reps: '25',
            notes: 'Chest and back combination movement in superset 3'
          },
          {
            name: 'Dips',
            sets: '3',
            reps: 'to failure',
            notes: 'Bodyweight dips to failure in superset 3'
          },
          {
            name: 'Cable Crossovers',
            sets: '3',
            reps: '25',
            notes: 'Final exercise in superset 3 - higher rep range'
          }
        ]
      },
      {
        day: 'Day 2',
        bodyParts: ['Shoulders'],
        sessionTime: 'Shoulders Specialization Session',
        specialNotes: 'Complete shoulder development with multiple angles and isolation work',
        exercises: [
          {
            name: 'Standing Dumbbell Lateral Raise',
            sets: '4',
            reps: '10',
            notes: 'Side delt isolation for shoulder width'
          },
          {
            name: 'Bent Lateral Raise',
            sets: '6',
            reps: '10',
            notes: 'Bent-over lateral raises for posterior delt development'
          },
          {
            name: 'Behind-the-Neck Press',
            sets: '4',
            reps: '10',
            notes: 'Overhead pressing with behind-the-neck variation'
          },
          {
            name: 'Alternating Dumbbell Front Raises',
            sets: '3',
            reps: '8',
            notes: 'Front delt isolation with alternating movement'
          },
          {
            name: 'Cable Lateral Raise',
            sets: '3',
            reps: '10',
            notes: 'Cable machine for constant tension on side delts'
          }
        ]
      },
      {
        day: 'Day 3',
        bodyParts: ['Arms'],
        sessionTime: 'Arms Specialization Session',
        specialNotes: 'Complete arm development with superset training for efficiency',
        exercises: [
          {
            name: 'Cable Pushdowns',
            sets: '4',
            reps: '8',
            notes: 'Tricep isolation - superset with standing dumbbell curls'
          },
          {
            name: 'Standing Dumbbell Curls',
            sets: '4',
            reps: '8',
            notes: 'Bicep curls - superset with cable pushdowns'
          },
          {
            name: 'Lying Barbell Triceps Extension',
            sets: '4',
            reps: '8',
            notes: 'Tricep extension - superset with preacher curls'
          },
          {
            name: 'Barbell Preacher Curl',
            sets: '4',
            reps: '8',
            notes: 'Isolated bicep work - superset with lying extensions'
          },
          {
            name: 'Seated Barbell Extension',
            sets: '4',
            reps: '8',
            notes: 'Overhead tricep extension - superset with incline curls'
          },
          {
            name: 'Dumbbell Incline Curl',
            sets: '4',
            reps: '8',
            notes: 'Incline bicep curls - superset with seated extensions'
          }
        ]
      },
      {
        day: 'Day 4',
        bodyParts: ['Legs'],
        sessionTime: 'Legs Specialization Session',
        specialNotes: 'Heavy compound movements with pyramid training. Alternate lunges and deadlifts between sessions for recovery.',
        exercises: [
          {
            name: 'Barbell Squat',
            sets: '7',
            reps: '20, 15, 10, 8, 6, 4, 2',
            notes: 'King of exercises - pyramid training, decrease reps increase weight'
          },
          {
            name: 'Leg Press',
            sets: '4',
            reps: '50, 25, 15, 8',
            notes: 'Machine-based leg work with pyramid scheme'
          },
          {
            name: 'Leg Extensions',
            sets: '6-7',
            reps: '20',
            notes: 'Quadriceps isolation for complete development'
          },
          {
            name: 'Barbell Lunges',
            sets: '2-3',
            reps: '12-15',
            notes: 'Alternate inclusion between sessions for optimal recovery'
          },
          {
            name: 'Deadlifts',
            sets: '6',
            reps: '5, 5, 5, 3, 1, 1',
            notes: 'Heavy posterior chain work - alternate inclusion between sessions'
          }
        ]
      },
      {
        day: 'Day 5',
        bodyParts: ['Back'],
        sessionTime: 'Back Development Session',
        specialNotes: 'Complete back development with compound and isolation movements',
        exercises: [
          {
            name: 'Pull-ups (Wide Grip)',
            sets: '6',
            reps: '10-15',
            notes: 'Bodyweight pulling for lat development'
          },
          {
            name: 'T-Bar Row',
            sets: '4',
            reps: '10',
            notes: 'Heavy rowing movement for middle back thickness'
          },
          {
            name: 'Seated Cable Row',
            sets: '4',
            reps: '10',
            notes: 'Machine rowing for controlled back isolation'
          },
          {
            name: 'One-Arm Dumbbell Rows',
            sets: '3',
            reps: '10',
            notes: 'Unilateral rowing - superset with hammer grip pull-ups'
          },
          {
            name: 'Hammer Grip Pull-ups',
            sets: '3',
            reps: '10',
            notes: 'Neutral grip pull-ups - superset with one-arm rows. Attach parallel-grip cable to pull-up bar'
          }
        ]
      },
      {
        day: 'Day 6',
        bodyParts: [],
        specialNotes: 'Rest day - recovery and muscle repair for continued growth',
        exercises: []
      },
      {
        day: 'Day 7',
        bodyParts: [],
        specialNotes: 'Rest day - full recovery for maximum muscle growth and performance',
        exercises: []
      }
    ]
  },
  frank_chemist: {
    name: 'Frank Zane - The Chemist',
    description: 'Aesthetic Perfection with Technical Precision - High-rep training focusing on muscle separation, symmetry, and detailed execution',
    trainingPhilosophy: 'High-rep, technical training with focus on muscle isolation, stretching between sets, and mind-muscle connection. Emphasizes slow negatives, full range of motion, and mind-muscle connection.',
    estimatedTimePerSession: '90-120 minutes',
    specialFeatures: [
      '3-day split focusing on back/biceps, thighs/calves, and chest/shoulders/triceps',
      'High-rep aesthetic training (12-15 reps per set)',
      'Emphasis on stretching between sets for maximum muscle isolation',
      'Wide grip deadlifts from floor and blocks for complete back development',
      'Pyramid training schemes and superset combinations',
      'Focus on mind-muscle connection and technical execution',
      'Strategic stretching protocols for optimal muscle separation'
    ],
    restDays: ['Day 4', 'Day 5', 'Day 6', 'Day 7'],
    weeklySchedule: [
      {
        day: 'Day 1',
        bodyParts: ['Back', 'Biceps', 'Forearms', 'Abs'],
        specialNotes: 'Focus on lat stretching between sets, slow negatives, and mind-muscle connection. Deadlifts performed with wide grip for maximum back development.',
        exercises: [
          {
            name: 'Wide Grip Deadlifts',
            sets: '6-7',
            reps: '15, 12, 10, 10, 10, 8 (occasionally + 6)',
            notes: 'First 3 sets from floor, next 3 sets from blocks. Stretch lats between sets. Occasionally add 7th set of 6 reps.',
            restTime: '2-3 minutes'
          },
          {
            name: 'T-Bar Rows',
            sets: '3',
            reps: '12, 10, 8',
            notes: 'Using 7-foot Olympic bar. Focus on squeezing shoulder blades together at peak contraction.',
            restTime: '90-120 seconds'
          },
          {
            name: 'Front Pulldowns',
            sets: '3',
            reps: '8-10',
            notes: 'Stretch lats fully at bottom of each rep. Hold stretch for 2 seconds between sets.',
            restTime: '60-90 seconds'
          },
          {
            name: 'Dumbbell Row',
            sets: '3',
            reps: '8-10',
            notes: 'Alternate arms. Stretch lats fully between sets. Focus on pulling with back, not arms.',
            restTime: '60-90 seconds'
          },
          {
            name: 'One Arm Dumbbell Concentration Curls',
            sets: '3',
            reps: '8-10',
            notes: 'Hold dumbbell at top while squeezing biceps for 2 seconds before lowering slowly.',
            restTime: '60 seconds'
          },
          {
            name: 'Alternate Dumbbell Curls',
            sets: '3',
            reps: '8-10',
            notes: 'Alternate arms with no rest between. Focus on peak contraction.',
            restTime: '60 seconds'
          },
          {
            name: '45 Degree Incline Dumbbell Curls',
            sets: '3',
            reps: '12, 10, 8',
            notes: 'Pyramid sets. Full range of motion with controlled negatives.',
            restTime: '60 seconds'
          },
          {
            name: 'Barbell Reverse Curls',
            sets: '2',
            reps: '12',
            notes: 'Superset with seated barbell wrist curls. Stretch forearms after each set.',
            restTime: 'No rest (superset)'
          },
          {
            name: 'Seated Barbell Wrist Curls',
            sets: '2',
            reps: '20',
            notes: 'Superset with reverse curls. Perform immediately after reverse curls.',
            restTime: '90 seconds'
          },
          {
            name: 'Crunches',
            sets: '2-3',
            reps: '50',
            notes: 'Superset with hanging leg raises. Focus on full range of motion.',
            restTime: 'No rest (superset)'
          },
          {
            name: 'Hanging Leg Raises',
            sets: '2-3',
            reps: '50',
            notes: 'Superset with crunches. Keep legs straight and raise to parallel.',
            restTime: '90 seconds'
          },
          {
            name: 'Hanging Knee-ups',
            sets: '2-3',
            reps: '50',
            notes: 'Superset with seated twists. Focus on abdominal contraction.',
            restTime: 'No rest (superset)'
          },
          {
            name: 'Seated Twists',
            sets: '2-3',
            reps: '50',
            notes: 'Superset with hanging knee-ups. Twist fully to each side.',
            restTime: '90 seconds'
          }
        ]
      },
      {
        day: 'Day 2',
        bodyParts: ['Thighs', 'Calves'],
        specialNotes: 'Warm up thoroughly with leg extensions. Focus on slow negatives going parallel. Stretch hamstrings and quads between sets.',
        exercises: [
          {
            name: 'Leg Extensions',
            sets: '2-3',
            reps: '15-20',
            notes: 'Warm-up sets only to boost blood flow. Light weight, focus on form.',
            restTime: '60 seconds'
          },
          {
            name: 'Back Squats',
            sets: '6',
            reps: '15, 12, 11, 10, 9, 8',
            notes: 'Slower negatives when going parallel. Full depth, but avoid bouncing.',
            restTime: '2-3 minutes'
          },
          {
            name: 'Leg Press',
            sets: '3',
            reps: '15, 12, 10',
            notes: 'Go deep on negative, avoid lockout at top. Control the movement.',
            restTime: '90-120 seconds'
          },
          {
            name: 'Lying Leg Curls',
            sets: '3',
            reps: '12, 11, 10',
            notes: 'Stretch hamstrings between sets. Focus on full hamstring contraction.',
            restTime: '90 seconds'
          },
          {
            name: 'Leg Extensions',
            sets: '3',
            reps: '12, 10, 8',
            notes: 'Working sets. Stretch quads between sets. Squeeze at peak contraction.',
            restTime: '90 seconds'
          },
          {
            name: 'Standing Calf Raise',
            sets: '3',
            reps: '15-20',
            notes: '15 seconds of calf stretching between sets. Full range of motion.',
            restTime: '15 seconds (stretching)'
          },
          {
            name: 'Donkey Calf Raise',
            sets: '4',
            reps: '20-25',
            notes: 'Focus on full stretch at bottom and contraction at top.',
            restTime: '90 seconds'
          },
          {
            name: 'Seated Calf Raise',
            sets: '4',
            reps: '120, 110, 100, 90',
            notes: '4-part descending set without resting between sets. Spend 15 seconds stretching afterward.',
            restTime: 'No rest between sets, 15 seconds stretching after'
          }
        ]
      },
      {
        day: 'Day 3',
        bodyParts: ['Chest', 'Shoulders', 'Triceps', 'Abs'],
        specialNotes: 'Focus on chest stretching between sets. Use shoulder-width grip on bench press. Emphasize mind-muscle connection.',
        exercises: [
          {
            name: 'Barbell Bench Press',
            sets: '6',
            reps: '12, 10, 8, 6, 4, 2',
            notes: 'Shoulder-width grip, avoid locking out at top. Slow negatives, stretch pecs between sets.',
            restTime: '90-120 seconds'
          },
          {
            name: '70-degree Incline Dumbbell Press',
            sets: '4',
            reps: '10, 8, 6, 4',
            notes: 'Drop angle down after each set. Focus on upper chest development.',
            restTime: '90 seconds'
          },
          {
            name: '10-degree Decline Dumbbell Flyes',
            sets: '3',
            reps: '12, 10, 8',
            notes: 'Full range of motion with stretch at bottom. Control the movement.',
            restTime: '90 seconds'
          },
          {
            name: 'Cross Bench Dumbbell Pullover',
            sets: '3',
            reps: '12, 10, 8',
            notes: 'Stretch chest fully at bottom. Focus on chest and back engagement.',
            restTime: '90 seconds'
          },
          {
            name: 'Close Grip Bench Press',
            sets: '3',
            reps: '12, 10, 8',
            notes: 'Hands about 12 inches apart. Focus on triceps isolation.',
            restTime: '90 seconds'
          },
          {
            name: 'One Arm Overhead Extensions',
            sets: '3',
            reps: '12, 10, 8',
            notes: 'Lean slightly back and hold support. Stretch triceps between sets.',
            restTime: '60-90 seconds'
          },
          {
            name: 'V-Grip Pressdown',
            sets: '3',
            reps: '12, 10, 8',
            notes: 'Hold contraction for full second on each rep. Squeeze triceps hard.',
            restTime: '60 seconds'
          },
          {
            name: 'Bent Over Dumbbell Lateral Raise',
            sets: '3',
            reps: '15, 12, 10',
            notes: 'Do shoulder stretches between sets. Control the movement, no swinging.',
            restTime: '60-90 seconds'
          },
          {
            name: 'Side Cable Raise',
            sets: '3',
            reps: '12, 10, 8',
            notes: 'Occasionally do 3 sets of 12 reps without rest, switching arms.',
            restTime: '60 seconds'
          },
          {
            name: 'Leg Raises',
            sets: '4',
            reps: '25',
            notes: 'Superset with ab crunches. Keep legs straight and controlled.',
            restTime: 'No rest (superset)'
          },
          {
            name: 'Ab Crunches',
            sets: '4',
            reps: '25',
            notes: 'Superset with leg raises. Focus on full abdominal contraction.',
            restTime: '60 seconds'
          },
          {
            name: 'Seated Twists',
            sets: '1',
            reps: '100',
            notes: '100 twists total. Twist fully to each side with control.',
            restTime: '60 seconds'
          },
          {
            name: 'Hanging Leg Raises',
            sets: '4',
            reps: '25',
            notes: 'Final ab exercise. Focus on lower abs and full range.',
            restTime: '60 seconds'
          }
        ]
      },
      {
        day: 'Day 4',
        bodyParts: [],
        specialNotes: 'Rest day - focus on recovery, stretching, and mobility work',
        exercises: []
      },
      {
        day: 'Day 5',
        bodyParts: [],
        specialNotes: 'Rest day - focus on recovery, stretching, and mobility work',
        exercises: []
      },
      {
        day: 'Day 6',
        bodyParts: [],
        specialNotes: 'Rest day - focus on recovery, stretching, and mobility work',
        exercises: []
      },
      {
        day: 'Day 7',
        bodyParts: [],
        specialNotes: 'Rest day - focus on recovery, stretching, and mobility work',
        exercises: []
      }
    ]
  },
  'lee': {
    name: 'Lee Haney - The Total Package',
    description: 'Lee Haney - The Total Package, 8-time Mr. Olympia champion known for his massive, well-proportioned physique and incredible conditioning. Pioneer of modern bodybuilding with revolutionary training methods.',
    trainingPhilosophy: 'Total body development with balanced training. Focus on building mass while maintaining proportion and conditioning. High-intensity training with proper recovery and nutrition.',
    estimatedTimePerSession: '75-90 minutes',
    specialFeatures: [
      '8-time Mr. Olympia champion',
      'Balanced training approach for total package',
      'High-intensity training methods',
      'Focus on proportion and symmetry',
      'Advanced conditioning techniques',
      'Comprehensive muscle group coverage',
      'Strategic rest and recovery'
    ],
    restDays: ['Day 4'],
    weeklySchedule: [
      {
        day: 'Day 1',
        bodyParts: ['Chest', 'Arms'],
        sessionTime: 'Chest & Arms Session',
        specialNotes: 'Heavy chest focus followed by comprehensive arm development. Focus on mind-muscle connection and full range of motion.',
        exercises: [
          {
            name: 'Bench Press',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy compound movement for chest mass. Focus on controlled descent and explosive press.',
            restTime: '90 seconds'
          },
          {
            name: 'Dumbbell Bench Press',
            sets: '3',
            reps: '8-10',
            notes: 'Dumbbell variation for unilateral strength and better range of motion.',
            restTime: '75 seconds'
          },
          {
            name: 'Incline Bench Press',
            sets: '4',
            reps: '6-8',
            notes: 'Upper chest development with incline angle for complete chest coverage.',
            restTime: '90 seconds'
          },
          {
            name: 'Incline Dumbbell Bench Press',
            sets: '3',
            reps: '8-10',
            notes: 'Dumbbell incline variation for maximum upper chest stimulation.',
            restTime: '75 seconds'
          },
          {
            name: 'Barbell Curl',
            sets: '4',
            reps: '8-10',
            notes: 'Heavy bicep development with barbell for maximum mass gain.',
            restTime: '75 seconds'
          },
          {
            name: 'Preacher Curl',
            sets: '4',
            reps: '8-10',
            notes: 'Isolation movement for peak bicep development and definition.',
            restTime: '75 seconds'
          },
          {
            name: 'Cable Tricep Extension',
            sets: '4',
            reps: '10-12',
            notes: 'Cable variation for constant tension and complete tricep development.',
            restTime: '60 seconds'
          },
          {
            name: 'Skull Crusher',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy tricep mass builder with lying extension movement.',
            restTime: '75 seconds'
          }
        ]
      },
      {
        day: 'Day 2',
        bodyParts: ['Legs'],
        sessionTime: 'Legs Session',
        specialNotes: 'Complete leg development with focus on all major muscle groups. High-intensity leg training for maximum growth.',
        exercises: [
          {
            name: 'Leg Extension',
            sets: '4-5',
            reps: '12-15',
            notes: 'Isolation movement to warm up quads and establish mind-muscle connection.',
            restTime: '60 seconds'
          },
          {
            name: 'Leg Press',
            sets: '4',
            reps: '10-12',
            notes: 'Heavy compound movement for overall leg mass and strength.',
            restTime: '90 seconds'
          },
          {
            name: 'Squat',
            sets: '4-5',
            reps: '8-10',
            notes: 'King of all exercises for complete lower body development.',
            restTime: '120 seconds'
          },
          {
            name: 'Leg Curl',
            sets: '4',
            reps: '8-10',
            notes: 'Hamstring isolation for balanced leg development.',
            restTime: '75 seconds'
          },
          {
            name: 'Stiff Leg Deadlift',
            sets: '3-4',
            reps: '8-10',
            notes: 'Hamstring and posterior chain development with stiff-leg variation.',
            restTime: '90 seconds'
          }
        ]
      },
      {
        day: 'Day 3',
        bodyParts: ['Back', 'Shoulders'],
        sessionTime: 'Back & Shoulders Session',
        specialNotes: 'Comprehensive back development followed by shoulder work. Focus on width and thickness for V-taper physique.',
        exercises: [
          {
            name: 'Front Lat Pulldown',
            sets: '4',
            reps: '8-10',
            notes: 'Wide grip for maximum lat width and back thickness.',
            restTime: '75 seconds'
          },
          {
            name: 'Barbell/T-Bar Row',
            sets: '4',
            reps: '6-8',
            notes: 'Heavy rowing movement for back mass and strength development.',
            restTime: '90 seconds'
          },
          {
            name: 'Cable Row',
            sets: '4',
            reps: '8-10',
            notes: 'Cable variation for constant tension and complete back stimulation.',
            restTime: '75 seconds'
          },
          {
            name: 'Military Press',
            sets: '4-5',
            reps: '6-8',
            notes: 'Heavy overhead press for overall shoulder development and strength.',
            restTime: '90 seconds'
          },
          {
            name: 'Side Lateral Raise',
            sets: '4',
            reps: '8-10',
            notes: 'Isolation movement for side delt development and shoulder width.',
            restTime: '60 seconds'
          },
          {
            name: 'Upright Row',
            sets: '4',
            reps: '6-8',
            notes: 'Trap and shoulder development with upright rowing motion.',
            restTime: '75 seconds'
          }
        ]
      },
      {
        day: 'Day 4',
        bodyParts: [],
        specialNotes: 'Rest day - focus on recovery, stretching, and mobility work. Light cardio optional.',
        exercises: []
      },
      {
        day: 'Day 5',
        bodyParts: [],
        specialNotes: 'Rest day - active recovery with light stretching and mobility work.',
        exercises: []
      },
      {
        day: 'Day 6',
        bodyParts: [],
        specialNotes: 'Rest day - focus on nutrition, sleep, and mental preparation.',
        exercises: []
      },
      {
        day: 'Day 7',
        bodyParts: [],
        specialNotes: 'Rest day - complete recovery before starting the cycle again.',
        exercises: []
      }
    ]
  },
  'nick': {
    name: 'Nick Walker - The Machine Master',
    description: 'Nick Walker - Modern IFBB Pro known for his machine-based training approach and incredible arm development. Focuses on controlled, high-volume training with emphasis on mind-muscle connection and progressive overload.',
    trainingPhilosophy: 'Machine-based training for consistent resistance and isolation. High-volume approach with controlled tempo and mind-muscle connection. Focus on squeezing and contracting muscles for maximum hypertrophy.',
    estimatedTimePerSession: '60-75 minutes',
    specialFeatures: [
      'Modern IFBB Pro bodybuilder',
      'Machine-based training specialist',
      'High-volume training approach',
      '23-inch arm development',
      'Mind-muscle connection focus',
      'Controlled tempo and form',
      'Progressive overload methodology',
      'Fun and enjoyable training sessions'
    ],
    restDays: ['Day 7'],
    weeklySchedule: [
      {
        day: 'Day 1',
        bodyParts: ['Chest', 'Biceps'],
        sessionTime: 'Chest & Biceps Session',
        specialNotes: 'Start with chest exercises to warm up upper body, then move to biceps isolation. Focus on squeezing muscles and mind-muscle connection for optimal hypertrophy.',
        exercises: [
          {
            name: 'Machine Chest Fly',
            sets: '3-4',
            reps: '12-15',
            notes: 'Machine variation for controlled chest isolation and constant tension throughout the movement.',
            restTime: '60 seconds'
          },
          {
            name: 'Machine Incline Leverage Press',
            sets: '3-4',
            reps: '12-15',
            notes: 'Incline leverage press for upper chest development with machine stability.',
            restTime: '75 seconds'
          },
          {
            name: 'Neutral Grip Machine Press',
            sets: '3-4',
            reps: '12-15',
            notes: 'Neutral grip variation for balanced chest development and joint-friendly pressing.',
            restTime: '75 seconds'
          },
          {
            name: 'Machine Chest Press',
            sets: '3-4',
            reps: '12-15',
            notes: 'Machine chest press for heavy chest work with controlled movement pattern.',
            restTime: '75 seconds'
          },
          {
            name: 'Cable Standing Fly',
            sets: '3-4',
            reps: '12-15',
            notes: 'Standing cable fly for constant tension and complete chest contraction.',
            restTime: '60 seconds'
          },
          {
            name: 'Cable Standing Biceps Curls',
            sets: '3-4',
            reps: '12-15',
            notes: 'Cable variation for constant tension throughout the bicep curl movement.',
            restTime: '60 seconds'
          },
          {
            name: 'Machine Preacher Curl',
            sets: '3-4',
            reps: '12-15',
            notes: 'Machine preacher curl for isolated bicep development with perfect form.',
            restTime: '60 seconds'
          },
          {
            name: 'Barbell Biceps Curls 21s',
            sets: '3-4',
            reps: '12-15',
            notes: '21s technique (7 bottom half, 7 top half, 7 full range) for maximum bicep stimulation.',
            restTime: '75 seconds'
          }
        ]
      },
      {
        day: 'Day 2',
        bodyParts: ['Shoulders', 'Upper Back', 'Triceps'],
        sessionTime: 'Shoulders, Upper Back & Triceps Session',
        specialNotes: 'Loyal to proven exercises since rookie days. Focus on maximizing progress in each lift before changing. High-volume shoulder and back work followed by triceps.',
        exercises: [
          {
            name: 'Seated Dumbbell Shoulder Press',
            sets: '3-4',
            reps: '12-15',
            notes: 'Free weight pressing for overall shoulder development and strength.',
            restTime: '75 seconds'
          },
          {
            name: 'Machine Standing Shoulder Lateral Raise',
            sets: '3-4',
            reps: '12-15',
            notes: 'Machine lateral raise for controlled shoulder isolation and consistent resistance.',
            restTime: '60 seconds'
          },
          {
            name: 'Machine Seated Shoulder Press',
            sets: '3-4',
            reps: '12-15',
            notes: 'Machine seated press for stable overhead pressing with controlled movement.',
            restTime: '75 seconds'
          },
          {
            name: 'Cable Standing Shoulder Lateral Raise',
            sets: '3-4',
            reps: '12-15',
            notes: 'Cable variation for constant tension throughout the lateral raise movement.',
            restTime: '60 seconds'
          },
          {
            name: 'Cable Seated Wide-Grip Row',
            sets: '3-4',
            reps: '12-15',
            notes: 'Wide-grip cable row for upper back width and thickness development.',
            restTime: '75 seconds'
          },
          {
            name: 'Machine Row',
            sets: '3-4',
            reps: '12-15',
            notes: 'Machine rowing for controlled back development and consistent resistance.',
            restTime: '75 seconds'
          },
          {
            name: 'Reverse Pec Dec',
            sets: '3-4',
            reps: '12-15',
            notes: 'Reverse pec dec for rear delt development and upper back definition.',
            restTime: '60 seconds'
          },
          {
            name: 'Cross Cable Pushdown',
            sets: '3-4',
            reps: '12-15',
            notes: 'Cross cable variation for complete tricep development with constant tension.',
            restTime: '60 seconds'
          },
          {
            name: 'Arsenal Dip Machine',
            sets: '3-4',
            reps: '12-15',
            notes: 'Machine dip for tricep isolation and controlled movement pattern.',
            restTime: '75 seconds'
          }
        ]
      },
      {
        day: 'Day 3',
        bodyParts: ['Arms'],
        sessionTime: 'Arms Session',
        specialNotes: 'Dedicated arm day with 23-inch arm focus. Relaxed approach with fun exercises. High-volume training with mix of compound and isolation movements.',
        exercises: [
          {
            name: 'Triceps Cable Pushdown',
            sets: '3-4',
            reps: '12-15',
            notes: 'Cable pushdown for tricep isolation with constant resistance throughout movement.',
            restTime: '60 seconds'
          },
          {
            name: 'Barbell Curl 21s',
            sets: '3-4',
            reps: '12-15',
            notes: '21s technique for maximum bicep fiber recruitment and growth stimulation.',
            restTime: '75 seconds'
          },
          {
            name: 'Arsenal Dip Machine',
            sets: '3-4',
            reps: '12-15',
            notes: 'Machine dip for controlled tricep development with adjustable resistance.',
            restTime: '75 seconds'
          },
          {
            name: 'Cable Biceps Curls',
            sets: '3-4',
            reps: '12-15',
            notes: 'Cable curls for constant tension and peak contraction in biceps.',
            restTime: '60 seconds'
          },
          {
            name: 'Cross Cable Pushdowns',
            sets: '3-4',
            reps: '12-15',
            notes: 'Cross cable variation for different angle of tricep stimulation.',
            restTime: '60 seconds'
          },
          {
            name: 'Machine Preacher Curl',
            sets: '3-4',
            reps: '12-15',
            notes: 'Machine preacher for strict bicep isolation and peak development.',
            restTime: '60 seconds'
          },
          {
            name: 'Incline Overhead Dumbbell Extension',
            sets: '1',
            reps: '30',
            notes: 'High-rep finisher for tricep burn and endurance. Single set to failure.',
            restTime: '60 seconds'
          },
          {
            name: 'Hammer Curls',
            sets: '1',
            reps: '30',
            notes: 'High-rep bicep finisher focusing on brachialis development. Single set to failure.',
            restTime: '60 seconds'
          }
        ]
      },
      {
        day: 'Day 4',
        bodyParts: ['Back'],
        sessionTime: 'Back Session',
        specialNotes: 'Complete back development with focus on width, thickness, and core stability. Mix of pulling movements with some accessory work.',
        exercises: [
          {
            name: 'Cable Lat Pulldown',
            sets: '3-4',
            reps: '12-15',
            notes: 'Wide grip pulldown for maximum lat width and back development.',
            restTime: '75 seconds'
          },
          {
            name: 'Assisted T-Bar Row',
            sets: '3-4',
            reps: '12-15',
            notes: 'Assisted T-bar row for controlled rowing movement and back thickness.',
            restTime: '75 seconds'
          },
          {
            name: 'Reverse Grip Low Row Machine',
            sets: '3-4',
            reps: '12-15',
            notes: 'Reverse grip for different angle of back stimulation and biceps involvement.',
            restTime: '75 seconds'
          },
          {
            name: 'Seated Cable Row with Long Angled Bar',
            sets: '3-4',
            reps: '12-15',
            notes: 'Long angled bar for wide grip rowing and complete back development.',
            restTime: '75 seconds'
          },
          {
            name: 'Straight Arm Cable Pushdowns',
            sets: '3-4',
            reps: '12-15',
            notes: 'Straight arm pushdown for lat isolation and mind-muscle connection.',
            restTime: '60 seconds'
          },
          {
            name: 'Assisted Pull-Ups',
            sets: '1',
            reps: '20',
            notes: 'High-rep pull-up finisher with rest pauses for maximum back pump and endurance.',
            restTime: '60 seconds'
          },
          {
            name: 'Weighted Back Extensions',
            sets: '3-4',
            reps: '12-15',
            notes: 'Weighted back extension for posterior chain development and core stability.',
            restTime: '75 seconds'
          },
          {
            name: 'Power Tower Leg Raises',
            sets: '3-4',
            reps: '12-15',
            notes: 'Hanging leg raises for core development and overall conditioning.',
            restTime: '60 seconds'
          }
        ]
      },
      {
        day: 'Day 5',
        bodyParts: ['Quads'],
        sessionTime: 'Quads Session',
        specialNotes: 'Complete quad development with focus on all angles and functions. Mix of machine and free weight exercises for maximum growth.',
        exercises: [
          {
            name: 'Leg Extensions',
            sets: '3-4',
            reps: '12-15',
            notes: 'Isolation movement to warm up quads and establish mind-muscle connection.',
            restTime: '60 seconds'
          },
          {
            name: 'Leg Press',
            sets: '3-4',
            reps: '12-15',
            notes: 'Heavy compound movement for overall quad mass and strength development.',
            restTime: '90 seconds'
          },
          {
            name: 'Hack Squat',
            sets: '3-4',
            reps: '12-15',
            notes: 'Hack squat for quad-focused development with controlled movement pattern.',
            restTime: '90 seconds'
          },
          {
            name: 'Single-Leg Extensions',
            sets: '3-4',
            reps: '12-15',
            notes: 'Unilateral extension for balanced quad development and stability.',
            restTime: '60 seconds'
          },
          {
            name: 'Walking Lunges',
            sets: '3-4',
            reps: '12-15',
            notes: 'Dynamic lunge movement for functional quad strength and hypertrophy.',
            restTime: '75 seconds'
          },
          {
            name: 'Bodyweight Sissy Squats',
            sets: '3-4',
            reps: '12-15',
            notes: 'Sissy squats for quad isolation and knee-over-toe positioning.',
            restTime: '60 seconds'
          },
          {
            name: 'Thigh Adduction Machine',
            sets: '3-4',
            reps: '12-15',
            notes: 'Inner thigh work to complement quad development and overall leg balance.',
            restTime: '60 seconds'
          }
        ]
      },
      {
        day: 'Day 6',
        bodyParts: ['Hamstrings', 'Glutes', 'Upper Back'],
        sessionTime: 'Hamstrings, Glutes & Upper Back Session',
        specialNotes: 'Complete posterior chain development with hamstring focus. Mix of isolation and compound movements for full lower body development.',
        exercises: [
          {
            name: 'Seated Hamstring Curl',
            sets: '3-4',
            reps: '12-15',
            notes: 'Seated curl for hamstring isolation with controlled movement pattern.',
            restTime: '75 seconds'
          },
          {
            name: 'Lying Leg Curl',
            sets: '3-4',
            reps: '12-15',
            notes: 'Lying curl for different angle of hamstring stimulation.',
            restTime: '75 seconds'
          },
          {
            name: 'Standing Single-Leg Hamstring Curl Machine',
            sets: '3-4',
            reps: '12-15',
            notes: 'Unilateral curl for balanced hamstring development and stability.',
            restTime: '60 seconds'
          },
          {
            name: 'Cable Stiff-Legged Deadlift',
            sets: '3-4',
            reps: '12-15',
            notes: 'Cable variation for controlled hamstring and posterior chain work.',
            restTime: '90 seconds'
          },
          {
            name: 'Machine Hip Thrust',
            sets: '3-4',
            reps: '12-15',
            notes: 'Machine hip thrust for glute activation and posterior chain strength.',
            restTime: '90 seconds'
          },
          {
            name: 'High Stance Leg Press',
            sets: '3-4',
            reps: '12-15',
            notes: 'High stance variation to emphasize glutes and hamstrings.',
            restTime: '90 seconds'
          },
          {
            name: 'Leg Abduction Machine',
            sets: '3-4',
            reps: '12-15',
            notes: 'Outer thigh work for complete leg development and balance.',
            restTime: '60 seconds'
          },
          {
            name: 'Cable Pulldown',
            sets: '3-4',
            reps: '12-15',
            notes: 'Light back work to finish the week and maintain upper body conditioning.',
            restTime: '75 seconds'
          },
          {
            name: 'Machine Seated Straight Leg Calf Raise',
            sets: '3-4',
            reps: '12-15',
            notes: 'Calf work to complete the lower body session and overall leg development.',
            restTime: '60 seconds'
          }
        ]
      },
      {
        day: 'Day 7',
        bodyParts: [],
        specialNotes: 'Full rest day - focus on recovery, active stretching, and mental preparation for next week.',
        exercises: []
      }
    ]
  },
  'frank': {
    name: 'Frank Zane - Aesthetic Perfection',
    description: '3x Mr. Olympia Frank Zane - known for his incredible aesthetics, symmetry, and precision training approach. The master of aesthetic bodybuilding.',
    trainingPhilosophy: 'Precision, aesthetics, and symmetry over mass. Focus on perfect form, mind-muscle connection, and balanced proportions. Quality training with moderate volume.',
    estimatedTimePerSession: '60-90 minutes',
    specialFeatures: [
      '3x Mr. Olympia champion (1977, 1978, 1979)',
      'Aesthetic perfection and symmetry focus',
      'Precision training with perfect form',
      'Moderate volume, high quality approach',
      'Mind-muscle connection emphasis',
      'Balanced proportions development'
    ],
    restDays: ['Day 4', 'Day 7'],
    weeklySchedule: [
      {
        day: 'Monday',
        bodyParts: ['Chest', 'Back'],
        sessionTime: 'Evening',
        specialNotes: 'Upper body focus with precision movements and perfect form',
        exercises: [
          // CHEST
          {
            name: 'Incline Barbell Bench Press',
            sets: '4',
            reps: '8-10',
            notes: 'Upper chest development with controlled movement'
          },
          {
            name: 'Flat Dumbbell Bench Press',
            sets: '4',
            reps: '8-10',
            notes: 'Full range of motion for complete chest development'
          },
          {
            name: 'Dumbbell Pec Flyes',
            sets: '3',
            reps: '10-12',
            notes: 'Chest isolation with perfect form'
          },
          {
            name: 'Cable Crossovers',
            sets: '3',
            reps: '12-15',
            notes: 'Chest definition and separation'
          },
          // BACK
          {
            name: 'Wide Grip Pull-ups',
            sets: '4',
            reps: '8-12',
            notes: 'Lat width development'
          },
          {
            name: 'Barbell Rows',
            sets: '4',
            reps: '8-10',
            notes: 'Back thickness and density'
          },
          {
            name: 'Seated Cable Rows',
            sets: '3',
            reps: '10-12',
            notes: 'Middle back development'
          },
          {
            name: 'Lat Pulldowns',
            sets: '3',
            reps: '10-12',
            notes: 'Lat development and V-taper'
          }
        ]
      },
      {
        day: 'Tuesday',
        bodyParts: ['Shoulders', 'Arms'],
        sessionTime: 'Evening',
        specialNotes: 'Shoulder and arm development with aesthetic focus',
        exercises: [
          // SHOULDERS
          {
            name: 'Seated Dumbbell Press',
            sets: '4',
            reps: '8-10',
            notes: 'Overall shoulder development'
          },
          {
            name: 'Lateral Raises',
            sets: '4',
            reps: '10-12',
            notes: 'Side delt width for V-taper'
          },
          {
            name: 'Rear Delt Flyes',
            sets: '3',
            reps: '12-15',
            notes: 'Rear delt development for balance'
          },
          {
            name: 'Front Raises',
            sets: '3',
            reps: '10-12',
            notes: 'Front delt definition'
          },
          // BICEPS
          {
            name: 'Barbell Bicep Curls',
            sets: '4',
            reps: '8-10',
            notes: 'Bicep mass and peak'
          },
          {
            name: 'Dumbbell Hammer Curls',
            sets: '3',
            reps: '10-12',
            notes: 'Brachialis and forearm development'
          },
          // TRICEPS
          {
            name: 'Close Grip Bench Press',
            sets: '4',
            reps: '8-10',
            notes: 'Tricep mass and strength'
          },
          {
            name: 'Overhead Tricep Extensions',
            sets: '3',
            reps: '10-12',
            notes: 'Long head tricep development'
          }
        ]
      },
      {
        day: 'Wednesday',
        bodyParts: ['Legs', 'Abs'],
        sessionTime: 'Evening',
        specialNotes: 'Lower body development with aesthetic proportions',
        exercises: [
          // QUADRICEPS
          {
            name: 'Squats',
            sets: '4',
            reps: '10-12',
            notes: 'Overall leg development'
          },
          {
            name: 'Leg Press',
            sets: '4',
            reps: '12-15',
            notes: 'Quad mass and definition'
          },
          {
            name: 'Leg Extensions',
            sets: '3',
            reps: '12-15',
            notes: 'Quad isolation and definition'
          },
          // HAMSTRINGS
          {
            name: 'Romanian Deadlifts',
            sets: '4',
            reps: '10-12',
            notes: 'Hamstring development'
          },
          {
            name: 'Leg Curls',
            sets: '3',
            reps: '12-15',
            notes: 'Hamstring isolation'
          },
          // CALVES
          {
            name: 'Standing Calf Raises',
            sets: '4',
            reps: '15-20',
            notes: 'Calf development for proportion'
          },
          // ABS
          {
            name: 'Crunches',
            sets: '3',
            reps: '20-25',
            notes: 'Core definition'
          },
          {
            name: 'Leg Raises',
            sets: '3',
            reps: '15-20',
            notes: 'Lower ab development'
          }
        ]
      },
      {
        day: 'Thursday',
        bodyParts: ['Rest'],
        sessionTime: 'Rest Day',
        specialNotes: 'Complete rest for recovery and muscle growth',
        exercises: []
      },
      {
        day: 'Friday',
        bodyParts: ['Chest', 'Back'],
        sessionTime: 'Evening',
        specialNotes: 'Second upper body session with different exercises',
        exercises: [
          // CHEST
          {
            name: 'Decline Barbell Bench Press',
            sets: '4',
            reps: '8-10',
            notes: 'Lower chest development'
          },
          {
            name: 'Incline Dumbbell Bench Press',
            sets: '4',
            reps: '8-10',
            notes: 'Upper chest with dumbbells'
          },
          {
            name: 'Dips',
            sets: '3',
            reps: '10-12',
            notes: 'Lower chest and tricep development'
          },
          // BACK
          {
            name: 'T-Bar Rows',
            sets: '4',
            reps: '8-10',
            notes: 'Back thickness'
          },
          {
            name: 'Close Grip Pulldowns',
            sets: '4',
            reps: '10-12',
            notes: 'Lat development'
          },
          {
            name: 'Cable Rows',
            sets: '3',
            reps: '10-12',
            notes: 'Middle back definition'
          },
          {
            name: 'Hyperextensions',
            sets: '3',
            reps: '12-15',
            notes: 'Lower back and posture'
          }
        ]
      },
      {
        day: 'Saturday',
        bodyParts: ['Shoulders', 'Arms'],
        sessionTime: 'Evening',
        specialNotes: 'Second shoulder and arm session for complete development',
        exercises: [
          // SHOULDERS
          {
            name: 'Overhead Press',
            sets: '4',
            reps: '8-10',
            notes: 'Overall shoulder strength'
          },
          {
            name: 'Cable Lateral Raises',
            sets: '4',
            reps: '10-12',
            notes: 'Side delt isolation'
          },
          {
            name: 'Bent Over Lateral Raises',
            sets: '3',
            reps: '12-15',
            notes: 'Rear delt development'
          },
          // BICEPS
          {
            name: 'Dumbbell Bicep Curls',
            sets: '4',
            reps: '8-10',
            notes: 'Bicep peak development'
          },
          {
            name: 'Preacher Curls',
            sets: '3',
            reps: '10-12',
            notes: 'Bicep isolation'
          },
          // TRICEPS
          {
            name: 'Tricep Dips',
            sets: '4',
            reps: '10-12',
            notes: 'Tricep mass'
          },
          {
            name: 'Cable Tricep Pushdowns',
            sets: '3',
            reps: '10-12',
            notes: 'Tricep definition'
          }
        ]
      },
      {
        day: 'Sunday',
        bodyParts: ['Rest'],
        sessionTime: 'Rest Day',
        specialNotes: 'Complete rest for recovery and preparation for next week',
        exercises: []
      }
    ]
  }
};




