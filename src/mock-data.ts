// Mock data for offline development

// Store for created plans
export const mockPlansStore = {
  plans: [] as any[],
  deletedDefaultPlan: false,
  mealPlans: [] as any[] // Added for daily meal plans
};

export const mockWorkoutPlansStore = {
    plans: [] as any[],
};

import AsyncStorage from '@react-native-async-storage/async-storage';

export const mockMetricsStore: {
  metrics: any[];
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
} = {
  metrics: [
    {
      id: 'metric-1',
      user_id: 'user-123',
      metric_date: '2023-12-01',
      weight_kg: 75.5,
      trend_weight_kg: 75.3,
      sleep_hours: 7.5,
      stress_level: 3,
      activity_calories: 450,
      notes: null,
      created_at: '2023-12-01T08:00:00Z'
    },
    {
      id: 'metric-2',
      user_id: 'user-123',
      metric_date: '2023-11-30',
      weight_kg: 75.8,
      trend_weight_kg: 75.6,
      sleep_hours: 7.2,
      stress_level: 4,
      activity_calories: 390,
      notes: null,
      created_at: '2023-11-30T08:00:00Z'
    }
  ],
  
  async loadFromStorage() {
    try {
      const stored = await AsyncStorage.getItem('mockMetricsStore');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.metrics = parsed.metrics || this.metrics;
        console.log('[MockData] Loaded metrics from storage:', this.metrics.length);
      }
    } catch (error) {
      console.error('[MockData] Error loading from storage:', error);
    }
  },
  
  async saveToStorage() {
    try {
      await AsyncStorage.setItem('mockMetricsStore', JSON.stringify({
        metrics: this.metrics
      }));
      console.log('[MockData] Saved metrics to storage:', this.metrics.length);
    } catch (error) {
      console.error('[MockData] Error saving to storage:', error);
    }
  }
};

export const mockMotivationalMessage = {
  id: 'mock-id-123',
  user_id: 'user-123',
  trigger_event: 'app_opened',
  message: "You're making great progress! Keep pushing your limits and you'll achieve your fitness goals.",
  is_seen: false,
  created_at: new Date().toISOString()
};

export const mockMetrics = mockMetricsStore.metrics;

export const mockPrediction = {
  id: 'prediction-1',
  user_id: 'user-123',
  prediction_date: '2023-12-07',
  predicted_weight_kg: 74.8,
  confidence_level: 'high',
  prediction_summary: 'Based on your current progress, you are likely to reach your target weight in about 4 weeks if you maintain your current routine.',
  warning_flags: null,
  created_at: '2023-12-01T09:00:00Z'
};

export const mockNutritionPlan = {
  id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
  user_id: 'user-123',
  plan_name: 'Custom Fat Loss Plan',
  goal_type: 'weight_loss',
  preferences: {
    dietary: ['vegetarian'],
    intolerances: ['dairy']
  },
  status: 'active',
  created_at: '2023-07-28T10:00:00Z',
  updated_at: '2023-07-28T10:00:00Z',
  daily_targets: {
    calories: 1800,
    protein_grams: 120,
    carbs_grams: 150,
    fat_grams: 60
  },
  metabolic_calculations: {
    bmr: 1650,
    tdee: 2557,
    activity_level: 'moderately_active',
    activity_multiplier: 1.55,
    goal_calories: 1800,
    goal_adjustment: -757,
    calculation_method: 'Mifflin-St Jeor Equation'
  },
  weekly_meal_plan: {
    monday: {
      breakfast: 'Vegetarian protein smoothie with spinach, banana, and plant-based protein powder',
      lunch: 'Quinoa bowl with roasted vegetables and tofu',
      dinner: 'Lentil pasta with tomato sauce and side salad',
      snacks: ['Apple with almond butter', 'Carrot sticks with hummus']
    },
    tuesday: {
      breakfast: 'Oatmeal with berries, nuts, and maple syrup',
      lunch: 'Mediterranean wrap with falafel and tahini sauce',
      dinner: 'Vegetable stir-fry with brown rice',
      snacks: ['Mixed nuts', 'Fruit salad']
    },
    wednesday: {
      breakfast: 'Avocado toast on whole grain bread with cherry tomatoes',
      lunch: 'Chickpea salad with olive oil dressing',
      dinner: 'Stuffed bell peppers with quinoa and black beans',
      snacks: ['Greek yogurt with honey', 'Trail mix']
    },
    thursday: {
      breakfast: 'Chia seed pudding with coconut milk and berries',
      lunch: 'Lentil soup with whole grain bread',
      dinner: 'Zucchini noodles with pesto and grilled tofu',
      snacks: ['Energy balls', 'Celery with almond butter']
    },
    friday: {
      breakfast: 'Tofu scramble with vegetables and whole grain toast',
      lunch: 'Buddha bowl with mixed greens, quinoa, and roasted chickpeas',
      dinner: 'Eggplant parmesan with side salad',
      snacks: ['Rice cakes with avocado', 'Handful of berries']
    },
    saturday: {
      breakfast: 'Whole grain pancakes with fresh fruit',
      lunch: 'Vegetable sushi rolls with edamame',
      dinner: 'Mushroom risotto with green vegetables',
      snacks: ['Smoothie', 'Popcorn']
    },
    sunday: {
      breakfast: 'Breakfast burrito with beans, vegetables, and salsa',
      lunch: 'Roasted vegetable sandwich on whole grain bread',
      dinner: 'Sweet potato curry with brown rice',
      snacks: ['Dark chocolate', 'Apple slices']
    }
  }
}; 
