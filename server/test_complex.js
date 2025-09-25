const test = async () => {
  try {
    const usedAI = false;
    const usedProvider = 'test';
    const workoutPlan = {
      id: 1,
      plan_name: 'Test Workout Plan',
      name: 'Test Workout Plan',
      training_level: 'intermediate',
      goal_fat_loss: 0,
      goal_muscle_gain: 5,
      mesocycle_length_weeks: 8,
      estimated_time_per_session: "45-60 min",
      primary_goal: 'muscle_gain',
      weekly_schedule: [],
      weeklySchedule: [],
      status: 'active',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      source: 'rule_based_fallback'
    };

    return {
      success: true,
      workoutPlan,
      provider: usedProvider || 'rule_based_fallback',
      used_ai: usedAI,
    };
  } catch (error) {
    console.error('[WORKOUT] Error generating workout plan:', error);
    return {
      success: false,
      error: error.message
    };
  }
};


