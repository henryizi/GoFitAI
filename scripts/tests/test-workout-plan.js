// Mock the DeepSeek service response for testing
const mockWorkoutPlan = {
  weeklySchedule: [
    {
      day: "Monday",
      focus: "Full Body A",
      exercises: [
        {
          name: "Dumbbell Press",
          sets: 3,
          reps: "8-12",
          restBetweenSets: "90 seconds"
        },
        {
          name: "Push Up",
          sets: 3,
          reps: "12-15",
          restBetweenSets: "60 seconds"
        },
        {
          name: "Dumbbell Row",
          sets: 3,
          reps: "10-12",
          restBetweenSets: "90 seconds"
        },
        {
          name: "Bodyweight Squat",
          sets: 4,
          reps: "15-20",
          restBetweenSets: "60 seconds"
        }
      ]
    },
    {
      day: "Wednesday",
      focus: "Full Body B",
      exercises: [
        {
          name: "Goblet Squat",
          sets: 3,
          reps: "10-12",
          restBetweenSets: "90 seconds"
        },
        {
          name: "Lateral Raise",
          sets: 3,
          reps: "12-15",
          restBetweenSets: "60 seconds"
        },
        {
          name: "Russian Twist",
          sets: 3,
          reps: "15 each side",
          restBetweenSets: "45 seconds"
        }
      ]
    },
    {
      day: "Friday",
      focus: "Full Body C",
      exercises: [
        {
          name: "Dumbbell Press",
          sets: 3,
          reps: "10-12",
          restBetweenSets: "90 seconds"
        },
        {
          name: "Dumbbell Row",
          sets: 3,
          reps: "10-12",
          restBetweenSets: "90 seconds"
        },
        {
          name: "Walking Lunge",
          sets: 3,
          reps: "10 each leg",
          restBetweenSets: "60 seconds"
        },
        {
          name: "Weighted Plank",
          sets: 3,
          reps: "30-45 seconds",
          restBetweenSets: "45 seconds"
        }
      ]
    }
  ],
  recommendations: {
    nutrition: [
      "Eat in a slight caloric deficit (300-500 calories below maintenance)",
      "Consume 1.6-2.2g protein per kg bodyweight",
      "Stay hydrated with 2-3 liters of water daily"
    ],
    rest: [
      "Get 7-9 hours of sleep per night",
      "Take one full day of rest between workouts",
      "Listen to your body and adjust intensity as needed"
    ],
    progression: [
      "Increase weight when you can complete all sets with good form",
      "Focus on proper form before adding weight",
      "Aim to increase reps or weight every 1-2 weeks"
    ]
  },
  estimatedTimePerSession: "45-60 minutes"
};

// Display the workout plan
console.log('\n=== Example Workout Plan (Dumbbells & Bodyweight) ===\n');
console.log(JSON.stringify(mockWorkoutPlan, null, 2)); 