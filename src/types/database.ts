export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          birthday: string | null;
          height: number | null;
          weight: number | null;
          height_cm: number | null;
          weight_kg: number | null;
          training_level: 'beginner' | 'intermediate' | 'advanced' | null;
          primary_goal: 'general_fitness' | 'hypertrophy' | 'athletic_performance' | 'fat_loss' | 'muscle_gain' | null;
          workout_frequency: '2_3' | '4_5' | '6' | null;
          preferred_workout_frequency: number | null; // Actual preferred workout days (1-7)
          onboarding_completed: boolean;
          body_fat: number | null;
          weight_trend: 'losing' | 'gaining' | 'stable' | 'unsure' | null;
          exercise_frequency: '1' | '2-3' | '4-5' | '6-7' | null;
          activity_level: 'sedentary' | 'moderately_active' | 'very_active' | null;
          fitness_strategy: 'bulk' | 'cut' | 'maintenance' | 'recomp' | 'maingaining' | null;
          gender: 'male' | 'female' | null;
          height_unit_preference: 'cm' | 'ft' | null;
          weight_unit_preference: 'kg' | 'lbs' | null;
          height_original_value: string | null;
          weight_original_value: string | null;
          goal_fat_reduction: number | null;
          goal_muscle_gain: number | null;
          body_analysis: Json | null;
          fitness_level: 'beginner' | 'intermediate' | 'advanced' | null;
          age: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          height?: number | null;
          weight?: number | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          training_level?: 'beginner' | 'intermediate' | 'advanced' | null;
          primary_goal?: 'general_fitness' | 'hypertrophy' | 'athletic_performance' | 'fat_loss' | 'muscle_gain' | null;
          workout_frequency?: '2_3' | '4_5' | '6' | null;
          exercise_frequency?: '1' | '2-3' | '4-5' | '6-7' | null;
          onboarding_completed?: boolean;
          body_fat?: number | null;
          weight_trend?: 'losing' | 'gaining' | 'stable' | 'unsure' | null;
          activity_level?: 'sedentary' | 'moderately_active' | 'very_active' | null;
          fitness_strategy?: 'bulk' | 'cut' | 'maintenance' | 'recomp' | 'maingaining' | null;
          gender?: 'male' | 'female' | null;
          height_unit_preference?: 'cm' | 'ft' | null;
          weight_unit_preference?: 'kg' | 'lbs' | null;
          height_original_value?: string | null;
          weight_original_value?: string | null;
          goal_fat_reduction?: number | null;
          goal_muscle_gain?: number | null;
          body_analysis?: Json | null;
          fitness_level?: 'beginner' | 'intermediate' | 'advanced' | null;
          age?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          height?: number | null;
          weight?: number | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          training_level?: 'beginner' | 'intermediate' | 'advanced' | null;
          primary_goal?: 'general_fitness' | 'hypertrophy' | 'athletic_performance' | 'fat_loss' | 'muscle_gain' | null;
          workout_frequency?: '2_3' | '4_5' | '6' | null;
          exercise_frequency?: '1' | '2-3' | '4-5' | '6-7' | null;
          onboarding_completed?: boolean;
          body_fat?: number | null;
          weight_trend?: 'losing' | 'gaining' | 'stable' | 'unsure' | null;
          activity_level?: 'sedentary' | 'moderately_active' | 'very_active' | null;
          fitness_strategy?: 'bulk' | 'cut' | 'maintenance' | 'recomp' | 'maingaining' | null;
          gender?: 'male' | 'female' | null;
          height_unit_preference?: 'cm' | 'ft' | null;
          weight_unit_preference?: 'kg' | 'lbs' | null;
          height_original_value?: string | null;
          weight_original_value?: string | null;
          goal_fat_reduction?: number | null;
          goal_muscle_gain?: number | null;
          body_analysis?: Json | null;
          fitness_level?: 'beginner' | 'intermediate' | 'advanced' | null;
          age?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      body_photos: {
        Row: {
          id: string;
          user_id: string;
          photo_type: string;
          photo_url: string;
          storage_path: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          photo_type: string;
          photo_url: string;
          storage_path: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          photo_type?: string;
          photo_url?: string;
          storage_path?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      workout_plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          training_level: string;
          primary_goal: string;
          days_per_week: number;
          estimated_time_per_session: string;
          is_active: boolean;
          status: 'active' | 'archived' | 'completed';
          created_at: string;
          updated_at: string;
          mesocycle_length_weeks: number;
          goal_fat_loss: number | null;
          goal_muscle_gain: number | null;
          image_url: string | null;
          plan_id: string;
          split_id: string | null;
          estimated_calories: number | null;
          weekly_schedule: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description: string;
          training_level: string;
          primary_goal: string;
          days_per_week: number;
          estimated_time_per_session: string;
          is_active?: boolean;
          status?: 'active' | 'archived' | 'completed';
          created_at?: string;
          updated_at?: string;
          mesocycle_length?: number;
          goal_fat_loss?: number | null;
          goal_muscle_gain?: number | null;
          image_url?: string | null;
          plan_id?: string;
          split_id?: string | null;
          estimated_calories?: number | null;
          training_splits?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          training_level?: string;
          primary_goal?: string;
          days_per_week?: number;
          estimated_time_per_session?: string;
          is_active?: boolean;
          status?: 'active' | 'archived' | 'completed';
          created_at?: string;
          updated_at?: string;
          mesocycle_length?: number;
          goal_fat_loss?: number | null;
          goal_muscle_gain?: number | null;
          image_url?: string | null;
          plan_id?: string;
          split_id?: string | null;
          estimated_calories?: number | null;
          training_splits?: Json | null;
        };
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          is_custom: boolean;
          plan_id: string;
          category: string;
          muscle_groups: string[];
          difficulty: string;
          equipment_needed: string[];
          description: string;
          form_tips: string[];
          rpe_recommendation: number | null;
          animation_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_custom?: boolean;
          plan_id: string;
          category: string;
          muscle_groups?: string[];
          difficulty: string;
          equipment_needed?: string[];
          description: string;
          form_tips?: string[];
          rpe_recommendation?: number | null;
          animation_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_custom?: boolean;
          plan_id?: string;
          category?: string;
          muscle_groups?: string[];
          difficulty?: string;
          equipment_needed?: string[];
          description?: string;
          form_tips?: string[];
          rpe_recommendation?: number | null;
          animation_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      exercise_sets: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          order_in_session: number;
          target_sets: number;
          target_reps: string;
          target_rpe: number;
          rest_period: string;
          progression_scheme: 'double_progression' | 'linear_progression' | 'rpe_based';
          notes: string;
          target_weight: number | null;
          rest_seconds: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          exercise_id: string;
          order_in_session: number;
          target_sets: number;
          target_reps: string;
          target_rpe: number;
          rest_period: string;
          progression_scheme?: 'double_progression' | 'linear_progression' | 'rpe_based';
          notes?: string;
          target_weight?: number | null;
          rest_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          exercise_id?: string;
          order_in_session?: number;
          target_sets?: number;
          target_reps?: string;
          target_rpe?: number;
          rest_period?: string;
          progression_scheme?: 'double_progression' | 'linear_progression' | 'rpe_based';
          notes?: string;
          target_weight?: number | null;
          rest_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      exercise_logs: {
        Row: {
          id: string;
          set_id: string;
          actual_reps: number;
          actual_weight: number;
          actual_rpe: number | null;
          completed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          set_id: string;
          actual_reps: number;
          actual_weight: number;
          actual_rpe?: number | null;
          completed_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          set_id?: string;
          actual_reps?: number;
          actual_weight?: number;
          actual_rpe?: number | null;
          completed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          status?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          status?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_recipes: {
        Row: {
          id: string;
          user_id: string;
          recipe_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipe_data: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          recipe_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      progress_entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          weight_kg: number | null;
          body_fat_percentage: number | null;
          front_photo_id: string | null;
          back_photo_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          weight_kg?: number | null;
          body_fat_percentage?: number | null;
          front_photo_id?: string | null;
          back_photo_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          weight_kg?: number | null;
          body_fat_percentage?: number | null;
          front_photo_id?: string | null;
          back_photo_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_user_metrics: {
        Row: {
          id: string;
          user_id: string;
          metric_date: string;
          weight_kg: number | null;
          trend_weight_kg: number | null;
          activity_calories: number | null;
          sleep_hours: number | null;
          stress_level: number | null;
          habit_score: number | null;
          body_fat_percentage: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          metric_date: string;
          weight_kg?: number | null;
          trend_weight_kg?: number | null;
          activity_calories?: number | null;
          sleep_hours?: number | null;
          stress_level?: number | null;
          habit_score?: number | null;
          body_fat_percentage?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          metric_date?: string;
          weight_kg?: number | null;
          trend_weight_kg?: number | null;
          activity_calories?: number | null;
          sleep_hours?: number | null;
          stress_level?: number | null;
          habit_score?: number | null;
          body_fat_percentage?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      data_deletion_requests: {
        Row: {
          id: string;
          user_id: string | null;
          user_email: string;
          requested_at: string;
          deletion_reason: string | null;
          status: 'pending' | 'completed' | 'failed';
          compliance_notes: string;
          processing_notes: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_email: string;
          requested_at?: string;
          deletion_reason?: string | null;
          status?: 'pending' | 'completed' | 'failed';
          compliance_notes?: string;
          processing_notes?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          user_email?: string;
          requested_at?: string;
          deletion_reason?: string | null;
          status?: 'pending' | 'completed' | 'failed';
          compliance_notes?: string;
          processing_notes?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workout_history: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string | null;
          session_id: string | null;
          completed_at: string;
          week_number: number | null;
          day_number: number | null;
          plan_name: string | null;
          session_name: string | null;
          exercises_data: Json | null;
          total_exercises: number | null;
          estimated_calories: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id?: string | null;
          session_id?: string | null;
          completed_at: string;
          week_number?: number | null;
          day_number?: number | null;
          plan_name?: string | null;
          session_name?: string | null;
          exercises_data?: Json | null;
          total_exercises?: number | null;
          estimated_calories?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string | null;
          session_id?: string | null;
          completed_at?: string;
          week_number?: number | null;
          day_number?: number | null;
          plan_name?: string | null;
          session_name?: string | null;
          exercises_data?: Json | null;
          total_exercises?: number | null;
          estimated_calories?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      meal_plan_suggestions: {
        Row: {
          id: string;
          nutrition_plan_id: string;
          suggestion_date: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          suggested_foods: Json;
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nutrition_plan_id: string;
          suggestion_date: string;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          suggested_foods: Json;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nutrition_plan_id?: string;
          suggestion_date?: string;
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
          suggested_foods?: Json;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      behavioral_insights: {
        Row: {
          id: string;
          user_id: string;
          insight_type: string;
          insight_data: Json;
          is_acknowledged: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          insight_type: string;
          insight_data: Json;
          is_acknowledged?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          insight_type?: string;
          insight_data?: Json;
          is_acknowledged?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      motivational_messages: {
        Row: {
          id: string;
          user_id: string;
          message_type: string;
          message_data: Json;
          is_seen: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          message_type: string;
          message_data: Json;
          is_seen?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          message_type?: string;
          message_data?: Json;
          is_seen?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
