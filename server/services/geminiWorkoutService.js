const { GoogleGenerativeAI } = require('@google/generative-ai');

// Get API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

class GeminiWorkoutService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async generatePersonalizedWorkoutPlan(userProfile, goal, level, age, gender, workoutTypes, equipment, intensity, targetWorkoutDays) {
    const prompt = `
      Create a highly personalized weekly workout plan for a user with the following profile:
      - Goal: ${goal}
      - Fitness Level: ${level}
      - Age: ${age}
      - Gender: ${gender}
      - Preferred Workout Types: ${workoutTypes.join(', ')}
      - Available Equipment: ${equipment.join(', ')}
      - Desired Intensity: ${intensity}
      - Target Workout Days per Week: ${targetWorkoutDays}

      Instructions:
      1.  Generate a 7-day plan, with a clear focus for each day (e.g., "Full Body Strength", "Cardio & Core", "Flexibility", "Rest Day").
      2.  Incorporate a mix of exercises that match the user's preferred workout types and available equipment.
      3.  The number of workout days should match the user's target. The remaining days should be rest days.
      4.  For each exercise, specify the number of sets, reps (or duration), and rest time.
      5.  Return the plan as a JSON object with the following structure:
          {
            "plan_name": "Personalized [Goal] Plan",
            "weekly_schedule": [
              {
                "day": "Monday",
                "focus": "...",
                "exercises": [
                  { "name": "...", "sets": ..., "reps": "...", "restBetweenSets": "..." },
                  ...
                ]
              },
              ...
            ]
          }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = await response.text();
      
      // Clean the response to ensure it is valid JSON
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (error) {
      console.error("Error generating workout plan with Gemini API:", error);
      // Fallback to a default plan if the API fails
      return {
        plan_name: "Default Bodyweight Plan",
        "weekly_schedule": [
          // Add a default schedule here
        ]
      };
    }
  }
}

module.exports = GeminiWorkoutService;

