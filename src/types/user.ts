import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface User extends Profile {
  // You can add any additional client-side properties here
  email?: string;
}

export type FitnessGoal = 'muscle_gain' | 'fat_loss' | 'tone_up' | 'maintenance';

export interface NotificationPreferences {
  workout_reminders: boolean;
  meal_log_reminders: boolean;
  photo_upload_reminders: boolean;
  milestone_notifications: boolean;
  reminder_time?: string; // HH:MM format
}

export interface UserProfile {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
} 