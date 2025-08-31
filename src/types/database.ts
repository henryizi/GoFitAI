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
          training_level: 'beginner' | 'intermediate' | 'advanced' | null;
          primary_goal: 'general_fitness' | 'fat_loss' | 'muscle_gain' | 'athletic_performance' | null;
          workout_frequency: '2_3' | '4_5' | '6' | null;
          onboarding_completed: boolean;
          goal_fat_reduction: number | null;
          goal_muscle_gain: number | null;
          body_fat: number | null;
          weight_trend: 'losing' | 'gaining' | 'stable' | 'unsure' | null;
          exercise_frequency: '0' | '1-3' | '4-6' | '7+' | null;
          activity_level: 'sedentary' | 'moderate' | 'very-active' | null;
          gender: 'male' | 'female' | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          height?: number | null;
          weight?: number | null;
          training_level?: 'beginner' | 'intermediate' | 'advanced' | null;
          primary_goal?: 'general_fitness' | 'fat_loss' | 'muscle_gain' | 'athletic_performance' | null;
          workout_frequency?: '2_3' | '4_5' | '6' | null;
          onboarding_completed?: boolean;
          goal_fat_reduction?: number | null;
          goal_muscle_gain?: number | null;
          body_fat?: number | null;
          weight_trend?: 'losing' | 'gaining' | 'stable' | 'unsure' | null;
          exercise_frequency?: '0' | '1-3' | '4-6' | '7+' | null;
          activity_level?: 'sedentary' | 'moderate' | 'very-active' | null;
          gender?: 'male' | 'female' | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          birthday?: string | null;
          height?: number | null;
          weight?: number | null;
          training_level?: 'beginner' | 'intermediate' | 'advanced' | null;
          primary_goal?: 'general_fitness' | 'fat_loss' | 'muscle_gain' | 'athletic_performance' | null;
          workout_frequency?: '2_3' | '4_5' | '6' | null;
          onboarding_completed?: boolean;
          goal_fat_reduction?: number | null;
          goal_muscle_gain?: number | null;
          body_fat?: number | null;
          weight_trend?: 'losing' | 'gaining' | 'stable' | 'unsure' | null;
          exercise_frequency?: '0' | '1-3' | '4-6' | '7+' | null;
          gender?: 'male' | 'female' | null;
        };
      };
      body_photos: {
        Row: {
          id: string
          user_id: string
          photo_type: string
          photo_url: string
          storage_path: string
          uploaded_at: string
          is_analyzed: boolean
          analysis_status: string
        }
        Insert: {
          id?: string
          user_id: string
          photo_type: string
          photo_url: string
          storage_path: string
          uploaded_at?: string
          is_analyzed?: boolean
          analysis_status?: string
        }
        Update: {
          id?: string
          user_id?: string
          photo_type?: string
          photo_url?: string
          storage_path?: string
          uploaded_at?: string
          is_analyzed?: boolean
          analysis_status?: string
        }
      }
      body_analysis: {
        Row: {
          id: string
          user_id: string
          photo_session_id: string | null
          chest_rating: number | null
          arms_rating: number | null
          back_rating: number | null
          legs_rating: number | null
          waist_rating: number | null
          overall_rating: number | null
          strongest_body_part: string | null
          weakest_body_part: string | null
          ai_feedback: string | null
          analysis_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          photo_session_id?: string | null
          chest_rating?: number | null
          arms_rating?: number | null
          back_rating?: number | null
          legs_rating?: number | null
          waist_rating?: number | null
          overall_rating?: number | null
          strongest_body_part?: string | null
          weakest_body_part?: string | null
          ai_feedback?: string | null
          analysis_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          photo_session_id?: string | null
          chest_rating?: number | null
          arms_rating?: number | null
          back_rating?: number | null
          legs_rating?: number | null
          waist_rating?: number | null
          overall_rating?: number | null
          strongest_body_part?: string | null
          weakest_body_part?: string | null
          ai_feedback?: string | null
          analysis_data?: Json | null
          created_at?: string
        }
      }
      progress_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          weight_kg: number | null
          front_photo_id: string | null
          back_photo_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          weight_kg?: number | null
          front_photo_id?: string | null
          back_photo_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          weight_kg?: number | null
          front_photo_id?: string | null
          back_photo_id?: string | null
          created_at?: string
        }
      }

      workout_plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
          status: 'active' | 'completed' | 'archived';
          mesocycle_length_weeks: number;
          current_week: number;
          training_level: 'beginner' | 'intermediate' | 'advanced';
          volume_landmarks: {
            [muscle: string]: {
              MEV: number; // Minimum Effective Volume
              MAV: number; // Maximum Adaptive Volume
              MRV: number; // Maximum Recoverable Volume
            };
          };
          deload_week: boolean;
          goal_fat_loss: number;
          goal_muscle_gain: number;
          estimated_time_per_session: string;
        };
        Insert: Omit<Database['public']['Tables']['workout_plans']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['workout_plans']['Insert']>;
      };

      training_splits: {
        Row: {
          id: string;
          plan_id: string;
          name: string;
          frequency_per_week: number;
          order_in_week: number;
          focus_areas: string[];
        };
        Insert: Omit<Database['public']['Tables']['training_splits']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['training_splits']['Insert']>;
      };

      exercises: {
        Row: {
          id: string;
          plan_id: string | null;
          name: string;
          category: string; // Changed to string for more flexibility
          muscle_groups: string[];
          difficulty: 'beginner' | 'intermediate' | 'advanced';
          equipment_needed: string[];
          description: string | null;
          form_tips: string[];
          rpe_recommendation: number | null;
          is_custom: boolean;
          animation_url: string | null; // Add the new field
        };
        Insert: Omit<Database['public']['Tables']['exercises']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['exercises']['Insert']>;
      };

      workout_sessions: {
        Row: {
          id: string;
          plan_id: string;
          split_id: string;
          week_number: number;
          day_number: number;
          status: 'pending' | 'completed' | 'skipped';
          completed_at: string | null;
          session_feedback: string | null;
          session_rpe: number | null;
          recovery_score: number | null;
          estimated_calories: number | null;
        };
        Insert: Omit<Database['public']['Tables']['workout_sessions']['Row'], 'id' | 'completed_at'>;
        Update: Partial<Database['public']['Tables']['workout_sessions']['Insert']>;
      };

      exercise_sets: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          order_in_session: number;
          target_sets: number;
          target_reps: string;
          target_rpe: number | null;
          rest_period: string;
          progression_scheme: 'double_progression' | 'linear_progression' | 'rpe_based';
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['exercise_sets']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['exercise_sets']['Insert']>;
      };

      exercise_logs: {
        Row: {
          id: string;
          set_id: string;
          actual_reps: number;
          actual_weight: number | null;
          actual_rpe: number | null;
          completed_at: string;
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['exercise_logs']['Row'], 'id' | 'completed_at'>;
        Update: Partial<Database['public']['Tables']['exercise_logs']['Insert']>;
      };

      workout_history: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string | null; // Made nullable since plan might be deleted
          session_id: string | null; // Made nullable since session might be deleted
          completed_at: string;
          duration_minutes: number | null;
          total_sets: number | null;
          total_exercises: number | null;
          estimated_calories: number | null;
          notes: string | null;
          created_at: string;
          // New permanent storage fields
          plan_name: string | null;
          session_name: string | null;
          week_number: number | null;
          day_number: number | null;
          exercises_data: any | null; // JSONB storing complete exercise data
        };
        Insert: Omit<Database['public']['Tables']['workout_history']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['workout_history']['Insert']>;
      };

      volume_tracking: {
        Row: {
          id: string;
          plan_id: string;
          week_number: number;
          muscle_group: string;
          weekly_sets: number;
          average_rpe: number | null;
          recovery_rating: number | null;
          volume_category: 'MEV' | 'MAV' | 'MRV';
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['volume_tracking']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['volume_tracking']['Insert']>;
      };

      progression_tracking: {
        Row: {
          id: string;
          exercise_id: string;
          user_id: string;
          date: string;
          top_set_weight: number | null;
          top_set_reps: number | null;
          top_set_rpe: number | null;
          e1rm: number | null;
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['progression_tracking']['Row'], 'id' | 'date'>;
        Update: Partial<Database['public']['Tables']['progression_tracking']['Insert']>;
      };
      daily_user_metrics: {
        Row: {
          id: string;
          user_id: string;
          metric_date: string;
          weight_kg: number | null;
          trend_weight_kg: number | null;
          sleep_hours: number | null;
          stress_level: number | null;
          activity_calories: number | null;
          notes: string | null;
          habit_score: number | null;
          body_fat_percentage: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['daily_user_metrics']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['daily_user_metrics']['Insert']
        >;
      };
      nutrition_plans: {
        Row: {
          id: string;
          user_id: string;
          plan_name: string;
          goal_type: string;
          preferences: Json | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['nutrition_plans']['Row'],
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<
          Database['public']['Tables']['nutrition_plans']['Insert']
        >;
      };
      historical_nutrition_targets: {
        Row: {
          id: string;
          nutrition_plan_id: string;
          start_date: string;
          end_date: string | null;
          daily_calories: number | null;
          protein_grams: number | null;
          carbs_grams: number | null;
          fat_grams: number | null;
          micronutrients_targets: Json | null;
          reasoning: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['historical_nutrition_targets']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['historical_nutrition_targets']['Insert']
        >;
      };
      nutrition_log_entries: {
        Row: {
          id: string;
          user_id: string;
          logged_at: string;
          food_name: string;
          serving_size_grams: number | null;
          calories: number | null;
          protein_grams: number | null;
          carbs_grams: number | null;
          fat_grams: number | null;
          micronutrients: Json | null;
        };
        Insert: Omit<
          Database['public']['Tables']['nutrition_log_entries']['Row'],
          'id' | 'logged_at'
        >;
        Update: Partial<
          Database['public']['Tables']['nutrition_log_entries']['Insert']
        >;
      };
      meal_plan_suggestions: {
        Row: {
          id: string;
          nutrition_plan_id: string;
          suggestion_date: string;
          meal_type: string;
          meal_description: string | null;
          calories: number | null;
          protein_grams: number | null;
          carbs_grams: number | null;
          fat_grams: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['meal_plan_suggestions']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['meal_plan_suggestions']['Insert']
        >;
      };
      behavioral_insights: {
        Row: {
          id: string;
          user_id: string;
          insight_date: string;
          insight_type: string;
          insight_message: string;
          is_acknowledged: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['behavioral_insights']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['behavioral_insights']['Insert']
        >;
      };
      motivational_messages: {
        Row: {
          id: string;
          user_id: string;
          trigger_event: string;
          message: string;
          is_seen: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['motivational_messages']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['motivational_messages']['Insert']
        >;
      };
      progress_predictions: {
        Row: {
          id: string;
          user_id: string;
          prediction_date: string;
          predicted_weight_kg: number | null;
          confidence_level: string | null;
          prediction_summary: string | null;
          warning_flags: string[] | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['progress_predictions']['Row'],
          'id' | 'created_at'
        >;
        Update: Partial<
          Database['public']['Tables']['progress_predictions']['Insert']
        >;
      };
    };
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 