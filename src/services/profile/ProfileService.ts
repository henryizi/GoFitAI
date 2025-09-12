import { supabase } from '../supabase/client';
import { Database } from '../../types/database';
import {
  processHeightInput,
  processWeightInput,
  parseOriginalHeightValue,
  parseOriginalWeightValue,
  type HeightUnit,
  type WeightUnit,
  type OriginalHeightValue,
  type OriginalWeightValue,
} from '../../utils/unitConversions';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type UserProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const fetchUserProfile = async (
  userId: string,
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as UserProfile) ?? null;
};

export const saveUserProfile = async (
  userId: string,
  email: string,
  updates: UserProfileUpdate,
): Promise<UserProfile> => {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  } as UserProfileUpdate;

  // Attempt update
  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  if (error) throw error;

  // Fetch the updated profile (may be null if RLS blocks select)
  const refreshed = await fetchUserProfile(userId);
  return (
    refreshed ?? {
      id: userId,
      email,
      ...payload,
    }
  ) as UserProfile;
};

// Helper function to update height with original value storage
export const updateUserHeight = async (
  userId: string,
  email: string,
  value: number,
  unit: HeightUnit,
  feet?: number,
  inches?: number,
): Promise<UserProfile> => {
  const { heightCm, originalValue } = processHeightInput(value, unit, feet, inches);
  
  const updates: UserProfileUpdate = {
    height_cm: heightCm,
    height_original_value: JSON.stringify(originalValue),
  };

  return saveUserProfile(userId, email, updates);
};

// Helper function to update weight with original value storage
export const updateUserWeight = async (
  userId: string,
  email: string,
  value: number,
  unit: WeightUnit,
): Promise<UserProfile> => {
  const { weightKg, originalValue } = processWeightInput(value, unit);
  
  const updates: UserProfileUpdate = {
    weight_kg: weightKg,
    weight_original_value: JSON.stringify(originalValue),
  };

  return saveUserProfile(userId, email, updates);
};

// Helper function to get original height value from profile
export const getOriginalHeightValue = (profile: UserProfile): OriginalHeightValue | null => {
  return parseOriginalHeightValue(profile.height_original_value);
};

// Helper function to get original weight value from profile
export const getOriginalWeightValue = (profile: UserProfile): OriginalWeightValue | null => {
  return parseOriginalWeightValue(profile.weight_original_value);
};

// Helper function to get height in cm (handles both old and new field names)
export const getHeightCm = (profile: UserProfile): number | null => {
  return profile.height_cm ?? profile.height ?? null;
};

// Helper function to get weight in kg (handles both old and new field names)
export const getWeightKg = (profile: UserProfile): number | null => {
  return profile.weight_kg ?? profile.weight ?? null;
}; 