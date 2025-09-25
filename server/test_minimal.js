const test = async () => {
  try {
    const usedAI = false;
    const usedProvider = 'test';
    const workoutPlan = { id: 1, name: 'test' };

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


