export interface ExerciseInfo {
  name: string;
  category: 'Push' | 'Pull' | 'Legs' | 'Core' | 'Cardio' | 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Abs' | 'Glutes' | 'Full Body';
  muscleGroups: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment?: 'Dumbbell' | 'Barbell' | 'Kettlebell' | 'Resistance Band' | 'Bodyweight' | 'Cable Machine' | 'Plate' | 'Machine' | 'Jump Rope' | 'Other';
}

export const SUPPORTED_EXERCISES: ExerciseInfo[] = [
  // Push Exercises (Chest, Shoulders, Triceps)
  // Bodyweight
  {
    name: "Push Up",
    category: "Push",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Diamond Push Up",
    category: "Push",
    muscleGroups: ["Triceps", "Chest", "Shoulders"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Pike Push Up",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Wide Grip Push Up",
    category: "Push",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Decline Push Up",
    category: "Push",
    muscleGroups: ["Upper Chest", "Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Archer Push Up",
    category: "Push",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "One Arm Push Up",
    category: "Push",
    muscleGroups: ["Chest", "Shoulders", "Triceps", "Core"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Dip",
    category: "Push",
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Ring Dip",
    category: "Push",
    muscleGroups: ["Chest", "Triceps", "Shoulders"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Handstand Push Up",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },

  // Weighted Push - Barbell
  {
    name: "Bench Press",
    category: "Push",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Incline Bench Press",
    category: "Push",
    muscleGroups: ["Upper Chest", "Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Decline Bench Press",
    category: "Push",
    muscleGroups: ["Lower Chest", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Close Grip Bench Press",
    category: "Push",
    muscleGroups: ["Triceps", "Chest"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Military Press",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Behind The Neck Press",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps"],
    difficulty: "Advanced",
    equipment: "Barbell"
  },
  {
    name: "Push Press",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps", "Legs"],
    difficulty: "Advanced",
    equipment: "Barbell"
  },

  // Weighted Push - Dumbbell
  {
    name: "Dumbbell Bench Press",
    category: "Push",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Incline Dumbbell Press",
    category: "Push",
    muscleGroups: ["Upper Chest", "Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Decline Dumbbell Press",
    category: "Push",
    muscleGroups: ["Lower Chest", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Flyes",
    category: "Push",
    muscleGroups: ["Chest"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Incline Dumbbell Flyes",
    category: "Push",
    muscleGroups: ["Upper Chest"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Decline Dumbbell Flyes",
    category: "Push",
    muscleGroups: ["Lower Chest"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Shoulder Press",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Arnold Press",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Lateral Raise",
    category: "Push",
    muscleGroups: ["Shoulders"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Front Raise",
    category: "Push",
    muscleGroups: ["Shoulders"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Rear Delt Flyes",
    category: "Push",
    muscleGroups: ["Rear Deltoids"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Tricep Extension",
    category: "Push",
    muscleGroups: ["Triceps"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Overhead Dumbbell Extension",
    category: "Push",
    muscleGroups: ["Triceps"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Kickback",
    category: "Push",
    muscleGroups: ["Triceps"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },

  // Weighted Push - Cable Machine
  {
    name: "Cable Flyes",
    category: "Push",
    muscleGroups: ["Chest"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Incline Cable Flyes",
    category: "Push",
    muscleGroups: ["Upper Chest"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Decline Cable Flyes",
    category: "Push",
    muscleGroups: ["Lower Chest"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Lateral Raise",
    category: "Push",
    muscleGroups: ["Shoulders"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Front Raise",
    category: "Push",
    muscleGroups: ["Shoulders"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Rear Delt Flyes",
    category: "Push",
    muscleGroups: ["Rear Deltoids"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Tricep Pushdown",
    category: "Push",
    muscleGroups: ["Triceps"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Rope Pushdown",
    category: "Push",
    muscleGroups: ["Triceps"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Overhead Cable Extension",
    category: "Push",
    muscleGroups: ["Triceps"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Crossovers",
    category: "Push",
    muscleGroups: ["Chest"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },

  // Pull Exercises (Back, Biceps)
  // Bodyweight
  {
    name: "Pull Up",
    category: "Pull",
    muscleGroups: ["Back", "Biceps", "Core"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Chin Up",
    category: "Pull",
    muscleGroups: ["Back", "Biceps", "Core"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Wide Grip Pull Up",
    category: "Pull",
    muscleGroups: ["Back", "Biceps", "Core"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Close Grip Pull Up",
    category: "Pull",
    muscleGroups: ["Back", "Biceps", "Core"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Neutral Grip Pull Up",
    category: "Pull",
    muscleGroups: ["Back", "Biceps", "Core"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Muscle Up",
    category: "Pull",
    muscleGroups: ["Back", "Biceps", "Chest", "Shoulders"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Inverted Row",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },

  // Weighted Pull - Barbell
  {
    name: "Barbell Row",
    category: "Pull",
    muscleGroups: ["Back", "Biceps", "Core"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Pendlay Row",
    category: "Pull",
    muscleGroups: ["Back", "Biceps", "Core"],
    difficulty: "Advanced",
    equipment: "Barbell"
  },
  {
    name: "T-Bar Row",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Barbell Curl",
    category: "Pull",
    muscleGroups: ["Biceps"],
    difficulty: "Beginner",
    equipment: "Barbell"
  },
  {
    name: "Preacher Curl",
    category: "Pull",
    muscleGroups: ["Biceps"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Incline Barbell Curl",
    category: "Pull",
    muscleGroups: ["Biceps"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Barbell Shrug",
    category: "Pull",
    muscleGroups: ["Traps"],
    difficulty: "Beginner",
    equipment: "Barbell"
  },
  {
    name: "Upright Row",
    category: "Pull",
    muscleGroups: ["Traps", "Shoulders"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },

  // Weighted Pull - Dumbbell
  {
    name: "Dumbbell Row",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "One Arm Dumbbell Row",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Incline Dumbbell Row",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Curl",
    category: "Pull",
    muscleGroups: ["Biceps"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Hammer Curl",
    category: "Pull",
    muscleGroups: ["Biceps", "Forearms"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Incline Dumbbell Curl",
    category: "Pull",
    muscleGroups: ["Biceps"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Concentration Curl",
    category: "Pull",
    muscleGroups: ["Biceps"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Shrug",
    category: "Pull",
    muscleGroups: ["Traps"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Rear Delt Flyes",
    category: "Pull",
    muscleGroups: ["Rear Deltoids"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },

  // Weighted Pull - Cable Machine
  {
    name: "Lat Pulldown",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Wide Grip Lat Pulldown",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Close Grip Lat Pulldown",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Seated Cable Row",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "One Arm Cable Row",
    category: "Pull",
    muscleGroups: ["Back", "Biceps"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Face Pull",
    category: "Pull",
    muscleGroups: ["Rear Deltoids", "Upper Back"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Curl",
    category: "Pull",
    muscleGroups: ["Biceps"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Rope Cable Curl",
    category: "Pull",
    muscleGroups: ["Biceps"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Shrug",
    category: "Pull",
    muscleGroups: ["Traps"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },

  // Legs Exercises
  // Bodyweight
  {
    name: "Bodyweight Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Jump Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Calves"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Bodyweight Lunge",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Walking Lunge",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Jumping Lunge",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Calves"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Single Leg Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Pistol Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Single Leg Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Glute Bridge",
    category: "Legs",
    muscleGroups: ["Glutes", "Hamstrings"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Single Leg Glute Bridge",
    category: "Legs",
    muscleGroups: ["Glutes", "Hamstrings"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Wall Sit",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },

  // Weighted Legs - Barbell
  {
    name: "Barbell Back Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Front Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Core"],
    difficulty: "Advanced",
    equipment: "Barbell"
  },
  {
    name: "Overhead Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core", "Shoulders"],
    difficulty: "Advanced",
    equipment: "Barbell"
  },
  {
    name: "Romanian Deadlift",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes", "Lower Back"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Conventional Deadlift",
    category: "Legs",
    muscleGroups: ["Back", "Hamstrings", "Glutes"],
    difficulty: "Advanced",
    equipment: "Barbell"
  },
  {
    name: "Sumo Deadlift",
    category: "Legs",
    muscleGroups: ["Back", "Hamstrings", "Glutes"],
    difficulty: "Advanced",
    equipment: "Barbell"
  },
  {
    name: "Good Morning",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Lower Back"],
    difficulty: "Advanced",
    equipment: "Barbell"
  },
  {
    name: "Barbell Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },

  // Weighted Legs - Dumbbell
  {
    name: "Dumbbell Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Goblet Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Walking Lunge",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Step Up",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Romanian Deadlift",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes", "Lower Back"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },

  // Weighted Legs - Kettlebell
  {
    name: "Kettlebell Goblet Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes", "Core"],
    difficulty: "Beginner",
    equipment: "Kettlebell"
  },
  {
    name: "Kettlebell Swing",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes", "Core"],
    difficulty: "Intermediate",
    equipment: "Kettlebell"
  },
  {
    name: "Kettlebell Deadlift",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes", "Lower Back"],
    difficulty: "Beginner",
    equipment: "Kettlebell"
  },

  // Weighted Legs - Cable Machine
  {
    name: "Leg Press",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Leg Extension",
    category: "Legs",
    muscleGroups: ["Quadriceps"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Leg Curl",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Seated Leg Curl",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Standing Leg Curl",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Seated Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Hack Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Hip Thrust",
    category: "Legs",
    muscleGroups: ["Glutes", "Hamstrings"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },

  // Core Exercises
  // Bodyweight Core
  {
    name: "Plank",
    category: "Core",
    muscleGroups: ["Core", "Shoulders"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Side Plank",
    category: "Core",
    muscleGroups: ["Obliques", "Core"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Mountain Climber",
    category: "Core",
    muscleGroups: ["Core", "Shoulders"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Bicycle Crunch",
    category: "Core",
    muscleGroups: ["Core", "Obliques"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Leg Raise",
    category: "Core",
    muscleGroups: ["Core", "Hip Flexors"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Hanging Leg Raise",
    category: "Core",
    muscleGroups: ["Core", "Hip Flexors"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Crunch",
    category: "Core",
    muscleGroups: ["Core"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Sit Up",
    category: "Core",
    muscleGroups: ["Core"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Russian Twist",
    category: "Core",
    muscleGroups: ["Obliques", "Core"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Dead Bug",
    category: "Core",
    muscleGroups: ["Core"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Bird Dog",
    category: "Core",
    muscleGroups: ["Core", "Glutes"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Superman",
    category: "Core",
    muscleGroups: ["Lower Back", "Glutes"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },

  // Weighted Core
  {
    name: "Cable Woodchop",
    category: "Core",
    muscleGroups: ["Obliques", "Core"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Weighted Russian Twist",
    category: "Core",
    muscleGroups: ["Obliques", "Core"],
    difficulty: "Intermediate",
    equipment: "Kettlebell"
  },
  {
    name: "Weighted Plank",
    category: "Core",
    muscleGroups: ["Core", "Shoulders"],
    difficulty: "Intermediate",
    equipment: "Plate"
  },
  {
    name: "Cable Crunch",
    category: "Core",
    muscleGroups: ["Core"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Pallof Press",
    category: "Core",
    muscleGroups: ["Core", "Obliques"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Rotation",
    category: "Core",
    muscleGroups: ["Obliques", "Core"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Weighted Sit Up",
    category: "Core",
    muscleGroups: ["Core"],
    difficulty: "Intermediate",
    equipment: "Plate"
  },
  {
    name: "Weighted Crunch",
    category: "Core",
    muscleGroups: ["Core"],
    difficulty: "Intermediate",
    equipment: "Plate"
  },

  // Cardio/Conditioning
  {
    name: "Kettlebell Swing",
    category: "Cardio",
    muscleGroups: ["Full Body", "Posterior Chain"],
    difficulty: "Intermediate",
    equipment: "Kettlebell"
  },
  {
    name: "Dumbbell Clean and Press",
    category: "Cardio",
    muscleGroups: ["Full Body"],
    difficulty: "Advanced",
    equipment: "Dumbbell"
  },
  {
    name: "Weighted Step-Up",
    category: "Cardio",
    muscleGroups: ["Legs", "Core"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Burpee",
    category: "Cardio",
    muscleGroups: ["Full Body"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Jump Rope",
    category: "Cardio",
    muscleGroups: ["Calves", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "High Knees",
    category: "Cardio",
    muscleGroups: ["Core", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Mountain Climber",
    category: "Cardio",
    muscleGroups: ["Core", "Shoulders", "Cardiovascular"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Box Jump",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Thruster",
    category: "Cardio",
    muscleGroups: ["Full Body"],
    difficulty: "Advanced",
    equipment: "Dumbbell"
  },
  {
    name: "Wall Ball",
    category: "Cardio",
    muscleGroups: ["Full Body"],
    difficulty: "Intermediate",
    equipment: "Plate"
  },
  
  // Running and Cardio Machine Exercises
  {
    name: "Treadmill Running",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Outdoor Running",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Treadmill Walking Incline",
    category: "Cardio",
    muscleGroups: ["Legs", "Glutes"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Treadmill Intervals",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "Track Running",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Hill Running",
    category: "Cardio",
    muscleGroups: ["Legs", "Glutes"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Sprint Intervals",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Fartlek Training",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  
  // Swimming Exercises
  {
    name: "Swimming",
    category: "Cardio",
    muscleGroups: ["Full Body", "Cardiovascular"],
    difficulty: "Intermediate",
    equipment: "Other"
  },
  {
    name: "Freestyle Swimming",
    category: "Cardio",
    muscleGroups: ["Shoulders", "Back", "Core"],
    difficulty: "Intermediate",
    equipment: "Other"
  },
  {
    name: "Swimming Laps Mixed Strokes",
    category: "Cardio",
    muscleGroups: ["Full Body", "Cardiovascular"],
    difficulty: "Intermediate",
    equipment: "Other"
  },
  {
    name: "Pool Running",
    category: "Cardio",
    muscleGroups: ["Full Body", "Cardiovascular"],
    difficulty: "Intermediate",
    equipment: "Other"
  },
  {
    name: "Water Aerobics",
    category: "Cardio",
    muscleGroups: ["Full Body", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Other"
  },
  
  // Cardio Machines
  {
    name: "Stationary Bike",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Spin Bike",
    category: "Cardio",
    muscleGroups: ["Legs", "Core"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "Recumbent Bike",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Bike Sprints",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Advanced",
    equipment: "Machine"
  },
  {
    name: "Elliptical Machine",
    category: "Cardio",
    muscleGroups: ["Legs", "Arms"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Cross Trainer",
    category: "Cardio",
    muscleGroups: ["Legs", "Arms"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Rowing Machine",
    category: "Cardio",
    muscleGroups: ["Full Body", "Back"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "StairMaster",
    category: "Cardio",
    muscleGroups: ["Legs", "Glutes"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "Arc Trainer",
    category: "Cardio",
    muscleGroups: ["Legs", "Glutes", "Arms"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  
  // Additional Cardio Exercises
  {
    name: "Jumping Jacks",
    category: "Cardio",
    muscleGroups: ["Full Body", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Battle Ropes",
    category: "Cardio",
    muscleGroups: ["Arms", "Core"],
    difficulty: "Advanced",
    equipment: "Other"
  },
  {
    name: "Step-Ups",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Bear Crawls",
    category: "Cardio",
    muscleGroups: ["Full Body", "Core"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Plank Jacks",
    category: "Cardio",
    muscleGroups: ["Core", "Arms"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Squat Jumps",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Lateral Shuffles",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Stair Climbing",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Dancing",
    category: "Cardio",
    muscleGroups: ["Full Body", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "HIIT Circuit",
    category: "Cardio",
    muscleGroups: ["Full Body", "Cardiovascular"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Jogging in Place",
    category: "Cardio",
    muscleGroups: ["Legs", "Cardiovascular"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Shadowboxing",
    category: "Cardio",
    muscleGroups: ["Arms", "Core"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },

  // Additional Hamstring Exercises (to balance muscle group distribution)
  {
    name: "Stiff Leg Deadlift",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes", "Lower Back"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Single Leg Romanian Deadlift",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes", "Core"],
    difficulty: "Advanced",
    equipment: "Dumbbell"
  },
  {
    name: "Nordic Hamstring Curl",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Glute Ham Raise",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes"],
    difficulty: "Advanced",
    equipment: "Cable Machine"
  },
  {
    name: "Lying Leg Curl",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Pull Through",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Reverse Hyperextension",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes", "Lower Back"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Single Leg Deadlift",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Glutes", "Core"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Barbell Hip Thrust",
    category: "Legs",
    muscleGroups: ["Glutes", "Hamstrings"],
    difficulty: "Intermediate",
    equipment: "Barbell"
  },
  {
    name: "Dumbbell Hip Thrust",
    category: "Legs",
    muscleGroups: ["Glutes", "Hamstrings"],
    difficulty: "Beginner",
    equipment: "Dumbbell"
  },
  {
    name: "Stability Ball Leg Curl",
    category: "Legs",
    muscleGroups: ["Hamstrings", "Core"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Eccentric Nordic Curl",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },

  // Additional Quadricep Exercises (to balance muscle group distribution)
  {
    name: "Bulgarian Split Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Weighted Bulgarian Split Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    difficulty: "Advanced",
    equipment: "Dumbbell"
  },
  {
    name: "Reverse Lunge",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Weighted Reverse Lunge",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Lateral Lunge",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Weighted Lateral Lunge",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    difficulty: "Advanced",
    equipment: "Dumbbell"
  },
  {
    name: "Sissy Squat",
    category: "Legs",
    muscleGroups: ["Quadriceps"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Single Leg Press",
    category: "Legs",
    muscleGroups: ["Quadriceps", "Glutes"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },

  // Additional Chest Exercises (to balance with other muscle groups)
  {
    name: "Decline Push-up",
    category: "Chest",
    muscleGroups: ["Chest", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Wide Grip Push-up",
    category: "Chest",
    muscleGroups: ["Chest", "Triceps"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Diamond Push-up",
    category: "Chest",
    muscleGroups: ["Chest", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Archer Push-up",
    category: "Chest",
    muscleGroups: ["Chest", "Triceps"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Single Arm Push-up",
    category: "Chest",
    muscleGroups: ["Chest", "Triceps", "Core"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Clap Push-up",
    category: "Chest",
    muscleGroups: ["Chest", "Triceps"],
    difficulty: "Advanced",
    equipment: "Bodyweight"
  },
  {
    name: "Hindu Push-up",
    category: "Chest",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Dive Bomber Push-up",
    category: "Chest",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Chest Squeeze Press",
    category: "Chest",
    muscleGroups: ["Chest"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Single Arm Dumbbell Press",
    category: "Chest",
    muscleGroups: ["Chest", "Core"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Pullover",
    category: "Chest",
    muscleGroups: ["Chest", "Back"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Cable Crossover High",
    category: "Chest",
    muscleGroups: ["Chest"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Crossover Low",
    category: "Chest",
    muscleGroups: ["Chest"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Cable Crossover Mid",
    category: "Chest",
    muscleGroups: ["Chest"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Single Arm Cable Fly",
    category: "Chest",
    muscleGroups: ["Chest", "Core"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },

  // Additional Calf Exercises (severely lacking - only 9 currently)
  {
    name: "Standing Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Seated Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Single Leg Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Weighted Standing Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Weighted Seated Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Dumbbell Single Leg Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  },
  {
    name: "Calf Press on Leg Press",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Cable Machine"
  },
  {
    name: "Standing Calf Raise Machine",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Seated Calf Raise Machine",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Cable Machine"
  },
  {
    name: "Donkey Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Jump Rope",
    category: "Legs",
    muscleGroups: ["Calves", "Core"],
    difficulty: "Beginner",
    equipment: "Jump Rope"
  },
  {
    name: "Box Jump Calf Focus",
    category: "Legs",
    muscleGroups: ["Calves", "Quadriceps"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Pogo Jumps",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Ankle Hops",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Single Leg Ankle Hops",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Calf Raise to Toe Walk",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Wall Calf Stretch Hold",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Bodyweight"
  },
  {
    name: "Step Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Intermediate",
    equipment: "Bodyweight"
  },
  {
    name: "Weighted Step Calf Raise",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Advanced",
    equipment: "Dumbbell"
  },
  {
    name: "Farmer's Walk on Toes",
    category: "Legs",
    muscleGroups: ["Calves", "Core"],
    difficulty: "Intermediate",
    equipment: "Dumbbell"
  }
];

// Helper function to get exercise names for AI prompt
export const getExerciseNamesForPrompt = (): string => {
  return SUPPORTED_EXERCISES
    .map(exercise => exercise.name)
    .join(", ");
};

// Helper function to check if an exercise name is supported
export const isSupportedExercise = (name: string): boolean => {
  return SUPPORTED_EXERCISES.some(
    exercise => exercise.name.toLowerCase() === name.trim().toLowerCase()
  );
};

// Helper function to get exercise info
export const getExerciseInfo = (name: string): ExerciseInfo | undefined => {
  return SUPPORTED_EXERCISES.find(
    exercise => exercise.name.toLowerCase() === name.trim().toLowerCase()
  );
};

// Helper function to get exercises by difficulty
export const getExercisesByDifficulty = (difficulty: 'Beginner' | 'Intermediate' | 'Advanced'): ExerciseInfo[] => {
  return SUPPORTED_EXERCISES.filter(exercise => exercise.difficulty === difficulty);
};

// Helper function to get exercises by category
export const getExercisesByCategory = (category: 'Push' | 'Pull' | 'Legs' | 'Core' | 'Cardio'): ExerciseInfo[] => {
  return SUPPORTED_EXERCISES.filter(exercise => exercise.category === category);
};

// New helper function to get exercises by equipment
export const getExercisesByEquipment = (equipment: ExerciseInfo['equipment']): ExerciseInfo[] => {
  return SUPPORTED_EXERCISES.filter(exercise => exercise.equipment === equipment);
};

// Helper function to get exercises by muscle group
export const getExercisesByMuscleGroup = (muscleGroup: string): ExerciseInfo[] => {
  return SUPPORTED_EXERCISES.filter(exercise => 
    exercise.muscleGroups.some(muscle => 
      muscle.toLowerCase() === muscleGroup.toLowerCase()
    )
  );
};

// Helper function to check if an exercise is primarily bodyweight
export const isBodyweightExercise = (exerciseName: string): boolean => {
  const name = exerciseName.toLowerCase().trim();
  
  // Check if it's in our supported exercises with bodyweight equipment
  const exerciseInfo = getExerciseInfo(exerciseName);
  if (exerciseInfo?.equipment === 'Bodyweight') {
    return true;
  }
  
  // Common bodyweight exercise patterns (for exercises not in our constants)
  const bodyweightPatterns = [
    // Pull exercises
    /^pull.?up$/,
    /^chin.?up$/,
    /^muscle.?up$/,
    // Push exercises  
    /^push.?up$/,
    /^dip$/,
    /^handstand$/,
    /^pike push.?up$/,
    /^diamond push.?up$/,
    /^wide grip push.?up$/,
    // Legs
    /^bodyweight squat$/,
    /^air squat$/,
    /^jump squat$/,
    /^pistol squat$/,
    /^single leg squat$/,
    /^bodyweight lunge$/,
    /^jumping lunge$/,
    /^calf raise$/,
    /^single leg calf raise$/,
    // Core
    /^plank$/,
    /^side plank$/,
    /^mountain climber$/,
    /^crunch$/,
    /^sit.?up$/,
    /^leg raise$/,
    /^hanging leg raise$/,
    /^russian twist$/ // without weight
  ];
  
  return bodyweightPatterns.some(pattern => pattern.test(name));
};

// Helper function to check if an exercise can optionally use weight
export const canUseOptionalWeight = (exerciseName: string): boolean => {
  const name = exerciseName.toLowerCase().trim();
  
  // Exercises that are primarily bodyweight but can be weighted
  const optionalWeightPatterns = [
    /pull.?up/,
    /chin.?up/,
    /dip/,
    /push.?up/,
    /plank/,
    /russian twist/,
    /calf raise/
  ];
  
  // Check regex patterns first
  const matchesPattern = optionalWeightPatterns.some(pattern => pattern.test(name));
  
  // Additional checks for exercises that need special handling
  if (matchesPattern) return true;
  
  // Special cases for squat and lunge (bodyweight versions only)
  if ((name.includes('squat') || name.includes('lunge')) && 
      !name.includes('barbell') && 
      !name.includes('dumbbell') && 
      !name.includes('walking')) {
    return true;
  }
  
  return false;
};

// Machine Exercises - Comprehensive gym machine coverage
const MACHINE_EXERCISES: ExerciseInfo[] = [
  // Push Machines - Chest
  {
    name: "Chest Press Machine",
    category: "Push",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Incline Chest Press Machine",
    category: "Push",
    muscleGroups: ["Upper Chest", "Shoulders", "Triceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Decline Chest Press Machine",
    category: "Push",
    muscleGroups: ["Lower Chest", "Shoulders", "Triceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Pec Deck Machine",
    category: "Push",
    muscleGroups: ["Chest"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Chest Fly Machine",
    category: "Push",
    muscleGroups: ["Chest"],
    difficulty: "Beginner",
    equipment: "Machine"
  },

  // Push Machines - Shoulders
  {
    name: "Shoulder Press Machine",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Lateral Raise Machine",
    category: "Push",
    muscleGroups: ["Shoulders"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Rear Delt Fly Machine",
    category: "Push",
    muscleGroups: ["Rear Delts", "Upper Back"],
    difficulty: "Beginner",
    equipment: "Machine"
  },

  // Push Machines - Triceps
  {
    name: "Tricep Extension Machine",
    category: "Push",
    muscleGroups: ["Triceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Tricep Dip Machine",
    category: "Push",
    muscleGroups: ["Triceps", "Chest", "Shoulders"],
    difficulty: "Beginner",
    equipment: "Machine"
  },

  // Pull Machines - Back
  {
    name: "Lat Pulldown Machine",
    category: "Pull",
    muscleGroups: ["Lat", "Biceps", "Rear Delts"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Wide Grip Lat Pulldown Machine",
    category: "Pull",
    muscleGroups: ["Lat", "Rear Delts"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Close Grip Lat Pulldown Machine",
    category: "Pull",
    muscleGroups: ["Lat", "Biceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Seated Row Machine",
    category: "Pull",
    muscleGroups: ["Back", "Lat", "Biceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Low Row Machine",
    category: "Pull",
    muscleGroups: ["Back", "Lat", "Biceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "High Row Machine",
    category: "Pull",
    muscleGroups: ["Upper Back", "Rear Delts", "Biceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "T-Bar Row Machine",
    category: "Pull",
    muscleGroups: ["Back", "Lat", "Biceps"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "Assisted Pull Up Machine",
    category: "Pull",
    muscleGroups: ["Lat", "Biceps", "Back"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Assisted Chin Up Machine",
    category: "Pull",
    muscleGroups: ["Lat", "Biceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },

  // Pull Machines - Biceps
  {
    name: "Bicep Curl Machine",
    category: "Pull",
    muscleGroups: ["Biceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Preacher Curl Machine",
    category: "Pull",
    muscleGroups: ["Biceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Hammer Curl Machine",
    category: "Pull",
    muscleGroups: ["Biceps", "Forearms"],
    difficulty: "Beginner",
    equipment: "Machine"
  },

  // Leg Machines - Quadriceps
  {
    name: "Leg Press Machine",
    category: "Legs",
    muscleGroups: ["Quad", "Glutes", "Hamstrings"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Leg Extension Machine",
    category: "Legs",
    muscleGroups: ["Quad"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Hack Squat Machine",
    category: "Legs",
    muscleGroups: ["Quad", "Glutes"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "Bulgarian Split Squat Machine",
    category: "Legs",
    muscleGroups: ["Quad", "Glutes"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },

  // Leg Machines - Hamstrings
  {
    name: "Leg Curl Machine",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Seated Leg Curl Machine",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Lying Leg Curl Machine",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Standing Leg Curl Machine",
    category: "Legs",
    muscleGroups: ["Hamstrings"],
    difficulty: "Beginner",
    equipment: "Machine"
  },

  // Leg Machines - Glutes
  {
    name: "Hip Thrust Machine",
    category: "Legs",
    muscleGroups: ["Glutes", "Hamstrings"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Hip Abduction Machine",
    category: "Legs",
    muscleGroups: ["Glutes", "Hip Abductors"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Hip Adduction Machine",
    category: "Legs",
    muscleGroups: ["Hip Adductors", "Inner Thighs"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Glute Kickback Machine",
    category: "Legs",
    muscleGroups: ["Glutes"],
    difficulty: "Beginner",
    equipment: "Machine"
  },

  // Leg Machines - Calves
  {
    name: "Standing Calf Raise Machine",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Seated Calf Raise Machine",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Leg Press Calf Raise Machine",
    category: "Legs",
    muscleGroups: ["Calves"],
    difficulty: "Beginner",
    equipment: "Machine"
  },

  // Core Machines
  {
    name: "Abdominal Crunch Machine",
    category: "Core",
    muscleGroups: ["Abdominal"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Rotary Torso Machine",
    category: "Core",
    muscleGroups: ["Obliques", "Core"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Back Extension Machine",
    category: "Core",
    muscleGroups: ["Lower Back", "Glutes"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Roman Chair Machine",
    category: "Core",
    muscleGroups: ["Lower Back", "Glutes", "Hamstrings"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "Ab Coaster Machine",
    category: "Core",
    muscleGroups: ["Abdominal", "Core"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Captain's Chair Machine",
    category: "Core",
    muscleGroups: ["Abdominal", "Hip Flexors"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },

  // Multi-Station Machines
  {
    name: "Smith Machine Squat",
    category: "Legs",
    muscleGroups: ["Quad", "Glutes", "Hamstrings"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "Smith Machine Bench Press",
    category: "Push",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "Smith Machine Row",
    category: "Pull",
    muscleGroups: ["Back", "Lat", "Biceps"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "Smith Machine Shoulder Press",
    category: "Push",
    muscleGroups: ["Shoulders", "Triceps"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },
  {
    name: "Smith Machine Deadlift",
    category: "Pull",
    muscleGroups: ["Back", "Glutes", "Hamstrings"],
    difficulty: "Intermediate",
    equipment: "Machine"
  },

  // Functional Trainer Machines
  {
    name: "Functional Trainer Chest Press",
    category: "Push",
    muscleGroups: ["Chest", "Shoulders", "Triceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Functional Trainer Row",
    category: "Pull",
    muscleGroups: ["Back", "Lat", "Biceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  },
  {
    name: "Functional Trainer Lat Pulldown",
    category: "Pull",
    muscleGroups: ["Lat", "Biceps"],
    difficulty: "Beginner",
    equipment: "Machine"
  }
];

// Add machine exercises to the main array
SUPPORTED_EXERCISES.push(...MACHINE_EXERCISES); 