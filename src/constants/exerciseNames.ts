export interface ExerciseInfo {
  name: string;
  category: 'Push' | 'Pull' | 'Legs' | 'Core' | 'Cardio';
  muscleGroups: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment?: 'Dumbbell' | 'Barbell' | 'Kettlebell' | 'Resistance Band' | 'Bodyweight' | 'Cable Machine' | 'Plate';
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