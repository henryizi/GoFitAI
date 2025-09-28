export type ChatSender = 'user' | 'ai';

export interface ChatMessage {
  sender: ChatSender;
  text: string;
  timestamp?: string;
}

export interface ExerciseItem {
  name: string;
  sets: number;
  reps: string;
  restBetweenSets?: string;
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: ExerciseItem[];
}

export interface WorkoutPlan {
  name: string;
  training_level: 'beginner' | 'intermediate' | 'advanced';
  goal_fat_loss: number;
  goal_muscle_gain: number;
  mesocycle_length_weeks: number;
  weeklySchedule: WorkoutDay[];
  id?: string;
  source?: string;
  primary_goal?: string;
  workout_frequency?: string;
  estimated_time_per_session?: number;
  // Production metadata for user messaging
  system_metadata?: {
    ai_available: boolean;
    fallback_used: boolean;
    fallback_reason: 'regional_restriction' | 'quota_exceeded' | 'ai_unavailable' | null;
    provider: string;
  };
}

export interface AiChatRequest {
  chatHistory: ChatMessage[];
  plan: WorkoutPlan;
  user?: { id?: string; name?: string } | Record<string, unknown>;
}

export interface AiChatResponse {
  aiMessage: string;
  newPlan: WorkoutPlan | null;
  error?: unknown;
} 